import { BaseLLMProvider, LLMMessage } from "../providers/llm/base.js";
import { BaseVectorProvider } from "../providers/vector/base.js";
import { BaseEmbeddingProvider } from "../providers/embedding/base.js";

export interface RAGResponse {
  content: string;
  sources: Array<{
    id: string;
    content: string;
    score: number;
    metadata?: Record<string, any>;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface RAGConfig {
  maxSources: number;
  minScore: number;
  contextWindow: number;
}

export class RAGService {
  constructor(
    private llmProvider: BaseLLMProvider,
    private vectorProvider: BaseVectorProvider,
    private embeddingProvider: BaseEmbeddingProvider,
    private config: RAGConfig = {
      maxSources: 5,
      minScore: 0.5,  // Lower threshold to allow more documents through
      contextWindow: 4000
    }
  ) {}

  async query(question: string, chatHistory: LLMMessage[] = []): Promise<RAGResponse> {
    try {
      // Generate embedding for the question
      const questionEmbedding = await this.embeddingProvider.embedText(question);
      
      // Search for relevant documents
      const searchResults = await this.vectorProvider.search(
        questionEmbedding, 
        this.config.maxSources
      );
      
      // Filter by minimum score
      const relevantSources = searchResults.filter(
        result => result.score >= this.config.minScore
      );
      
      // Build context from relevant sources
      const context = this.buildContext(relevantSources);
      
      // Prepare messages for LLM
      const messages: LLMMessage[] = [
        ...chatHistory,
        { role: 'user', content: question }
      ];
      
      // Generate response using LLM with context
      const llmResponse = await this.llmProvider.chat(messages, context);
      
      return {
        content: llmResponse.content,
        sources: relevantSources.map(source => ({
          id: source.id,
          content: source.content,
          score: source.score,
          metadata: source.metadata,
        })),
        usage: llmResponse.usage,
      };
    } catch (error) {
      console.error('RAG query failed:', error);
      throw new Error(`RAG query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async *queryStream(question: string, chatHistory: LLMMessage[] = []): AsyncIterable<{
    content?: string;
    sources?: RAGResponse['sources'];
    done: boolean;
    usage?: RAGResponse['usage'];
  }> {
    try {
      // Generate embedding for the question
      const questionEmbedding = await this.embeddingProvider.embedText(question);
      
      // Search for relevant documents
      const searchResults = await this.vectorProvider.search(
        questionEmbedding, 
        this.config.maxSources
      );
      
      // Filter by minimum score
      const relevantSources = searchResults.filter(
        result => result.score >= this.config.minScore
      );
      
      // Yield sources first
      yield {
        sources: relevantSources.map(source => ({
          id: source.id,
          content: source.content,
          score: source.score,
          metadata: source.metadata,
        })),
        done: false,
      };
      
      // Build context from relevant sources
      const context = this.buildContext(relevantSources);
      
      // Prepare messages for LLM
      const messages: LLMMessage[] = [
        ...chatHistory,
        { role: 'user', content: question }
      ];
      
      // Stream response from LLM
      for await (const chunk of this.llmProvider.chatStream(messages, context)) {
        yield {
          content: chunk.content,
          done: chunk.done,
          usage: chunk.usage,
        };
      }
    } catch (error) {
      console.error('RAG stream query failed:', error);
      throw new Error(`RAG stream query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildContext(sources: Array<{content: string}>): string[] {
    const context: string[] = [];
    let totalLength = 0;
    
    for (const source of sources) {
      // Check if adding this source would exceed context window
      if (totalLength + source.content.length > this.config.contextWindow) {
        // Try to fit partial content
        const remainingSpace = this.config.contextWindow - totalLength;
        if (remainingSpace > 100) { // Only add if there's meaningful space
          context.push(source.content.substring(0, remainingSpace) + '...');
        }
        break;
      }
      
      context.push(source.content);
      totalLength += source.content.length;
    }
    
    return context;
  }

  async testComponents(): Promise<{
    llm: boolean;
    vector: boolean;
    embedding: boolean;
  }> {
    try {
      const [llmTest, vectorTest, embeddingTest] = await Promise.all([
        this.llmProvider.testConnection(),
        this.vectorProvider.testConnection(),
        this.embeddingProvider.testConnection(),
      ]);
      
      return {
        llm: llmTest,
        vector: vectorTest,
        embedding: embeddingTest,
      };
    } catch (error) {
      console.error('Component test failed:', error);
      return {
        llm: false,
        vector: false,
        embedding: false,
      };
    }
  }
}
