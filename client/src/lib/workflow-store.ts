/**
 * UI state for the browser runtime workflow experience.
 * Zustand only mirrors runtime state; orchestration lives in the worker.
 */
import { create } from "zustand";

import { runtimeEventBus } from "./runtime/local-event-bus";
import { localRuntime } from "./runtime/local-runtime-client";
import type {
  AgentInfo,
  AgentMemoryEntry,
  AgentMemorySummary,
  HeartbeatReportInfo,
  HeartbeatStatusInfo,
  MessageInfo,
  RuntimeEvent,
  StageInfo,
  TaskInfo,
  WorkflowInfo,
} from "./runtime/types";

export type {
  AgentInfo,
  AgentMemoryEntry,
  AgentMemorySummary,
  HeartbeatReportInfo,
  HeartbeatStatusInfo,
  MessageInfo,
  StageInfo,
  TaskInfo,
  WorkflowInfo,
};

export type PanelView =
  | "directive"
  | "org"
  | "workflow"
  | "review"
  | "history"
  | "memory"
  | "reports";

function mergeHeartbeatStatus(
  items: HeartbeatStatusInfo[],
  next: HeartbeatStatusInfo
): HeartbeatStatusInfo[] {
  const found = items.some(item => item.agentId === next.agentId);
  const merged = found
    ? items.map(item => (item.agentId === next.agentId ? next : item))
    : [...items, next];

  return merged.sort((a, b) => a.agentId.localeCompare(b.agentId));
}

function normalizeDirective(directive: string): string {
  return directive.trim().replace(/\s+/g, " ");
}

function isTerminalWorkflowStatus(status: WorkflowInfo["status"]): boolean {
  return (
    status === "completed" ||
    status === "completed_with_errors" ||
    status === "failed"
  );
}

function saveDownload(filename: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

let runtimeUnsubscribe: (() => void) | null = null;
let runtimeInitPromise: Promise<void> | null = null;

interface WorkflowState {
  connected: boolean;
  agents: AgentInfo[];
  agentStatuses: Record<string, string>;
  currentWorkflowId: string | null;
  workflows: WorkflowInfo[];
  currentWorkflow: WorkflowInfo | null;
  tasks: TaskInfo[];
  messages: MessageInfo[];
  agentMemoryRecent: AgentMemoryEntry[];
  agentMemorySearchResults: AgentMemorySummary[];
  heartbeatStatuses: HeartbeatStatusInfo[];
  heartbeatReports: HeartbeatReportInfo[];
  stages: StageInfo[];
  isWorkflowPanelOpen: boolean;
  activeView: PanelView;
  isSubmitting: boolean;
  lastSubmittedDirective: string | null;
  lastSubmittedAt: number | null;
  isMemoryLoading: boolean;
  isHeartbeatLoading: boolean;
  runningHeartbeatAgentId: string | null;
  selectedMemoryAgentId: string | null;
  memoryQuery: string;
  eventLog: Array<{ type: string; data: any; timestamp: string }>;
  initSocket: () => Promise<void>;
  disconnectSocket: () => void;
  fetchAgents: () => Promise<void>;
  fetchStages: () => Promise<void>;
  fetchWorkflows: () => Promise<void>;
  fetchWorkflowDetail: (id: string) => Promise<void>;
  fetchAgentRecentMemory: (
    agentId: string,
    workflowId?: string | null,
    limit?: number
  ) => Promise<void>;
  searchAgentMemory: (
    agentId: string,
    query: string,
    topK?: number
  ) => Promise<void>;
  fetchHeartbeatStatuses: () => Promise<void>;
  fetchHeartbeatReports: (
    agentId?: string | null,
    limit?: number
  ) => Promise<void>;
  runHeartbeat: (agentId: string) => Promise<boolean>;
  submitDirective: (directive: string) => Promise<string | null>;
  downloadWorkflowReport: (
    workflowId: string,
    format: "json" | "md"
  ) => Promise<void>;
  downloadDepartmentReport: (
    workflowId: string,
    managerId: string,
    format: "json" | "md"
  ) => Promise<void>;
  downloadHeartbeatReport: (
    agentId: string,
    reportId: string,
    format: "json" | "md"
  ) => Promise<void>;
  setSelectedMemoryAgent: (id: string | null) => void;
  setMemoryQuery: (query: string) => void;
  setActiveView: (view: PanelView) => void;
  toggleWorkflowPanel: () => void;
  openWorkflowPanel: () => void;
  setCurrentWorkflow: (id: string | null) => void;
}

type WorkflowStoreSet = (
  partial:
    | Partial<WorkflowState>
    | ((state: WorkflowState) => Partial<WorkflowState>)
) => void;

function applyAgentStatusUpdate(
  agents: AgentInfo[],
  agentId: string,
  action: string
) {
  return agents.map(agent =>
    agent.id === agentId
      ? { ...agent, status: (action || "idle") as AgentInfo["status"] }
      : agent
  );
}

function handleRuntimeEvent(
  event: RuntimeEvent,
  set: WorkflowStoreSet,
  get: () => WorkflowState
) {
  const state = get();

  set({
    eventLog: [
      ...state.eventLog.slice(-100),
      {
        type: event.type,
        data: event,
        timestamp: new Date().toISOString(),
      },
    ],
  });

  switch (event.type) {
    case "stage_change": {
      set(store => ({
        workflows: store.workflows.map(workflow =>
          workflow.id === event.workflowId
            ? { ...workflow, current_stage: event.stage, status: "running" }
            : workflow
        ),
        currentWorkflow:
          store.currentWorkflow && store.currentWorkflow.id === event.workflowId
            ? {
                ...store.currentWorkflow,
                current_stage: event.stage,
                status: "running",
              }
            : store.currentWorkflow,
      }));
      if (state.currentWorkflowId === event.workflowId) {
        void get().fetchWorkflowDetail(event.workflowId);
      }
      break;
    }
    case "agent_active": {
      set(store => ({
        agentStatuses: {
          ...store.agentStatuses,
          [event.agentId]: event.action,
        },
        agents: applyAgentStatusUpdate(store.agents, event.agentId, event.action),
      }));
      break;
    }
    case "heartbeat_status": {
      set(store => ({
        heartbeatStatuses: mergeHeartbeatStatus(
          store.heartbeatStatuses,
          event.status
        ),
        agentStatuses:
          store.agentStatuses[event.status.agentId] === "heartbeat" &&
          event.status.state !== "running"
            ? { ...store.agentStatuses, [event.status.agentId]: "idle" }
            : store.agentStatuses,
        agents:
          store.agentStatuses[event.status.agentId] === "heartbeat" &&
          event.status.state !== "running"
            ? applyAgentStatusUpdate(store.agents, event.status.agentId, "idle")
            : store.agents,
      }));
      break;
    }
    case "heartbeat_report_saved": {
      void get().fetchHeartbeatStatuses();
      void get().fetchHeartbeatReports(undefined, 12);
      break;
    }
    case "message_sent":
    case "score_assigned":
    case "task_update": {
      if (state.currentWorkflowId === event.workflowId) {
        void get().fetchWorkflowDetail(event.workflowId);
      }
      break;
    }
    case "workflow_complete": {
      set(store => ({
        workflows: store.workflows.map(workflow =>
          workflow.id === event.workflowId
            ? { ...workflow, status: event.status }
            : workflow
        ),
        currentWorkflow:
          store.currentWorkflow && store.currentWorkflow.id === event.workflowId
            ? { ...store.currentWorkflow, status: event.status }
            : store.currentWorkflow,
      }));
      if (state.currentWorkflowId === event.workflowId) {
        void get().fetchWorkflowDetail(event.workflowId);
      }
      void get().fetchWorkflows();
      break;
    }
    case "workflow_error": {
      set(store => ({
        workflows: store.workflows.map(workflow =>
          workflow.id === event.workflowId
            ? {
                ...workflow,
                status: "failed",
                results: {
                  ...(workflow.results || {}),
                  last_error: event.error,
                },
              }
            : workflow
        ),
        currentWorkflow:
          store.currentWorkflow && store.currentWorkflow.id === event.workflowId
            ? {
                ...store.currentWorkflow,
                status: "failed",
                results: {
                  ...(store.currentWorkflow.results || {}),
                  last_error: event.error,
                },
              }
            : store.currentWorkflow,
      }));
      if (state.currentWorkflowId === event.workflowId) {
        void get().fetchWorkflowDetail(event.workflowId);
      }
      break;
    }
  }
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  connected: false,
  agents: [],
  agentStatuses: {},
  currentWorkflowId: null,
  workflows: [],
  currentWorkflow: null,
  tasks: [],
  messages: [],
  agentMemoryRecent: [],
  agentMemorySearchResults: [],
  heartbeatStatuses: [],
  heartbeatReports: [],
  stages: [],
  isWorkflowPanelOpen: false,
  activeView: "directive",
  isSubmitting: false,
  lastSubmittedDirective: null,
  lastSubmittedAt: null,
  isMemoryLoading: false,
  isHeartbeatLoading: false,
  runningHeartbeatAgentId: null,
  selectedMemoryAgentId: null,
  memoryQuery: "",
  eventLog: [],

  initSocket: async () => {
    if (runtimeInitPromise) {
      await runtimeInitPromise;
      return;
    }

    runtimeInitPromise = (async () => {
      await localRuntime.ensureStarted();

      if (!runtimeUnsubscribe) {
        runtimeUnsubscribe = runtimeEventBus.subscribe(event =>
          handleRuntimeEvent(event, set, get)
        );
      }

      const snapshot = await localRuntime.getSnapshot();
      set({
        connected: true,
        agents: snapshot.agents,
        agentStatuses: snapshot.agentStatuses,
        workflows: snapshot.workflows,
        heartbeatStatuses: snapshot.heartbeatStatuses,
        heartbeatReports: snapshot.heartbeatReports,
        stages: snapshot.stages,
      });
    })();

    try {
      await runtimeInitPromise;
    } catch (error) {
      set({ connected: false });
      runtimeInitPromise = null;
      throw error;
    }
  },

  disconnectSocket: () => {
    if (runtimeUnsubscribe) {
      runtimeUnsubscribe();
      runtimeUnsubscribe = null;
    }
    runtimeInitPromise = null;
    set({ connected: false });
  },

  fetchAgents: async () => {
    try {
      const data = await localRuntime.getAgents();
      set({
        agents: data.agents.map(agent => ({
          ...agent,
          status: (get().agentStatuses[agent.id] || agent.status) as AgentInfo["status"],
        })),
      });
    } catch (err) {
      console.error("[Store] Failed to fetch agents:", err);
    }
  },

  fetchStages: async () => {
    try {
      const data = await localRuntime.getStages();
      set({ stages: data.stages || [] });
    } catch (err) {
      console.error("[Store] Failed to fetch stages:", err);
    }
  },

  fetchWorkflows: async () => {
    try {
      const data = await localRuntime.listWorkflows();
      set({ workflows: data.workflows || [] });
    } catch (err) {
      console.error("[Store] Failed to fetch workflows:", err);
    }
  },

  fetchWorkflowDetail: async (id: string) => {
    try {
      const data = await localRuntime.getWorkflowDetail(id);
      set({
        currentWorkflow: data.workflow,
        tasks: data.tasks || [],
        messages: data.messages || [],
        currentWorkflowId: id,
      });
    } catch (err) {
      console.error("[Store] Failed to fetch workflow detail:", err);
    }
  },

  fetchAgentRecentMemory: async (
    agentId: string,
    workflowId?: string | null,
    limit: number = 10
  ) => {
    if (!agentId) return;
    set({ isMemoryLoading: true });

    try {
      const data = await localRuntime.getAgentRecentMemory(
        agentId,
        workflowId,
        limit
      );
      set({
        agentMemoryRecent: data.entries || [],
        isMemoryLoading: false,
      });
    } catch (err) {
      console.error("[Store] Failed to fetch recent memory:", err);
      set({ agentMemoryRecent: [], isMemoryLoading: false });
    }
  },

  searchAgentMemory: async (
    agentId: string,
    query: string,
    topK: number = 5
  ) => {
    if (!agentId) return;
    set({ isMemoryLoading: true, memoryQuery: query });

    try {
      const data = await localRuntime.searchAgentMemory(agentId, query, topK);
      set({
        agentMemorySearchResults: data.memories || [],
        isMemoryLoading: false,
      });
    } catch (err) {
      console.error("[Store] Failed to search memory:", err);
      set({ agentMemorySearchResults: [], isMemoryLoading: false });
    }
  },

  fetchHeartbeatStatuses: async () => {
    try {
      const data = await localRuntime.getHeartbeatStatuses();
      set({ heartbeatStatuses: data.statuses || [] });
    } catch (err) {
      console.error("[Store] Failed to fetch heartbeat statuses:", err);
    }
  },

  fetchHeartbeatReports: async (
    agentId?: string | null,
    limit: number = 12
  ) => {
    set({ isHeartbeatLoading: true });

    try {
      const data = await localRuntime.getHeartbeatReports(agentId, limit);
      set({
        heartbeatReports: data.reports || [],
        isHeartbeatLoading: false,
      });
    } catch (err) {
      console.error("[Store] Failed to fetch heartbeat reports:", err);
      set({ heartbeatReports: [], isHeartbeatLoading: false });
    }
  },

  runHeartbeat: async (agentId: string) => {
    if (!agentId) return false;
    set({ runningHeartbeatAgentId: agentId });

    try {
      await localRuntime.runHeartbeat(agentId);
      await get().fetchHeartbeatStatuses();
      await get().fetchHeartbeatReports(undefined, 12);
      set({ runningHeartbeatAgentId: null });
      return true;
    } catch (err) {
      console.error("[Store] Failed to run heartbeat:", err);
      set({ runningHeartbeatAgentId: null });
      return false;
    }
  },

  submitDirective: async (directive: string) => {
    const normalizedDirective = normalizeDirective(directive);
    if (!normalizedDirective) return null;

    const state = get();
    const now = Date.now();
    const currentWorkflow = state.currentWorkflow;
    const existingRunningWorkflow =
      currentWorkflow &&
      !isTerminalWorkflowStatus(currentWorkflow.status) &&
      normalizeDirective(currentWorkflow.directive) === normalizedDirective
        ? currentWorkflow
        : state.workflows.find(
            workflow =>
              !isTerminalWorkflowStatus(workflow.status) &&
              normalizeDirective(workflow.directive) === normalizedDirective
          );

    if (existingRunningWorkflow) {
      set({
        currentWorkflowId: existingRunningWorkflow.id,
        currentWorkflow: existingRunningWorkflow,
        activeView: "workflow",
      });
      await get().fetchWorkflowDetail(existingRunningWorkflow.id);
      return existingRunningWorkflow.id;
    }

    if (
      state.lastSubmittedDirective === normalizedDirective &&
      state.lastSubmittedAt !== null &&
      now - state.lastSubmittedAt < 5000
    ) {
      return state.currentWorkflowId;
    }

    set({
      isSubmitting: true,
      lastSubmittedDirective: normalizedDirective,
      lastSubmittedAt: now,
    });

    try {
      const data = await localRuntime.submitDirective(normalizedDirective);

      if (data.workflowId) {
        set({
          currentWorkflowId: data.workflowId,
          activeView: "workflow",
          isSubmitting: false,
          lastSubmittedDirective: normalizedDirective,
          lastSubmittedAt: Date.now(),
        });
        await get().fetchWorkflowDetail(data.workflowId);
        await get().fetchWorkflows();
        return data.workflowId;
      }

      set({ isSubmitting: false });
      return null;
    } catch (err) {
      console.error("[Store] Failed to submit directive:", err);
      set({ isSubmitting: false });
      return null;
    }
  },

  downloadWorkflowReport: async (workflowId, format) => {
    const payload = await localRuntime.downloadWorkflowReport(workflowId, format);
    saveDownload(payload.filename, payload.mimeType, payload.content);
  },

  downloadDepartmentReport: async (workflowId, managerId, format) => {
    const payload = await localRuntime.downloadWorkflowReport(
      workflowId,
      format,
      managerId
    );
    saveDownload(payload.filename, payload.mimeType, payload.content);
  },

  downloadHeartbeatReport: async (agentId, reportId, format) => {
    const payload = await localRuntime.downloadHeartbeatReport(
      agentId,
      reportId,
      format
    );
    saveDownload(payload.filename, payload.mimeType, payload.content);
  },

  setSelectedMemoryAgent: id =>
    set({
      selectedMemoryAgentId: id,
      agentMemoryRecent: [],
      agentMemorySearchResults: [],
    }),

  setMemoryQuery: query => set({ memoryQuery: query }),
  setActiveView: view => set({ activeView: view }),
  toggleWorkflowPanel: () =>
    set(state => ({ isWorkflowPanelOpen: !state.isWorkflowPanelOpen })),
  openWorkflowPanel: () => set({ isWorkflowPanelOpen: true }),
  setCurrentWorkflow: id => {
    if (id) {
      void get().fetchWorkflowDetail(id);
    } else {
      set({
        currentWorkflowId: null,
        currentWorkflow: null,
        tasks: [],
        messages: [],
      });
    }
  },
}));
