export interface TextChunk {
  index: number;
  content: string;
  metadata: {
    startChar: number;
    endChar: number;
    tokenCount: number;
  };
}

export class TextChunker {
  private static readonly CHUNK_SIZE = 1000;
  private static readonly CHUNK_OVERLAP = 200;

  static chunkText(text: string, chunkSize = TextChunker.CHUNK_SIZE, overlap = TextChunker.CHUNK_OVERLAP): TextChunk[] {
    const cleaned = text.trim();
    if (!cleaned) return [];

    if (cleaned.length <= chunkSize) {
      return [
        {
          index: 0,
          content: cleaned,
          metadata: {
            startChar: 0,
            endChar: cleaned.length,
            tokenCount: Math.ceil(cleaned.length / 4),
          },
        },
      ];
    }

    const chunks: TextChunk[] = [];
    let start = 0;
    let index = 0;

    while (start < cleaned.length) {
      let end = start + chunkSize;

      if (end >= cleaned.length) {
        end = cleaned.length;
      } else {
        // Try to break at a paragraph boundary
        const paragraphBreak = cleaned.lastIndexOf('\n\n', end);
        if (paragraphBreak > start + chunkSize * 0.5) {
          end = paragraphBreak + 2;
        } else {
          // Try to break at a newline boundary
          const newlineBreak = cleaned.lastIndexOf('\n', end);
          if (newlineBreak > start + chunkSize * 0.5) {
            end = newlineBreak + 1;
          } else {
            // Try to break at a sentence boundary (. ? !)
            const sentenceBreak = Math.max(
              cleaned.lastIndexOf('. ', end),
              cleaned.lastIndexOf('? ', end),
              cleaned.lastIndexOf('! ', end)
            );
            if (sentenceBreak > start + chunkSize * 0.5) {
              end = sentenceBreak + 2;
            } else {
              // Try space boundary
              const spaceBreak = cleaned.lastIndexOf(' ', end);
              if (spaceBreak > start + chunkSize * 0.5) {
                end = spaceBreak + 1;
              }
            }
          }
        }
      }

      const chunkText = cleaned.substring(start, end).trim();
      if (chunkText.length > 0) {
        chunks.push({
          index,
          content: chunkText,
          metadata: {
            startChar: start,
            endChar: end,
            tokenCount: Math.ceil(chunkText.length / 4),
          },
        });
        index++;
      }

      if (end >= cleaned.length) break;

      // Advance start with overlap
      start = Math.max(start + 1, end - overlap);
    }

    return chunks;
  }
}
