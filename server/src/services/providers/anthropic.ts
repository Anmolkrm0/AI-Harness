import Anthropic from '@anthropic-ai/sdk';
import { ChatMessage, ProviderStreamOptions, ServiceTestResult } from './types.js';

export class AnthropicService {
  /**
   * Resolves model ID with alias fallback
   */
  private static resolveModel(modelId: string): string {
    const aliasMap: Record<string, string> = {
      'claude-3-7-sonnet-20250219': 'claude-sonnet-5-5',
      'claude-3-5-sonnet-20241022': 'claude-sonnet-4-5-20250929',
      'claude-3-5-haiku-20241022': 'claude-haiku-4-5-20251001',
      'claude-3-haiku-20240307': 'claude-haiku-4-5-20251001',
    };
    return aliasMap[modelId] || modelId;
  }

  static async stream(apiKey: string, options: ProviderStreamOptions): Promise<void> {
    const anthropic = new Anthropic({ apiKey });
    const targetModel = this.resolveModel(options.modelId);

    // Format messages for Anthropic: must alternate or be merged, system is passed separately
    const anthropicMessages: Anthropic.MessageParam[] = [];
    let systemPrompt = options.systemPrompt || '';

    for (const msg of options.messages) {
      if (msg.role === 'system') {
        systemPrompt += (systemPrompt ? '\n\n' : '') + msg.content;
      } else {
        const lastMsg = anthropicMessages[anthropicMessages.length - 1];
        if (lastMsg && lastMsg.role === msg.role) {
          lastMsg.content = `${lastMsg.content}\n\n${msg.content}`;
        } else {
          anthropicMessages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content,
          });
        }
      }
    }

    if (anthropicMessages.length === 0) {
      anthropicMessages.push({ role: 'user', content: 'Hello' });
    } else if (anthropicMessages[0].role !== 'user') {
      anthropicMessages.unshift({ role: 'user', content: 'Continuing previous conversation:' });
    }

    try {
      const isNewModel = targetModel.includes('-5') || targetModel.includes('-4-6') || targetModel.includes('-4-7') || targetModel.includes('-4-8');

      const stream = await anthropic.messages.stream({
        model: targetModel,
        max_tokens: options.maxTokens ?? 4096,
        ...(isNewModel ? {} : { temperature: options.temperature ?? 0.7 }),
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: anthropicMessages,
      });

      let fullText = '';
      stream.on('text', (delta) => {
        fullText += delta;
        options.callbacks.onToken(delta);
      });

      await stream.finalMessage();
      options.callbacks.onDone(fullText);
    } catch (err: any) {
      options.callbacks.onError(err);
      throw err;
    }
  }

  static async testConnection(apiKey: string): Promise<ServiceTestResult> {
    const start = Date.now();
    try {
      const anthropic = new Anthropic({ apiKey });
      await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'ping' }],
      });
      const latencyMs = Date.now() - start;
      return {
        service: 'anthropic',
        success: true,
        message: 'Successfully connected to Anthropic API (Claude models active).',
        latencyMs,
      };
    } catch (err: any) {
      return {
        service: 'anthropic',
        success: false,
        message: err?.message || 'Failed to authenticate with Anthropic API key.',
        latencyMs: Date.now() - start,
      };
    }
  }
}
