import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { upload, deleteFile, getFileExtension, getFileSize } from "./utils/file-upload.js";
import { DocumentProcessor } from "./services/document-processor.js";
import { BatchProcessor } from "./services/batch-processor.js";
import { ConfigService } from "./services/config-service.js";
import { LLMProviderFactory } from "./providers/llm/factory.js";
import { VectorProviderFactory } from "./providers/vector/factory.js";
import { EmbeddingProviderFactory } from "./providers/embedding/factory.js";
import { OCRProcessor } from "./services/ocr-processor.js";
import { insertConfigurationSchema, insertDocumentSchema, insertChatSessionSchema, insertChatMessageSchema } from "@shared/schema.js";

export async function registerRoutes(app: Express): Promise<Server> {
  const configService = new ConfigService(storage);

  // Initialize default configuration if none exists
  try {
    const activeConfig = await storage.getActiveConfiguration();
    if (!activeConfig) {
      // Create default configuration from environment
      const defaultConfig = {
        name: "Default Configuration",
        llmProvider: "openai",
        llmConfig: {
          apiKey: process.env.OPENAI_API_KEY || "",
          model: "gpt-4o",
          temperature: 0.7,
          maxTokens: 2048,
        },
        vectorProvider: "faiss",
        vectorConfig: {
          dimension: 1536,
          indexPath: "./data/faiss_index",
          indexType: "IndexFlatIP",
          topK: 5,
        },
        embeddingProvider: "openai",
        embeddingConfig: {
          apiKey: process.env.OPENAI_API_KEY || "",
          model: "text-embedding-ada-002",
          dimension: 1536,
        },
        isActive: true,
      };

      if (process.env.OPENAI_API_KEY) {
        await storage.createConfiguration(defaultConfig);
      }
    }
  } catch (error) {
    console.warn('Failed to initialize default configuration:', error);
  }

  // Configuration endpoints
  app.get("/api/configurations", async (req, res) => {
    try {
      const configs = await storage.getUserConfigurations(req.query.userId as string || "default");
      res.json(configs);
    } catch (error) {
      console.error('Failed to get configurations:', error);
      res.status(500).json({ message: "Failed to get configurations" });
    }
  });

  app.post("/api/configurations", async (req, res) => {
    try {
      const configData = insertConfigurationSchema.parse(req.body);
      const config = await configService.createConfiguration(configData);
      res.json(config);
    } catch (error) {
      console.error('Failed to create configuration:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create configuration" });
    }
  });

  app.put("/api/configurations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const config = await configService.updateConfiguration(id, updates);
      res.json(config);
    } catch (error) {
      console.error('Failed to update configuration:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update configuration" });
    }
  });

  app.post("/api/configurations/:id/activate", async (req, res) => {
    try {
      const { id } = req.params;
      await configService.setActiveConfiguration(id, req.body.userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to activate configuration:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to activate configuration" });
    }
  });

  app.delete("/api/configurations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteConfiguration(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete configuration:', error);
      res.status(500).json({ message: "Failed to delete configuration" });
    }
  });

  // System status endpoint
  app.get("/api/system/status", async (req, res) => {
    try {
      const status = await configService.getSystemStatus();
      res.json(status);
    } catch (error) {
      console.error('Failed to get system status:', error);
      res.status(500).json({ message: "Failed to get system status" });
    }
  });

  // Document endpoints
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      console.error('Failed to get documents:', error);
      res.status(500).json({ message: "Failed to get documents" });
    }
  });

  app.post("/api/documents/upload", upload.array('files', 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const uploadedDocs = [];

      // Create documents first (sequential - memory efficient)
      for (const file of files) {
        const docData = {
          filename: file.filename,
          originalName: file.originalname,
          fileType: getFileExtension(file.originalname),
          fileSize: file.size,
          filePath: file.path,
          status: "pending",
          chunks: null,
          metadata: {
            mimetype: file.mimetype,
            uploadedBy: req.body.userId || "anonymous",
          },
        };

        const document = await storage.createDocument(docData);
        uploadedDocs.push(document);
      }

      // Process files sequentially using BatchProcessor (optimized for memory)
      processFilesSequentially(uploadedDocs).catch(error => {
        console.error('Failed to process files sequentially:', error);
      });

      res.json({ documents: uploadedDocs });
    } catch (error) {
      console.error('Failed to upload documents:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to upload documents" });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const document = await storage.getDocument(id);
      
      if (document) {
        // Delete file from disk
        await deleteFile(document.filePath);
        
        // Delete document chunks from vector database
        try {
          const ragService = await configService.getActiveRAGService();
          const processor = new DocumentProcessor(
            EmbeddingProviderFactory.createFromEnvironment(),
            await VectorProviderFactory.createFromEnvironment()
          );
          await processor.deleteDocumentChunks(id);
        } catch (error) {
          console.warn('Failed to delete document chunks:', error);
        }
      }
      
      await storage.deleteDocument(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete document:', error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  app.post("/api/documents/:id/reindex", async (req, res) => {
    try {
      const { id } = req.params;
      await processDocumentAsync(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to reindex document:', error);
      res.status(500).json({ message: "Failed to reindex document" });
    }
  });

  app.post("/api/documents/clear-all", async (req, res) => {
    try {
      const ragService = await configService.getActiveRAGService();
      const processor = new DocumentProcessor(
        EmbeddingProviderFactory.createFromEnvironment(),
        await VectorProviderFactory.createFromEnvironment()
      );
      
      // Clear all documents from vector database and file system
      await processor.clearAllDocuments();
      
      // Clear all documents from storage
      await storage.clearAllDocuments();
      
      res.json({ success: true, message: "All documents cleared successfully" });
    } catch (error) {
      console.error('Failed to clear all documents:', error);
      res.status(500).json({ message: "Failed to clear all documents" });
    }
  });

  // Chat endpoints
  app.get("/api/chat/sessions", async (req, res) => {
    try {
      const sessions = await storage.getUserChatSessions(req.query.userId as string || "default");
      res.json(sessions);
    } catch (error) {
      console.error('Failed to get chat sessions:', error);
      res.status(500).json({ message: "Failed to get chat sessions" });
    }
  });

  app.post("/api/chat/sessions", async (req, res) => {
    try {
      const sessionData = insertChatSessionSchema.parse(req.body);
      const session = await storage.createChatSession(sessionData);
      res.json(session);
    } catch (error) {
      console.error('Failed to create chat session:', error);
      res.status(400).json({ message: "Failed to create chat session" });
    }
  });

  app.get("/api/chat/sessions/:id/messages", async (req, res) => {
    try {
      const { id } = req.params;
      const messages = await storage.getSessionMessages(id);
      res.json(messages);
    } catch (error) {
      console.error('Failed to get chat messages:', error);
      res.status(500).json({ message: "Failed to get chat messages" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, sessionId, history = [] } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      const ragService = await configService.getActiveRAGService();
      const response = await ragService.query(message, history);

      // Save user message
      if (sessionId) {
        await storage.createChatMessage({
          sessionId,
          role: "user",
          content: message,
          metadata: null,
        });

        // Save assistant response
        await storage.createChatMessage({
          sessionId,
          role: "assistant",
          content: response.content,
          metadata: {
            sources: response.sources,
            usage: response.usage,
          },
        });
      }

      res.json(response);
    } catch (error) {
      console.error('Chat request failed:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Chat request failed" });
    }
  });

  app.post("/api/chat/stream", async (req, res) => {
    try {
      const { message, sessionId, history = [] } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const ragService = await configService.getActiveRAGService();
      
      let fullResponse = '';
      let sources: any[] = [];

      for await (const chunk of ragService.queryStream(message, history)) {
        if (chunk.sources) {
          sources = chunk.sources;
          res.write(`data: ${JSON.stringify({ type: 'sources', sources: chunk.sources })}\n\n`);
        }
        
        if (chunk.content) {
          fullResponse += chunk.content;
          res.write(`data: ${JSON.stringify({ type: 'content', content: chunk.content })}\n\n`);
        }
        
        if (chunk.done) {
          res.write(`data: ${JSON.stringify({ type: 'done', usage: chunk.usage })}\n\n`);
          
          // Save messages to database
          if (sessionId) {
            await storage.createChatMessage({
              sessionId,
              role: "user",
              content: message,
              metadata: null,
            });

            await storage.createChatMessage({
              sessionId,
              role: "assistant",
              content: fullResponse,
              metadata: {
                sources,
                usage: chunk.usage,
              },
            });
          }
          
          break;
        }
      }

      res.end();
    } catch (error) {
      console.error('Chat stream failed:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : 'Chat stream failed' })}\n\n`);
      res.end();
    }
  });

  app.delete("/api/chat/sessions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteChatSession(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete chat session:', error);
      res.status(500).json({ message: "Failed to delete chat session" });
    }
  });

  // Test connection endpoints
  app.post("/api/test/llm", async (req, res) => {
    try {
      const { provider, config } = req.body;
      const llmProvider = LLMProviderFactory.create({ type: provider, ...config });
      const isConnected = await llmProvider.testConnection();
      res.json({ connected: isConnected });
    } catch (error) {
      console.error('LLM connection test failed:', error);
      res.status(400).json({ connected: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/test/vector", async (req, res) => {
    try {
      const { provider, config } = req.body;
      const vectorProvider = await VectorProviderFactory.create({ type: provider, ...config });
      await vectorProvider.initialize();
      const isConnected = await vectorProvider.testConnection();
      res.json({ connected: isConnected });
    } catch (error) {
      console.error('Vector connection test failed:', error);
      res.status(400).json({ connected: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Helper function to process files sequentially (OPTIMIZED for memory management)
  async function processFilesSequentially(documents: any[]): Promise<void> {
    console.log(`Starting sequential processing of ${documents.length} files`);
    
    const activeConfig = await storage.getActiveConfiguration();
    if (!activeConfig) {
      console.error('No active configuration found');
      return;
    }

    const embeddingProvider = EmbeddingProviderFactory.create({
      type: activeConfig.embeddingProvider as any,
      ...(activeConfig.embeddingConfig || {}),
    });
    
    const vectorProvider = await VectorProviderFactory.create({
      type: activeConfig.vectorProvider as any,
      ...(activeConfig.vectorConfig || {}),
    });
    await vectorProvider.initialize();

    const processor = new DocumentProcessor(embeddingProvider, vectorProvider);
    const batchProcessor = new BatchProcessor(processor);
    
    // Process files one at a time with progress tracking
    await batchProcessor.processFilesWithProgress(documents, (current, total, filename) => {
      console.log(`Processing file ${current}/${total}: ${filename}`);
    });
  }

  // Helper function to process documents asynchronously
  async function processDocumentAsync(documentId: string): Promise<void> {
    try {
      await storage.updateDocument(documentId, { status: "processing" });
      
      const document = await storage.getDocument(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Get active RAG service to ensure vector provider consistency
      const ragService = await configService.getActiveRAGService();
      
      // Get the same providers used by RAG service
      const activeConfig = await storage.getActiveConfiguration();
      if (!activeConfig) {
        throw new Error('No active configuration found');
      }
      
      const embeddingProvider = EmbeddingProviderFactory.create({
        type: activeConfig.embeddingProvider as any,
        ...(activeConfig.embeddingConfig || {}),
      });
      
      const vectorProvider = await VectorProviderFactory.create({
        type: activeConfig.vectorProvider as any,
        ...(activeConfig.vectorConfig || {}),
      });
      await vectorProvider.initialize();

      const processor = new DocumentProcessor(embeddingProvider, vectorProvider);
      const chunks = await processor.processDocument(document);

      await storage.updateDocument(documentId, {
        status: "indexed",
        chunks: chunks.map(chunk => ({
          id: chunk.id,
          content: chunk.content,
          metadata: chunk.metadata || {},
        })),
      });
    } catch (error) {
      console.error('Document processing failed:', error);
      await storage.updateDocument(documentId, { 
        status: "error",
        metadata: { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      });
    }
  }

  // OCR Testing endpoint
  app.post("/api/test/ocr", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { path: filePath, filename } = req.file;
      console.log(`Testing OCR on: ${filename}`);

      // Initialize OCR processor
      await OCRProcessor.initialize();
      
      // Check Tesseract installation
      const installation = await OCRProcessor.checkTesseractInstallation();
      if (!installation.isInstalled) {
        return res.status(503).json({ 
          error: 'Tesseract OCR not available',
          details: 'OCR functionality requires Tesseract to be installed'
        });
      }

      // Process with OCR
      const result = await OCRProcessor.processPDFWithOCR(filePath, {
        dpi: 300,
        enhanceImage: true,
        languages: ['eng', 'hin', 'kan', 'tam', 'tel', 'mar', 'mal']
      });

      // Clean up uploaded file
      await deleteFile(filePath);

      res.json({
        success: true,
        filename,
        totalPages: result.totalPages,
        averageConfidence: result.confidence,
        detectedLanguage: result.language,
        textLength: result.text.length,
        textPreview: result.text.substring(0, 500) + '...',
        pageResults: result.ocrResults.map(page => ({
          pageNumber: page.pageNumber,
          confidence: page.confidence,
          language: page.language,
          textLength: page.text.length
        })),
        tesseractVersion: installation.version,
        availableLanguages: installation.availableLanguages
      });

    } catch (error) {
      console.error('OCR test failed:', error);
      res.status(500).json({ 
        error: 'OCR processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
