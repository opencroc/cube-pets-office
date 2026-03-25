/**
 * Global state management with Zustand
 * Manages: PDF viewer, AI config, pet interactions, UI panels
 */
import { create } from 'zustand';

export interface AIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  modelReasoningEffort: string;
  maxContext: number;
  providerName: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  petName?: string;
  timestamp: number;
}

interface AppState {
  // PDF Viewer
  currentPage: number;
  totalPages: number;
  isPdfOpen: boolean;
  setCurrentPage: (page: number) => void;
  togglePdf: () => void;
  openPdf: () => void;
  closePdf: () => void;

  // AI Config
  aiConfig: AIConfig;
  isConfigOpen: boolean;
  setAIConfig: (config: Partial<AIConfig>) => void;
  toggleConfig: () => void;

  // Chat
  chatMessages: ChatMessage[];
  isChatOpen: boolean;
  isLoading: boolean;
  addMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
  toggleChat: () => void;
  setLoading: (loading: boolean) => void;

  // Pet interaction
  selectedPet: string | null;
  setSelectedPet: (pet: string | null) => void;

  // Scene
  isSceneReady: boolean;
  setSceneReady: (ready: boolean) => void;
  loadingProgress: number;
  setLoadingProgress: (progress: number) => void;
}

// Load saved AI config from localStorage
function loadSavedConfig(): AIConfig {
  try {
    const saved = localStorage.getItem('cube-pets-ai-config');
    if (saved) {
      return { ...DEFAULT_AI_CONFIG, ...JSON.parse(saved) };
    }
  } catch {}
  return DEFAULT_AI_CONFIG;
}

const DEFAULT_AI_CONFIG: AIConfig = {
  apiKey: 'clp_8a761eb26d953931769b4cb8186baff6ce3d797b8ed5ed923a54967027d93f52',
  baseUrl: 'https://api-vip.codex-for.me/v1',
  model: 'gpt-5.4',
  modelReasoningEffort: 'high',
  maxContext: 1000000,
  providerName: 'codex-for-me',
};

export const useAppStore = create<AppState>((set) => ({
  // PDF Viewer
  currentPage: 1,
  totalPages: 33,
  isPdfOpen: false,
  setCurrentPage: (page) => set({ currentPage: Math.max(1, Math.min(page, 33)) }),
  togglePdf: () => set((s) => ({ isPdfOpen: !s.isPdfOpen })),
  openPdf: () => set({ isPdfOpen: true }),
  closePdf: () => set({ isPdfOpen: false }),

  // AI Config
  aiConfig: loadSavedConfig(),
  isConfigOpen: false,
  setAIConfig: (config) => set((s) => {
    const newConfig = { ...s.aiConfig, ...config };
    try {
      localStorage.setItem('cube-pets-ai-config', JSON.stringify(newConfig));
    } catch {}
    return { aiConfig: newConfig };
  }),
  toggleConfig: () => set((s) => ({ isConfigOpen: !s.isConfigOpen })),

  // Chat
  chatMessages: [],
  isChatOpen: false,
  isLoading: false,
  addMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  clearChat: () => set({ chatMessages: [] }),
  toggleChat: () => set((s) => ({ isChatOpen: !s.isChatOpen })),
  setLoading: (loading) => set({ isLoading: loading }),

  // Pet interaction
  selectedPet: null,
  setSelectedPet: (pet) => set({ selectedPet: pet }),

  // Scene
  isSceneReady: false,
  setSceneReady: (ready) => set({ isSceneReady: ready }),
  loadingProgress: 0,
  setLoadingProgress: (progress) => set({ loadingProgress: progress }),
}));
