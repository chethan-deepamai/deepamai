import { BaseVectorProvider, VectorSearchResult, VectorDocument, VectorConfig } from "./base.js";
import fs from 'fs/promises';
import path from 'path';

export interface FaissConfig extends VectorConfig {
  indexPath: string;
  indexType?: 'IndexFlatIP' | 'IndexHNSWFlat' | 'IndexIVFFlat';
}

export class FaissProvider extends BaseVectorProvider {
  private faiss: any;
  private index: any;
  private documents: Map<string, VectorDocument> = new Map();
  private indexPath: string;
  private indexType: string;

  constructor(config: FaissConfig) {
    super(config);
    this.indexPath = config.indexPath;
    this.indexType = config.indexType || 'IndexFlatIP';
  }

  async initialize(): Promise<void> {
    try {
      // Dynamic import of faiss-node
      const faissModule = await import('faiss-node');
      this.faiss = faissModule.default || faissModule;
      
      // Create index based on type (only IndexFlatIP and IndexFlatL2 are available)
      switch (this.indexType) {
        case 'IndexFlatIP':
          this.index = new this.faiss.IndexFlatIP(this.config.dimension);
          break;
        case 'IndexHNSWFlat':
          // Fallback to IndexFlatIP as HNSW is not available
          console.warn('IndexHNSWFlat not available, using IndexFlatIP instead');
          this.index = new this.faiss.IndexFlatIP(this.config.dimension);
          break;
        case 'IndexIVFFlat':
          // Fallback to IndexFlatIP as IVF is not available  
          console.warn('IndexIVFFlat not available, using IndexFlatIP instead');
          this.index = new this.faiss.IndexFlatIP(this.config.dimension);
          break;
        default:
          throw new Error(`Unsupported FAISS index type: ${this.indexType}`);
      }

      // Try to load existing index
      await this.loadIndex();
      console.log(`FAISS initialized with ${this.documents.size} documents`);
    } catch (error) {
      console.error('Failed to initialize FAISS:', error);
      throw new Error(`FAISS initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async addDocuments(documents: VectorDocument[]): Promise<void> {
    try {
      if (!this.index) {
        throw new Error('FAISS index not initialized');
      }

      // Store documents in memory
      for (const doc of documents) {
        this.documents.set(doc.id, doc);
      }

      // Add embeddings to index (flatten the array for FAISS)
      const flatEmbeddings = documents.flatMap(doc => doc.embedding);
      this.index.add(flatEmbeddings);

      // Save index
      await this.saveIndex();
    } catch (error) {
      console.error('Failed to add documents to FAISS:', error);
      throw new Error(`Failed to add documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async search(query: number[], topK?: number): Promise<VectorSearchResult[]> {
    try {
      if (!this.index) {
        throw new Error('FAISS index not initialized');
      }

      // Limit k to the actual number of documents available
      const requestedK = topK || this.config.topK || 5;
      const totalDocuments = this.documents.size;
      const k = Math.min(requestedK, totalDocuments);
      
      if (k === 0) {
        console.warn('No documents available for search');
        return [];
      }
      
      const result = this.index.search(query, k);
      
      const searchResults: VectorSearchResult[] = [];
      const docArray = Array.from(this.documents.values());
      
      for (let i = 0; i < result.labels.length; i++) {
        const docIndex = result.labels[i];
        const score = result.distances[i];
        
        if (docIndex < docArray.length) {
          const doc = docArray[docIndex];
          searchResults.push({
            id: doc.id,
            content: doc.content,
            score,
            metadata: doc.metadata,
          });
        }
      }

      // Filter by threshold if configured
      if (this.config.threshold) {
        return searchResults.filter(result => result.score >= this.config.threshold!);
      }

      return searchResults;
    } catch (error) {
      console.error('FAISS search failed:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(ids: string[]): Promise<void> {
    try {
      // Remove documents from memory
      for (const id of ids) {
        this.documents.delete(id);
      }

      // Rebuild index without deleted documents
      await this.rebuildIndex();
    } catch (error) {
      console.error('Failed to delete documents from FAISS:', error);
      throw new Error(`Failed to delete documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async clear(): Promise<void> {
    try {
      // Clear documents from memory
      this.documents.clear();
      
      // Reinitialize with empty index instead of trying to recreate
      await this.initialize();
      
      console.log('FAISS index cleared successfully');
    } catch (error) {
      console.error('Failed to clear FAISS index:', error);
      throw new Error(`Failed to clear index: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDocumentCount(): Promise<number> {
    return this.documents.size;
  }

  async testConnection(): Promise<boolean> {
    try {
      return this.index !== null && this.index !== undefined;
    } catch (error) {
      console.error('FAISS connection test failed:', error);
      return false;
    }
  }

  private async loadIndex(): Promise<void> {
    try {
      const indexFile = path.join(this.indexPath, 'index.faiss');
      const docsFile = path.join(this.indexPath, 'documents.json');

      // Check if files exist
      try {
        await fs.access(indexFile);
        await fs.access(docsFile);
      } catch {
        // Files don't exist, start with empty index
        return;
      }

      // Load index using proper API
      this.index = this.faiss.Index.read(indexFile);

      // Load documents
      const docsData = await fs.readFile(docsFile, 'utf-8');
      const docsArray = JSON.parse(docsData);
      
      this.documents.clear();
      for (const doc of docsArray) {
        this.documents.set(doc.id, doc);
      }
    } catch (error) {
      console.warn('Failed to load existing FAISS index:', error);
      // Continue with empty index
    }
  }

  private async saveIndex(): Promise<void> {
    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.indexPath), { recursive: true });

      const indexFile = path.join(this.indexPath, 'index.faiss');
      const docsFile = path.join(this.indexPath, 'documents.json');

      // Save index using proper API
      this.index.write(indexFile);

      // Save documents
      const docsArray = Array.from(this.documents.values());
      await fs.writeFile(docsFile, JSON.stringify(docsArray, null, 2));
    } catch (error) {
      console.error('Failed to save FAISS index:', error);
      throw new Error(`Failed to save index: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async rebuildIndex(): Promise<void> {
    try {
      // Recreate index
      switch (this.indexType) {
        case 'IndexFlatIP':
          this.index = new this.faiss.IndexFlatIP(this.config.dimension);
          break;
        case 'IndexHNSWFlat':
          // Fallback to IndexFlatIP as HNSW is not available
          console.warn('IndexHNSWFlat not available, using IndexFlatIP instead');
          this.index = new this.faiss.IndexFlatIP(this.config.dimension);
          break;
        case 'IndexIVFFlat':
          // Fallback to IndexFlatIP as IVF is not available
          console.warn('IndexIVFFlat not available, using IndexFlatIP instead');
          this.index = new this.faiss.IndexFlatIP(this.config.dimension);
          break;
      }

      // Re-add all remaining documents
      if (this.documents.size > 0) {
        const docs = Array.from(this.documents.values());
        const flatEmbeddings = docs.flatMap(doc => doc.embedding);
        this.index.add(flatEmbeddings);
      }

      await this.saveIndex();
    } catch (error) {
      console.error('Failed to rebuild FAISS index:', error);
      throw new Error(`Failed to rebuild index: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
