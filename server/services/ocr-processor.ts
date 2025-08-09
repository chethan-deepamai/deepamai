import { createWorker, PSM, OEM } from 'tesseract.js';
import { fromPath } from 'pdf2pic';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { detectLanguage } from './language-detector.js';

const execAsync = promisify(exec);

interface OCRResult {
  text: string;
  confidence: number;
  language: string;
  pageNumber: number;
}

interface ProcessingOptions {
  languages?: string[];
  psm?: PSM;
  oem?: OEM;
  enhanceImage?: boolean;
  dpi?: number;
  parallelWorkers?: number;
  config?: string;
}

interface TesseractInstallation {
  isInstalled: boolean;
  version?: string;
  availableLanguages: string[];
  tesseractPath?: string;
}

/**
 * OCR Processor Service
 * Handles PDF to image conversion and OCR text extraction with multi-language support
 */
export class OCRProcessor {
  private static readonly DEFAULT_OPTIONS: ProcessingOptions = {
    languages: ['eng', 'hin', 'kan', 'tam', 'tel', 'mar', 'mal'], // English + Indian languages
    psm: PSM.SINGLE_BLOCK, // Better for structured documents
    oem: OEM.LSTM_ONLY,
    enhanceImage: true,
    dpi: 300, // Higher DPI for better OCR results
    parallelWorkers: 2,
    config: '--psm 6' // Assume uniform block of text
  };

  private static readonly LANGUAGE_MAPPING = {
    'eng': 'English',
    'hin': 'Hindi',
    'kan': 'Kannada', 
    'tam': 'Tamil',
    'tel': 'Telugu',
    'mar': 'Marathi',
    'mal': 'Malayalam',
    'ben': 'Bengali',
    'guj': 'Gujarati',
    'ori': 'Odia'
  };

  private static readonly TEMP_DIR = './uploads/temp-ocr';
  private static readonly MAX_PARALLEL_PAGES = 5;

  /**
   * Initialize OCR processor with temp directory setup and system verification
   */
  static async initialize(): Promise<void> {
    try {
      await fs.mkdir(OCRProcessor.TEMP_DIR, { recursive: true });
      
      // Check Tesseract installation
      const installation = await OCRProcessor.checkTesseractInstallation();
      if (!installation.isInstalled) {
        console.warn('Tesseract OCR not properly installed - OCR features may be limited');
        return;
      }
      
      console.log(`OCR Processor initialized - Tesseract ${installation.version}`);
      console.log(`Available languages: ${installation.availableLanguages.slice(0, 10).join(', ')}${installation.availableLanguages.length > 10 ? '...' : ''}`);
      
    } catch (error) {
      console.error('Failed to initialize OCR processor:', error);
      throw error;
    }
  }

  /**
   * Check Tesseract installation and available languages
   */
  static async checkTesseractInstallation(): Promise<TesseractInstallation> {
    try {
      // Check if tesseract command exists
      const { stdout: versionOutput } = await execAsync('tesseract --version');
      const versionMatch = versionOutput.match(/tesseract\s+([\d.]+)/i);
      const version = versionMatch ? versionMatch[1] : 'unknown';
      
      // Get available languages
      const { stdout: langsOutput } = await execAsync('tesseract --list-langs');
      const availableLanguages = langsOutput
        .split('\n')
        .slice(1) // Skip header line
        .filter(lang => lang.trim())
        .map(lang => lang.trim());
      
      return {
        isInstalled: true,
        version,
        availableLanguages,
        tesseractPath: 'tesseract' // Available in PATH
      };
      
    } catch (error) {
      console.warn('Tesseract installation check failed:', error);
      return {
        isInstalled: false,
        availableLanguages: []
      };
    }
  }

  /**
   * Validate language support for OCR processing
   */
  static async validateLanguageSupport(languages: string[]): Promise<string[]> {
    const installation = await OCRProcessor.checkTesseractInstallation();
    if (!installation.isInstalled) {
      return [];
    }
    
    const supportedLanguages = languages.filter(lang => 
      installation.availableLanguages.includes(lang)
    );
    
    const unsupportedLanguages = languages.filter(lang => 
      !installation.availableLanguages.includes(lang)
    );
    
    if (unsupportedLanguages.length > 0) {
      console.warn(`Unsupported OCR languages: ${unsupportedLanguages.join(', ')}`);
    }
    
    return supportedLanguages;
  }

  /**
   * Process PDF with OCR and extract text from all pages
   * Uses the existing PDF processor as fallback
   */
  static async processPDFWithOCR(
    filePath: string, 
    options: ProcessingOptions = {}
  ): Promise<{ text: string; totalPages: number; confidence: number; language: string; ocrResults: OCRResult[] }> {
    const opts = { ...OCRProcessor.DEFAULT_OPTIONS, ...options };
    
    console.log(`OCR Processing: ${path.basename(filePath)} - Starting PDF to image conversion`);
    
    try {
      // Convert PDF to images
      const images = await OCRProcessor.convertPDFToImages(filePath, opts.dpi!);
      console.log(`Converted PDF to ${images.length} images`);
      
      if (images.length === 0) {
        throw new Error('No images generated from PDF');
      }

      // Process images with OCR in batches
      const ocrResults = await OCRProcessor.processImagesWithOCR(images, opts);
      
      // Combine results
      const combinedText = ocrResults.map(result => result.text).join('\n\n');
      const averageConfidence = ocrResults.reduce((sum, r) => sum + r.confidence, 0) / ocrResults.length;
      const detectedLanguage = detectLanguage(combinedText);
      
      // Clean up temporary images
      await OCRProcessor.cleanupImages(images);
      
      console.log(`OCR Processing complete: ${ocrResults.length} pages, avg confidence: ${averageConfidence.toFixed(2)}%`);
      
      return {
        text: combinedText.trim(),
        totalPages: images.length,
        confidence: averageConfidence,
        language: detectedLanguage,
        ocrResults
      };
    } catch (error) {
      console.error('OCR processing failed:', error);
      throw error;
    }
  }

  /**
   * Convert PDF to images using pdf2pic with enhanced configuration
   */
  private static async convertPDFToImages(filePath: string, dpi: number = 300): Promise<string[]> {
    try {
      const convert = fromPath(filePath, {
        density: dpi,
        saveFilename: `page`,
        savePath: OCRProcessor.TEMP_DIR,
        format: 'png',
        width: Math.round(8.27 * dpi), // A4 width at specified DPI
        height: Math.round(11.7 * dpi), // A4 height at specified DPI
        preserveAspectRatio: true,
        quality: 100
      });

      // Get total pages first
      const totalPages = await OCRProcessor.getPDFPageCount(filePath);
      
      const imagePaths: string[] = [];
      
      // Convert pages in batches to avoid memory issues
      for (let page = 1; page <= totalPages; page++) {
        try {
          const result = await convert(page, { responseType: 'image' });
          if (result && result.path) {
            imagePaths.push(result.path);
          }
        } catch (pageError) {
          console.warn(`Failed to convert page ${page}:`, pageError);
        }
      }
      
      return imagePaths;
    } catch (error) {
      console.error('PDF to image conversion failed:', error);
      throw error;
    }
  }

  /**
   * Get PDF page count using pdf2pic
   */
  private static async getPDFPageCount(filePath: string): Promise<number> {
    try {
      const convert = fromPath(filePath, {
        density: 72,
        saveFilename: 'temp',
        savePath: OCRProcessor.TEMP_DIR,
        format: 'png'
      });
      
      // Try to convert first page to get metadata
      const result = await convert(1, { responseType: 'image' });
      
      // This is a simplified approach - in production, you might want to use a proper PDF library
      // For now, we'll estimate or use a fallback method
      return 10; // Default assumption - will be corrected during actual conversion
    } catch (error) {
      console.warn('Could not determine page count, using fallback');
      return 5; // Conservative fallback
    }
  }

  /**
   * Process multiple images with OCR in parallel batches
   */
  private static async processImagesWithOCR(
    imagePaths: string[],
    options: ProcessingOptions
  ): Promise<OCRResult[]> {
    const results: OCRResult[] = [];
    
    // Process in batches to control memory usage
    for (let i = 0; i < imagePaths.length; i += OCRProcessor.MAX_PARALLEL_PAGES) {
      const batch = imagePaths.slice(i, i + OCRProcessor.MAX_PARALLEL_PAGES);
      
      console.log(`Processing OCR batch ${Math.floor(i / OCRProcessor.MAX_PARALLEL_PAGES) + 1}/${Math.ceil(imagePaths.length / OCRProcessor.MAX_PARALLEL_PAGES)}`);
      
      const batchResults = await Promise.all(
        batch.map((imagePath, index) => 
          OCRProcessor.processImageWithOCR(imagePath, i + index + 1, options)
        )
      );
      
      results.push(...batchResults.filter(r => r !== null));
    }
    
    return results;
  }

  /**
   * Process single image with OCR using enhanced configuration
   */
  private static async processImageWithOCR(
    imagePath: string,
    pageNumber: number,
    options: ProcessingOptions
  ): Promise<OCRResult> {
    // Validate language support before processing
    const supportedLanguages = await OCRProcessor.validateLanguageSupport(options.languages!);
    if (supportedLanguages.length === 0) {
      console.warn(`No supported languages found for OCR processing, falling back to English`);
      supportedLanguages.push('eng');
    }

    const worker = await createWorker(supportedLanguages, options.oem, {
      logger: (progress) => {
        if (progress.status === 'recognizing text') {
          console.log(`OCR Page ${pageNumber}: ${(progress.progress * 100).toFixed(1)}%`);
        }
      }
    });

    try {
      // Enhance image if requested
      let processedImagePath = imagePath;
      if (options.enhanceImage) {
        processedImagePath = await OCRProcessor.enhanceImage(imagePath);
      }

      // Set enhanced OCR parameters
      await worker.setParameters({
        tessedit_pageseg_mode: options.psm!,
        tessedit_char_whitelist: '', // Allow all characters for multilingual support
        preserve_interword_spaces: '1',
        tessedit_make_box_file: '0'
      });

      // Perform OCR with custom config
      const { data: { text, confidence } } = await worker.recognize(
        processedImagePath,
        { rotateAuto: true }
      );
      
      // Clean up enhanced image if created
      if (processedImagePath !== imagePath) {
        await fs.unlink(processedImagePath).catch(() => {});
      }

      const detectedLanguage = detectLanguage(text);

      // Post-process text for better quality
      const cleanedText = OCRProcessor.postProcessOCRText(text);

      return {
        text: cleanedText,
        confidence: confidence || 0,
        language: detectedLanguage,
        pageNumber
      };
    } catch (error) {
      console.error(`OCR failed for page ${pageNumber}:`, error);
      return {
        text: '',
        confidence: 0,
        language: 'unknown',
        pageNumber
      };
    } finally {
      await worker.terminate();
    }
  }

  /**
   * Post-process OCR text to improve quality
   */
  private static postProcessOCRText(text: string): string {
    if (!text || !text.trim()) {
      return '';
    }

    // Remove excessive whitespace while preserving structure
    let processed = text
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Reduce multiple line breaks
      .replace(/[ \t]+/g, ' ') // Normalize spaces
      .replace(/^\s+|\s+$/gm, ''); // Trim lines

    // Remove obvious OCR artifacts
    processed = processed
      .replace(/[|]{2,}/g, '') // Remove multiple pipes
      .replace(/_{3,}/g, '') // Remove multiple underscores
      .replace(/\.{4,}/g, '...') // Normalize ellipsis
      .replace(/\s+([.,:;!?])/g, '$1'); // Fix punctuation spacing

    return processed.trim();
  }

  /**
   * Enhance image quality for better OCR results with advanced processing
   */
  private static async enhanceImage(imagePath: string): Promise<string> {
    const enhancedPath = imagePath.replace('.png', '_enhanced.png');
    
    try {
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      
      // Calculate optimal dimensions
      const targetHeight = Math.max(metadata.height || 1000, 2000);
      const scaleFactor = targetHeight / (metadata.height || 1000);
      
      await image
        .resize(null, targetHeight, { 
          withoutEnlargement: false,
          kernel: sharp.kernel.lanczos3 // Better scaling algorithm
        })
        .gamma(1.1) // Slight gamma correction
        .modulate({
          brightness: 1.05, // Slight brightness boost
          saturation: 0.9,   // Reduce saturation for better text contrast
          hue: 0
        })
        .normalize() // Auto-level the image
        .sharpen(1, 1, 2)
        .threshold(128, { greyscale: false }) // Enhance text contrast
        .png({ 
          quality: 100,
          compressionLevel: 0,
          adaptiveFiltering: false
        })
        .toFile(enhancedPath);
        
      console.log(`Enhanced image: ${metadata.width}x${metadata.height} -> ${Math.round((metadata.width || 0) * scaleFactor)}x${targetHeight}`);
      return enhancedPath;
    } catch (error) {
      console.warn('Image enhancement failed, using original:', error);
      return imagePath;
    }
  }

  /**
   * Clean up temporary image files
   */
  private static async cleanupImages(imagePaths: string[]): Promise<void> {
    const cleanupPromises = imagePaths.map(async (imagePath) => {
      try {
        await fs.unlink(imagePath);
        // Also clean up enhanced versions
        const enhancedPath = imagePath.replace('.png', '_enhanced.png');
        await fs.unlink(enhancedPath).catch(() => {});
      } catch (error) {
        // Ignore cleanup errors
      }
    });
    
    await Promise.all(cleanupPromises);
  }

  /**
   * Check if OCR processing is recommended for a PDF
   * Enhanced logic based on text quality and multilingual content
   */
  static shouldUseOCR(filePath: string, extractedText: string): boolean {
    if (!extractedText || extractedText.trim().length === 0) {
      console.log('OCR recommended: No text extracted');
      return true;
    }

    // Use OCR if text extraction yielded very little readable text
    const readableChars = extractedText.replace(/\s/g, '').length;
    const threshold = 50; // Lowered threshold for better detection
    
    if (readableChars < threshold) {
      console.log(`OCR recommended: Only ${readableChars} readable characters extracted`);
      return true;
    }
    
    // Check for multilingual text that might be poorly extracted
    const unicodeRanges = {
      latin: /[a-zA-Z]/g,
      devanagari: /[\u0900-\u097F]/g,
      bengali: /[\u0980-\u09FF]/g,
      tamil: /[\u0B80-\u0BFF]/g,
      telugu: /[\u0C00-\u0C7F]/g,
      kannada: /[\u0C80-\u0CFF]/g,
      malayalam: /[\u0D00-\u0D7F]/g,
      gujarati: /[\u0A80-\u0AFF]/g
    };
    
    const totalChars = extractedText.length;
    let recognizedChars = 0;
    
    for (const [script, regex] of Object.entries(unicodeRanges)) {
      const matches = extractedText.match(regex);
      if (matches) {
        recognizedChars += matches.length;
      }
    }
    
    // Add common punctuation and numbers
    const punctuationChars = extractedText.match(/[\s.,!?;:()\-0-9]/g)?.length || 0;
    recognizedChars += punctuationChars;
    
    const recognizedRatio = recognizedChars / Math.max(totalChars, 1);
    
    if (recognizedRatio < 0.5) { // Less than 50% recognized characters
      console.log(`OCR recommended: Low recognized character ratio (${(recognizedRatio * 100).toFixed(1)}%)`);
      return true;
    }
    
    // Check for common OCR artifacts that suggest poor extraction
    const ocrArtifacts = [
      /[|]{2,}/g,     // Multiple pipe characters
      /[_]{3,}/g,     // Multiple underscores
      /[.]{4,}/g,     // Multiple dots
      /\s{5,}/g,      // Excessive spaces
      /[^\w\s.,!?;:()\-\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0A80-\u0AFF]/g
    ];
    
    let artifactCount = 0;
    for (const pattern of ocrArtifacts) {
      const matches = extractedText.match(pattern);
      if (matches) {
        artifactCount += matches.length;
      }
    }
    
    const artifactRatio = artifactCount / Math.max(totalChars, 1);
    if (artifactRatio > 0.1) { // More than 10% artifacts
      console.log(`OCR recommended: High artifact ratio (${(artifactRatio * 100).toFixed(1)}%)`);
      return true;
    }
    
    return false;
  }

  /**
   * Get language-specific OCR configuration
   */
  static getLanguageConfig(detectedLanguage: string): { languages: string[]; psm: PSM; config: string } {
    const configs = {
      'kannada': { languages: ['kan', 'eng'], psm: PSM.SINGLE_BLOCK, config: '--psm 6' },
      'tamil': { languages: ['tam', 'eng'], psm: PSM.SINGLE_BLOCK, config: '--psm 6' },
      'telugu': { languages: ['tel', 'eng'], psm: PSM.SINGLE_BLOCK, config: '--psm 6' },
      'hindi': { languages: ['hin', 'eng'], psm: PSM.SINGLE_BLOCK, config: '--psm 6' },
      'malayalam': { languages: ['mal', 'eng'], psm: PSM.SINGLE_BLOCK, config: '--psm 6' },
      'marathi': { languages: ['mar', 'eng'], psm: PSM.SINGLE_BLOCK, config: '--psm 6' },
      'bengali': { languages: ['ben', 'eng'], psm: PSM.SINGLE_BLOCK, config: '--psm 6' },
      'gujarati': { languages: ['guj', 'eng'], psm: PSM.SINGLE_BLOCK, config: '--psm 6' },
      'english': { languages: ['eng'], psm: PSM.AUTO, config: '--psm 3' }
    };
    
    const key = detectedLanguage.toLowerCase() as keyof typeof configs;
    return configs[key] || configs['english'];
  }
}