import { Router } from 'express';

import { submitMissionDecision } from '../tasks/mission-decision.js';
import {
  missionRuntime,
  type MissionRuntime,
} from '../tasks/mission-runtime.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

function parseLimit(rawValue: unknown): number {
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(value)));
}

export function createTaskRouter(runtime: MissionRuntime = missionRuntime): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const limit = parseLimit(req.query.limit);
    res.json({
      ok: true,
      tasks: runtime.listTasks(limit),
    });
  });

  router.get('/:id', (req, res) => {
    const task = runtime.getTask(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({
      ok: true,
      task,
    });
  });

  router.post('/:id/decision', (req, res) => {
    const result = submitMissionDecision(runtime, req.params.id, req.body || {}, {
      idempotentIfNotWaiting: true,
    });

    if (!result.ok) {
      return res.status(result.statusCode).json({ error: result.error });
    }

    res.json({
      ok: true,
      alreadyResolved: result.alreadyResolved === true,
      detail: result.detail,
      decision: result.decision,
      task: result.task,
    });
  });

  return router;
}

export default createTaskRouter();
