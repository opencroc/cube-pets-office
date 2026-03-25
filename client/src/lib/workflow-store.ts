/**
 * Workflow Store — State management for multi-agent orchestration UI
 * Manages: workflows, agent states, messages, tasks, real-time events
 */
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

// ============================================================
// Types
// ============================================================
export interface AgentInfo {
  id: string;
  name: string;
  department: string;
  role: 'ceo' | 'manager' | 'worker';
  managerId: string | null;
  model: string;
  isActive: boolean;
  status: 'idle' | 'thinking' | 'executing' | 'reviewing' | 'planning' | 'analyzing' | 'auditing' | 'revising' | 'verifying' | 'summarizing' | 'evaluating';
}

export interface WorkflowInfo {
  id: string;
  directive: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  current_stage: string | null;
  departments_involved: string[];
  started_at: string | null;
  completed_at: string | null;
  results: any;
  created_at: string;
}

export interface TaskInfo {
  id: number;
  workflow_id: string;
  worker_id: string;
  manager_id: string;
  department: string;
  description: string;
  deliverable: string | null;
  deliverable_v2: string | null;
  deliverable_v3: string | null;
  score_accuracy: number | null;
  score_completeness: number | null;
  score_actionability: number | null;
  score_format: number | null;
  total_score: number | null;
  manager_feedback: string | null;
  meta_audit_feedback: string | null;
  version: number;
  status: string;
}

export interface MessageInfo {
  id: number;
  workflow_id: string;
  from_agent: string;
  to_agent: string;
  stage: string;
  content: string;
  metadata: any;
  created_at: string;
}

export interface StageInfo {
  id: string;
  order: number;
  label: string;
}

export type PanelView = 'directive' | 'org' | 'workflow' | 'review' | 'history';

interface WorkflowState {
  // Connection
  socket: Socket | null;
  connected: boolean;

  // Agents
  agents: AgentInfo[];
  agentStatuses: Record<string, string>;

  // Workflows
  currentWorkflowId: string | null;
  workflows: WorkflowInfo[];
  currentWorkflow: WorkflowInfo | null;

  // Tasks & Messages
  tasks: TaskInfo[];
  messages: MessageInfo[];

  // Stages
  stages: StageInfo[];

  // UI
  isWorkflowPanelOpen: boolean;
  activeView: PanelView;
  isSubmitting: boolean;
  eventLog: Array<{ type: string; data: any; timestamp: string }>;

  // Actions
  initSocket: () => void;
  disconnectSocket: () => void;
  fetchAgents: () => Promise<void>;
  fetchStages: () => Promise<void>;
  fetchWorkflows: () => Promise<void>;
  fetchWorkflowDetail: (id: string) => Promise<void>;
  submitDirective: (directive: string) => Promise<string | null>;
  setActiveView: (view: PanelView) => void;
  toggleWorkflowPanel: () => void;
  openWorkflowPanel: () => void;
  setCurrentWorkflow: (id: string | null) => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  // Initial state
  socket: null,
  connected: false,
  agents: [],
  agentStatuses: {},
  currentWorkflowId: null,
  workflows: [],
  currentWorkflow: null,
  tasks: [],
  messages: [],
  stages: [],
  isWorkflowPanelOpen: false,
  activeView: 'directive',
  isSubmitting: false,
  eventLog: [],

  // Initialize WebSocket connection
  initSocket: () => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[WS] Connected');
      set({ connected: true });
    });

    socket.on('disconnect', () => {
      console.log('[WS] Disconnected');
      set({ connected: false });
    });

    socket.on('agent_event', (event: any) => {
      const state = get();

      // Log event
      set({
        eventLog: [
          ...state.eventLog.slice(-100),
          { type: event.type, data: event, timestamp: new Date().toISOString() },
        ],
      });

      switch (event.type) {
        case 'stage_change': {
          if (state.currentWorkflowId === event.workflowId) {
            set((s) => ({
              currentWorkflow: s.currentWorkflow
                ? { ...s.currentWorkflow, current_stage: event.stage, status: 'running' }
                : null,
            }));
          }
          // Update in workflows list
          set((s) => ({
            workflows: s.workflows.map((w) =>
              w.id === event.workflowId ? { ...w, current_stage: event.stage, status: 'running' } : w
            ),
          }));
          break;
        }

        case 'agent_active': {
          set((s) => ({
            agentStatuses: { ...s.agentStatuses, [event.agentId]: event.action },
          }));
          break;
        }

        case 'message_sent': {
          // Auto-refresh messages if viewing this workflow
          if (state.currentWorkflowId === event.workflowId) {
            get().fetchWorkflowDetail(event.workflowId);
          }
          break;
        }

        case 'score_assigned': {
          if (state.currentWorkflowId === event.workflowId) {
            get().fetchWorkflowDetail(event.workflowId);
          }
          break;
        }

        case 'task_update': {
          if (state.currentWorkflowId === event.workflowId) {
            set((s) => ({
              tasks: s.tasks.map((t) =>
                t.id === event.taskId ? { ...t, status: event.status } : t
              ),
            }));
          }
          break;
        }

        case 'workflow_complete': {
          set((s) => ({
            workflows: s.workflows.map((w) =>
              w.id === event.workflowId ? { ...w, status: 'completed' } : w
            ),
            currentWorkflow:
              s.currentWorkflow && s.currentWorkflow.id === event.workflowId
                ? { ...s.currentWorkflow, status: 'completed' }
                : s.currentWorkflow,
          }));
          if (state.currentWorkflowId === event.workflowId) {
            get().fetchWorkflowDetail(event.workflowId);
          }
          break;
        }

        case 'workflow_error': {
          set((s) => ({
            workflows: s.workflows.map((w) =>
              w.id === event.workflowId
                ? {
                    ...w,
                    status: 'failed',
                    results: { ...(w.results || {}), last_error: event.error },
                  }
                : w
            ),
            currentWorkflow:
              s.currentWorkflow && s.currentWorkflow.id === event.workflowId
                ? {
                    ...s.currentWorkflow,
                    status: 'failed',
                    results: { ...(s.currentWorkflow.results || {}), last_error: event.error },
                  }
                : s.currentWorkflow,
          }));
          if (state.currentWorkflowId === event.workflowId) {
            get().fetchWorkflowDetail(event.workflowId);
          }
          break;
        }
      }
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, connected: false });
    }
  },

  // Fetch all agents
  fetchAgents: async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      const agents = (data.agents || []).map((a: any) => ({
        ...a,
        isActive: a.isActive ?? true,
        status: get().agentStatuses[a.id] || 'idle',
      }));
      set({ agents });
    } catch (err) {
      console.error('[Store] Failed to fetch agents:', err);
    }
  },

  // Fetch stage definitions
  fetchStages: async () => {
    try {
      const res = await fetch('/api/config/stages');
      const data = await res.json();
      set({ stages: data.stages || [] });
    } catch (err) {
      console.error('[Store] Failed to fetch stages:', err);
    }
  },

  // Fetch all workflows
  fetchWorkflows: async () => {
    try {
      const res = await fetch('/api/workflows');
      const data = await res.json();
      set({ workflows: data.workflows || [] });
    } catch (err) {
      console.error('[Store] Failed to fetch workflows:', err);
    }
  },

  // Fetch workflow detail
  fetchWorkflowDetail: async (id: string) => {
    try {
      const res = await fetch(`/api/workflows/${id}`);
      const data = await res.json();
      set({
        currentWorkflow: data.workflow,
        tasks: data.tasks || [],
        messages: data.messages || [],
        currentWorkflowId: id,
      });
    } catch (err) {
      console.error('[Store] Failed to fetch workflow detail:', err);
    }
  },

  // Submit a new directive
  submitDirective: async (directive: string) => {
    set({ isSubmitting: true });
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directive }),
      });
      const data = await res.json();
      if (data.workflowId) {
        set({
          currentWorkflowId: data.workflowId,
          activeView: 'workflow',
          isSubmitting: false,
        });
        // Fetch initial state
        await get().fetchWorkflowDetail(data.workflowId);
        await get().fetchWorkflows();
        return data.workflowId;
      }
      set({ isSubmitting: false });
      return null;
    } catch (err) {
      console.error('[Store] Failed to submit directive:', err);
      set({ isSubmitting: false });
      return null;
    }
  },

  setActiveView: (view) => set({ activeView: view }),
  toggleWorkflowPanel: () => set((s) => ({ isWorkflowPanelOpen: !s.isWorkflowPanelOpen })),
  openWorkflowPanel: () => set({ isWorkflowPanelOpen: true }),
  setCurrentWorkflow: (id) => {
    if (id) {
      get().fetchWorkflowDetail(id);
    } else {
      set({ currentWorkflowId: null, currentWorkflow: null, tasks: [], messages: [] });
    }
  },
}));
