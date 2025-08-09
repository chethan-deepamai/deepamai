import { create } from 'zustand';
import { Document, ProcessingFile } from '../types';

interface DocumentState {
  documents: Document[];
  processingFiles: ProcessingFile[];
  isLoading: boolean;
  
  // Actions
  setDocuments: (documents: Document[]) => void;
  setLoading: (loading: boolean) => void;
  addDocument: (document: Document) => void;
  removeDocument: (documentId: string) => void;
  updateDocument: (documentId: string, updates: Partial<Document>) => void;
  addProcessingFile: (file: ProcessingFile) => void;
  updateProcessingFile: (fileId: string, updates: Partial<ProcessingFile>) => void;
  removeProcessingFile: (fileId: string) => void;
  clearProcessingFiles: () => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  processingFiles: [],
  isLoading: false,

  setDocuments: (documents) => set({ documents }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  addDocument: (document) => set((state) => ({
    documents: [document, ...state.documents]
  })),
  
  removeDocument: (documentId) => set((state) => ({
    documents: state.documents.filter(doc => doc.id !== documentId)
  })),
  
  updateDocument: (documentId, updates) => set((state) => ({
    documents: state.documents.map(doc =>
      doc.id === documentId ? { ...doc, ...updates } : doc
    )
  })),
  
  addProcessingFile: (file) => set((state) => ({
    processingFiles: [...state.processingFiles, file]
  })),
  
  updateProcessingFile: (fileId, updates) => set((state) => ({
    processingFiles: state.processingFiles.map(file =>
      file.id === fileId ? { ...file, ...updates } : file
    )
  })),
  
  removeProcessingFile: (fileId) => set((state) => ({
    processingFiles: state.processingFiles.filter(file => file.id !== fileId)
  })),
  
  clearProcessingFiles: () => set({ processingFiles: [] }),
}));
