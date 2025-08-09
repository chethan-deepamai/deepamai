import { ChromaApi, Collection } from 'chromadb';
import { BaseVectorProvider, VectorSearchResult, VectorDocument, VectorConfig } from "./base.js";

export interface ChromaConfig extends VectorConfig {
  host?: string;
  port?: number;
  collectionName: string;
  ssl?: boolean;
}

export class ChromaProvider extends BaseVectorProvider {
  private client: ChromaApi;
  private collection: Collection | null = null;
  private collectionName: string;

  constructor(config: ChromaConfig) {
    super(config);
    this.collectionName = config.collectionName;
    
    const url = config.ssl 
      ? `https://${config.host || 'localhost'}:${config.port || 8000}`
      : `http://${config.host || 'localhost'}:${config.port || 8000}`;
      
    this.client = new ChromaApi({ url });
  }

  async initialize(): Promise<void> {
    try {
      // Get or create collection
      try {
        this.collection = await this.client.getCollection({
          name: this.collectionName,
        });
      } catch {
        // Collection doesn't exist, create it
        this.collection = await this.client.createCollection({
          name: this.collectionName,
          metadata: { dimension: this.config.dimension },
        });
      }
    } catch (error) {
      console.error('Failed to initialize Chroma:', error);
      throw new Error(`Chroma initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async addDocuments(documents: VectorDocument[]): Promise<void> {
    try {
      if (!this.collection) {
        throw new Error('Chroma collection not initialized');
      }

      await this.collection.add({
        ids: documents.map(doc => doc.id),
        embeddings: documents.map(doc => doc.embedding),
        documents: documents.map(doc => doc.content),
        metadatas: documents.map(doc => doc.metadata || {}),
      });
    } catch (error) {
      console.error('Failed to add documents to Chroma:', error);
      throw new Error(`Failed to add documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async search(query: number[], topK?: number): Promise<VectorSearchResult[]> {
    try {
      if (!this.collection) {
        throw new Error('Chroma collection not initialized');
      }

      const k = topK || this.config.topK || 5;
      const results = await this.collection.query({
        queryEmbeddings: [query],
        nResults: k,
        include: ['documents', 'metadatas', 'distances'],
      });

      const searchResults: VectorSearchResult[] = [];
      
      if (results.ids && results.ids[0] && results.documents && results.documents[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          const score = results.distances && results.distances[0] 
            ? 1 - results.distances[0][i] // Convert distance to similarity
            : 0;
            
          searchResults.push({
            id: results.ids[0][i],
            content: results.documents[0][i] || '',
            score,
            metadata: results.metadatas && results.metadatas[0] 
              ? results.metadatas[0][i] as Record<string, any>
              : undefined,
          });
        }
      }

      // Filter by threshold if configured
      if (this.config.threshold) {
        return searchResults.filter(result => result.score >= this.config.threshold!);
      }

      return searchResults;
    } catch (error) {
      console.error('Chroma search failed:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(ids: string[]): Promise<void> {
    try {
      if (!this.collection) {
        throw new Error('Chroma collection not initialized');
      }

      await this.collection.delete({
        ids,
      });
    } catch (error) {
      console.error('Failed to delete documents from Chroma:', error);
      throw new Error(`Failed to delete documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async clear(): Promise<void> {
    try {
      if (!this.collection) {
        throw new Error('Chroma collection not initialized');
      }

      // Delete the collection and recreate it
      await this.client.deleteCollection({ name: this.collectionName });
      
      this.collection = await this.client.createCollection({
        name: this.collectionName,
        metadata: { dimension: this.config.dimension },
      });
    } catch (error) {
      console.error('Failed to clear Chroma collection:', error);
      throw new Error(`Failed to clear collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDocumentCount(): Promise<number> {
    try {
      if (!this.collection) {
        throw new Error('Chroma collection not initialized');
      }

      const count = await this.collection.count();
      return count;
    } catch (error) {
      console.error('Failed to get document count from Chroma:', error);
      return 0;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.listCollections();
      return true;
    } catch (error) {
      console.error('Chroma connection test failed:', error);
      return false;
    }
  }
}
