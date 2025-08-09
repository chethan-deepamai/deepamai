import { BaseEmbeddingProvider } from "./base.js";
import { OpenAIEmbeddingProvider, OpenAIEmbeddingConfig } from "./openai.js";

export type EmbeddingProviderType = 'openai';

export type EmbeddingProviderConfig = 
  | ({ type: 'openai' } & OpenAIEmbeddingConfig);

export class EmbeddingProviderFactory {
  static create(config: EmbeddingProviderConfig): BaseEmbeddingProvider {
    switch (config.type) {
      case 'openai':
        return new OpenAIEmbeddingProvider(config);
      default:
        throw new Error(`Unsupported embedding provider type: ${(config as any).type}`);
    }
  }

  static createFromEnvironment(): BaseEmbeddingProvider {
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY is required for embedding provider');
    }

    return new OpenAIEmbeddingProvider({
      apiKey: openaiKey,
      model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-ada-002",
      dimension: parseInt(process.env.VECTOR_DIMENSION || "1536"),
    });
  }
}
