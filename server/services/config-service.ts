import { Configuration, InsertConfiguration } from "@shared/schema.js";
import { IStorage } from "../storage.js";
import { LLMProviderFactory, LLMProviderConfig } from "../providers/llm/factory.js";
import { VectorProviderFactory, VectorProviderConfig } from "../providers/vector/factory.js";
import { EmbeddingProviderFactory, EmbeddingProviderConfig } from "../providers/embedding/factory.js";
import { RAGService } from "./rag-service.js";

export class ConfigService {
  private activeRAGService: RAGService | null = null;

  constructor(private storage: IStorage) {}

  async createConfiguration(config: InsertConfiguration): Promise<Configuration> {
    // Validate configuration by testing connections
    await this.validateConfiguration({
      llmProvider: config.llmProvider,
      llmConfig: config.llmConfig,
      vectorProvider: config.vectorProvider,
      vectorConfig: config.vectorConfig,
      embeddingProvider: config.embeddingProvider,
      embeddingConfig: config.embeddingConfig,
    });

    return await this.storage.createConfiguration(config);
  }

  async updateConfiguration(id: string, updates: Partial<Configuration>): Promise<Configuration> {
    const existing = await this.storage.getConfiguration(id);
    if (!existing) {
      throw new Error('Configuration not found');
    }

    // If provider configs are being updated, validate them
    if (updates.llmConfig || updates.vectorConfig || updates.embeddingConfig) {
      await this.validateConfiguration({
        llmProvider: updates.llmProvider || existing.llmProvider,
        llmConfig: updates.llmConfig || existing.llmConfig,
        vectorProvider: updates.vectorProvider || existing.vectorProvider,
        vectorConfig: updates.vectorConfig || existing.vectorConfig,
        embeddingProvider: updates.embeddingProvider || existing.embeddingProvider,
        embeddingConfig: updates.embeddingConfig || existing.embeddingConfig,
      });
    }

    const updated = await this.storage.updateConfiguration(id, updates);

    // If this is the active configuration, reinitialize RAG service
    if (updated.isActive) {
      await this.initializeRAGService(updated);
    }

    return updated;
  }

  async setActiveConfiguration(id: string, userId?: string): Promise<void> {
    await this.storage.setActiveConfiguration(id, userId);
    
    const config = await this.storage.getConfiguration(id);
    if (config) {
      await this.initializeRAGService(config);
    }
  }

  async getActiveRAGService(): Promise<RAGService> {
    if (!this.activeRAGService) {
      const activeConfig = await this.storage.getActiveConfiguration();
      if (!activeConfig) {
        throw new Error('No active configuration found');
      }
      await this.initializeRAGService(activeConfig);
    }

    return this.activeRAGService!;
  }

  private async validateConfiguration(config: {
    llmProvider: string;
    llmConfig: any;
    vectorProvider: string;
    vectorConfig: any;
    embeddingProvider: string;
    embeddingConfig: any;
  }): Promise<void> {
    try {
      // Create provider instances
      const llmProvider = LLMProviderFactory.create({
        type: config.llmProvider as any,
        ...config.llmConfig,
      });

      const vectorProvider = await VectorProviderFactory.create({
        type: config.vectorProvider as any,
        ...config.vectorConfig,
      });

      const embeddingProvider = EmbeddingProviderFactory.create({
        type: config.embeddingProvider as any,
        ...config.embeddingConfig,
      });

      // Test connections
      const [llmTest, vectorTest, embeddingTest] = await Promise.all([
        llmProvider.testConnection(),
        vectorProvider.testConnection(),
        embeddingProvider.testConnection(),
      ]);

      if (!llmTest) {
        throw new Error('LLM provider connection failed');
      }
      if (!vectorTest) {
        throw new Error('Vector provider connection failed');
      }
      if (!embeddingTest) {
        throw new Error('Embedding provider connection failed');
      }
    } catch (error) {
      console.error('Configuration validation failed:', error);
      throw new Error(`Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async initializeRAGService(config: Configuration): Promise<void> {
    try {
      // Create provider instances
      const llmProvider = LLMProviderFactory.create({
        type: config.llmProvider as any,
        ...config.llmConfig,
      });

      const vectorProvider = await VectorProviderFactory.create({
        type: config.vectorProvider as any,
        ...config.vectorConfig,
      });

      const embeddingProvider = EmbeddingProviderFactory.create({
        type: config.embeddingProvider as any,
        ...config.embeddingConfig,
      });

      // Initialize vector provider
      await vectorProvider.initialize();

      // Create RAG service
      this.activeRAGService = new RAGService(
        llmProvider,
        vectorProvider,
        embeddingProvider
      );
    } catch (error) {
      console.error('Failed to initialize RAG service:', error);
      throw new Error(`Failed to initialize RAG service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSystemStatus(): Promise<{
    hasActiveConfig: boolean;
    llmStatus: boolean;
    vectorStatus: boolean;
    embeddingStatus: boolean;
    documentCount: number;
  }> {
    try {
      const activeConfig = await this.storage.getActiveConfiguration();
      
      if (!activeConfig) {
        return {
          hasActiveConfig: false,
          llmStatus: false,
          vectorStatus: false,
          embeddingStatus: false,
          documentCount: 0,
        };
      }

      const ragService = await this.getActiveRAGService();
      const status = await ragService.testComponents();
      
      // Get document count from storage (single source of truth)
      const documents = await this.storage.getAllDocuments();
      const documentCount = documents.length;

      return {
        hasActiveConfig: true,
        llmStatus: status.llm,
        vectorStatus: status.vector,
        embeddingStatus: status.embedding,
        documentCount,
      };
    } catch (error) {
      console.error('Failed to get system status:', error);
      return {
        hasActiveConfig: false,
        llmStatus: false,
        vectorStatus: false,
        embeddingStatus: false,
        documentCount: 0,
      };
    }
  }
}
