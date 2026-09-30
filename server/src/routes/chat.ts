import { Router } from 'express';
import crypto from 'crypto';
import { dbService } from '../db/index.js';
import { AgentCoordinator } from '../services/tools/agent.js';
import { ModelRegistry } from '../services/providers/registry.js';
import { ChatMessage } from '../services/providers/types.js';
import { QuestionSuggester } from '../services/tools/questionSuggester.js';
import { LLMJudge, JudgeEvaluation } from '../services/tools/judge.js';

export const chatRouter = Router();

chatRouter.post('/stream', async (req, res) => {
  const userId = req.user?.id;
  const { conversationId, message, model: requestedModel, enableWeb, enableGmail, enableJudge, attachments } = req.body;

  if (!conversationId || !message) {
    return res.status(400).json({ error: 'conversationId and message are required' });
  }

  // Ensure conversation belongs to the authenticated user
  const existingConv = dbService.getConversation(conversationId);
  if (existingConv && existingConv.user_id && existingConv.user_id !== userId) {
    return res.status(403).json({ error: 'Access denied: Conversation belongs to another user' });
  }

  let conv = dbService.getConversation(conversationId, userId);
  const activeModel = requestedModel || conv?.model || 'gemini-flash-latest';

  if (!conv) {
    conv = dbService.createConversation(conversationId, message.slice(0, 40), activeModel, userId);
  } else if (requestedModel && requestedModel !== conv.model) {
    // Persist model switch for the conversation
    dbService.updateConversation(conversationId, { model: requestedModel }, userId);
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
      userId,
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
        suggestedQuestions = await QuestionSuggester.suggest(message, fullAssistantText, activeModel, userId);
      } catch (err: any) {
        console.warn('Suggested questions generation warning:', err.message);
      }
    }

    // LLM as a Judge evaluation (if enabled)
    let judgeEvaluation: JudgeEvaluation | null = null;
    if (enableJudge && fullAssistantText.trim().length > 10) {
      try {
        judgeEvaluation = await LLMJudge.evaluate(
          message,
          fullAssistantText,
          { toolsUsed: finalToolCalls, documents: attachments },
          undefined,
          userId
        );
      } catch (err: any) {
        console.warn('Judge evaluation error:', err.message);
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
      judge_evaluation: judgeEvaluation || null,
    });

    sendSSE({
      type: 'done',
      messageId: assistantMsgId,
      content: fullAssistantText,
      model_used: activeModel,
      provider_used: modelInfo.provider,
      tool_calls: finalToolCalls,
      suggested_questions: suggestedQuestions,
      judge_evaluation: judgeEvaluation,
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

// POST /api/chat/evaluate - On-demand evaluation with LLM as a Judge
chatRouter.post('/evaluate', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { messageId, conversationId, judgeModel } = req.body;
    if (!messageId || !conversationId) {
      return res.status(400).json({ error: 'messageId and conversationId are required' });
    }

    const conv = dbService.getConversation(conversationId, userId);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const msg = dbService.getMessage(messageId);
    if (!msg || !msg.content || msg.conversation_id !== conversationId) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Retrieve user prompt for evaluation context
    const history = dbService.listMessages(conversationId);
    const msgIndex = history.findIndex((m) => m.id === messageId);
    let userPrompt = 'General query';
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (history[i].role === 'user') {
        userPrompt = history[i].content;
        break;
      }
    }

    const toolsUsed = msg.tool_calls ? JSON.parse(msg.tool_calls) : [];
    const evaluation = await LLMJudge.evaluate(
      userPrompt,
      msg.content,
      { toolsUsed },
      judgeModel,
      userId
    );

    dbService.updateMessage(messageId, { judge_evaluation: evaluation });

    res.json({ success: true, evaluation });
  } catch (err: any) {
    console.error('Evaluate endpoint error:', err);
    res.status(500).json({ error: err.message || 'Evaluation failed' });
  }
});

// POST /api/chat/improve - Regenerate & improve response using Judge feedback
chatRouter.post('/improve', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { messageId, conversationId, targetModel } = req.body;
    if (!messageId || !conversationId) {
      return res.status(400).json({ error: 'messageId and conversationId are required' });
    }

    const conv = dbService.getConversation(conversationId, userId);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const msg = dbService.getMessage(messageId);
    if (!msg || !msg.content || msg.conversation_id !== conversationId) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const history = dbService.listMessages(conversationId);
    const msgIndex = history.findIndex((m) => m.id === messageId);
    let userPrompt = 'Original query';
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (history[i].role === 'user') {
        userPrompt = history[i].content;
        break;
      }
    }

    let evaluation = msg.judge_evaluation ? JSON.parse(msg.judge_evaluation) : null;
    if (!evaluation) {
      evaluation = await LLMJudge.evaluate(userPrompt, msg.content, undefined, undefined, userId);
    }

    const improvedContent = await LLMJudge.improveResponse(
      userPrompt,
      msg.content,
      evaluation,
      targetModel || msg.model_used || undefined,
      undefined,
      userId
    );

    // Re-evaluate to get an updated scorecard for the improved response
    const newEvaluation = await LLMJudge.evaluate(userPrompt, improvedContent, undefined, undefined, userId);

    dbService.updateMessage(messageId, {
      content: improvedContent,
      judge_evaluation: newEvaluation,
    });

    res.json({
      success: true,
      improvedContent,
      judge_evaluation: newEvaluation,
    });
  } catch (err: any) {
    console.error('Improve endpoint error:', err);
    res.status(500).json({ error: err.message || 'Failed to improve response' });
  }
});
