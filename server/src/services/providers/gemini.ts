import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import { ProviderStreamOptions, ServiceTestResult } from './types.js';

export class GeminiService {
  /**
   * Resolves model ID with alias fallback
   */
  private static resolveModel(modelId: string): string {
    const aliasMap: Record<string, string> = {
      'gemini-2.5-flash': 'gemini-3.5-flash',
      'gemini-2.0-flash': 'gemini-3.5-flash',
      'gemini-flash-latest': 'gemini-3.5-flash',
      'gemini-2.5-pro': 'gemini-3.1-pro-preview',
      'gemini-1.5-flash': 'gemini-3.5-flash',
      'gemini-1.5-pro': 'gemini-3.1-pro-preview',
    };
    return aliasMap[modelId] || modelId;
  }

  static async stream(apiKey: string, options: ProviderStreamOptions): Promise<void> {
    const genAI = new GoogleGenerativeAI(apiKey);
    let targetModel = this.resolveModel(options.modelId);

    const contents: Content[] = [];
    for (const msg of options.messages) {
      if (msg.role === 'system') continue;
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    }

    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
    }

    const tryStreamWithModel = async (modelName: string): Promise<string> => {
      const model = genAI.getGenerativeModel({
        model: modelName,
        ...(options.systemPrompt ? { systemInstruction: options.systemPrompt } : {}),
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 4096,
        },
      });

      const responseStream = await model.generateContentStream({ contents });
      let fullText = '';
      for await (const chunk of responseStream.stream) {
        const text = chunk.text();
        if (text) {
          fullText += text;
          options.callbacks.onToken(text);
        }
      }
      return fullText;
    };

    try {
      const fullText = await tryStreamWithModel(targetModel);
      options.callbacks.onDone(fullText);
    } catch (err: any) {
      // If 503 high demand or 404, fallback to gemini-3.5-flash
      if (targetModel !== 'gemini-3.5-flash' && (err.message?.includes('503') || err.message?.includes('404'))) {
        try {
          const fallbackText = await tryStreamWithModel('gemini-3.5-flash');
          options.callbacks.onDone(fallbackText);
          return;
        } catch (fallbackErr: any) {
          options.callbacks.onError(fallbackErr);
          throw fallbackErr;
        }
      }
      options.callbacks.onError(err);
      throw err;
    }
  }

  static async testConnection(apiKey: string): Promise<ServiceTestResult> {
    const start = Date.now();
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
      await model.generateContent('ping');
      const latencyMs = Date.now() - start;
      return {
        service: 'gemini',
        success: true,
        message: 'Successfully connected to Google Gemini API (gemini-3.5-flash active).',
        latencyMs,
      };
    } catch (err: any) {
      return {
        service: 'gemini',
        success: false,
        message: err?.message || 'Failed to authenticate with Google Gemini API key.',
        latencyMs: Date.now() - start,
      };
    }
  }
}
