import { BaseEmbeddingProvider } from "../providers/embedding/base.js";
import { BaseVectorProvider } from "../providers/vector/base.js";
import { Document } from "@shared/schema.js";
import fs from 'fs/promises';
import path from 'path';
import { PDFProcessor } from "./pdf-processor.js";
import { ChunkProcessor } from "./chunk-processor.js";

export interface ProcessedChunk {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    documentId: string;
    filename: string;
    chunkIndex: number;
    startChar: number;
    endChar: number;
  };
}

export interface ProcessingOptions {
  chunkSize: number;
  chunkOverlap: number;
  extractMetadata: boolean;
}

export class DocumentProcessor {
  constructor(
    private embeddingProvider: BaseEmbeddingProvider,
    private vectorProvider: BaseVectorProvider
  ) {}

  async processDocument(
    document: Document, 
    options: ProcessingOptions = {
      chunkSize: 1000,
      chunkOverlap: 100,
      extractMetadata: true
    }
  ): Promise<ProcessedChunk[]> {
    try {
      console.log(`Starting parallel processing for ${document.originalName}`);
      
      // Extract text using modular processors (ISOLATED - won't affect other functions)
      const content = await this.extractTextFromFile(document.filePath, document.fileType);
      
      // Split into chunks using isolated ChunkProcessor with proper chunk size
      const chunkData = ChunkProcessor.splitIntoChunks(content, options.chunkSize, options.chunkOverlap);
      const textChunks = chunkData.map(chunk => chunk.content);
      
      console.log(`ChunkProcessor created ${textChunks.length} chunks (expected ~${Math.ceil(content.length / options.chunkSize)})`);
      console.log(`Split into ${textChunks.length} chunks for processing`);
      
      // Process chunks in parallel batches for faster processing
      const BATCH_SIZE = 20; // Process 20 chunks at a time for better performance
      const allProcessedChunks: ProcessedChunk[] = [];
      
      // Create all batch promises for parallel execution
      const batchPromises: Promise<ProcessedChunk[]>[] = [];
      
      for (let batchStart = 0; batchStart < textChunks.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, textChunks.length);
        const batchChunks = textChunks.slice(batchStart, batchEnd);
        
        // Create a promise for this batch
        const batchPromise = this.processBatch(batchChunks, batchStart, document);
        batchPromises.push(batchPromise);
      }
      
      console.log(`Processing ${batchPromises.length} batches in parallel`);
      
      // Wait for all batches to complete in parallel
      const batchResults = await Promise.all(batchPromises);
      
      // Flatten results
      for (const batchChunks of batchResults) {
        allProcessedChunks.push(...batchChunks);
      }
      
      // Store all chunks in vector database in parallel batches
      const STORAGE_BATCH_SIZE = 50; // Store 50 chunks at a time
      const storagePromises: Promise<void>[] = [];
      
      for (let i = 0; i < allProcessedChunks.length; i += STORAGE_BATCH_SIZE) {
        const storageChunks = allProcessedChunks.slice(i, i + STORAGE_BATCH_SIZE);
        const storagePromise = this.vectorProvider.addDocuments(storageChunks);
        storagePromises.push(storagePromise);
      }
      
      console.log(`Storing ${allProcessedChunks.length} chunks in ${Math.ceil(allProcessedChunks.length / STORAGE_BATCH_SIZE)} parallel batches`);
      
      // Wait for all storage operations to complete
      await Promise.all(storagePromises);
      
      console.log(`Successfully processed ${allProcessedChunks.length} chunks for document ${document.originalName}`);
      return allProcessedChunks;
    } catch (error) {
      console.error('Document processing failed:', error);
      throw new Error(`Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processBatch(chunks: string[], batchStart: number, document: Document): Promise<ProcessedChunk[]> {
    try {
      // Generate embeddings for this batch
      const embeddings = await this.embeddingProvider.embedTexts(chunks);
      
      // Create processed chunks for this batch
      const processedChunks: ProcessedChunk[] = [];
      let currentChar = 0;
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkIndex = batchStart + i;
        const chunkId = `${document.id}_chunk_${chunkIndex}`;
        
        processedChunks.push({
          id: chunkId,
          content: chunk,
          embedding: embeddings.embeddings[i],
          metadata: {
            documentId: document.id,
            filename: document.originalName,
            chunkIndex: chunkIndex,
            startChar: currentChar,
            endChar: currentChar + chunk.length,
          },
        });
        
        currentChar += chunk.length;
      }
      
      return processedChunks;
    } catch (error) {
      console.error(`Failed to process batch starting at ${batchStart}:`, error);
      throw error;
    }
  }

  async deleteDocumentChunks(documentId: string): Promise<void> {
    try {
      // For now, we'll need to track chunk IDs separately
      // In a production system, you'd want better chunk ID management
      const chunkIds: string[] = [];
      
      // Generate potential chunk IDs (this is a limitation of the current approach)
      for (let i = 0; i < 1000; i++) { // Assume max 1000 chunks per document
        chunkIds.push(`${documentId}_chunk_${i}`);
      }
      
      await this.vectorProvider.delete(chunkIds);
    } catch (error) {
      console.error('Failed to delete document chunks:', error);
      throw new Error(`Failed to delete document chunks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async extractTextFromFile(filePath: string, fileType: string): Promise<string> {
    try {
      switch (fileType.toLowerCase()) {
        case '.txt':
        case '.md':
          return await fs.readFile(filePath, 'utf-8');
        
        case '.json':
          const jsonData = await fs.readFile(filePath, 'utf-8');
          return JSON.stringify(JSON.parse(jsonData), null, 2);
        
        case '.pdf':
          // Use isolated PDFProcessor (MODULAR - won't break other functions)
          const fileName = filePath.split('/').pop() || 'document.pdf';
          return await PDFProcessor.extractText(filePath, fileName);
        
        case '.docx':
          // For DOCX files, you'd typically use a library like mammoth
          // For now, return a placeholder message
          return 'DOCX content extraction not implemented. Please install mammoth library.';
        
        case '.html':
          const htmlContent = await fs.readFile(filePath, 'utf-8');
          // Simple HTML tag removal (in production, use a proper HTML parser)
          return htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        
        default:
          // Attempt to read as text for various language files
          return await fs.readFile(filePath, 'utf-8');
      }
    } catch (error) {
      console.error(`Failed to extract text from ${filePath}:`, error);
      throw new Error(`Failed to extract text from file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // REMOVED - Now using ChunkProcessor.splitIntoChunks() for better modularization

  async reindexAllDocuments(documents: Document[]): Promise<void> {
    try {
      // Clear existing index
      await this.vectorProvider.clear();
      
      // Process each document in parallel for maximum speed
      const processingPromises = documents
        .filter(document => document.status === 'indexed')
        .map(document => this.processDocument(document));
      
      console.log(`Reindexing ${processingPromises.length} documents in parallel`);
      
      // Wait for all documents to be processed
      await Promise.all(processingPromises);
      
      console.log('All documents reindexed successfully');
    } catch (error) {
      console.error('Failed to reindex documents:', error);
      throw new Error(`Failed to reindex documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // DEPRECATED - Replaced with modular PDFProcessor.extractText()
  private async extractTextFromPDF(filePath: string): Promise<string> {
    try {
      const fileName = filePath.split('/').pop();
      console.log(`PDF processing: ${fileName} - Using PyPDF2 for text extraction`);
      
      // Use Python PyPDF2 to extract text from PDF
      const { spawn } = await import('child_process');
      const pythonScript = `
import PyPDF2
import sys
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
import unicodedata

def normalize_text(text):
    """Normalize and clean Unicode text for better readability"""
    try:
        # Normalize Unicode to standard form
        normalized = unicodedata.normalize('NFC', text)
        
        # Clean up common PDF extraction artifacts
        cleaned = normalized.replace('\\x00', '').replace('\\ufffd', '')
        
        # Remove excessive whitespace but preserve line breaks
        lines = []
        for line in cleaned.split('\\n'):
            line = line.strip()
            if line:
                lines.append(line)
        
        return '\\n'.join(lines)
    except Exception as e:
        print(f"Text normalization error: {str(e)}", file=sys.stderr)
        return text

def extract_page_text(page, page_num):
    """Extract text from a single page with proper Unicode handling"""
    try:
        # Extract text using PyPDF2
        page_text = page.extract_text()
        
        if page_text and page_text.strip():
            # Normalize and clean the extracted text
            normalized_text = normalize_text(page_text)
            
            if normalized_text.strip():
                return {
                    "page_num": page_num,
                    "text": normalized_text,
                    "success": True
                }
        
        return {"page_num": page_num, "text": "", "success": True}
        
    except Exception as e:
        return {
            "page_num": page_num, 
            "text": "", 
            "success": False, 
            "error": str(e)
        }

def extract_pdf_text_parallel(file_path, max_workers=4):
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            total_pages = len(pdf_reader.pages)
            
            # Use parallel processing for page extraction
            page_results = {}
            
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                # Submit all page extraction tasks
                future_to_page = {
                    executor.submit(extract_page_text, pdf_reader.pages[i], i + 1): i + 1
                    for i in range(total_pages)
                }
                
                # Collect results as they complete
                for future in as_completed(future_to_page):
                    result = future.result()
                    page_results[result["page_num"]] = result
            
            # Combine results in page order
            text = ""
            extracted_pages = 0
            
            for page_num in sorted(page_results.keys()):
                result = page_results[page_num]
                if result["success"] and result["text"].strip():
                    text += f"\\n\\n--- Page {page_num} ---\\n\\n"
                    text += result["text"]
                    extracted_pages += 1
            
            return {
                "success": True,
                "text": text.strip(),
                "pages": total_pages,
                "extracted_pages": extracted_pages
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "text": "",
            "pages": 0
        }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"success": False, "error": "Usage: python script.py <pdf_path>"}))
        sys.exit(1)
    
    result = extract_pdf_text_parallel(sys.argv[1])
    # Ensure proper UTF-8 encoding for output
    print(json.dumps(result, ensure_ascii=False, indent=None, separators=(',', ':')))
`;

      return new Promise((resolve, reject) => {
        const python = spawn('python3', ['-c', pythonScript, filePath]);
        let output = '';
        let error = '';

        python.stdout.on('data', (data) => {
          output += data.toString('utf8');
        });

        python.stderr.on('data', (data) => {
          error += data.toString();
        });

        python.on('close', (code) => {
          try {
            if (code !== 0) {
              console.error(`PyPDF2 extraction failed with code ${code}:`, error);
              resolve(this.getFallbackPDFText(fileName!));
              return;
            }

            const result = JSON.parse(output);
            
            if (!result.success) {
              console.error('PyPDF2 extraction error:', result.error);
              resolve(this.getFallbackPDFText(fileName!));
              return;
            }

            if (!result.text || result.text.trim().length === 0) {
              console.warn('PyPDF2 extracted empty text, using fallback');
              resolve(this.getFallbackPDFText(fileName!));
              return;
            }

            console.log(`Successfully extracted ${result.text.length} characters from ${result.extracted_pages}/${result.pages} pages using parallel PyPDF2`);
            resolve(result.text);
            
          } catch (parseError) {
            console.error('Failed to parse PyPDF2 output:', parseError);
            console.error('Raw output:', output);
            resolve(this.getFallbackPDFText(fileName!));
          }
        });
      });
      
    } catch (error) {
      console.error('PDF processing failed:', error);
      const fileName = filePath.split('/').pop();
      return this.getFallbackPDFText(fileName!);
    }
  }

  private getFallbackPDFText(fileName: string): string {
    return `PDF Document: ${fileName}

Status: Text extraction encountered limitations

The PDF file has been uploaded but detailed text extraction could not be completed. This may be due to:
- Scanned pages requiring OCR
- Complex PDF formatting
- Protected or encrypted content
- Multi-language text encoding issues

The document is still available for basic operations and can be referenced in the system.`;
  }

  // Removed extractPageText since we're using fallback PDF processing

  // Clear all documents from the vector database and file system
  async clearAllDocuments(): Promise<void> {
    try {
      console.log('Clearing all documents from vector database...');
      await this.vectorProvider.clear();
      
      console.log('Clearing all uploaded files...');
      // Clear uploads directory
      try {
        const uploadsDir = 'uploads';
        const files = await fs.readdir(uploadsDir);
        const deletePromises = files.map(file => 
          fs.unlink(path.join(uploadsDir, file)).catch(err => 
            console.warn(`Failed to delete ${file}:`, err)
          )
        );
        await Promise.all(deletePromises);
        console.log(`Deleted ${files.length} uploaded files`);
      } catch (error) {
        console.warn('Failed to clear uploads directory:', error);
      }
      
      console.log('All documents cleared successfully');
    } catch (error) {
      console.error('Failed to clear all documents:', error);
      throw new Error(`Failed to clear documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}