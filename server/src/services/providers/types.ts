export type ProviderType = 'openai' | 'anthropic' | 'gemini' | 'xai';

export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderType;
  description: string;
  contextWindow?: number;
  supportsVision?: boolean;
}

export const SUPPORTED_MODELS: ModelInfo[] = [
  // Google Gemini (Verified & Active)
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash (Latest)',
    provider: 'gemini',
    description: 'Fastest, highly intelligent Google Gemini flagship',
    contextWindow: 1000000,
    supportsVision: true,
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    provider: 'gemini',
    description: 'Google next-gen 3.5 Flash model with 1M context',
    contextWindow: 1000000,
    supportsVision: true,
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    provider: 'gemini',
    description: 'Google frontier multimodal 3.8 Flash model',
    contextWindow: 1000000,
    supportsVision: true,
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    provider: 'gemini',
    description: 'Google flagship reasoning & code intelligence',
    contextWindow: 2000000,
    supportsVision: true,
  },

  // Anthropic Claude (Verified & Active)
  {
    id: 'claude-sonnet-5-5',
    name: 'Claude Sonnet 5.5',
    provider: 'anthropic',
    description: 'Anthropic state-of-the-art hybrid reasoning & coding model',
    contextWindow: 1000000,
    supportsVision: true,
  },
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    description: 'Ultra-fast, responsive Anthropic Claude model',
    contextWindow: 200000,
    supportsVision: true,
  },
  {
    id: 'claude-opus-5-5',
    name: 'Claude Opus 5.5',
    provider: 'anthropic',
    description: 'Anthropic frontier complex reasoning model',
    contextWindow: 1000000,
    supportsVision: true,
  },
  {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    description: 'Strong general intelligence and code generation',
    contextWindow: 1000000,
    supportsVision: true,
  },

  // OpenAI
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'OpenAI flagship multimodal intelligent model',
    contextWindow: 128000,
    supportsVision: true,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Fast, affordable, lightweight model for everyday tasks',
    contextWindow: 128000,
    supportsVision: true,
  },
  {
    id: 'o3-mini',
    name: 'o3-mini',
    provider: 'openai',
    description: 'Advanced reasoning and problem-solving model',
    contextWindow: 200000,
  },

  // xAI Grok
  {
    id: 'grok-2-1212',
    name: 'Grok 2',
    provider: 'xai',
    description: 'xAI premier frontier model with strong general intelligence',
    contextWindow: 131072,
    supportsVision: true,
  },
  {
    id: 'grok-beta',
    name: 'Grok Beta',
    provider: 'xai',
    description: 'Fast, real-time responsive frontier model from xAI',
    contextWindow: 131072,
  },
];

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
  onError: (err: Error) => void;
}

export interface ProviderStreamOptions {
  modelId: string;
  messages: ChatMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  callbacks: StreamCallbacks;
}

export interface ServiceTestResult {
  service: string;
  success: boolean;
  message: string;
  latencyMs?: number;
}
