import { spawn } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';
import { detectLanguage, detectLanguageDistribution } from './language-detector.js';
import { OCRProcessor } from './ocr-processor.js';

/**
 * Dedicated PDF Processing Service
 * ISOLATED module - changes here should not affect other processing logic
 */
export class PDFProcessor {
  private static readonly PYTHON_SCRIPT = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import PyPDF2
import sys
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
import unicodedata
import re

def normalize_text(text):
    """Normalize and clean Unicode text for better readability"""
    try:
        if isinstance(text, bytes):
            text = text.decode('utf-8', errors='ignore')
        
        # Normalize Unicode to NFC form (critical for Indic scripts)
        normalized = unicodedata.normalize('NFC', text)
        
        # Remove null bytes and replacement characters
        cleaned = re.sub(r'[\\x00\\ufffd]', '', normalized)
        
        # Filter characters but preserve Unicode ranges for Indic scripts
        filtered_chars = []
        for char in cleaned:
            code_point = ord(char)
            if (char.isprintable() or 
                char.isspace() or 
                (0x0900 <= code_point <= 0x097F) or  # Devanagari
                (0x0980 <= code_point <= 0x09FF) or  # Bengali  
                (0x0B00 <= code_point <= 0x0B7F) or  # Oriya
                (0x0B80 <= code_point <= 0x0BFF) or  # Tamil
                (0x0C00 <= code_point <= 0x0C7F) or  # Telugu
                (0x0C80 <= code_point <= 0x0CFF) or  # Kannada
                (0x0D00 <= code_point <= 0x0D7F)):   # Malayalam
                filtered_chars.append(char)
        
        cleaned = ''.join(filtered_chars)
        
        # Clean up whitespace while preserving structure
        lines = []
        for line in cleaned.split('\\n'):
            line = ' '.join(line.split())
            if line.strip():
                lines.append(line)
        
        return '\\n'.join(lines)
    
    except Exception as e:
        print(f"Text normalization failed: {str(e)}", file=sys.stderr)
        return ""

def extract_page_text(page, page_num):
    """Extract text from a single page with proper Unicode handling"""
    try:
        page_text = page.extract_text()
        
        if page_text and page_text.strip():
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

def extract_pdf_text_batch_parallel(file_path, batch_size=5, max_workers=4):
    """Extract text from PDF using parallel batch processing"""
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            total_pages = len(pdf_reader.pages)
            
            if total_pages == 0:
                return {
                    "success": False,
                    "error": "PDF has no pages",
                    "text": "",
                    "pages": 0,
                    "extracted_pages": 0,
                    "batches_processed": 0
                }
            
            print(f"Processing {total_pages} pages in batches of {batch_size}", file=sys.stderr)
            
            all_results = {}
            
            # Process pages in batches
            for batch_start in range(0, total_pages, batch_size):
                batch_end = min(batch_start + batch_size, total_pages)
                batch_pages = list(range(batch_start, batch_end))
                
                print(f"Processing batch: pages {batch_start + 1}-{batch_end}", file=sys.stderr)
                
                page_results = {}
                
                with ThreadPoolExecutor(max_workers=max_workers) as executor:
                    future_to_page = {
                        executor.submit(extract_page_text, pdf_reader.pages[i], i + 1): i + 1
                        for i in batch_pages
                    }
                    
                    for future in as_completed(future_to_page):
                        result = future.result()
                        page_results[result["page_num"]] = result
                
                all_results.update(page_results)
                print(f"Completed batch: pages {batch_start + 1}-{batch_end}", file=sys.stderr)
            
            # Combine all results in correct page order
            text = ""
            extracted_pages = 0
            
            for page_num in sorted(all_results.keys()):
                result = all_results[page_num]
                if result["success"] and result["text"].strip():
                    if text:
                        text += "\\n\\n"
                    text += result["text"]
                    extracted_pages += 1
            
            return {
                "success": True,
                "text": text.strip(),
                "pages": total_pages,
                "extracted_pages": extracted_pages,
                "batches_processed": (total_pages + batch_size - 1) // batch_size
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "text": "",
            "pages": 0,
            "extracted_pages": 0,
            "batches_processed": 0
        }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"success": False, "error": "Usage: python script.py <pdf_path>"}))
        sys.exit(1)
    
    result = extract_pdf_text_batch_parallel(sys.argv[1])
    print(json.dumps(result, ensure_ascii=False, indent=None, separators=(',', ':')))
`;

  /**
   * Extract text from PDF using parallel processing
   * ISOLATED METHOD - changes here won't affect other document types
   */
  static async extractText(filePath: string, fileName: string): Promise<string> {
    console.log(`PDF processing: ${fileName} - Using parallel PyPDF2 extraction`);
    
    return new Promise(async (resolve, reject) => {
      try {
        // Create temporary Python file to avoid spawn argument issues
        const tempScriptPath = `/tmp/pdf_extractor_${Date.now()}.py`;
        await fs.writeFile(tempScriptPath, this.PYTHON_SCRIPT, 'utf8');
        
        const python = spawn('python3', [tempScriptPath, filePath]);
        let output = '';
        let error = '';

        // Proper UTF-8 encoding handling
        python.stdout.on('data', (data) => {
          output += data.toString('utf8');
        });

        python.stderr.on('data', (data) => {
          error += data.toString('utf8');
        });

        python.on('close', async (code) => {
          // Clean up temp file
          try {
            await fs.unlink(tempScriptPath);
          } catch (e) {
            // Ignore cleanup errors
          }

          if (code !== 0) {
            console.error('PyPDF2 extraction failed:', error);
            reject(new Error(`PDF extraction failed with code ${code}: ${error}`));
            return;
          }

          try {
            const result = JSON.parse(output.trim());
            
            if (!result.success) {
              console.error('PyPDF2 returned error:', result.error);
              reject(new Error(result.error));
              return;
            }

            if (!result.text || result.text.trim().length === 0) {
              console.warn('No text extracted from PDF');
              resolve(''); // Return empty string instead of rejecting
              return;
            }

            // Detect language and log distribution for multilingual documents
            const primaryLanguage = detectLanguage(result.text);
            const languageDistribution = detectLanguageDistribution(result.text);
            
            console.log(`Successfully extracted text from ${result.extracted_pages} pages (${result.pages} total)`);
            console.log(`Detected primary language: ${primaryLanguage}`);
            console.log(`Language distribution: ${languageDistribution}`);

            // Check if OCR should be used as fallback
            if (OCRProcessor.shouldUseOCR(filePath, result.text)) {
              console.log('Text quality is low, attempting OCR processing...');
              try {
                await OCRProcessor.initialize();
                const ocrResult = await OCRProcessor.processPDFWithOCR(filePath);
                
                if (ocrResult.text && ocrResult.text.length > result.text.length) {
                  console.log(`OCR produced better results: ${ocrResult.text.length} vs ${result.text.length} characters`);
                  console.log(`OCR confidence: ${ocrResult.confidence.toFixed(2)}%`);
                  resolve(ocrResult.text);
                  return;
                }
              } catch (ocrError) {
                console.warn('OCR processing failed, using PyPDF2 result:', ocrError);
              }
            }

            resolve(result.text);
            
          } catch (parseError) {
            console.error('Failed to parse PDF extraction result:', parseError);
            console.error('Raw output:', output);
            reject(new Error(`Failed to parse PDF extraction result: ${parseError}`));
          }
        });

        python.on('error', (err) => {
          reject(new Error(`Failed to spawn Python process: ${err.message}`));
        });
        
      } catch (error) {
        console.error('PDF processing setup failed:', error);
        reject(error);
      }
    });
  }
}