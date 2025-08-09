import OpenAI from "openai";
import { BaseLLMProvider, LLMMessage, LLMResponse, LLMStreamResponse, LLMConfig } from "./base.js";

export interface OpenAIConfig extends LLMConfig {
  apiKey: string;
  baseURL?: string;
}

export class OpenAIProvider extends BaseLLMProvider {
  private client: OpenAI;

  constructor(config: OpenAIConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  async chat(messages: LLMMessage[], context?: string[]): Promise<LLMResponse> {
    try {
      const systemMessage = this.buildSystemMessage(context);
      const allMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemMessage },
        ...messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        }))
      ];

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await this.client.chat.completions.create({
        model: this.config.model || "gpt-4o",
        messages: allMessages,
        temperature: this.config.temperature ?? 0.7,
        max_tokens: this.config.maxTokens ?? 2048,
        top_p: this.config.topP ?? 1.0,
        stop: this.config.stop,
        stream: false,
      });

      const choice = response.choices[0];
      if (!choice.message.content) {
        throw new Error('No content in OpenAI response');
      }

      return {
        content: choice.message.content,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined,
        model: response.model,
        finishReason: choice.finish_reason || undefined,
      };
    } catch (error) {
      console.error('OpenAI chat error:', error);
      throw new Error(`OpenAI chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async *chatStream(messages: LLMMessage[], context?: string[]): AsyncIterable<LLMStreamResponse> {
    try {
      const systemMessage = this.buildSystemMessage(context);
      const allMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemMessage },
        ...messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        }))
      ];

      const stream = await this.client.chat.completions.create({
        model: this.config.model || "gpt-4o",
        messages: allMessages,
        temperature: this.config.temperature ?? 0.7,
        max_tokens: this.config.maxTokens ?? 2048,
        top_p: this.config.topP ?? 1.0,
        stop: this.config.stop,
        stream: true,
      });

      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (choice?.delta?.content) {
          yield {
            content: choice.delta.content,
            done: false,
          };
        }

        if (choice?.finish_reason) {
          yield {
            content: '',
            done: true,
            usage: chunk.usage ? {
              promptTokens: chunk.usage.prompt_tokens,
              completionTokens: chunk.usage.completion_tokens,
              totalTokens: chunk.usage.total_tokens,
            } : undefined,
          };
        }
      }
    } catch (error) {
      console.error('OpenAI stream error:', error);
      throw new Error(`OpenAI stream failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}
