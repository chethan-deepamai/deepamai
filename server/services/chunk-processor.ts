import { detectLanguage, hasLanguageContent } from './language-detector.js';

/**
 * Text Chunking Service
 * ISOLATED module for text splitting and chunk management
 */
export class ChunkProcessor {
  private static readonly DEFAULT_CHUNK_SIZE = 800;
  private static readonly DEFAULT_OVERLAP = 100;

  /**
   * Split text into chunks with overlap and language awareness
   * ISOLATED METHOD - changes here won't affect PDF processing
   */
  static splitIntoChunks(
    text: string, 
    chunkSize: number = this.DEFAULT_CHUNK_SIZE,
    overlap: number = this.DEFAULT_OVERLAP
  ): Array<{ content: string; startChar: number; endChar: number; language?: string }> {
    const chunks: Array<{ content: string; startChar: number; endChar: number; language?: string }> = [];
    
    // Detect primary language of the entire text
    const primaryLanguage = detectLanguage(text);
    
    if (!text || text.trim().length === 0) {
      return [{
        content: '',
        startChar: 0,
        endChar: 0,
        language: primaryLanguage
      }];
    }

    // For small text, return as single chunk
    if (text.length <= chunkSize) {
      return [{
        content: text,
        startChar: 0,
        endChar: text.length,
        language: primaryLanguage
      }];
    }

    let start = 0;

    while (start < text.length) {
      let end = start + chunkSize;
      
      // If we're not at the end of the text, try to break at a natural boundary
      if (end < text.length) {
        // Look for sentence endings first
        const sentenceEnd = text.lastIndexOf('.', end);
        const questionEnd = text.lastIndexOf('?', end);
        const exclamationEnd = text.lastIndexOf('!', end);
        
        const maxSentenceEnd = Math.max(sentenceEnd, questionEnd, exclamationEnd);
        
        if (maxSentenceEnd > start + chunkSize * 0.5) {
          // Found a good sentence boundary
          end = maxSentenceEnd + 1;
        } else {
          // Look for paragraph breaks
          const paragraphEnd = text.lastIndexOf('\n\n', end);
          if (paragraphEnd > start + chunkSize * 0.3) {
            end = paragraphEnd + 2;
          } else {
            // Look for any whitespace
            const spaceEnd = text.lastIndexOf(' ', end);
            if (spaceEnd > start + chunkSize * 0.5) {
              end = spaceEnd;
            }
          }
        }
      }
      
      const chunkContent = text.slice(start, end).trim();
      if (chunkContent.length > 0) {
        // Detect language for this specific chunk (may differ from primary)
        const chunkLanguage = detectLanguage(chunkContent);
        
        chunks.push({
          content: chunkContent,
          startChar: start,
          endChar: end,
          language: chunkLanguage
        });
      }
      
      // Move start position with overlap
      start = end - overlap;
      
      // Ensure we don't go backwards or create tiny chunks
      if (start <= chunks[chunks.length - 1]?.startChar) {
        start = end;
      }
    }

    return chunks;
  }

  /**
   * Create chunk metadata
   * ISOLATED METHOD for chunk information
   */
  static createChunkMetadata(
    documentId: string,
    filename: string,
    chunkIndex: number,
    startChar: number,
    endChar: number
  ) {
    return {
      documentId,
      filename,
      chunkIndex,
      startChar,
      endChar
    };
  }
}