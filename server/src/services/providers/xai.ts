import OpenAI from 'openai';
import { ProviderStreamOptions, ServiceTestResult } from './types.js';

export class XAIService {
  private static getClient(apiKey: string) {
    return new OpenAI({
      apiKey,
      baseURL: 'https://api.x.ai/v1',
    });
  }

  static async stream(apiKey: string, options: ProviderStreamOptions): Promise<void> {
    const client = this.getClient(apiKey);

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
      const stream = await client.chat.completions.create({
        model: options.modelId,
        messages: formattedMessages,
        stream: true,
        temperature: options.temperature ?? 0.7,
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
      const client = this.getClient(apiKey);
      const res = await client.models.list();
      const latencyMs = Date.now() - start;
      const count = res.data?.length || 0;
      return {
        service: 'xai',
        success: true,
        message: `Successfully connected to xAI Grok API (${count} models detected).`,
        latencyMs,
      };
    } catch (err: any) {
      return {
        service: 'xai',
        success: false,
        message: err?.message || 'Failed to authenticate with xAI API key.',
        latencyMs: Date.now() - start,
      };
    }
  }
}
