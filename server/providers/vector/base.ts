export interface VectorSearchResult {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export interface VectorConfig {
  dimension: number;
  topK?: number;
  threshold?: number;
}

export abstract class BaseVectorProvider {
  protected config: VectorConfig;

  constructor(config: VectorConfig) {
    this.config = config;
  }

  abstract initialize(): Promise<void>;
  abstract addDocuments(documents: VectorDocument[]): Promise<void>;
  abstract search(query: number[], topK?: number): Promise<VectorSearchResult[]>;
  abstract delete(ids: string[]): Promise<void>;
  abstract clear(): Promise<void>;
  abstract getDocumentCount(): Promise<number>;
  abstract testConnection(): Promise<boolean>;
}
