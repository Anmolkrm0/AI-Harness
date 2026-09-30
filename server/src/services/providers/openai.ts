import OpenAI from 'openai';
import { ProviderStreamOptions, ServiceTestResult } from './types.js';

export class OpenAIService {
  static async stream(apiKey: string, options: ProviderStreamOptions): Promise<void> {
    const openai = new OpenAI({ apiKey });

    const formattedMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (options.systemPrompt) {
      formattedMessages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    for (const msg of options.messages) {
      if (msg.role === 'system') {
        formattedMessages.push({ role: 'system', content: msg.content });
      } else if (msg.role === 'user') {
        formattedMessages.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'assistant') {
        formattedMessages.push({ role: 'assistant', content: msg.content });
      }
    }

    try {
      const isReasoningModel = options.modelId.startsWith('o1') || options.modelId.startsWith('o3');

      const stream = await openai.chat.completions.create({
        model: options.modelId,
        messages: formattedMessages,
        stream: true,
        ...(isReasoningModel ? {} : { temperature: options.temperature ?? 0.7 }),
        max_tokens: options.maxTokens ?? 4096,
      });

      let fullText = '';
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          fullText += delta;
          options.callbacks.onToken(delta);
        }
      }

      options.callbacks.onDone(fullText);
    } catch (err: any) {
      options.callbacks.onError(err);
      throw err;
    }
  }

  static async testConnection(apiKey: string): Promise<ServiceTestResult> {
    const start = Date.now();
    try {
      const openai = new OpenAI({ apiKey });
      const res = await openai.models.list();
      const latencyMs = Date.now() - start;
      const count = res.data?.length || 0;
      return {
        service: 'openai',
        success: true,
        message: `Successfully connected to OpenAI (${count} models available).`,
        latencyMs,
      };
    } catch (err: any) {
      return {
        service: 'openai',
        success: false,
        message: err?.message || 'Failed to authenticate with OpenAI API key.',
        latencyMs: Date.now() - start,
      };
    }
  }
}
