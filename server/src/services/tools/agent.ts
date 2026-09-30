import { dbService } from '../../db/index.js';
import { VectorStore, SearchResult } from '../rag/vectorStore.js';
import { TavilyService, TavilyResponse } from './tavily.js';
import { GmailService, EmailSummary } from './gmail.js';
import { ChatMessage, StreamCallbacks } from '../providers/types.js';
import { ModelRegistry } from '../providers/registry.js';

export interface AgentContextEvent {
  type: 'rag' | 'tavily' | 'gmail';
  status: 'searching' | 'completed' | 'skipped' | 'error';
  title: string;
  data?: any;
}

export interface AgentRunOptions {
  modelId: string;
  conversationId: string;
  userId?: string;
  userMessage: string;
  history: ChatMessage[];
  enableWeb?: boolean;
  enableGmail?: boolean;
  onToolEvent?: (event: AgentContextEvent) => void;
  callbacks: StreamCallbacks;
}

export class AgentCoordinator {
  /**
   * Intelligently discovers whether web search is needed
   */
  private static shouldSearchWeb(prompt: string, forceEnabled?: boolean): boolean {
    if (forceEnabled === true) return true;
    if (forceEnabled === false) return false;

    const lower = prompt.toLowerCase();
    const searchKeywords = [
      'search web', 'search the internet', 'latest news', 'today', 'current price',
      'weather', 'browse web', 'google this', 'tavily', 'who is currently', 'recent events'
    ];
    return searchKeywords.some((kw) => lower.includes(kw));
  }

  /**
   * Intelligently discovers whether Gmail search is needed
   */
  private static shouldSearchGmail(prompt: string, forceEnabled?: boolean): boolean {
    if (forceEnabled === true) return true;
    if (forceEnabled === false) return false;

    const lower = prompt.toLowerCase();
    const emailKeywords = [
      'email', 'emails', 'inbox', 'gmail', 'mail from', 'unread messages',
      'flight confirmation', 'receipt in my mail', 'invitation email'
    ];
    return emailKeywords.some((kw) => lower.includes(kw));
  }

  static async run(options: AgentRunOptions): Promise<{ toolCalls: any[] }> {
    const executedTools: any[] = [];
    let systemContext = `You are a helpful, versatile, and precise AI assistant powered by a unified multi-model harness.
You have access to conversation history, uploaded documents via built-in RAG, real-time internet search via Tavily, and Gmail inbox access via IMAP.
When using external sources, cite them clearly and provide well-structured, actionable answers.\n\n`;

    // 1. Check Document RAG (isolated by userId)
    try {
      const ragResults = await VectorStore.search(options.userMessage, options.conversationId, 5, options.userId);
      if (ragResults.length > 0) {
        options.onToolEvent?.({
          type: 'rag',
          status: 'completed',
          title: `Retrieved ${ragResults.length} relevant excerpt(s) from uploaded documents`,
          data: ragResults.map((r) => ({
            filename: r.filename,
            score: Math.round(r.score * 100),
            snippet: r.content.slice(0, 150) + '...',
          })),
        });

        executedTools.push({
          tool: 'rag',
          count: ragResults.length,
          sources: ragResults.map((r) => r.filename),
        });

        systemContext += `### Uploaded Document Context:\n`;
        ragResults.forEach((r, idx) => {
          systemContext += `[Doc ${idx + 1}: ${r.filename}]\n${r.content}\n\n`;
        });
      }
    } catch (err: any) {
      console.warn('RAG search error:', err.message);
    }

    // 2. Check Tavily Web Search (using authenticated user's key)
    const tavilyKey = options.userId ? dbService.getUserSetting(options.userId, 'tavily_key') : dbService.getSetting('tavily_key');
    if (tavilyKey && this.shouldSearchWeb(options.userMessage, options.enableWeb)) {
      try {
        options.onToolEvent?.({
          type: 'tavily',
          status: 'searching',
          title: `Searching the web with Tavily for: "${options.userMessage}"`,
        });

        const webResult: TavilyResponse = await TavilyService.search(tavilyKey, options.userMessage, 5);

        options.onToolEvent?.({
          type: 'tavily',
          status: 'completed',
          title: `Found ${webResult.results.length} web sources`,
          data: webResult.results,
        });

        executedTools.push({
          tool: 'tavily',
          query: options.userMessage,
          resultsCount: webResult.results.length,
          sources: webResult.results.map((r) => ({ title: r.title, url: r.url })),
        });

        systemContext += TavilyService.formatForPrompt(webResult);
      } catch (err: any) {
        options.onToolEvent?.({
          type: 'tavily',
          status: 'error',
          title: `Web search error: ${err.message}`,
        });
      }
    }

    // 3. Check Gmail Search (using authenticated user's credentials)
    const gmailUser = options.userId ? dbService.getUserSetting(options.userId, 'gmail_user') : dbService.getSetting('gmail_user');
    const gmailPass = options.userId ? dbService.getUserSetting(options.userId, 'gmail_pass') : dbService.getSetting('gmail_pass');
    const gmailHost = (options.userId ? dbService.getUserSetting(options.userId, 'gmail_host') : dbService.getSetting('gmail_host')) || 'imap.gmail.com';
    const gmailPort = Number((options.userId ? dbService.getUserSetting(options.userId, 'gmail_port') : dbService.getSetting('gmail_port')) || 993);

    if (gmailUser && gmailPass && this.shouldSearchGmail(options.userMessage, options.enableGmail)) {
      try {
        options.onToolEvent?.({
          type: 'gmail',
          status: 'searching',
          title: 'Accessing Gmail inbox via IMAP...',
        });

        const emails: EmailSummary[] = await GmailService.searchEmails(
          {
            user: gmailUser,
            pass: gmailPass,
            host: gmailHost,
            port: gmailPort,
          },
          options.userMessage,
          5
        );

        options.onToolEvent?.({
          type: 'gmail',
          status: 'completed',
          title: `Found ${emails.length} relevant email(s)`,
          data: emails.map((e) => ({ subject: e.subject, from: e.from, date: e.date })),
        });

        executedTools.push({
          tool: 'gmail',
          count: emails.length,
          emails: emails.map((e) => ({ subject: e.subject, from: e.from })),
        });

        systemContext += GmailService.formatForPrompt(emails);
      } catch (err: any) {
        options.onToolEvent?.({
          type: 'gmail',
          status: 'error',
          title: `Gmail search error: ${err.message}`,
        });
      }
    }

    // Combine history with latest user message
    const messagesToSend: ChatMessage[] = [
      ...options.history,
      { role: 'user', content: options.userMessage },
    ];

    // Stream LLM response using authenticated user's personal API credentials
    await ModelRegistry.streamResponse({
      modelId: options.modelId,
      messages: messagesToSend,
      systemPrompt: systemContext,
      callbacks: options.callbacks,
      userId: options.userId,
    });

    return { toolCalls: executedTools };
  }
}
