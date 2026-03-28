import type {
  MissionDecision,
  MissionDecisionResolved,
  MissionDecisionSubmission,
  MissionEvent,
  MissionRecord,
  MissionStage,
} from "../../shared/mission/contracts.js";
import type { ExecutorEvent, ExecutionPlan } from "../../shared/executor/contracts.js";
import {
  ExecutionPlanBuilder,
  type ExecutionPlanBuildInput,
  type ExecutionPlanBuildResult,
} from "./execution-plan-builder.js";
import {
  ExecutorClient,
  type DispatchExecutionPlanOptions,
  type DispatchExecutionPlanResult,
} from "./executor-client.js";

export interface MissionRepository {
  create(record: MissionRecord): Promise<MissionRecord> | MissionRecord;
  get(id: string): Promise<MissionRecord | undefined> | MissionRecord | undefined;
  save(record: MissionRecord): Promise<MissionRecord> | MissionRecord;
}

export interface MissionDecisionSubmissionResult {
  mission: MissionRecord;
  decision: MissionDecisionResolved;
  detail: string;
  resumed: boolean;
}

export interface MissionOrchestratorHooks {
  onMissionUpdated?(mission: MissionRecord): Promise<void> | void;
  onDecisionSubmitted?(
    mission: MissionRecord,
    submission: MissionDecisionSubmission,
    resolved: MissionDecisionResolved,
  ):
    | Promise<{ resumed?: boolean; detail?: string } | void>
    | { resumed?: boolean; detail?: string }
    | void;
}

export interface StartMissionInput {
  missionId?: string;
  title?: string;
  sourceText: string;
  topicId?: string;
  requestedBy?: ExecutionPlan["requestedBy"];
  mode?: ExecutionPlan["mode"];
  workspaceRoot?: string;
  metadata?: Record<string, unknown>;
  dispatch?: DispatchExecutionPlanOptions;
}

export interface StartMissionResult {
  mission: MissionRecord;
  plan: ExecutionPlan;
  dispatch: DispatchExecutionPlanResult;
}

export interface MissionOrchestratorOptions {
  executorClient: ExecutorClient;
  repository?: MissionRepository;
  planBuilder?: ExecutionPlanBuilder;
  hooks?: MissionOrchestratorHooks;
}

interface MissionRuntimeState {
  plan?: ExecutionPlan;
  dispatch?: DispatchExecutionPlanResult;
  lastExecutorEvent?: ExecutorEvent;
  submittedDecision?: MissionDecisionResolved;
}

const CORE_STAGE_BLUEPRINT: Array<Pick<MissionStage, "key" | "label">> = [
  { key: "understand", label: "Understand request" },
  { key: "build-plan", label: "Build execution plan" },
  { key: "dispatch", label: "Dispatch to executor" },
  { key: "decision", label: "Waiting for decision" },
  { key: "finalize", label: "Finalize mission" },
];

function createMissionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `mission_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function eventTimeFromIso(value: string | undefined): number {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function clampProgress(progress: number | undefined, fallback: number): number {
  if (typeof progress !== "number" || Number.isNaN(progress)) return fallback;
  return Math.max(0, Math.min(100, Math.round(progress)));
}

function toTitleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function cloneStages(stages: MissionStage[]): MissionStage[] {
  return stages.map(stage => ({ ...stage }));
}

function cloneEvents(events: MissionEvent[]): MissionEvent[] {
  return events.map(event => ({ ...event }));
}

function cloneMission(record: MissionRecord): MissionRecord {
  return {
    ...record,
    stages: cloneStages(record.stages),
    events: cloneEvents(record.events),
  };
}

function baseStages(): MissionStage[] {
  return CORE_STAGE_BLUEPRINT.map(stage => ({
    ...stage,
    status: "pending",
  }));
}

function ensureStage(
  stages: MissionStage[],
  key: string,
  label = toTitleCase(key),
): MissionStage {
  const existing = stages.find(stage => stage.key === key);
  if (existing) return existing;

  const created: MissionStage = {
    key,
    label,
    status: "pending",
  };
  stages.push(created);
  return created;
}

function touchStage(
  stages: MissionStage[],
  key: string,
  label: string,
  update: Partial<MissionStage>,
  now = Date.now(),
): MissionStage[] {
  const next = cloneStages(stages);
  const stage = ensureStage(next, key, label);
  if (update.status === "running" && !stage.startedAt) {
    stage.startedAt = now;
  }
  if ((update.status === "done" || update.status === "failed") && !stage.completedAt) {
    stage.completedAt = now;
  }
  Object.assign(stage, update);
  return next;
}

function replaceMission(record: MissionRecord, patch: Partial<MissionRecord>): MissionRecord {
  return {
    ...record,
    ...patch,
    updatedAt: Date.now(),
  };
}

function appendEvent(record: MissionRecord, event: MissionEvent): MissionRecord {
  const next = cloneMission(record);
  next.events.push(event);
  next.updatedAt = event.time;
  return next;
}

function missionEvent(
  type: MissionEvent["type"],
  message: string,
  options: Partial<MissionEvent> = {},
): MissionEvent {
  return {
    type,
    message,
    time: options.time || Date.now(),
    progress: options.progress,
    stageKey: options.stageKey,
    level: options.level,
    source: options.source,
  };
}

class InMemoryMissionRepository implements MissionRepository {
  private readonly records = new Map<string, MissionRecord>();

  create(record: MissionRecord): MissionRecord {
    const created = cloneMission(record);
    this.records.set(created.id, created);
    return cloneMission(created);
  }

  get(id: string): MissionRecord | undefined {
    const record = this.records.get(id);
    return record ? cloneMission(record) : undefined;
  }

  save(record: MissionRecord): MissionRecord {
    const saved = cloneMission(record);
    this.records.set(saved.id, saved);
    return cloneMission(saved);
  }
}

export class MissionOrchestrator {
  private readonly runtime = new Map<string, MissionRuntimeState>();
  private readonly repository: MissionRepository;
  private readonly planBuilder: ExecutionPlanBuilder;
  private readonly executorClient: ExecutorClient;
  private readonly hooks: MissionOrchestratorHooks;

  constructor(options: MissionOrchestratorOptions) {
    this.repository = options.repository || new InMemoryMissionRepository();
    this.planBuilder = options.planBuilder || new ExecutionPlanBuilder();
    this.executorClient = options.executorClient;
    this.hooks = options.hooks || {};
  }

  async startMission(input: StartMissionInput): Promise<StartMissionResult> {
    const missionId = input.missionId || createMissionId();
    const title = input.title || "Brain dispatch mission";
    const now = Date.now();

    let mission = await Promise.resolve(
      this.repository.create({
        id: missionId,
        kind: "brain-dispatch",
        title,
        sourceText: input.sourceText,
        topicId: input.topicId,
        status: "queued",
        progress: 0,
        currentStageKey: "understand",
        stages: baseStages(),
        createdAt: now,
        updatedAt: now,
        events: [
          missionEvent("created", "Mission created by brain dispatch.", {
            source: "brain",
            stageKey: "understand",
            progress: 0,
            time: now,
          }),
        ],
      }),
    );

    mission = await this.persist(
      appendEvent(
        replaceMission(mission, {
          status: "running",
          progress: 8,
          currentStageKey: "understand",
          stages: touchStage(
            mission.stages,
            "understand",
            "Understand request",
            { status: "running", detail: "Reading mission objective and constraints." },
          ),
        }),
        missionEvent("progress", "Understanding mission objective.", {
          source: "brain",
          stageKey: "understand",
          progress: 8,
        }),
      ),
    );

    const planResult = await this.buildPlan({
      missionId,
      title,
      sourceText: input.sourceText,
      requestedBy: input.requestedBy,
      mode: input.mode,
      workspaceRoot: input.workspaceRoot,
      topicId: input.topicId,
      metadata: input.metadata,
    });

    mission = await this.persist(
      appendEvent(
        replaceMission(mission, {
          progress: 32,
          currentStageKey: "build-plan",
          stages: this.attachPlanStages(
            touchStage(
              touchStage(
                mission.stages,
                "understand",
                "Understand request",
                { status: "done", detail: planResult.understanding.summary },
              ),
              "build-plan",
              "Build execution plan",
              { status: "done", detail: planResult.plan.summary },
            ),
            planResult.plan,
          ),
        }),
        missionEvent("progress", "Structured ExecutionPlan created.", {
          source: "brain",
          stageKey: "build-plan",
          progress: 32,
        }),
      ),
    );

    this.runtime.set(missionId, {
      plan: planResult.plan,
    });

    mission = await this.persist(
      appendEvent(
        replaceMission(mission, {
          progress: 45,
          currentStageKey: "dispatch",
          stages: touchStage(
            mission.stages,
            "dispatch",
            "Dispatch to executor",
            {
              status: "running",
              detail: `Dispatching ${planResult.plan.jobs.length} executor job(s).`,
            },
          ),
        }),
        missionEvent("progress", "Dispatching plan to executor.", {
          source: "brain",
          stageKey: "dispatch",
          progress: 45,
        }),
      ),
    );

    let dispatched: DispatchExecutionPlanResult;
    try {
      dispatched = await this.executorClient.dispatchPlan(planResult.plan, input.dispatch);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      mission = await this.persist(
        appendEvent(
          replaceMission(mission, {
            status: "failed",
            progress: 45,
            summary: message,
            currentStageKey: "dispatch",
            stages: touchStage(
              touchStage(
                mission.stages,
                "dispatch",
                "Dispatch to executor",
                { status: "failed", detail: message },
              ),
              "finalize",
              "Finalize mission",
              { status: "failed", detail: "Mission failed before executor acceptance." },
            ),
          }),
          missionEvent("failed", message, {
            source: "brain",
            stageKey: "dispatch",
            progress: 45,
            level: "error",
          }),
        ),
      );
      throw error;
    }

    this.runtime.set(missionId, {
      ...this.runtime.get(missionId),
      dispatch: dispatched,
    });

    mission = await this.persist(
      appendEvent(
        replaceMission(mission, {
          status: "running",
          progress: 60,
          currentStageKey: "dispatch",
          stages: touchStage(
            mission.stages,
            "dispatch",
            "Dispatch to executor",
            {
              status: "done",
              detail: `Executor accepted job ${dispatched.response.jobId}.`,
            },
          ),
        }),
        missionEvent("progress", "Executor accepted mission dispatch.", {
          source: "brain",
          stageKey: "dispatch",
          progress: 60,
        }),
      ),
    );

    return {
      mission,
      plan: planResult.plan,
      dispatch: dispatched,
    };
  }

  async applyExecutorEvent(event: ExecutorEvent): Promise<MissionRecord> {
    const mission = await Promise.resolve(this.repository.get(event.missionId));
    if (!mission) {
      throw new Error(`Mission not found for executor event: ${event.missionId}`);
    }

    const runtimeState = this.runtime.get(event.missionId) || {};
    runtimeState.lastExecutorEvent = event;
    this.runtime.set(event.missionId, runtimeState);

    const stageKey = event.stageKey || "finalize";
    const stageLabel = this.stageLabelForExecutorEvent(event, runtimeState.plan);
    const progress = clampProgress(event.progress, mission.progress);
    const time = eventTimeFromIso(event.occurredAt);
    const sourceEvent = this.mapExecutorEvent(event, progress, time, stageKey);

    let next = appendEvent(
      replaceMission(mission, {
        progress,
        currentStageKey: stageKey,
        stages: touchStage(
          mission.stages,
          stageKey,
          stageLabel,
          {
            status: this.mapExecutorStatus(event.status),
            detail: event.detail || event.message,
          },
          time,
        ),
      }),
      sourceEvent,
    );

    if (event.status === "waiting" || event.type === "job.waiting") {
      next = replaceMission(next, {
        status: "waiting",
        waitingFor: event.waitingFor || event.message,
        decision: event.decision,
        currentStageKey: "decision",
        stages: touchStage(
          next.stages,
          "decision",
          "Waiting for decision",
          {
            status: "running",
            detail: event.waitingFor || event.message,
          },
          time,
        ),
      });
    } else if (event.status === "completed" || event.type === "job.completed") {
      next = replaceMission(next, {
        status: "done",
        progress: 100,
        summary: event.summary || event.message,
        waitingFor: undefined,
        decision: undefined,
        completedAt: time,
        currentStageKey: "finalize",
        stages: touchStage(
          touchStage(
            next.stages,
            "decision",
            "Waiting for decision",
            { status: "done", detail: "No pending decision." },
            time,
          ),
          "finalize",
          "Finalize mission",
          {
            status: "done",
            detail: event.summary || event.message,
          },
          time,
        ),
      });
    } else if (event.status === "failed" || event.status === "cancelled" || event.type === "job.failed") {
      next = replaceMission(next, {
        status: "failed",
        summary: event.summary || event.message,
        waitingFor: undefined,
        decision: undefined,
        currentStageKey: "finalize",
        stages: touchStage(
          touchStage(
            next.stages,
            "decision",
            "Waiting for decision",
            { status: "failed", detail: event.summary || event.message },
            time,
          ),
          "finalize",
          "Finalize mission",
          {
            status: "failed",
            detail: event.summary || event.message,
          },
          time,
        ),
      });
    } else {
      next = replaceMission(next, {
        status: "running",
      });
    }

    return this.persist(next);
  }

  async submitDecision(
    missionId: string,
    submission: MissionDecisionSubmission,
  ): Promise<MissionDecisionSubmissionResult> {
    const mission = await Promise.resolve(this.repository.get(missionId));
    if (!mission) {
      throw new Error(`Mission not found: ${missionId}`);
    }

    if (!mission.decision) {
      throw new Error(`Mission ${missionId} is not waiting for a decision.`);
    }

    const resolved = this.resolveDecision(mission.decision, submission);
    const runtimeState = this.runtime.get(missionId) || {};
    runtimeState.submittedDecision = resolved;
    this.runtime.set(missionId, runtimeState);

    const hookResult = await this.hooks.onDecisionSubmitted?.(mission, submission, resolved);
    const resumed = !!hookResult?.resumed;
    const detail =
      hookResult?.detail ||
      (resumed
        ? "Decision accepted and mission resumed."
        : "Decision captured. Waiting for executor resume integration.");

    let next = appendEvent(
      cloneMission(mission),
      missionEvent("log", detail, {
        source: "user",
        stageKey: "decision",
        level: "info",
        progress: mission.progress,
      }),
    );

    if (resumed) {
      next = replaceMission(next, {
        status: "running",
        waitingFor: undefined,
        decision: undefined,
        currentStageKey: runtimeState.lastExecutorEvent?.stageKey || "dispatch",
        stages: touchStage(
          next.stages,
          "decision",
          "Waiting for decision",
          {
            status: "done",
            detail,
          },
        ),
      });
    }

    next = await this.persist(next);

    return {
      mission: next,
      decision: resolved,
      detail,
      resumed,
    };
  }

  async getMission(missionId: string): Promise<MissionRecord | undefined> {
    return Promise.resolve(this.repository.get(missionId));
  }

  getRuntimeState(missionId: string): MissionRuntimeState | undefined {
    const state = this.runtime.get(missionId);
    return state ? { ...state } : undefined;
  }

  private async buildPlan(input: ExecutionPlanBuildInput): Promise<ExecutionPlanBuildResult> {
    return this.planBuilder.build(input);
  }

  private async persist(record: MissionRecord): Promise<MissionRecord> {
    const saved = await Promise.resolve(this.repository.save(record));
    await this.hooks.onMissionUpdated?.(saved);
    return saved;
  }

  private attachPlanStages(stages: MissionStage[], plan: ExecutionPlan): MissionStage[] {
    const next = cloneStages(stages);
    for (const step of plan.steps) {
      ensureStage(next, step.key, step.label);
    }
    return next;
  }

  private stageLabelForExecutorEvent(event: ExecutorEvent, plan: ExecutionPlan | undefined): string {
    if (!event.stageKey) return "Finalize mission";
    const matchingStep = plan?.steps.find(step => step.key === event.stageKey);
    return matchingStep?.label || toTitleCase(event.stageKey);
  }

  private mapExecutorStatus(status: ExecutorEvent["status"]): MissionStage["status"] {
    switch (status) {
      case "completed":
        return "done";
      case "failed":
      case "cancelled":
        return "failed";
      default:
        return "running";
    }
  }

  private mapExecutorEvent(
    event: ExecutorEvent,
    progress: number,
    time: number,
    stageKey: string,
  ): MissionEvent {
    if (event.type === "job.waiting" || event.status === "waiting") {
      return missionEvent("waiting", event.message, {
        source: "executor",
        stageKey,
        progress,
        time,
      });
    }

    if (event.type === "job.completed" || event.status === "completed") {
      return missionEvent("done", event.summary || event.message, {
        source: "executor",
        stageKey,
        progress: 100,
        time,
      });
    }

    if (event.type === "job.failed" || event.status === "failed" || event.status === "cancelled") {
      return missionEvent("failed", event.summary || event.message, {
        source: "executor",
        stageKey,
        progress,
        level: "error",
        time,
      });
    }

    if (event.type === "job.log" && event.log) {
      return missionEvent("log", event.log.message || event.message, {
        source: "executor",
        stageKey,
        progress,
        level: event.log.level,
        time,
      });
    }

    return missionEvent("progress", event.message, {
      source: "executor",
      stageKey,
      progress,
      time,
    });
  }

  private resolveDecision(
    decision: MissionDecision,
    submission: MissionDecisionSubmission,
  ): MissionDecisionResolved {
    if (!submission.optionId && !submission.freeText?.trim()) {
      throw new Error("Decision submission must include optionId or freeText.");
    }

    const selected = decision.options.find(option => option.id === submission.optionId);
    if (submission.optionId && !selected) {
      throw new Error(`Unknown decision option: ${submission.optionId}`);
    }

    return {
      optionId: selected?.id,
      optionLabel: selected?.label,
      freeText: submission.freeText?.trim() || undefined,
    };
  }
}
