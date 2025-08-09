export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  finishReason?: string;
}

export interface LLMStreamResponse {
  content: string;
  done: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string[];
  stream?: boolean;
}

export abstract class BaseLLMProvider {
  protected config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  abstract chat(messages: LLMMessage[], context?: string[]): Promise<LLMResponse>;
  abstract chatStream(messages: LLMMessage[], context?: string[]): AsyncIterable<LLMStreamResponse>;
  abstract testConnection(): Promise<boolean>;
  
  protected buildSystemMessage(context?: string[]): string {
    const baseMessage = "You are an AI assistant that helps people find information.";
    
    if (!context || context.length === 0) {
      return baseMessage;
    }

    return `${baseMessage}

Use the following context to answer questions. If the information is not in the context, say so clearly.

Context:
${context.join('\n\n')}`;
  }
}
