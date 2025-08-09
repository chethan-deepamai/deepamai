import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Configuration, SystemStatus } from "@/types";

export function useConfigurations() {
  return useQuery({
    queryKey: ['/api/configurations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/configurations?userId=default');
      return response.json() as Promise<Configuration[]>;
    },
  });
}

export function useActiveConfiguration() {
  return useQuery({
    queryKey: ['/api/configurations', 'active'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/configurations');
      const configs = await response.json() as Configuration[];
      return configs.find(config => config.isActive) || null;
    },
  });
}

export function useSystemStatus() {
  return useQuery({
    queryKey: ['/api/system/status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/system/status');
      return response.json() as Promise<SystemStatus>;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useCreateConfiguration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (config: Partial<Configuration>) => {
      const response = await apiRequest('POST', '/api/configurations', config);
      return response.json() as Promise<Configuration>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/configurations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/system/status'] });
    },
  });
}

export function useUpdateConfiguration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Configuration> }) => {
      const response = await apiRequest('PUT', `/api/configurations/${id}`, updates);
      return response.json() as Promise<Configuration>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/configurations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/system/status'] });
    },
  });
}

export function useActivateConfiguration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId?: string }) => {
      const response = await apiRequest('POST', `/api/configurations/${id}/activate`, { userId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/configurations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/system/status'] });
    },
  });
}

export function useDeleteConfiguration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/configurations/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/configurations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/system/status'] });
    },
  });
}

export function useTestLLMConnection() {
  return useMutation({
    mutationFn: async ({ provider, config }: { provider: string; config: any }) => {
      const response = await apiRequest('POST', '/api/test/llm', { provider, config });
      return response.json() as Promise<{ connected: boolean; error?: string }>;
    },
  });
}

export function useTestVectorConnection() {
  return useMutation({
    mutationFn: async ({ provider, config }: { provider: string; config: any }) => {
      const response = await apiRequest('POST', '/api/test/vector', { provider, config });
      return response.json() as Promise<{ connected: boolean; error?: string }>;
    },
  });
}
