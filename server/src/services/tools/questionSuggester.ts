import { ModelRegistry } from '../providers/registry.js';

export class QuestionSuggester {
  /**
   * Generates 3 intelligent, highly relevant follow-up questions based on the conversation
   */
  static async suggest(
    userMessage: string,
    assistantAnswer: string,
    modelId?: string
  ): Promise<string[]> {
    if (!assistantAnswer || assistantAnswer.trim().length < 10) {
      return [];
    }

    // Try generating with LLM within 2.5 seconds
    try {
      const llmQuestions = await this.generateViaLLM(userMessage, assistantAnswer, modelId);
      if (llmQuestions && llmQuestions.length === 3) {
        return llmQuestions;
      }
    } catch (_) {
      // Fall through to contextual fallback
    }

    return this.generateContextualFallback(userMessage, assistantAnswer);
  }

  private static async generateViaLLM(
    userMessage: string,
    assistantAnswer: string,
    modelId?: string
  ): Promise<string[] | null> {
    const prompt = `Based on the following user message and assistant answer, suggest exactly 3 natural, concise follow-up questions the user might ask next.
Respond ONLY with a JSON array of 3 strings (e.g. ["Question 1?", "Question 2?", "Question 3?"]). Do not include markdown codeblocks or any additional explanation.

User: ${userMessage.slice(0, 500)}
Assistant: ${assistantAnswer.slice(0, 1500)}`;

    const available = ModelRegistry.getAvailableModels();
    const targetModel = available.find((m) => m.id === (modelId || 'gemini-flash-latest') && m.isConfigured);
    const configuredModel = targetModel || available.find((m) => m.isConfigured);
    if (!configuredModel) return null;

    const effectiveModelId = configuredModel.id;

    return new Promise<string[] | null>((resolve) => {
      const timeout = setTimeout(() => resolve(null), 2500);

      let fullText = '';
      ModelRegistry.streamResponse({
        modelId: effectiveModelId,
        messages: [{ role: 'user', content: prompt }],
        systemPrompt: 'You are an AI assistant that suggests next questions in strict JSON format.',
        callbacks: {
          onToken: (token) => {
            fullText += token;
          },
          onDone: (text) => {
            clearTimeout(timeout);
            try {
              const cleaned = (text || fullText).replace(/```json/gi, '').replace(/```/g, '').trim();
              const parsed = JSON.parse(cleaned);
              if (Array.isArray(parsed) && parsed.length >= 3) {
                resolve(parsed.slice(0, 3).map((q: any) => String(q).trim()));
                return;
              }
            } catch (_) {}
            resolve(null);
          },
          onError: () => {
            clearTimeout(timeout);
            resolve(null);
          },
        },
      }).catch(() => {
        clearTimeout(timeout);
        resolve(null);
      });
    });
  }

  private static generateContextualFallback(userMessage: string, assistantAnswer: string): string[] {
    const u = userMessage.toLowerCase();
    const a = assistantAnswer.toLowerCase();

    // 1. Gmail / Email inquiries
    if (u.includes('email') || u.includes('gmail') || u.includes('inbox') || a.includes('subject:')) {
      return [
        'Would you like me to draft a quick reply to any of these emails?',
        'Search for messages from a specific sender or topic?',
        'Check if there are any urgent unread emails?'
      ];
    }

    // 2. Web Search / News / Breakthroughs
    if (u.includes('search') || u.includes('news') || u.includes('latest') || u.includes('breakthrough') || a.includes('http')) {
      return [
        'Can you provide more details about the primary source mentioned?',
        'What are the key industry reactions or expert opinions on this?',
        'Search for related recent developments or alternative views?'
      ];
    }

    // 3. Document / PRD / RAG
    if (u.includes('document') || u.includes('pdf') || u.includes('file') || u.includes('summarize this document') || a.includes('chunk')) {
      return [
        'What are the most critical action items or next steps in this document?',
        'Can you extract all data points and tables into a clean summary?',
        'Are there any risks, warnings, or missing details identified?'
      ];
    }

    // 4. Code / Programming / Bugs
    if (u.includes('code') || u.includes('function') || u.includes('bug') || u.includes('react') || u.includes('python') || u.includes('typescript') || a.includes('```')) {
      return [
        'How would you handle edge cases and error handling for this?',
        'Can you show a complete code example with tests?',
        'What are the performance or security considerations for this approach?'
      ];
    }

    // 5. Comparison (vs / compare / difference)
    if (u.includes('vs') || u.includes('compare') || u.includes('difference') || u.includes('pros and cons')) {
      return [
        'Which option is best suited for production scalability?',
        'What are the cost and maintenance differences between them?',
        'Can you provide a side-by-side feature comparison table?'
      ];
    }

    // 6. Explanations & Concepts
    return [
      'Can you explain this with a real-world practical example?',
      'What are the common pitfalls or misconceptions about this?',
      'How does this integrate into an end-to-end workflow?'
    ];
  }
}
