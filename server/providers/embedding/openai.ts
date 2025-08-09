import OpenAI from "openai";
import { BaseEmbeddingProvider, EmbeddingResponse, EmbeddingConfig } from "./base.js";

export interface OpenAIEmbeddingConfig extends EmbeddingConfig {
  apiKey: string;
  baseURL?: string;
}

export class OpenAIEmbeddingProvider extends BaseEmbeddingProvider {
  private client: OpenAI;

  constructor(config: OpenAIEmbeddingConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  async embedTexts(texts: string[]): Promise<EmbeddingResponse> {
    try {
      // OpenAI has a limit of ~2048 inputs per request and token limits
      // Process in smaller batches for memory efficiency
      const MAX_BATCH_SIZE = 20; // Reduced for better memory management
      
      if (texts.length <= MAX_BATCH_SIZE) {
        const response = await this.client.embeddings.create({
          model: this.config.model,
          input: texts,
        });

        return {
          embeddings: response.data.map(item => item.embedding),
          usage: response.usage ? {
            promptTokens: response.usage.prompt_tokens,
            totalTokens: response.usage.total_tokens,
          } : undefined,
          model: response.model,
        };
      }

      // Process in batches for large arrays
      const allEmbeddings: number[][] = [];
      let totalUsage = { promptTokens: 0, totalTokens: 0 };
      let responseModel = '';

      for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
        const batch = texts.slice(i, i + MAX_BATCH_SIZE);
        const response = await this.client.embeddings.create({
          model: this.config.model,
          input: batch,
        });

        allEmbeddings.push(...response.data.map(item => item.embedding));
        
        if (response.usage) {
          totalUsage.promptTokens += response.usage.prompt_tokens;
          totalUsage.totalTokens += response.usage.total_tokens;
        }
        responseModel = response.model;
        
        // Small delay to prevent rate limiting
        if (i + MAX_BATCH_SIZE < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return {
        embeddings: allEmbeddings,
        usage: totalUsage,
        model: responseModel,
      };
    } catch (error) {
      console.error('OpenAI embedding error:', error);
      throw new Error(`OpenAI embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async embedText(text: string): Promise<number[]> {
    const response = await this.embedTexts([text]);
    return response.embeddings[0];
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.embedText("test");
      return true;
    } catch (error) {
      console.error('OpenAI embedding connection test failed:', error);
      return false;
    }
  }
}
