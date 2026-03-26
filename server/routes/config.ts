/**
 * System configuration routes.
 */
import { Router } from "express";

import {
  WORKFLOW_STAGE_LABELS,
  WORKFLOW_STAGES,
} from "../../shared/workflow-runtime.js";
import { getAIConfig } from "../core/ai-config.js";
import db from "../db/index.js";

const router = Router();

router.get("/ai", (_req, res) => {
  res.json({ config: getAIConfig(), source: ".env", writable: false });
});

router.get("/stages", (_req, res) => {
  const stageInfo = WORKFLOW_STAGES.map((stage, idx) => ({
    id: stage,
    order: idx + 1,
    label: WORKFLOW_STAGE_LABELS[stage],
  }));

  res.json({ stages: stageInfo });
});

router.get("/stats", (_req, res) => {
  const agents = db.getAgents();
  const workflows = db.getWorkflows();
  const completedWorkflows = workflows.filter(
    workflow =>
      workflow.status === "completed" ||
      workflow.status === "completed_with_errors"
  );

  res.json({
    totalAgents: agents.length,
    activeAgents: agents.filter(agent => agent.is_active).length,
    totalWorkflows: workflows.length,
    completedWorkflows: completedWorkflows.length,
    runningWorkflows: workflows.filter(
      workflow => workflow.status === "running"
    ).length,
  });
});

export default router;
