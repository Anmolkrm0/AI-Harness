import { OpenAIService } from './providers/openai.js';
import { AnthropicService } from './providers/anthropic.js';
import { GeminiService } from './providers/gemini.js';
import { XAIService } from './providers/xai.js';
import { TavilyService } from './tools/tavily.js';
import { GmailService, GmailCredentials } from './tools/gmail.js';
import { ServiceTestResult } from './providers/types.js';

export class ConnectionTester {
  static async testService(service: string, credentials: Record<string, any>): Promise<ServiceTestResult> {
    switch (service) {
      case 'openai':
        if (!credentials.apiKey) throw new Error('OpenAI API key is required.');
        return OpenAIService.testConnection(credentials.apiKey);

      case 'anthropic':
        if (!credentials.apiKey) throw new Error('Anthropic API key is required.');
        return AnthropicService.testConnection(credentials.apiKey);

      case 'gemini':
        if (!credentials.apiKey) throw new Error('Google Gemini API key is required.');
        return GeminiService.testConnection(credentials.apiKey);

      case 'xai':
        if (!credentials.apiKey) throw new Error('xAI API key is required.');
        return XAIService.testConnection(credentials.apiKey);

      case 'tavily':
        if (!credentials.apiKey) throw new Error('Tavily API key is required.');
        return TavilyService.testConnection(credentials.apiKey);

      case 'gmail': {
        const creds: GmailCredentials = {
          user: credentials.user,
          pass: credentials.pass,
          host: credentials.host || 'imap.gmail.com',
          port: Number(credentials.port) || 993,
        };
        if (!creds.user || !creds.pass) {
          throw new Error('Gmail email and app password are required.');
        }
        return GmailService.testConnection(creds);
      }

      default:
        throw new Error(`Unknown service: ${service}`);
    }
  }
}
