import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ChatSession, ChatMessage } from "@/types";
import { useChatStore } from "@/store/chat-store";

export function useChatSessions() {
  return useQuery({
    queryKey: ['/api/chat/sessions'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/chat/sessions?userId=default');
      return response.json() as Promise<ChatSession[]>;
    },
  });
}

export function useChatMessages(sessionId?: string) {
  return useQuery({
    queryKey: ['/api/chat/sessions', sessionId, 'messages'],
    queryFn: async () => {
      if (!sessionId) return [];
      const response = await apiRequest('GET', `/api/chat/sessions/${sessionId}/messages`);
      return response.json() as Promise<ChatMessage[]>;
    },
    enabled: !!sessionId,
  });
}

export function useCurrentChatMessages() {
  const { currentSessionId } = useChatStore();
  return useChatMessages(currentSessionId);
}

export function useCreateChatSession() {
  const queryClient = useQueryClient();
  const { setCurrentSessionId } = useChatStore();
  
  return useMutation({
    mutationFn: async (sessionData: { title: string; userId?: string; configurationId?: string }) => {
      const response = await apiRequest('POST', '/api/chat/sessions', {
        ...sessionData,
        userId: sessionData.userId || 'default',
      });
      return response.json() as Promise<ChatSession>;
    },
    onSuccess: (session) => {
      setCurrentSessionId(session.id);
      queryClient.invalidateQueries({ queryKey: ['/api/chat/sessions'] });
    },
  });
}

export function useDeleteChatSession() {
  const queryClient = useQueryClient();
  const { currentSessionId, setCurrentSessionId } = useChatStore();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('DELETE', `/api/chat/sessions/${sessionId}`);
      return response.json();
    },
    onSuccess: (_, sessionId) => {
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/chat/sessions'] });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { currentSessionId, setCurrentSessionId } = useChatStore();
  const { mutate: createSession } = useCreateChatSession();
  
  return useMutation({
    mutationFn: async ({ message, sessionId }: { message: string; sessionId?: string }) => {
      // If no session exists, create one first
      if (!sessionId && !currentSessionId) {
        return new Promise((resolve, reject) => {
          createSession(
            { title: message.substring(0, 50) + (message.length > 50 ? '...' : '') },
            {
              onSuccess: (session) => {
                // Now send the message with the new session ID
                apiRequest('POST', '/api/chat', {
                  message,
                  sessionId: session.id,
                }).then(response => response.json()).then(resolve).catch(reject);
              },
              onError: reject,
            }
          );
        });
      }

      const response = await apiRequest('POST', '/api/chat', {
        message,
        sessionId: sessionId || currentSessionId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/sessions'] });
      if (currentSessionId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/chat/sessions', currentSessionId, 'messages'] 
        });
      }
    },
  });
}

export function useSendMessageStream() {
  const queryClient = useQueryClient();
  const { currentSessionId } = useChatStore();
  
  return useMutation({
    mutationFn: async ({ message, sessionId, onChunk }: { 
      message: string; 
      sessionId?: string; 
      onChunk: (chunk: any) => void;
    }) => {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId: sessionId || currentSessionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Stream request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              onChunk(data);
            } catch (e) {
              console.error('Failed to parse chunk:', e);
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/sessions'] });
      if (currentSessionId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/chat/sessions', currentSessionId, 'messages'] 
        });
      }
    },
  });
}
