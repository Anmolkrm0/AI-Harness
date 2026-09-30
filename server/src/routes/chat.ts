import { Router } from 'express';
import crypto from 'crypto';
import { dbService } from '../db/index.js';
import { AgentCoordinator } from '../services/tools/agent.js';
import { ModelRegistry } from '../services/providers/registry.js';
import { ChatMessage } from '../services/providers/types.js';
import { QuestionSuggester } from '../services/tools/questionSuggester.js';

export const chatRouter = Router();

chatRouter.post('/stream', async (req, res) => {
  const { conversationId, message, model: requestedModel, enableWeb, enableGmail, attachments } = req.body;

  if (!conversationId || !message) {
    return res.status(400).json({ error: 'conversationId and message are required' });
  }

  // Ensure conversation exists
  let conv = dbService.getConversation(conversationId);
  const activeModel = requestedModel || conv?.model || 'gemini-flash-latest';

  if (!conv) {
    conv = dbService.createConversation(conversationId, message.slice(0, 40), activeModel);
  } else if (requestedModel && requestedModel !== conv.model) {
    // Persist model switch for the conversation
    dbService.updateConversation(conversationId, { model: requestedModel });
  }

  const modelInfo = ModelRegistry.getModel(activeModel);
  if (!modelInfo) {
    return res.status(400).json({ error: `Selected model '${activeModel}' is not supported.` });
  }

  // Save user message to database
  const userMsgId = crypto.randomUUID();
  dbService.addMessage({
    id: userMsgId,
    conversation_id: conversationId,
    role: 'user',
    content: message,
    attachments: attachments || null,
  });

  // Load message history for context (exclude empty error messages)
  const historyRecords = dbService.listMessages(conversationId);
  const history: ChatMessage[] = [];

  const previousRecords = historyRecords.slice(0, -1);
  for (const r of previousRecords) {
    if ((r.role === 'user' || r.role === 'assistant') && r.content.trim()) {
      history.push({
        role: r.role,
        content: r.content,
      });
    }
  }

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const sendSSE = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const assistantMsgId = crypto.randomUUID();
  sendSSE({
    type: 'init',
    userMessageId: userMsgId,
    assistantMessageId: assistantMsgId,
    model: activeModel,
    provider: modelInfo.provider,
  });

  let fullAssistantText = '';
  let finalToolCalls: any[] = [];
  let streamHasError = false;

  try {
    const result = await AgentCoordinator.run({
      modelId: activeModel,
      conversationId,
      userMessage: message,
      history,
      enableWeb,
      enableGmail,
      onToolEvent: (event) => {
        sendSSE({ type: 'tool_event', event });
      },
      callbacks: {
        onToken: (token) => {
          fullAssistantText += token;
          sendSSE({ type: 'token', token });
        },
        onDone: (text) => {
          fullAssistantText = text;
        },
        onError: (err) => {
          streamHasError = true;
          sendSSE({ type: 'error', error: err.message || 'Stream generation failed' });
        },
      },
    });

    finalToolCalls = result.toolCalls;

    if (!fullAssistantText.trim() && streamHasError) {
      throw new Error(`The model '${modelInfo.name}' did not return any tokens.`);
    }

    // Generate 3 intelligent follow-up questions related to the generated answer
    let suggestedQuestions: string[] = [];
    if (fullAssistantText.trim().length > 10) {
      try {
        suggestedQuestions = await QuestionSuggester.suggest(message, fullAssistantText, activeModel);
      } catch (err: any) {
        console.warn('Suggested questions generation warning:', err.message);
      }
    }

    // Save assistant message to database
    dbService.addMessage({
      id: assistantMsgId,
      conversation_id: conversationId,
      role: 'assistant',
      content: fullAssistantText,
      model_used: activeModel,
      provider_used: modelInfo.provider,
      tool_calls: finalToolCalls.length > 0 ? finalToolCalls : null,
      suggested_questions: suggestedQuestions.length > 0 ? suggestedQuestions : null,
    });

    sendSSE({
      type: 'done',
      messageId: assistantMsgId,
      content: fullAssistantText,
      model_used: activeModel,
      provider_used: modelInfo.provider,
      tool_calls: finalToolCalls,
      suggested_questions: suggestedQuestions,
    });

    res.end();
  } catch (err: any) {
    console.error('Chat stream error:', err.message);

    const providerName = modelInfo?.provider ? modelInfo.provider.toUpperCase() : 'AI Model';
    const friendlyError = `⚠️ **${providerName} (${modelInfo.name}) Error:** ${err.message || 'An error occurred during response generation'}\n\n*Tip: You can switch to another connected provider (such as Google Gemini or Anthropic Claude) using the model dropdown at the top.*`;

    // Save informative error message to DB so bubbles are never empty
    dbService.addMessage({
      id: assistantMsgId,
      conversation_id: conversationId,
      role: 'assistant',
      content: friendlyError,
      model_used: activeModel,
      provider_used: modelInfo.provider,
      tool_calls: finalToolCalls.length > 0 ? finalToolCalls : null,
    });

    sendSSE({
      type: 'error',
      error: friendlyError,
      assistantMessageId: assistantMsgId,
    });

    res.end();
  }
});
