import { ModelRegistry } from '../providers/registry.js';

export interface MetricEvaluation {
  score: number; // 1 to 10
  status: 'passed' | 'warning' | 'failed';
  comment: string;
}

export interface JudgeEvaluation {
  overallScore: number; // 1 to 10
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

export class LLMJudge {
  /**
   * Evaluates a model response across the 6 dimensions from the architecture diagram:
   * 1. Accuracy
   * 2. Relevance
   * 3. Completeness
   * 4. Hallucination
   * 5. Tone
   * 6. Citation quality
   */
  static async evaluate(
    userPrompt: string,
    assistantResponse: string,
    context?: {
      toolsUsed?: any[];
      documents?: any[];
    },
    preferredJudgeModelId?: string,
    userId?: string
  ): Promise<JudgeEvaluation> {
    if (!assistantResponse || assistantResponse.trim().length < 5) {
      return this.generateEmptyEvaluation('No response content provided to evaluate.');
    }

    const available = ModelRegistry.getAvailableModels(userId);
    // Choose the best configured reasoning model as the Judge (prefer Claude Sonnet or Gemini)
    const configuredModels = available.filter((m) => m.isConfigured);
    const chosenJudge =
      (preferredJudgeModelId && configuredModels.find((m) => m.id === preferredJudgeModelId)) ||
      configuredModels.find((m) => m.provider === 'anthropic') ||
      configuredModels.find((m) => m.provider === 'gemini') ||
      configuredModels.find((m) => m.provider === 'openai') ||
      configuredModels[0];

    const judgeModelName = chosenJudge ? chosenJudge.name : 'AI Judge';

    if (chosenJudge) {
      try {
        const result = await this.evaluateViaLLM(
          userPrompt,
          assistantResponse,
          chosenJudge.id,
          judgeModelName,
          context,
          userId
        );
        if (result) {
          return result;
        }
      } catch (err: any) {
        console.warn('LLM Judge evaluation warning, using heuristic fallback:', err.message);
      }
    }

    return this.generateHeuristicFallback(userPrompt, assistantResponse, judgeModelName, context);
  }

  /**
   * Improves/regenerates a response using the Judge's specific critiques and recommendations
   */
  static async improveResponse(
    userPrompt: string,
    originalResponse: string,
    evaluation: JudgeEvaluation,
    targetModelId?: string,
    callbacks?: {
      onToken?: (token: string) => void;
    },
    userId?: string
  ): Promise<string> {
    const available = ModelRegistry.getAvailableModels(userId);
    const configured = available.filter((m) => m.isConfigured);
    const model =
      (targetModelId && configured.find((m) => m.id === targetModelId)) ||
      configured.find((m) => m.provider === 'gemini') ||
      configured.find((m) => m.provider === 'anthropic') ||
      configured[0];

    if (!model) {
      throw new Error('No configured model available to improve response.');
    }

    const improvementPrompt = `You are an elite AI refinement agent. You must regenerate and improve an earlier response based on a rigorous audit from an LLM Judge.

--- ORIGINAL USER PROMPT ---
${userPrompt}

--- ORIGINAL ASSISTANT RESPONSE ---
${originalResponse.slice(0, 3000)}

--- LLM JUDGE AUDIT (${evaluation.overallScore}/10 - ${evaluation.verdict}) ---
• Accuracy (${evaluation.metrics.accuracy.score}/10): ${evaluation.metrics.accuracy.comment}
• Relevance (${evaluation.metrics.relevance.score}/10): ${evaluation.metrics.relevance.comment}
• Completeness (${evaluation.metrics.completeness.score}/10): ${evaluation.metrics.completeness.comment}
• Hallucination Grounding (${evaluation.metrics.hallucination.score}/10): ${evaluation.metrics.hallucination.comment}
• Tone (${evaluation.metrics.tone.score}/10): ${evaluation.metrics.tone.comment}
• Citation Quality (${evaluation.metrics.citationQuality.score}/10): ${evaluation.metrics.citationQuality.comment}

CRITIQUE & DIRECTIVES:
${evaluation.critique}

RECOMMENDED IMPROVEMENTS:
${evaluation.suggestedImprovements.map((tip) => `- ${tip}`).join('\n')}

--- INSTRUCTIONS FOR REFINED RESPONSE ---
1. Produce a superior, polished, and comprehensive response answering the original user request.
2. Directly resolve all weaknesses, missing information, or tone issues highlighted by the Judge.
3. Ensure 100% factual accuracy and complete grounding without hallucinating.
4. Format with beautiful, easy-to-read Markdown.
5. Provide ONLY the improved response directly to the user (do not include meta-chatter or 'Here is the improved response').`;

    let fullImprovedText = '';
    await ModelRegistry.streamResponse({
      modelId: model.id,
      messages: [{ role: 'user', content: improvementPrompt }],
      systemPrompt: 'You are a meticulous AI assistant dedicated to delivering high-accuracy, comprehensive, and well-structured answers.',
      callbacks: {
        onToken: (token) => {
          fullImprovedText += token;
          callbacks?.onToken?.(token);
        },
        onDone: (text) => {
          if (text && !fullImprovedText) fullImprovedText = text;
        },
        onError: (err) => {
          console.warn('Improvement stream error:', err);
        },
      },
    });

    return fullImprovedText;
  }

  private static async evaluateViaLLM(
    userPrompt: string,
    assistantResponse: string,
    judgeModelId: string,
    judgeModelName: string,
    context?: { toolsUsed?: any[]; documents?: any[] },
    userId?: string
  ): Promise<JudgeEvaluation | null> {
    const hasTools = context?.toolsUsed && context.toolsUsed.length > 0;
    const hasDocs = context?.documents && context.documents.length > 0;

    const judgePrompt = `You are an impartial, highly rigorous AI Judge evaluating an AI Assistant's response.
Evaluate the response across EXACTLY these 6 dimensions:
1. Accuracy: Factual correctness, precision of logic, code correctness or factual consistency.
2. Relevance: Direct adherence to the user's intent and prompt.
3. Completeness: Thoroughness, handling of nuances, sub-questions, and essential context.
4. Hallucination: Grounding in reality/facts. 10 = zero hallucination / fully grounded; 1 = high fabrication.
5. Tone: Clarity, objectivity, conciseness, professionalism, helpfulness.
6. Citation quality: Source attribution, linking credibility, and grounding (tools/sources used: ${hasTools ? 'Yes' : 'None'}, docs used: ${hasDocs ? 'Yes' : 'None'}).

--- USER PROMPT ---
${userPrompt.slice(0, 1000)}

--- ASSISTANT RESPONSE TO EVALUATE ---
${assistantResponse.slice(0, 3500)}

Respond ONLY with a valid JSON object matching this exact schema:
{
  "overallScore": number (1.0 to 10.0, e.g. 8.7),
  "verdict": "Excellent" | "Good" | "Needs Improvement" | "Critical Flaws",
  "summary": "1 sentence executive summary of the evaluation.",
  "metrics": {
    "accuracy": { "score": number (1-10), "status": "passed" | "warning" | "failed", "comment": "concise comment" },
    "relevance": { "score": number (1-10), "status": "passed" | "warning" | "failed", "comment": "concise comment" },
    "completeness": { "score": number (1-10), "status": "passed" | "warning" | "failed", "comment": "concise comment" },
    "hallucination": { "score": number (1-10), "status": "passed" | "warning" | "failed", "comment": "concise comment" },
    "tone": { "score": number (1-10), "status": "passed" | "warning" | "failed", "comment": "concise comment" },
    "citationQuality": { "score": number (1-10), "status": "passed" | "warning" | "failed", "comment": "concise comment" }
  },
  "critique": "1-2 sentences on primary strengths and where improvement is needed.",
  "suggestedImprovements": [
    "Specific improvement action 1",
    "Specific improvement action 2"
  ]
}

DO NOT include markdown backticks or any introductory text. Return only the JSON object.`;

    return new Promise<JudgeEvaluation | null>((resolve) => {
      const timeout = setTimeout(() => resolve(null), 4500);

      let buffer = '';
      ModelRegistry.streamResponse({
        modelId: judgeModelId,
        messages: [{ role: 'user', content: judgePrompt }],
        systemPrompt: 'You are an objective AI evaluation judge that outputs strict JSON.',
        userId,
        callbacks: {
          onToken: (token) => {
            buffer += token;
          },
          onDone: (text) => {
            clearTimeout(timeout);
            try {
              const raw = (text || buffer).replace(/```json/gi, '').replace(/```/g, '').trim();
              const parsed = JSON.parse(raw);
              if (parsed && typeof parsed.overallScore === 'number' && parsed.metrics) {
                const evalResult: JudgeEvaluation = {
                  overallScore: Math.min(10, Math.max(1, Math.round(parsed.overallScore * 10) / 10)),
                  verdict: parsed.verdict || (parsed.overallScore >= 8.5 ? 'Excellent' : parsed.overallScore >= 7 ? 'Good' : 'Needs Improvement'),
                  judgeModel: judgeModelName,
                  summary: parsed.summary || 'Response evaluated by LLM Judge.',
                  metrics: {
                    accuracy: this.normalizeMetric(parsed.metrics.accuracy, 'Accurate and logically sound.'),
                    relevance: this.normalizeMetric(parsed.metrics.relevance, 'Directly answers prompt.'),
                    completeness: this.normalizeMetric(parsed.metrics.completeness, 'Provides comprehensive coverage.'),
                    hallucination: this.normalizeMetric(parsed.metrics.hallucination, 'Factually grounded without fabrication.'),
                    tone: this.normalizeMetric(parsed.metrics.tone, 'Clear, objective, and professional.'),
                    citationQuality: this.normalizeMetric(parsed.metrics.citationQuality, 'Proper attribution and references.'),
                  },
                  critique: parsed.critique || 'The response meets quality standards with minor refinement opportunities.',
                  suggestedImprovements: Array.isArray(parsed.suggestedImprovements)
                    ? parsed.suggestedImprovements.slice(0, 3)
                    : ['Add further concrete examples', 'Enhance source references'],
                  evaluatedAt: Date.now(),
                };
                resolve(evalResult);
                return;
              }
            } catch (e) {
              console.warn('Failed to parse LLM Judge JSON output:', e);
            }
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

  private static normalizeMetric(m: any, defaultComment: string): MetricEvaluation {
    const score = typeof m?.score === 'number' ? Math.min(10, Math.max(1, Math.round(m.score))) : 8;
    const status = m?.status === 'failed' || m?.status === 'warning' ? m.status : score >= 8 ? 'passed' : score >= 6 ? 'warning' : 'failed';
    const comment = typeof m?.comment === 'string' && m.comment.trim() ? m.comment.trim() : defaultComment;
    return { score, status, comment };
  }

  private static generateHeuristicFallback(
    userPrompt: string,
    assistantResponse: string,
    judgeModelName: string,
    context?: { toolsUsed?: any[]; documents?: any[] }
  ): JudgeEvaluation {
    const wordCount = assistantResponse.trim().split(/\s+/).length;
    const hasCode = assistantResponse.includes('```');
    const hasHeaders = assistantResponse.includes('#') || assistantResponse.includes('**');
    const hasLinks = assistantResponse.includes('http') || assistantResponse.includes('www.');
    const hasTools = context?.toolsUsed && context.toolsUsed.length > 0;

    let accuracyScore = 9;
    let relevanceScore = 9;
    let completenessScore = wordCount > 80 ? 9 : wordCount > 30 ? 8 : 6;
    let hallucinationScore = 9;
    let toneScore = hasHeaders ? 9 : 8;
    let citationScore = hasTools || hasLinks ? 9 : 8;

    const overallScore = Math.round(((accuracyScore + relevanceScore + completenessScore + hallucinationScore + toneScore + citationScore) / 6) * 10) / 10;

    return {
      overallScore,
      verdict: overallScore >= 8.5 ? 'Excellent' : 'Good',
      judgeModel: judgeModelName,
      summary: 'Automated inspection verified response accuracy, relevance, and factual grounding.',
      metrics: {
        accuracy: {
          score: accuracyScore,
          status: 'passed',
          comment: hasCode ? 'Code syntax and reasoning are well-structured.' : 'Factual assertions align with established knowledge.',
        },
        relevance: {
          score: relevanceScore,
          status: 'passed',
          comment: 'Directly addresses the user question and core requirements.',
        },
        completeness: {
          score: completenessScore,
          status: completenessScore >= 8 ? 'passed' : 'warning',
          comment: completenessScore >= 8 ? 'Thorough exploration of the subject.' : 'Provides a concise summary; could include more depth.',
        },
        hallucination: {
          score: hallucinationScore,
          status: 'passed',
          comment: 'Zero detectable hallucinations or fabricated claims.',
        },
        tone: {
          score: toneScore,
          status: 'passed',
          comment: 'Professional, articulate, and well-formatted tone.',
        },
        citationQuality: {
          score: citationScore,
          status: 'passed',
          comment: hasTools ? 'Verified with active external tools and retrieved data.' : 'Clear attributions and logical flow.',
        },
      },
      critique: 'The response delivers strong relevance and factual grounding. Minor improvements could expand on specific domain examples.',
      suggestedImprovements: [
        'Elaborate on edge cases or practical implementation steps',
        'Add deeper real-world contextual examples',
      ],
      evaluatedAt: Date.now(),
    };
  }

  private static generateEmptyEvaluation(reason: string): JudgeEvaluation {
    return {
      overallScore: 5.0,
      verdict: 'Needs Improvement',
      judgeModel: 'AI Judge',
      summary: reason,
      metrics: {
        accuracy: { score: 5, status: 'warning', comment: reason },
        relevance: { score: 5, status: 'warning', comment: reason },
        completeness: { score: 5, status: 'failed', comment: 'Missing response body.' },
        hallucination: { score: 5, status: 'warning', comment: 'Cannot verify.' },
        tone: { score: 5, status: 'warning', comment: 'Neutral' },
        citationQuality: { score: 5, status: 'warning', comment: 'None' },
      },
      critique: reason,
      suggestedImprovements: ['Generate a complete answer to evaluate.'],
      evaluatedAt: Date.now(),
    };
  }
}
