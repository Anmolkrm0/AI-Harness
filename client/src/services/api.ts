import {
  Conversation,
  DocumentRecord,
  Message,
  ModelInfo,
  ServiceTestResult,
  SettingsResponse,
  ToolEvent,
  JudgeEvaluation,
  User,
  AuthResponse,
} from '../types';

const TOKEN_KEY = 'ai_harness_token';

export const tokenStorage = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string): void => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.error('Failed to save token to localStorage:', e);
    }
  },
  clear: (): void => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.error('Failed to clear token from localStorage:', e);
    }
  },
};

function authHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const token = tokenStorage.get();
  if (token) {
    return { ...headers, Authorization: `Bearer ${token}` };
  }
  return headers;
}

export const api = {
  // Authentication
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(err.error || 'Login failed');
    }
    const data: AuthResponse = await res.json();
    tokenStorage.set(data.token);
    return data;
  },

  async register(email: string, password: string, name?: string): Promise<AuthResponse> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(err.error || 'Registration failed');
    }
    const data: AuthResponse = await res.json();
    tokenStorage.set(data.token);
    return data;
  },

  async getCurrentUser(): Promise<User | null> {
    const token = tokenStorage.get();
    if (!token) return null;
    try {
      const res = await fetch('/api/auth/me', {
        headers: authHeaders(),
      });
      if (!res.ok) {
        tokenStorage.clear();
        return null;
      }
      const data = await res.json();
      return data.user;
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: authHeaders(),
      });
    } catch (e) {
      console.warn('Logout endpoint warning:', e);
    } finally {
      tokenStorage.clear();
    }
  },

  // Settings
  async getSettings(): Promise<SettingsResponse> {
    const res = await fetch('/api/settings', {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async saveSettings(data: Record<string, any>): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to save settings');
    return res.json();
  },

  async testConnection(service: string, credentials?: Record<string, any>): Promise<ServiceTestResult> {
    const res = await fetch('/api/settings/test', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ service, credentials }),
    });
    if (!res.ok) throw new Error('Failed to run connection test');
    return res.json();
  },

  async getModels(): Promise<ModelInfo[]> {
    const res = await fetch('/api/settings/models', {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch models');
    return res.json();
  },

  // Conversations
  async getConversations(): Promise<Conversation[]> {
    const res = await fetch('/api/conversations', {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch conversations');
    return res.json();
  },

  async createConversation(title?: string, model?: string): Promise<Conversation> {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ title, model }),
    });
    if (!res.ok) throw new Error('Failed to create conversation');
    return res.json();
  },

  async getConversation(id: string): Promise<{ conversation: Conversation; messages: Message[]; documents: DocumentRecord[] }> {
    const res = await fetch(`/api/conversations/${id}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch conversation details');
    return res.json();
  },

  async updateConversation(id: string, updates: { title?: string; model?: string }): Promise<Conversation> {
    const res = await fetch(`/api/conversations/${id}`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update conversation');
    return res.json();
  },

  async deleteConversation(id: string): Promise<void> {
    const res = await fetch(`/api/conversations/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete conversation');
  },

  // Documents
  async uploadDocument(file: File, conversationId?: string): Promise<{ success: boolean; document: DocumentRecord }> {
    const formData = new FormData();
    formData.append('file', file);
    if (conversationId) formData.append('conversationId', conversationId);

    const token = tokenStorage.get();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Upload failed');
    }
    return res.json();
  },

  async getDocuments(conversationId?: string): Promise<DocumentRecord[]> {
    const url = conversationId ? `/api/documents?conversationId=${encodeURIComponent(conversationId)}` : '/api/documents';
    const res = await fetch(url, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async deleteDocument(id: string): Promise<void> {
    const res = await fetch(`/api/documents/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete document');
  },

  // SSE Chat Stream
  async streamChat(
    options: {
      conversationId: string;
      message: string;
      model: string;
      enableWeb?: boolean;
      enableGmail?: boolean;
      enableJudge?: boolean;
      attachments?: any[];
    },
    callbacks: {
      onInit?: (data: { userMessageId: string; assistantMessageId: string; model: string; provider: string }) => void;
      onToolEvent?: (event: ToolEvent) => void;
      onToken?: (token: string) => void;
      onDone?: (data: {
        messageId: string;
        content: string;
        model_used: string;
        provider_used: string;
        tool_calls: any[];
        suggested_questions?: string[];
        judge_evaluation?: JudgeEvaluation;
      }) => void;
      onError?: (error: string) => void;
    },
    signal?: AbortSignal
  ): Promise<void> {
    const res = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(options),
      signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Chat stream failed' }));
      throw new Error(err.error || `HTTP error ${res.status}`);
    }

    if (!res.body) throw new Error('No readable response body received');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const rawData = trimmed.slice(6);
          try {
            const data = JSON.parse(rawData);
            if (data.type === 'init') {
              callbacks.onInit?.(data);
            } else if (data.type === 'tool_event') {
              callbacks.onToolEvent?.(data.event);
            } else if (data.type === 'token') {
              callbacks.onToken?.(data.token);
            } else if (data.type === 'done') {
              callbacks.onDone?.(data);
            } else if (data.type === 'error') {
              callbacks.onError?.(data.error);
            }
          } catch (e) {
            console.warn('Failed to parse SSE line:', trimmed, e);
          }
        }
      }
    }
  },

  // LLM as a Judge
  async evaluateMessage(
    messageId: string,
    conversationId: string,
    judgeModel?: string
  ): Promise<{ success: boolean; evaluation: JudgeEvaluation }> {
    const res = await fetch('/api/chat/evaluate', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ messageId, conversationId, judgeModel }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Evaluation failed' }));
      throw new Error(err.error || 'Evaluation failed');
    }
    return res.json();
  },

  async improveMessage(
    messageId: string,
    conversationId: string,
    targetModel?: string
  ): Promise<{ success: boolean; improvedContent: string; judge_evaluation: JudgeEvaluation }> {
    const res = await fetch('/api/chat/improve', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ messageId, conversationId, targetModel }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Improvement failed' }));
      throw new Error(err.error || 'Improvement failed');
    }
    return res.json();
  },
};
