import { dbService } from '../../db/index.js';
import { ModelInfo, ProviderStreamOptions, SUPPORTED_MODELS } from './types.js';
import { OpenAIService } from './openai.js';
import { AnthropicService } from './anthropic.js';
import { GeminiService } from './gemini.js';
import { XAIService } from './xai.js';

export class ModelRegistry {
  static getModel(modelId: string): ModelInfo | undefined {
    const direct = SUPPORTED_MODELS.find((m) => m.id === modelId);
    if (direct) return direct;

    const aliases: Record<string, string> = {
      'gemini-2.5-flash': 'gemini-flash-latest',
      'gemini-2.0-flash': 'gemini-flash-latest',
      'gemini-2.5-pro': 'gemini-3.1-pro-preview',
      'gemini-1.5-flash': 'gemini-flash-latest',
      'gemini-1.5-pro': 'gemini-3.1-pro-preview',
      'claude-3-7-sonnet-20250219': 'claude-sonnet-5-5',
      'claude-3-5-sonnet-20241022': 'claude-sonnet-4-5-20250929',
      'claude-3-5-haiku-20241022': 'claude-haiku-4-5-20251001',
      'claude-3-haiku-20240307': 'claude-haiku-4-5-20251001',
    };
    const targetId = aliases[modelId];
    if (targetId) {
      return SUPPORTED_MODELS.find((m) => m.id === targetId);
    }
    return undefined;
  }

  static getAvailableModels(): (ModelInfo & { isConfigured: boolean })[] {
    const settings = dbService.getAllSettings();
    return SUPPORTED_MODELS.map((model) => {
      let isConfigured = false;
      if (model.provider === 'openai' && settings.openai_key) isConfigured = true;
      if (model.provider === 'anthropic' && settings.anthropic_key) isConfigured = true;
      if (model.provider === 'gemini' && settings.gemini_key) isConfigured = true;
      if (model.provider === 'xai' && settings.xai_key) isConfigured = true;
      return {
        ...model,
        isConfigured,
      };
    });
  }

  static getProviderKey(provider: string): string | null {
    switch (provider) {
      case 'openai':
        return dbService.getSetting('openai_key');
      case 'anthropic':
        return dbService.getSetting('anthropic_key');
      case 'gemini':
        return dbService.getSetting('gemini_key');
      case 'xai':
        return dbService.getSetting('xai_key');
      default:
        return null;
    }
  }

  static async streamResponse(options: ProviderStreamOptions): Promise<void> {
    const model = this.getModel(options.modelId);
    if (!model) {
      throw new Error(`Model '${options.modelId}' is not supported. Please select a valid model.`);
    }

    const apiKey = this.getProviderKey(model.provider);
    if (!apiKey) {
      throw new Error(
        `API key for ${model.provider.toUpperCase()} is not configured. Please open Settings and add your API key.`
      );
    }

    // Call provider with resolved model
    const resolvedOptions = { ...options, modelId: model.id };

    switch (model.provider) {
      case 'openai':
        return OpenAIService.stream(apiKey, resolvedOptions);
      case 'anthropic':
        return AnthropicService.stream(apiKey, resolvedOptions);
      case 'gemini':
        return GeminiService.stream(apiKey, resolvedOptions);
      case 'xai':
        return XAIService.stream(apiKey, resolvedOptions);
      default:
        throw new Error(`Unsupported provider: ${model.provider}`);
    }
  }
}
