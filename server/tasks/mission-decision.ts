import type {
  MissionDecisionResolved,
  MissionDecisionSubmission,
  MissionRecord,
} from '../../shared/mission/contracts.js';

export interface MissionDecisionRuntime {
  getTask(id: string): MissionRecord | undefined;
  resumeMissionFromDecision(
    id: string,
    submission: { detail: string; progress?: number }
  ): MissionRecord | undefined;
}

export interface SubmitMissionDecisionOptions {
  idempotentIfNotWaiting?: boolean;
}

export interface MissionDecisionSuccess {
  ok: true;
  task: MissionRecord;
  decision: MissionDecisionResolved;
  detail: string;
  alreadyResolved?: boolean;
}

export interface MissionDecisionFailure {
  ok: false;
  statusCode: number;
  error: string;
}

export function formatMissionDecisionDetail(
  optionLabel: string | undefined,
  freeText: string | undefined
): string {
  if (optionLabel && freeText) {
    return `Decision received: ${optionLabel} - ${freeText}`;
  }
  if (optionLabel) return `Decision received: ${optionLabel}`;
  if (freeText) return `Decision received: ${freeText}`;
  return 'Decision received';
}

export function describeMissionDecisionAlreadyProcessed(
  task: MissionRecord,
  decision: MissionDecisionResolved
): string {
  const selected = decision.optionLabel || decision.freeText || decision.optionId;
  if (task.status === 'done') {
    return selected
      ? `Decision already processed (${selected}); mission is complete`
      : 'Decision already processed; mission is complete';
  }
  if (task.status === 'failed') {
    return selected
      ? `Decision already processed (${selected}); mission has ended`
      : 'Decision already processed; mission has ended';
  }
  return selected
    ? `Decision already processed (${selected}); mission has resumed`
    : 'Decision already processed; mission has resumed';
}

export function submitMissionDecision(
  runtime: MissionDecisionRuntime,
  taskId: string,
  request: MissionDecisionSubmission,
  options: SubmitMissionDecisionOptions = {}
): MissionDecisionSuccess | MissionDecisionFailure {
  const task = runtime.getTask(taskId);
  if (!task) {
    return {
      ok: false,
      statusCode: 404,
      error: 'Task not found',
    };
  }

  const optionId = request.optionId?.trim() || undefined;
  const freeText = request.freeText?.trim() || undefined;
  const decision: MissionDecisionResolved = {
    optionId,
    freeText,
  };

  if (task.status !== 'waiting') {
    if (!options.idempotentIfNotWaiting) {
      return {
        ok: false,
        statusCode: 409,
        error: 'Task is not waiting for a decision',
      };
    }

    return {
      ok: true,
      task,
      decision,
      detail: describeMissionDecisionAlreadyProcessed(task, decision),
      alreadyResolved: true,
    };
  }

  const prompt = task.decision;
  const selectedOption = optionId
    ? prompt?.options.find(option => option.id === optionId)
    : undefined;

  if (optionId && !selectedOption) {
    return {
      ok: false,
      statusCode: 400,
      error: 'Invalid decision option',
    };
  }

  if (!optionId && !freeText) {
    return {
      ok: false,
      statusCode: 400,
      error: 'optionId or freeText is required',
    };
  }

  if (freeText && prompt && prompt.allowFreeText !== true && !optionId) {
    return {
      ok: false,
      statusCode: 400,
      error: 'This decision does not allow free text only submissions',
    };
  }

  if (freeText && prompt && prompt.allowFreeText !== true && optionId) {
    return {
      ok: false,
      statusCode: 400,
      error: 'This decision does not allow free text notes',
    };
  }

  const detail =
    request.detail?.trim() ||
    formatMissionDecisionDetail(selectedOption?.label, freeText);
  const updated = runtime.resumeMissionFromDecision(task.id, {
    detail,
    progress: request.progress ?? task.progress,
  });

  if (!updated) {
    return {
      ok: false,
      statusCode: 409,
      error: 'Task decision could not be applied',
    };
  }

  return {
    ok: true,
    task: updated,
    detail,
    decision: {
      optionId: selectedOption?.id,
      optionLabel: selectedOption?.label,
      freeText,
    },
  };
}
