export interface EmbeddingResponse {
  embeddings: number[][];
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
  model?: string;
}

export interface EmbeddingConfig {
  model: string;
  dimension: number;
}

export abstract class BaseEmbeddingProvider {
  protected config: EmbeddingConfig;

  constructor(config: EmbeddingConfig) {
    this.config = config;
  }

  abstract embedTexts(texts: string[]): Promise<EmbeddingResponse>;
  abstract embedText(text: string): Promise<number[]>;
  abstract testConnection(): Promise<boolean>;
}
