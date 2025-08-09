import { create } from 'zustand';
import { ChatSession, ChatMessage } from '../types';

interface ChatState {
  currentSessionId: string | null;
  sessions: ChatSession[];
  isLoading: boolean;
  
  // Actions
  setCurrentSessionId: (sessionId: string | null) => void;
  setSessions: (sessions: ChatSession[]) => void;
  setLoading: (loading: boolean) => void;
  addSession: (session: ChatSession) => void;
  removeSession: (sessionId: string) => void;
  updateSession: (sessionId: string, updates: Partial<ChatSession>) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentSessionId: null,
  sessions: [],
  isLoading: false,

  setCurrentSessionId: (sessionId) => set({ currentSessionId: sessionId }),
  
  setSessions: (sessions) => set({ sessions }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  addSession: (session) => set((state) => ({
    sessions: [session, ...state.sessions]
  })),
  
  removeSession: (sessionId) => set((state) => ({
    sessions: state.sessions.filter(session => session.id !== sessionId),
    currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId
  })),
  
  updateSession: (sessionId, updates) => set((state) => ({
    sessions: state.sessions.map(session =>
      session.id === sessionId ? { ...session, ...updates } : session
    )
  })),
}));
