#!/usr/bin/env node
/**
 * OCR Command Line Interface
 * Test OCR functionality from command line
 */

import { OCRProcessor } from './ocr-processor.js';
import path from 'path';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node ocr-cli.js <pdf-file-path>');
    process.exit(1);
  }
  
  const filePath = path.resolve(args[0]);
  
  try {
    console.log(`Testing OCR on: ${filePath}`);
    console.log('Initializing OCR processor...');
    
    await OCRProcessor.initialize();
    
    console.log('Processing PDF with OCR...');
    const result = await OCRProcessor.processPDFWithOCR(filePath);
    
    console.log('\n=== OCR RESULTS ===');
    console.log(`Total pages: ${result.totalPages}`);
    console.log(`Average confidence: ${result.confidence.toFixed(2)}%`);
    console.log(`Detected language: ${result.language}`);
    console.log(`Text length: ${result.text.length} characters`);
    
    console.log('\n=== EXTRACTED TEXT ===');
    console.log(result.text.substring(0, 500) + '...');
    
    console.log('\n=== PAGE DETAILS ===');
    result.ocrResults.forEach(page => {
      console.log(`Page ${page.pageNumber}: ${page.confidence.toFixed(1)}% confidence, ${page.language}, ${page.text.length} chars`);
    });
    
  } catch (error) {
    console.error('OCR processing failed:', error);
    process.exit(1);
  }
}

main();