import { dbService } from '../../db/index.js';
import { EmbedderService } from './embedder.js';

export interface SearchResult {
  chunkId: string;
  documentId: string;
  filename: string;
  content: string;
  score: number;
  metadata?: any;
}

export class VectorStore {
  /**
   * Computes cosine similarity between two float vectors.
   */
  private static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  /**
   * Keyword / token overlap score (BM25 approximation)
   */
  private static keywordScore(query: string, text: string): number {
    const queryTokens = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);
    if (queryTokens.length === 0) return 0;

    const lowerText = text.toLowerCase();
    let matches = 0;
    for (const token of queryTokens) {
      if (lowerText.includes(token)) {
        matches++;
      }
    }
    return matches / queryTokens.length;
  }

  /**
   * Performs hybrid search across document chunks.
   */
  static async search(query: string, conversationId?: string, topK = 5, userId?: string): Promise<SearchResult[]> {
    const chunks = dbService.getAllChunks(userId, conversationId);
    if (chunks.length === 0) return [];

    const queryEmbedding = await EmbedderService.getQueryEmbedding(query);

    const scored: SearchResult[] = [];

    for (const chunk of chunks) {
      let vecScore = 0;
      if (chunk.embedding) {
        try {
          const emb = JSON.parse(chunk.embedding) as number[];
          if (emb.length === queryEmbedding.length) {
            vecScore = this.cosineSimilarity(queryEmbedding, emb);
          }
        } catch {
          // ignore parsing error
        }
      }

      const keyScore = this.keywordScore(query, chunk.content);

      // Hybrid combination: 70% vector + 30% keyword
      const combinedScore = vecScore > 0 ? vecScore * 0.7 + keyScore * 0.3 : keyScore;

      let meta: any = null;
      if (chunk.metadata) {
        try {
          meta = JSON.parse(chunk.metadata);
        } catch {}
      }

      scored.push({
        chunkId: chunk.id,
        documentId: chunk.document_id,
        filename: chunk.filename,
        content: chunk.content,
        score: combinedScore,
        metadata: meta,
      });
    }

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    // Return top K with a minimal relevance threshold
    return scored.slice(0, topK).filter((r) => r.score > 0.1 || r.content.toLowerCase().includes(query.toLowerCase()));
  }
}
