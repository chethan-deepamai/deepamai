import { 
  type User, 
  type InsertUser, 
  type Configuration, 
  type InsertConfiguration,
  type Document,
  type InsertDocument,
  type ChatSession,
  type InsertChatSession,
  type ChatMessage,
  type InsertChatMessage
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Configurations
  getConfiguration(id: string): Promise<Configuration | undefined>;
  getActiveConfiguration(userId?: string): Promise<Configuration | undefined>;
  getUserConfigurations(userId: string): Promise<Configuration[]>;
  createConfiguration(config: InsertConfiguration): Promise<Configuration>;
  updateConfiguration(id: string, config: Partial<Configuration>): Promise<Configuration>;
  deleteConfiguration(id: string): Promise<void>;
  setActiveConfiguration(id: string, userId?: string): Promise<void>;

  // Documents
  getDocument(id: string): Promise<Document | undefined>;
  getAllDocuments(): Promise<Document[]>;
  getDocumentsByStatus(status: string): Promise<Document[]>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocument(id: string, doc: Partial<Document>): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
  clearAllDocuments(): Promise<void>;

  // Chat Sessions
  getChatSession(id: string): Promise<ChatSession | undefined>;
  getUserChatSessions(userId: string): Promise<ChatSession[]>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  updateChatSession(id: string, session: Partial<ChatSession>): Promise<ChatSession>;
  deleteChatSession(id: string): Promise<void>;

  // Chat Messages
  getSessionMessages(sessionId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  deleteChatMessage(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private configurations: Map<string, Configuration> = new Map();
  private documents: Map<string, Document> = new Map();
  private chatSessions: Map<string, ChatSession> = new Map();
  private chatMessages: Map<string, ChatMessage> = new Map();

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Configurations
  async getConfiguration(id: string): Promise<Configuration | undefined> {
    return this.configurations.get(id);
  }

  async getActiveConfiguration(userId?: string): Promise<Configuration | undefined> {
    return Array.from(this.configurations.values()).find(
      config => config.isActive && (!userId || config.userId === userId)
    );
  }

  async getUserConfigurations(userId: string): Promise<Configuration[]> {
    return Array.from(this.configurations.values()).filter(
      config => config.userId === userId
    );
  }

  async createConfiguration(insertConfig: InsertConfiguration): Promise<Configuration> {
    const id = randomUUID();
    const config: Configuration = { 
      ...insertConfig, 
      id, 
      createdAt: new Date()
    };
    this.configurations.set(id, config);
    return config;
  }

  async updateConfiguration(id: string, updates: Partial<Configuration>): Promise<Configuration> {
    const existing = this.configurations.get(id);
    if (!existing) throw new Error('Configuration not found');
    
    const updated = { ...existing, ...updates };
    this.configurations.set(id, updated);
    return updated;
  }

  async deleteConfiguration(id: string): Promise<void> {
    this.configurations.delete(id);
  }

  async setActiveConfiguration(id: string, userId?: string): Promise<void> {
    // Deactivate all configurations for user
    for (const [key, config] of this.configurations.entries()) {
      if (!userId || config.userId === userId) {
        this.configurations.set(key, { ...config, isActive: false });
      }
    }
    
    // Activate the specified configuration
    const config = this.configurations.get(id);
    if (config) {
      this.configurations.set(id, { ...config, isActive: true });
    }
  }

  // Documents
  async getDocument(id: string): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async getDocumentsByStatus(status: string): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(doc => doc.status === status);
  }

  async createDocument(insertDoc: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const doc: Document = { 
      ...insertDoc, 
      id, 
      uploadedAt: new Date(),
      processedAt: null
    };
    this.documents.set(id, doc);
    return doc;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
    const existing = this.documents.get(id);
    if (!existing) throw new Error('Document not found');
    
    const updated = { ...existing, ...updates };
    if (updates.status === 'indexed' && !existing.processedAt) {
      updated.processedAt = new Date();
    }
    
    this.documents.set(id, updated);
    return updated;
  }

  async deleteDocument(id: string): Promise<void> {
    this.documents.delete(id);
  }

  async clearAllDocuments(): Promise<void> {
    this.documents.clear();
  }

  // Chat Sessions
  async getChatSession(id: string): Promise<ChatSession | undefined> {
    return this.chatSessions.get(id);
  }

  async getUserChatSessions(userId: string): Promise<ChatSession[]> {
    return Array.from(this.chatSessions.values())
      .filter(session => session.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const id = randomUUID();
    const session: ChatSession = { 
      ...insertSession, 
      id, 
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.chatSessions.set(id, session);
    return session;
  }

  async updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession> {
    const existing = this.chatSessions.get(id);
    if (!existing) throw new Error('Chat session not found');
    
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.chatSessions.set(id, updated);
    return updated;
  }

  async deleteChatSession(id: string): Promise<void> {
    // Also delete all messages in the session
    for (const [key, message] of this.chatMessages.entries()) {
      if (message.sessionId === id) {
        this.chatMessages.delete(key);
      }
    }
    this.chatSessions.delete(id);
  }

  // Chat Messages
  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter(message => message.sessionId === sessionId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const message: ChatMessage = { 
      ...insertMessage, 
      id, 
      createdAt: new Date()
    };
    this.chatMessages.set(id, message);
    
    // Update session timestamp
    const session = this.chatSessions.get(message.sessionId);
    if (session) {
      this.chatSessions.set(message.sessionId, { 
        ...session, 
        updatedAt: new Date() 
      });
    }
    
    return message;
  }

  async deleteChatMessage(id: string): Promise<void> {
    this.chatMessages.delete(id);
  }
}

export const storage = new MemStorage();
