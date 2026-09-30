import { ServiceTestResult } from '../providers/types.js';

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilyResponse {
  query: string;
  answer?: string;
  results: TavilySearchResult[];
}

export class TavilyService {
  static async search(apiKey: string, query: string, maxResults = 5): Promise<TavilyResponse> {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: maxResults,
        include_answer: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Tavily search failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return {
      query,
      answer: data.answer,
      results: (data.results || []).map((r: any) => ({
        title: r.title || 'Untitled',
        url: r.url,
        content: r.content || '',
        score: r.score || 0,
      })),
    };
  }

  static formatForPrompt(response: TavilyResponse): string {
    let out = `### Web Search Results for: "${response.query}"\n\n`;
    if (response.answer) {
      out += `Direct Answer Summary: ${response.answer}\n\n`;
    }
    out += `Sources:\n`;
    response.results.forEach((item, i) => {
      out += `[${i + 1}] "${item.title}" (${item.url})\n${item.content}\n\n`;
    });
    return out;
  }

  static async testConnection(apiKey: string): Promise<ServiceTestResult> {
    const start = Date.now();
    try {
      const result = await this.search(apiKey, 'AI news today', 1);
      const latencyMs = Date.now() - start;
      return {
        service: 'tavily',
        success: true,
        message: `Successfully connected to Tavily Web Search. Found ${result.results.length} result(s).`,
        latencyMs,
      };
    } catch (err: any) {
      return {
        service: 'tavily',
        success: false,
        message: err?.message || 'Failed to authenticate with Tavily API key.',
        latencyMs: Date.now() - start,
      };
    }
  }
}
