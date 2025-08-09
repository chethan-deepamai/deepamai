import { DocumentProcessor } from "./document-processor.js";
import { Document } from "@shared/schema.js";

/**
 * Sequential Batch File Processor
 * ISOLATED service for processing multiple files one at a time to prevent memory overload
 */
export class BatchProcessor {
  constructor(private documentProcessor: DocumentProcessor) {}

  /**
   * Process multiple files sequentially (one at a time)
   * ISOLATED METHOD - prevents memory issues from parallel file processing
   */
  async processFilesSequentially(documents: Document[]): Promise<void> {
    console.log(`Starting sequential processing of ${documents.length} files`);
    
    let processed = 0;
    let failed = 0;

    for (const document of documents) {
      try {
        console.log(`Processing file ${processed + 1}/${documents.length}: ${document.originalName}`);
        
        // Process one file at a time to manage memory
        await this.documentProcessor.processDocument(document);
        processed++;
        
        console.log(`✓ Completed ${document.originalName} (${processed}/${documents.length})`);
        
      } catch (error) {
        failed++;
        console.error(`✗ Failed to process ${document.originalName}:`, error);
        // Continue with next file instead of stopping entire batch
      }
    }

    console.log(`Batch processing complete: ${processed} successful, ${failed} failed out of ${documents.length} total`);
    
    if (failed > 0) {
      console.warn(`⚠️  ${failed} files failed to process - check individual error logs above`);
    }
  }

  /**
   * Process files with progress reporting
   * ISOLATED METHOD for batch progress tracking
   */
  async processFilesWithProgress(
    documents: Document[], 
    onProgress?: (current: number, total: number, filename: string) => void
  ): Promise<{ processed: number; failed: number }> {
    console.log(`Starting sequential processing of ${documents.length} files with progress tracking`);
    
    let processed = 0;
    let failed = 0;

    for (let i = 0; i < documents.length; i++) {
      const document = documents[i];
      
      try {
        if (onProgress) {
          onProgress(i + 1, documents.length, document.originalName);
        }
        
        console.log(`Processing file ${i + 1}/${documents.length}: ${document.originalName}`);
        
        // Process one file at a time
        await this.documentProcessor.processDocument(document);
        processed++;
        
        console.log(`✓ Completed ${document.originalName} (${processed}/${documents.length})`);
        
      } catch (error) {
        failed++;
        console.error(`✗ Failed to process ${document.originalName}:`, error);
      }
    }

    const result = { processed, failed };
    console.log(`Sequential batch processing complete:`, result);
    return result;
  }
}