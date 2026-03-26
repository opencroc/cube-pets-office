import { RuntimeAgent } from "@shared/runtime-agent";
import { WorkflowKernel } from "@shared/workflow-kernel";
import {
  WORKFLOW_STAGE_SET,
  validateHierarchy,
  validateStageRoute,
} from "@shared/message-bus-rules";
import type {
  AgentDirectory,
  AgentRecord,
  FinalWorkflowReportRecord,
  LLMProvider,
  MemoryRepository,
  MessageRecord,
  ReportRepository,
  RuntimeEventEmitter,
  RuntimeMessageBus,
  TaskRecord,
  WorkflowRecord,
  WorkflowRepository,
  WorkflowRuntime,
} from "@shared/workflow-runtime";

interface BrowserRuntimeOptions {
  agents: AgentRecord[];
  llmProvider: LLMProvider;
  onEvent?: (event: Parameters<RuntimeEventEmitter["emit"]>[0]) => void;
}

function now(): string {
  return new Date().toISOString();
}

function averageScore(tasks: TaskRecord[]): number | null {
  const scored = tasks.filter(task => task.total_score !== null);
  if (scored.length === 0) return null;
  return scored.reduce((sum, task) => sum + (task.total_score || 0), 0) / scored.length;
}

class BrowserWorkflowRepository implements WorkflowRepository {
  private workflows: WorkflowRecord[] = [];
  private messages: MessageRecord[] = [];
  private tasks: TaskRecord[] = [];
  private evolutionLogs: any[] = [];
  private messageCounter = 0;
  private taskCounter = 0;

  constructor(private readonly agents: AgentRecord[]) {}

  createWorkflow(id: string, directive: string, departments: string[]): WorkflowRecord {
    const workflow: WorkflowRecord = {
      id,
      directive,
      status: "pending",
      current_stage: null,
      departments_involved: departments,
      started_at: null,
      completed_at: null,
      results: null,
      created_at: now(),
    };
    this.workflows.push(workflow);
    return workflow;
  }

  getWorkflow(id: string): WorkflowRecord | undefined {
    return this.workflows.find(workflow => workflow.id === id);
  }

  getWorkflows(): WorkflowRecord[] {
    return [...this.workflows].reverse();
  }

  findWorkflowByDirective(
    directive: string,
    options: { statuses?: WorkflowRecord["status"][]; maxAgeMs?: number } = {}
  ): WorkflowRecord | undefined {
    const normalized = directive.trim().replace(/\s+/g, " ");
    const statuses = options.statuses;
    const maxAgeMs = options.maxAgeMs;
    const currentTime = Date.now();

    return [...this.workflows].reverse().find(workflow => {
      if (statuses && !statuses.includes(workflow.status)) return false;
      if (maxAgeMs !== undefined) {
        const createdAt = Date.parse(workflow.created_at);
        if (!Number.isFinite(createdAt) || currentTime - createdAt > maxAgeMs) {
          return false;
        }
      }
      return workflow.directive.trim().replace(/\s+/g, " ") === normalized;
    });
  }

  updateWorkflow(id: string, updates: Partial<WorkflowRecord>): void {
    const workflow = this.getWorkflow(id);
    if (workflow) Object.assign(workflow, updates);
  }

  getAgents(): AgentRecord[] {
    return this.agents;
  }

  getAgent(id: string): AgentRecord | undefined {
    return this.agents.find(agent => agent.id === id);
  }

  getAgentsByRole(role: AgentRecord["role"]): AgentRecord[] {
    return this.agents.filter(agent => agent.role === role);
  }

  getAgentsByDepartment(dept: string): AgentRecord[] {
    return this.agents.filter(agent => agent.department === dept);
  }

  getTasksByWorkflow(workflowId: string): TaskRecord[] {
    return this.tasks.filter(task => task.workflow_id === workflowId);
  }

  createTask(task: Omit<TaskRecord, "id" | "created_at" | "updated_at">): TaskRecord {
    this.taskCounter += 1;
    const timestamp = now();
    const row: TaskRecord = {
      ...task,
      id: this.taskCounter,
      created_at: timestamp,
      updated_at: timestamp,
    };
    this.tasks.push(row);
    return row;
  }

  updateTask(id: number, updates: Partial<TaskRecord>): void {
    const task = this.tasks.find(item => item.id === id);
    if (task) {
      Object.assign(task, updates, { updated_at: now() });
    }
  }

  getMessagesByWorkflow(workflowId: string): MessageRecord[] {
    return this.messages.filter(message => message.workflow_id === workflowId);
  }

  createMessage(row: Omit<MessageRecord, "id" | "created_at">): MessageRecord {
    this.messageCounter += 1;
    const message: MessageRecord = {
      ...row,
      id: this.messageCounter,
      created_at: now(),
    };
    this.messages.push(message);
    return message;
  }

  getInbox(agentId: string, workflowId?: string): MessageRecord[] {
    return this.messages.filter(
      message =>
        message.to_agent === agentId &&
        (!workflowId || message.workflow_id === workflowId)
    );
  }

  createEvolutionLog(log: any): unknown {
    this.evolutionLogs.push({ ...log, created_at: now() });
    return log;
  }

  getScoresForWorkflow(workflowId: string): TaskRecord[] {
    return this.tasks.filter(
      task => task.workflow_id === workflowId && task.total_score !== null
    );
  }
}

class BrowserMemoryRepository implements MemoryRepository {
  private soulByAgent = new Map<string, string>();
  private exchangesByAgent = new Map<string, Array<{ prompt: string; response: string }>>();

  constructor(agents: AgentRecord[]) {
    for (const agent of agents) {
      this.soulByAgent.set(agent.id, agent.soul_md || "");
    }
  }

  buildPromptContext(agentId: string, _query: string, _workflowId?: string): string[] {
    const exchanges = this.exchangesByAgent.get(agentId) || [];
    return exchanges.slice(-3).map(
      exchange => `Previous prompt:\n${exchange.prompt}\n\nPrevious response:\n${exchange.response}`
    );
  }

  appendLLMExchange(
    agentId: string,
    options: { prompt: string; response: string }
  ): void {
    const exchanges = this.exchangesByAgent.get(agentId) || [];
    exchanges.push({ prompt: options.prompt, response: options.response });
    this.exchangesByAgent.set(agentId, exchanges.slice(-12));
  }

  appendMessageLog(
    _agentId: string,
    _options: {
      workflowId: string;
      stage: string;
      direction: "inbound" | "outbound";
      otherAgentId: string;
      content: string;
      metadata?: any;
    }
  ): void {}

  materializeWorkflowMemories(_workflowId: string): void {}

  getSoulText(agentId: string, fallbackSoulMd: string = ""): string {
    return this.soulByAgent.get(agentId) || fallbackSoulMd;
  }

  appendLearnedBehaviors(agentId: string, behaviors: string[]): string {
    const current = this.getSoulText(agentId);
    const next = [current.trim(), "## Learned Behaviors", ...behaviors.map(item => `- ${item}`)]
      .filter(Boolean)
      .join("\n\n");
    this.soulByAgent.set(agentId, next);
    return next;
  }
}

class BrowserReportRepository implements ReportRepository {
  private reports = new Map<string, unknown>();

  buildDepartmentReport(
    workflow: WorkflowRecord,
    manager: { id: string; name: string; department?: string },
    summary: string,
    tasks: TaskRecord[]
  ) {
    return {
      workflowId: workflow.id,
      manager,
      summary,
      stats: {
        averageScore: averageScore(tasks),
      },
    };
  }

  saveDepartmentReport(report: any) {
    const key = `department:${report.workflowId}:${report.manager.id}`;
    this.reports.set(key, report);
    return {
      jsonPath: `browser://${key}.json`,
      markdownPath: `browser://${key}.md`,
    };
  }

  saveFinalWorkflowReport(report: FinalWorkflowReportRecord) {
    const key = `workflow:${report.workflowId}:final`;
    this.reports.set(key, report);
    return {
      jsonPath: `browser://${key}.json`,
      markdownPath: `browser://${key}.md`,
    };
  }
}

class BrowserEventEmitter implements RuntimeEventEmitter {
  constructor(private readonly onEvent?: BrowserRuntimeOptions["onEvent"]) {}

  emit(event: Parameters<RuntimeEventEmitter["emit"]>[0]): void {
    this.onEvent?.(event);
  }
}

class BrowserMessageBus implements RuntimeMessageBus {
  constructor(
    private readonly repo: BrowserWorkflowRepository,
    private readonly memoryRepo: MemoryRepository,
    private readonly eventEmitter: RuntimeEventEmitter
  ) {}

  async send(
    fromId: string,
    toId: string,
    content: string,
    workflowId: string,
    stage: string,
    metadata?: any
  ): Promise<MessageRecord> {
    const fromAgent = this.repo.getAgent(fromId);
    const toAgent = this.repo.getAgent(toId);
    const workflow = this.repo.getWorkflow(workflowId);

    if (!fromId.trim() || !toId.trim()) {
      throw new Error("Sender and receiver IDs are required");
    }
    if (!content.trim()) {
      throw new Error("Message content must not be empty");
    }
    if (!workflowId.trim() || !workflow) {
      throw new Error("Workflow not found");
    }
    if (!fromAgent || !toAgent) {
      throw new Error("Agent not found");
    }
    if (!WORKFLOW_STAGE_SET.has(stage)) {
      throw new Error(`Unsupported message stage: ${stage}`);
    }
    if (!validateHierarchy(fromAgent, toAgent)) {
      throw new Error(`Hierarchy violation: ${fromId} -> ${toId}`);
    }
    if (!validateStageRoute(fromAgent, toAgent, stage as any)) {
      throw new Error(`Stage route violation at ${stage}: ${fromId} -> ${toId}`);
    }

    const message = this.repo.createMessage({
      workflow_id: workflowId,
      from_agent: fromId,
      to_agent: toId,
      stage,
      content,
      metadata: metadata || null,
    });

    this.memoryRepo.appendMessageLog(fromId, {
      workflowId,
      stage,
      direction: "outbound",
      otherAgentId: toId,
      content,
      metadata,
    });
    this.memoryRepo.appendMessageLog(toId, {
      workflowId,
      stage,
      direction: "inbound",
      otherAgentId: fromId,
      content,
      metadata,
    });

    this.eventEmitter.emit({
      type: "message_sent",
      workflowId,
      from: fromId,
      to: toId,
      stage,
      preview: content.substring(0, 100),
      timestamp: message.created_at,
    });

    return message;
  }

  async getInbox(agentId: string, workflowId?: string): Promise<MessageRecord[]> {
    return this.repo.getInbox(agentId, workflowId);
  }
}

class BrowserAgentDirectory implements AgentDirectory {
  private agents = new Map<string, RuntimeAgent>();

  constructor(
    records: AgentRecord[],
    llmProvider: LLMProvider,
    memoryRepo: MemoryRepository,
    eventEmitter: RuntimeEventEmitter
  ) {
    for (const record of records) {
      this.agents.set(
        record.id,
        new RuntimeAgent(
          {
            id: record.id,
            name: record.name,
            department: record.department,
            role: record.role,
            managerId: record.manager_id,
            model: record.model,
            soulMd: record.soul_md || "",
          },
          { llmProvider, memoryRepo, eventEmitter }
        )
      );
    }
  }

  get(id: string) {
    return this.agents.get(id);
  }

  getCEO() {
    return this.agents.get("ceo");
  }

  getManagerByDepartment(dept: string) {
    return Array.from(this.agents.values()).find(
      agent => agent.config.role === "manager" && agent.config.department === dept
    );
  }

  getWorkersByManager(managerId: string) {
    return Array.from(this.agents.values()).filter(
      agent => agent.config.role === "worker" && agent.config.managerId === managerId
    );
  }

  refresh(_agentId: string): void {}
}

export function createBrowserRuntime(
  options: BrowserRuntimeOptions
): WorkflowRuntime {
  const workflowRepo = new BrowserWorkflowRepository(options.agents);
  const memoryRepo = new BrowserMemoryRepository(options.agents);
  const eventEmitter = new BrowserEventEmitter(options.onEvent);
  const reportRepo = new BrowserReportRepository();
  const messageBus = new BrowserMessageBus(workflowRepo, memoryRepo, eventEmitter);
  const agentDirectory = new BrowserAgentDirectory(
    options.agents,
    options.llmProvider,
    memoryRepo,
    eventEmitter
  );

  return {
    workflowRepo,
    memoryRepo,
    reportRepo,
    eventEmitter,
    llmProvider: options.llmProvider,
    agentDirectory,
    messageBus,
    evolutionService: {
      evolveWorkflow: () => ({ mode: "browser", applied: false }),
    },
  };
}

export function createBrowserWorkflowEngine(options: BrowserRuntimeOptions) {
  return new WorkflowKernel(createBrowserRuntime(options));
}
