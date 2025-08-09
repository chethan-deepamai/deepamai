import { BaseLLMProvider } from "./base.js";
import { OpenAIProvider, OpenAIConfig } from "./openai.js";
import { AzureOpenAIProvider, AzureOpenAIConfig } from "./azure-openai.js";
import { AnthropicProvider, AnthropicConfig } from "./anthropic.js";

export type LLMProviderType = 'openai' | 'azure-openai' | 'anthropic';

export type LLMProviderConfig = 
  | ({ type: 'openai' } & OpenAIConfig)
  | ({ type: 'azure-openai' } & AzureOpenAIConfig)
  | ({ type: 'anthropic' } & AnthropicConfig);

export class LLMProviderFactory {
  static create(config: LLMProviderConfig): BaseLLMProvider {
    switch (config.type) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'azure-openai':
        return new AzureOpenAIProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      default:
        throw new Error(`Unsupported LLM provider type: ${(config as any).type}`);
    }
  }

  static createFromEnvironment(): BaseLLMProvider {
    // Default to OpenAI if environment variables are available
    const openaiKey = process.env.OPENAI_API_KEY;
    const azureKey = process.env.AZURE_OPENAI_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (openaiKey) {
      return new OpenAIProvider({
        apiKey: openaiKey,
        model: process.env.OPENAI_MODEL || "gpt-4o",
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || "0.7"),
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || "2048"),
      });
    }

    if (azureKey && process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_DEPLOYMENT) {
      return new AzureOpenAIProvider({
        apiKey: azureKey,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION,
        model: process.env.AZURE_OPENAI_MODEL || "gpt-4",
        temperature: parseFloat(process.env.AZURE_OPENAI_TEMPERATURE || "0.7"),
        maxTokens: parseInt(process.env.AZURE_OPENAI_MAX_TOKENS || "2048"),
      });
    }

    if (anthropicKey) {
      return new AnthropicProvider({
        apiKey: anthropicKey,
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        temperature: parseFloat(process.env.ANTHROPIC_TEMPERATURE || "0.7"),
        maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || "2048"),
      });
    }

    throw new Error('No LLM provider configuration found in environment variables');
  }
}
