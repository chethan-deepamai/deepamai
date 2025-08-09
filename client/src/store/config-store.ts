import { create } from 'zustand';
import { Configuration, LLMProvider, VectorProvider, EmbeddingProvider, SystemStatus } from '../types';

interface ConfigState {
  configurations: Configuration[];
  activeConfiguration: Configuration | null;
  systemStatus: SystemStatus | null;
  isLoading: boolean;
  
  // Actions
  setConfigurations: (configs: Configuration[]) => void;
  setActiveConfiguration: (config: Configuration | null) => void;
  setSystemStatus: (status: SystemStatus) => void;
  setLoading: (loading: boolean) => void;
  updateConfiguration: (id: string, updates: Partial<Configuration>) => void;
  addConfiguration: (config: Configuration) => void;
  removeConfiguration: (id: string) => void;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  configurations: [],
  activeConfiguration: null,
  systemStatus: null,
  isLoading: false,

  setConfigurations: (configs) => set({ configurations: configs }),
  
  setActiveConfiguration: (config) => set({ activeConfiguration: config }),
  
  setSystemStatus: (status) => set({ systemStatus: status }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  updateConfiguration: (id, updates) => set((state) => ({
    configurations: state.configurations.map(config =>
      config.id === id ? { ...config, ...updates } : config
    ),
    activeConfiguration: state.activeConfiguration?.id === id 
      ? { ...state.activeConfiguration, ...updates }
      : state.activeConfiguration
  })),
  
  addConfiguration: (config) => set((state) => ({
    configurations: [...state.configurations, config]
  })),
  
  removeConfiguration: (id) => set((state) => ({
    configurations: state.configurations.filter(config => config.id !== id),
    activeConfiguration: state.activeConfiguration?.id === id 
      ? null 
      : state.activeConfiguration
  })),
}));
