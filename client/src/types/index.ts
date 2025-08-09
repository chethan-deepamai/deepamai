export interface LLMProvider {
  type: 'openai' | 'azure-openai' | 'anthropic';
  name: string;
  icon: string;
  config: Record<string, any>;
  isActive: boolean;
  isConnected: boolean;
}

export interface VectorProvider {
  type: 'faiss' | 'pinecone' | 'chroma';
  name: string;
  icon: string;
  config: Record<string, any>;
  isActive: boolean;
  isConnected: boolean;
}

export interface EmbeddingProvider {
  type: 'openai';
  name: string;
  icon: string;
  config: Record<string, any>;
  isActive: boolean;
  isConnected: boolean;
}

export interface Configuration {
  id: string;
  name: string;
  llmProvider: string;
  llmConfig: Record<string, any>;
  vectorProvider: string;
  vectorConfig: Record<string, any>;
  embeddingProvider: string;
  embeddingConfig: Record<string, any>;
  isActive: boolean;
  createdAt: string;
}

export interface Document {
  id: string;
  filename: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  status: 'pending' | 'processing' | 'indexed' | 'error';
  chunks?: Array<{
    id: string;
    content: string;
    metadata: Record<string, any>;
  }>;
  metadata?: Record<string, any>;
  uploadedAt: string;
  processedAt?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    sources?: Array<{
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
  };
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  configurationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemStatus {
  hasActiveConfig: boolean;
  llmStatus: boolean;
  vectorStatus: boolean;
  embeddingStatus: boolean;
  documentCount: number;
}

export interface ProcessingFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export type TabType = 'chat' | 'config' | 'documents' | 'file-viewer' | 'history';
