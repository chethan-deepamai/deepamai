import { BaseVectorProvider } from "./base.js";
import { FaissProvider, FaissConfig } from "./faiss.js";

export type VectorProviderType = 'faiss' | 'pinecone' | 'chroma';

// Define Pinecone config type without importing the module
export interface PineconeConfig {
  apiKey: string;
  environment: string;
  indexName: string;
  dimension: number;
  topK?: number;
  threshold?: number;
}

// Define Chroma config type without importing the module
export interface ChromaConfig {
  host?: string;
  port?: number;
  collectionName: string;
  ssl?: boolean;
  dimension: number;
  topK?: number;
  threshold?: number;
}

export type VectorProviderConfig = 
  | ({ type: 'faiss' } & FaissConfig)
  | ({ type: 'pinecone' } & PineconeConfig)
  | ({ type: 'chroma' } & ChromaConfig);

export class VectorProviderFactory {
  static async create(config: VectorProviderConfig): Promise<BaseVectorProvider> {
    switch (config.type) {
      case 'faiss':
        return new FaissProvider(config);
      case 'pinecone':
        try {
          const { PineconeProvider } = await import("./pinecone.js");
          return new PineconeProvider(config);
        } catch (error) {
          throw new Error(`Pinecone provider is not available. Install @pinecone-database/pinecone to use this provider. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      case 'chroma':
        try {
          const { ChromaProvider } = await import("./chroma.js");
          return new ChromaProvider(config);
        } catch (error) {
          throw new Error(`Chroma provider is not available. Install chromadb to use this provider. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      default:
        throw new Error(`Unsupported vector provider type: ${(config as any).type}`);
    }
  }

  static async createFromEnvironment(): Promise<BaseVectorProvider> {
    // Default to FAISS if no specific configuration
    const vectorProvider = process.env.VECTOR_PROVIDER || 'faiss';
    
    switch (vectorProvider.toLowerCase()) {
      case 'faiss':
        return new FaissProvider({
          dimension: parseInt(process.env.VECTOR_DIMENSION || "1536"),
          indexPath: process.env.FAISS_INDEX_PATH || "./data/faiss_index",
          indexType: (process.env.FAISS_INDEX_TYPE as any) || 'IndexFlatIP',
          topK: parseInt(process.env.VECTOR_TOP_K || "5"),
          threshold: parseFloat(process.env.VECTOR_THRESHOLD || "0"),
        });

      case 'pinecone':
        if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_ENVIRONMENT || !process.env.PINECONE_INDEX_NAME) {
          throw new Error('Pinecone requires PINECONE_API_KEY, PINECONE_ENVIRONMENT, and PINECONE_INDEX_NAME');
        }
        try {
          const { PineconeProvider } = await import("./pinecone.js");
          return new PineconeProvider({
            apiKey: process.env.PINECONE_API_KEY,
            environment: process.env.PINECONE_ENVIRONMENT,
            indexName: process.env.PINECONE_INDEX_NAME,
            dimension: parseInt(process.env.VECTOR_DIMENSION || "1536"),
            topK: parseInt(process.env.VECTOR_TOP_K || "5"),
            threshold: parseFloat(process.env.VECTOR_THRESHOLD || "0"),
          });
        } catch (error) {
          throw new Error(`Pinecone provider is not available. Install @pinecone-database/pinecone to use this provider. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

      case 'chroma':
        try {
          const { ChromaProvider } = await import("./chroma.js");
          return new ChromaProvider({
            host: process.env.CHROMA_HOST || 'localhost',
            port: parseInt(process.env.CHROMA_PORT || "8000"),
            collectionName: process.env.CHROMA_COLLECTION_NAME || 'documents',
            ssl: process.env.CHROMA_SSL === 'true',
            dimension: parseInt(process.env.VECTOR_DIMENSION || "1536"),
            topK: parseInt(process.env.VECTOR_TOP_K || "5"),
            threshold: parseFloat(process.env.VECTOR_THRESHOLD || "0"),
          });
        } catch (error) {
          throw new Error(`Chroma provider is not available. Install chromadb to use this provider. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

      default:
        throw new Error(`Unsupported vector provider: ${vectorProvider}`);
    }
  }
}
