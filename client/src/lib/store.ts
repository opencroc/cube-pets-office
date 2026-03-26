/**
 * Global state management with Zustand
 * Manages: PDF viewer, AI config, pet interactions, UI panels
 */
import { create } from 'zustand';
import { getAIConfigSnapshot, persistAIConfig } from './browser-runtime-storage';
import {
  createBrowserAIConfig,
  createDefaultAIConfig,
  createServerAIConfig,
  loadPersistedAISettings,
  savePersistedAISettings,
  type AIConfig,
  type AIConfigMode,
} from './ai-config';
export type { AIConfig, AIConfigMode } from './ai-config';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  petName?: string;
  timestamp: number;
}

interface AppState {
  currentPage: number;
  totalPages: number;
  isPdfOpen: boolean;
  setCurrentPage: (page: number) => void;
  togglePdf: () => void;
  openPdf: () => void;
  closePdf: () => void;

  serverAIConfig: AIConfig;
  aiConfig: AIConfig;
  isAIConfigLoading: boolean;
  hydrateAIConfig: () => Promise<void>;
  updateBrowserAIConfig: (patch: Partial<AIConfig>) => void;
  setAIConfigMode: (mode: AIConfigMode) => void;
  resetBrowserAIConfig: () => void;
  isConfigOpen: boolean;
  toggleConfig: () => void;

  chatMessages: ChatMessage[];
  isChatOpen: boolean;
  isLoading: boolean;
  addMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
  toggleChat: () => void;
  setLoading: (loading: boolean) => void;

  selectedPet: string | null;
  setSelectedPet: (pet: string | null) => void;

  isSceneReady: boolean;
  setSceneReady: (ready: boolean) => void;
  loadingProgress: number;
  setLoadingProgress: (progress: number) => void;
}

const DEFAULT_AI_CONFIG = createDefaultAIConfig();

export const useAppStore = create<AppState>((set, get) => ({
  currentPage: 1,
  totalPages: 33,
  isPdfOpen: false,
  setCurrentPage: (page) => set({ currentPage: Math.max(1, Math.min(page, 33)) }),
  togglePdf: () => set((s) => ({ isPdfOpen: !s.isPdfOpen })),
  openPdf: () => set({ isPdfOpen: true }),
  closePdf: () => set({ isPdfOpen: false }),

  serverAIConfig: DEFAULT_AI_CONFIG,
  aiConfig: DEFAULT_AI_CONFIG,
  isAIConfigLoading: false,
  hydrateAIConfig: async () => {
    set({ isAIConfigLoading: true });

    try {
      const response = await fetch('/api/config/ai');
      if (!response.ok) {
        throw new Error(`API ${response.status}`);
      }

      const data = await response.json();
      const serverAIConfig = createServerAIConfig(data.config || {});
      const persisted = loadPersistedAISettings(serverAIConfig);
      const aiConfig =
        persisted.mode === 'browser_direct'
          ? persisted.browserConfig
          : serverAIConfig;
      void persistAIConfig(aiConfig).catch((storageError) => {
        console.warn('[AI Config] Failed to persist browser snapshot:', storageError);
      });
      set({
        serverAIConfig,
        aiConfig,
        isAIConfigLoading: false,
      });
    } catch (error) {
      console.error('[AI Config] Failed to hydrate config:', error);
      try {
        const cachedConfig = await getAIConfigSnapshot();
        if (cachedConfig) {
          const fallbackServerAIConfig = get().serverAIConfig || DEFAULT_AI_CONFIG;
          const cachedMode =
            cachedConfig.mode === 'browser_direct' ? 'browser_direct' : 'server_proxy';
          const cachedServerAIConfig = createServerAIConfig(
            cachedMode === 'server_proxy' ? cachedConfig : fallbackServerAIConfig
          );
          const aiConfig =
            cachedMode === 'browser_direct'
              ? createBrowserAIConfig(cachedConfig, cachedServerAIConfig)
              : cachedServerAIConfig;
          set({
            serverAIConfig: cachedServerAIConfig,
            aiConfig,
            isAIConfigLoading: false,
          });
          return;
        }
      } catch (storageError) {
        console.warn('[AI Config] Failed to load browser snapshot:', storageError);
      }
      const fallbackServerAIConfig = get().serverAIConfig || DEFAULT_AI_CONFIG;
      const persisted = loadPersistedAISettings(fallbackServerAIConfig);
      const aiConfig =
        persisted.mode === 'browser_direct'
          ? persisted.browserConfig
          : fallbackServerAIConfig;

      set({
        serverAIConfig: fallbackServerAIConfig,
        aiConfig,
        isAIConfigLoading: false,
      });
      throw error;
    }
  },
  updateBrowserAIConfig: (patch) => {
    const state = get();
    const nextConfig = createBrowserAIConfig(
      {
        ...state.aiConfig,
        ...patch,
      },
      state.serverAIConfig
    );

    savePersistedAISettings('browser_direct', nextConfig);
    void persistAIConfig(nextConfig).catch((storageError) => {
      console.warn('[AI Config] Failed to persist browser snapshot:', storageError);
    });
    set({ aiConfig: nextConfig });
  },
  setAIConfigMode: (mode) => {
    const state = get();

    if (mode === 'browser_direct') {
      const nextConfig = createBrowserAIConfig(state.aiConfig, state.serverAIConfig);
      savePersistedAISettings('browser_direct', nextConfig);
      void persistAIConfig(nextConfig).catch((storageError) => {
        console.warn('[AI Config] Failed to persist browser snapshot:', storageError);
      });
      set({ aiConfig: nextConfig });
      return;
    }

    savePersistedAISettings('server_proxy', state.aiConfig);
    void persistAIConfig(state.serverAIConfig).catch((storageError) => {
      console.warn('[AI Config] Failed to persist browser snapshot:', storageError);
    });
    set({ aiConfig: state.serverAIConfig });
  },
  resetBrowserAIConfig: () => {
    const state = get();
    const nextConfig = createBrowserAIConfig({}, state.serverAIConfig);
    savePersistedAISettings('browser_direct', nextConfig);
    void persistAIConfig(nextConfig).catch((storageError) => {
      console.warn('[AI Config] Failed to persist browser snapshot:', storageError);
    });
    set({ aiConfig: nextConfig });
  },
  isConfigOpen: false,
  toggleConfig: () => set((s) => ({ isConfigOpen: !s.isConfigOpen })),

  chatMessages: [],
  isChatOpen: false,
  isLoading: false,
  addMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  clearChat: () => set({ chatMessages: [] }),
  toggleChat: () => set((s) => ({ isChatOpen: !s.isChatOpen })),
  setLoading: (loading) => set({ isLoading: loading }),

  selectedPet: null,
  setSelectedPet: (pet) => set({ selectedPet: pet }),

  isSceneReady: false,
  setSceneReady: (ready) => set({ isSceneReady: ready }),
  loadingProgress: 0,
  setLoadingProgress: (progress) => set({ loadingProgress: progress }),
}));
