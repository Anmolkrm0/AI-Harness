export type ProviderType = 'openai' | 'anthropic' | 'gemini' | 'xai';

export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderType;
  description: string;
  contextWindow?: number;
  supportsVision?: boolean;
  isConfigured?: boolean;
}

export interface ServiceStatus {
  openai: { isConfigured: boolean; maskedKey: string };
  anthropic: { isConfigured: boolean; maskedKey: string };
  gemini: { isConfigured: boolean; maskedKey: string };
  xai: { isConfigured: boolean; maskedKey: string };
  tavily: { isConfigured: boolean; maskedKey: string };
  gmail: {
    isConfigured: boolean;
    user: string;
    maskedPass: string;
    host: string;
    port: string;
  };
}

export interface SettingsResponse {
  status: ServiceStatus;
  hasAnyModelConfigured: boolean;
}

export interface ServiceTestResult {
  service: string;
  success: boolean;
  message: string;
  latencyMs?: number;
}

export interface Attachment {
  id: string;
  filename: string;
  mime_type: string;
  size: number;
}

export interface ToolCall {
  tool: string;
  count?: number;
  query?: string;
  resultsCount?: number;
  sources?: any[];
  emails?: any[];
}

export interface MetricEvaluation {
  score: number; // 1 to 10
  status: 'passed' | 'warning' | 'failed';
  comment: string;
}

export interface JudgeEvaluation {
  overallScore: number;
  verdict: 'Excellent' | 'Good' | 'Needs Improvement' | 'Critical Flaws';
  judgeModel: string;
  summary: string;
  metrics: {
    accuracy: MetricEvaluation;
    relevance: MetricEvaluation;
    completeness: MetricEvaluation;
    hallucination: MetricEvaluation;
    tone: MetricEvaluation;
    citationQuality: MetricEvaluation;
  };
  critique: string;
  suggestedImprovements: string[];
  evaluatedAt: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_used?: string | null;
  provider_used?: string | null;
  tool_calls?: ToolCall[] | null;
  attachments?: Attachment[] | null;
  suggested_questions?: string[] | null;
  judge_evaluation?: JudgeEvaluation | null;
  created_at: number;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  created_at: number;
  updated_at: number;
}

export interface DocumentRecord {
  id: string;
  conversation_id?: string | null;
  filename: string;
  mime_type: string;
  size: number;
  file_path: string;
  text_content?: string | null;
  chunk_count: number;
  created_at: number;
}

export interface ToolEvent {
  type: 'rag' | 'tavily' | 'gmail';
  status: 'searching' | 'completed' | 'skipped' | 'error';
  title: string;
  data?: any;
}
