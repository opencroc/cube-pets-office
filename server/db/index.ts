/**
 * Database Layer — JSON file-based storage
 * Compatible with the MySQL schema design from ROADMAP.
 * Can be swapped to MySQL by changing this module.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// ============================================================
// Type Definitions (mirrors MySQL schema)
// ============================================================
export interface AgentRow {
  id: string;
  name: string;
  department: 'game' | 'ai' | 'life' | 'meta';
  role: 'ceo' | 'manager' | 'worker';
  manager_id: string | null;
  model: string;
  soul_md: string | null;
  heartbeat_config: any;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRun {
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

export interface MessageRow {
  id: number;
  workflow_id: string;
  from_agent: string;
  to_agent: string;
  stage: string;
  content: string;
  metadata: any;
  created_at: string;
}

export interface TaskRow {
  id: number;
  workflow_id: string;
  worker_id: string;
  manager_id: string;
  department: 'game' | 'ai' | 'life' | 'meta';
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
  verify_result: any;
  version: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface EvolutionLogRow {
  id: number;
  agent_id: string;
  workflow_id: string | null;
  dimension: string | null;
  old_score: number | null;
  new_score: number | null;
  patch_content: string | null;
  applied: number;
  created_at: string;
}

interface DatabaseSchema {
  agents: AgentRow[];
  workflow_runs: WorkflowRun[];
  messages: MessageRow[];
  tasks: TaskRow[];
  evolution_log: EvolutionLogRow[];
  _counters: { messages: number; tasks: number; evolution_log: number };
}

// ============================================================
// Database Class
// ============================================================
class Database {
  private data: DatabaseSchema;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.load();
  }

  private getDefaultData(): DatabaseSchema {
    return {
      agents: [],
      workflow_runs: [],
      messages: [],
      tasks: [],
      evolution_log: [],
      _counters: { messages: 0, tasks: 0, evolution_log: 0 },
    };
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('[DB] Failed to load database, starting fresh:', e);
    }
    return this.getDefaultData();
  }

  private save(): void {
    // Debounced save to avoid excessive writes
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      try {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
      } catch (e) {
        console.error('[DB] Failed to save:', e);
      }
    }, 100);
  }

  forceSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  private now(): string {
    return new Date().toISOString();
  }

  // ============================================================
  // Agents
  // ============================================================
  getAgents(): AgentRow[] {
    return this.data.agents;
  }

  getAgent(id: string): AgentRow | undefined {
    return this.data.agents.find((a) => a.id === id);
  }

  getAgentsByRole(role: 'ceo' | 'manager' | 'worker'): AgentRow[] {
    return this.data.agents.filter((a) => a.role === role);
  }

  getAgentsByDepartment(dept: string): AgentRow[] {
    return this.data.agents.filter((a) => a.department === dept);
  }

  getWorkersByManager(managerId: string): AgentRow[] {
    return this.data.agents.filter((a) => a.manager_id === managerId && a.role === 'worker');
  }

  upsertAgent(agent: Partial<AgentRow> & { id: string }): void {
    const idx = this.data.agents.findIndex((a) => a.id === agent.id);
    const now = this.now();
    if (idx >= 0) {
      this.data.agents[idx] = { ...this.data.agents[idx], ...agent, updated_at: now };
    } else {
      this.data.agents.push({
        id: agent.id,
        name: agent.name || agent.id,
        department: agent.department || 'meta',
        role: agent.role || 'worker',
        manager_id: agent.manager_id ?? null,
        model: agent.model || 'gpt-4o-mini',
        soul_md: agent.soul_md ?? null,
        heartbeat_config: agent.heartbeat_config ?? null,
        is_active: agent.is_active ?? 1,
        created_at: now,
        updated_at: now,
      });
    }
    this.save();
  }

  updateAgentSoul(agentId: string, soulMd: string): void {
    const agent = this.getAgent(agentId);
    if (agent) {
      agent.soul_md = soulMd;
      agent.updated_at = this.now();
      this.save();
    }
  }

  // ============================================================
  // Workflow Runs
  // ============================================================
  createWorkflow(id: string, directive: string, departments: string[]): WorkflowRun {
    const now = this.now();
    const wf: WorkflowRun = {
      id,
      directive,
      status: 'pending',
      current_stage: null,
      departments_involved: departments,
      started_at: null,
      completed_at: null,
      results: null,
      created_at: now,
    };
    this.data.workflow_runs.push(wf);
    this.save();
    return wf;
  }

  getWorkflow(id: string): WorkflowRun | undefined {
    return this.data.workflow_runs.find((w) => w.id === id);
  }

  getWorkflows(): WorkflowRun[] {
    return [...this.data.workflow_runs].reverse();
  }

  updateWorkflow(id: string, updates: Partial<WorkflowRun>): void {
    const wf = this.getWorkflow(id);
    if (wf) {
      Object.assign(wf, updates);
      this.save();
    }
  }

  // ============================================================
  // Messages
  // ============================================================
  createMessage(msg: Omit<MessageRow, 'id' | 'created_at'>): MessageRow {
    this.data._counters.messages++;
    const row: MessageRow = {
      ...msg,
      id: this.data._counters.messages,
      created_at: this.now(),
    };
    this.data.messages.push(row);
    this.save();
    return row;
  }

  getMessagesByWorkflow(workflowId: string): MessageRow[] {
    return this.data.messages.filter((m) => m.workflow_id === workflowId);
  }

  getInbox(agentId: string, workflowId?: string): MessageRow[] {
    return this.data.messages.filter(
      (m) => m.to_agent === agentId && (!workflowId || m.workflow_id === workflowId)
    );
  }

  // ============================================================
  // Tasks
  // ============================================================
  createTask(task: Omit<TaskRow, 'id' | 'created_at' | 'updated_at'>): TaskRow {
    this.data._counters.tasks++;
    const now = this.now();
    const row: TaskRow = {
      ...task,
      id: this.data._counters.tasks,
      created_at: now,
      updated_at: now,
    };
    this.data.tasks.push(row);
    this.save();
    return row;
  }

  getTasksByWorkflow(workflowId: string): TaskRow[] {
    return this.data.tasks.filter((t) => t.workflow_id === workflowId);
  }

  getTask(id: number): TaskRow | undefined {
    return this.data.tasks.find((t) => t.id === id);
  }

  updateTask(id: number, updates: Partial<TaskRow>): void {
    const task = this.getTask(id);
    if (task) {
      Object.assign(task, updates, { updated_at: this.now() });
      this.save();
    }
  }

  // ============================================================
  // Evolution Log
  // ============================================================
  createEvolutionLog(log: Omit<EvolutionLogRow, 'id' | 'created_at'>): EvolutionLogRow {
    this.data._counters.evolution_log++;
    const row: EvolutionLogRow = {
      ...log,
      id: this.data._counters.evolution_log,
      created_at: this.now(),
    };
    this.data.evolution_log.push(row);
    this.save();
    return row;
  }

  getEvolutionLogs(agentId?: string): EvolutionLogRow[] {
    if (agentId) return this.data.evolution_log.filter((e) => e.agent_id === agentId);
    return this.data.evolution_log;
  }

  // ============================================================
  // Scores helpers
  // ============================================================
  getScoresForWorkflow(workflowId: string): TaskRow[] {
    return this.data.tasks.filter(
      (t) => t.workflow_id === workflowId && t.total_score !== null
    );
  }

  getRecentScores(agentId: string, limit: number = 5): TaskRow[] {
    return this.data.tasks
      .filter((t) => t.worker_id === agentId && t.total_score !== null)
      .slice(-limit);
  }
}

// Singleton
const db = new Database();
export default db;
