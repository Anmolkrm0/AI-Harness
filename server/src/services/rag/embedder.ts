import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { dbService } from '../../db/index.js';

export class EmbedderService {
  /**
   * Generates embedding vectors for an array of text snippets.
   * Automatically picks OpenAI embeddings if available, then Gemini, then local TF-IDF vectorizer.
   */
  static async getEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const openaiKey = dbService.getSetting('openai_key');
    if (openaiKey) {
      try {
        const openai = new OpenAI({ apiKey: openaiKey });
        // Batch in groups of 100
        const batchSize = 100;
        const allEmbeddings: number[][] = [];

        for (let i = 0; i < texts.length; i += batchSize) {
          const batch = texts.slice(i, i + batchSize);
          const res = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: batch,
          });
          for (const item of res.data) {
            allEmbeddings.push(item.embedding);
          }
        }
        return allEmbeddings;
      } catch (err) {
        console.warn('OpenAI embedding failed, trying next provider:', err);
      }
    }

    const geminiKey = dbService.getSetting('gemini_key');
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
        const allEmbeddings: number[][] = [];

        for (const text of texts) {
          const res = await model.embedContent(text);
          if (res.embedding && res.embedding.values) {
            allEmbeddings.push(res.embedding.values);
          } else {
            allEmbeddings.push(this.computeLocalVector(text));
          }
        }
        return allEmbeddings;
      } catch (err) {
        console.warn('Gemini embedding failed, using local TF-IDF vectorizer:', err);
      }
    }

    // Local deterministic TF-IDF / term hashing vectorizer
    return texts.map((t) => this.computeLocalVector(t));
  }

  static async getQueryEmbedding(query: string): Promise<number[]> {
    const embeddings = await this.getEmbeddings([query]);
    return embeddings[0] || this.computeLocalVector(query);
  }

  /**
   * Generates a 256-dimensional normalized term frequency hash vector
   * Suitable for fast cosine similarity without external network calls.
   */
  static computeLocalVector(text: string, dimensions = 256): number[] {
    const vector = new Array(dimensions).fill(0);
    const tokens = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    if (tokens.length === 0) return vector;

    for (const token of tokens) {
      // Hash token into one of dimensions buckets
      let hash = 0;
      for (let i = 0; i < token.length; i++) {
        hash = (hash << 5) - hash + token.charCodeAt(i);
        hash |= 0;
      }
      const idx = Math.abs(hash) % dimensions;
      vector[idx] += 1;
    }

    // L2 Normalize
    let norm = 0;
    for (let i = 0; i < dimensions; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < dimensions; i++) {
        vector[i] /= norm;
      }
    }

    return vector;
  }
}
