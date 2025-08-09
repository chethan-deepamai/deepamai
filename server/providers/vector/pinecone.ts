import { Pinecone } from '@pinecone-database/pinecone';
import { BaseVectorProvider, VectorSearchResult, VectorDocument, VectorConfig } from "./base.js";

export interface PineconeConfig extends VectorConfig {
  apiKey: string;
  environment: string;
  indexName: string;
}

export class PineconeProvider extends BaseVectorProvider {
  private client: Pinecone;
  private indexName: string;
  private index: any;

  constructor(config: PineconeConfig) {
    super(config);
    this.indexName = config.indexName;
    this.client = new Pinecone({
      apiKey: config.apiKey,
      environment: config.environment,
    });
  }

  async initialize(): Promise<void> {
    try {
      this.index = this.client.index(this.indexName);
      
      // Test if index exists
      await this.testConnection();
    } catch (error) {
      console.error('Failed to initialize Pinecone:', error);
      throw new Error(`Pinecone initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async addDocuments(documents: VectorDocument[]): Promise<void> {
    try {
      if (!this.index) {
        throw new Error('Pinecone index not initialized');
      }

      const vectors = documents.map(doc => ({
        id: doc.id,
        values: doc.embedding,
        metadata: {
          content: doc.content,
          ...doc.metadata,
        },
      }));

      // Upsert in batches of 100
      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await this.index.upsert(batch);
      }
    } catch (error) {
      console.error('Failed to add documents to Pinecone:', error);
      throw new Error(`Failed to add documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async search(query: number[], topK?: number): Promise<VectorSearchResult[]> {
    try {
      if (!this.index) {
        throw new Error('Pinecone index not initialized');
      }

      const k = topK || this.config.topK || 5;
      const response = await this.index.query({
        vector: query,
        topK: k,
        includeMetadata: true,
      });

      const results: VectorSearchResult[] = [];
      
      if (response.matches) {
        for (const match of response.matches) {
          if (match.metadata?.content) {
            results.push({
              id: match.id,
              content: match.metadata.content as string,
              score: match.score || 0,
              metadata: match.metadata,
            });
          }
        }
      }

      // Filter by threshold if configured
      if (this.config.threshold) {
        return results.filter(result => result.score >= this.config.threshold!);
      }

      return results;
    } catch (error) {
      console.error('Pinecone search failed:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(ids: string[]): Promise<void> {
    try {
      if (!this.index) {
        throw new Error('Pinecone index not initialized');
      }

      // Delete in batches
      const batchSize = 1000;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        await this.index.deleteMany(batch);
      }
    } catch (error) {
      console.error('Failed to delete documents from Pinecone:', error);
      throw new Error(`Failed to delete documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async clear(): Promise<void> {
    try {
      if (!this.index) {
        throw new Error('Pinecone index not initialized');
      }

      await this.index.deleteAll();
    } catch (error) {
      console.error('Failed to clear Pinecone index:', error);
      throw new Error(`Failed to clear index: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDocumentCount(): Promise<number> {
    try {
      if (!this.index) {
        throw new Error('Pinecone index not initialized');
      }

      const stats = await this.index.describeIndexStats();
      return stats.totalVectorCount || 0;
    } catch (error) {
      console.error('Failed to get document count from Pinecone:', error);
      return 0;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.index) {
        return false;
      }

      await this.index.describeIndexStats();
      return true;
    } catch (error) {
      console.error('Pinecone connection test failed:', error);
      return false;
    }
  }
}
