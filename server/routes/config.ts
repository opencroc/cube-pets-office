/**
 * System configuration routes.
 */
import { Router } from 'express';

import { V3_STAGES } from '../core/workflow-engine.js';
import db from '../db/index.js';

const router = Router();

const STAGE_LABELS: Record<string, string> = {
  direction: '方向下发',
  planning: '任务规划',
  execution: '执行任务',
  review: '评审打分',
  meta_audit: '元审计',
  revision: '修订改进',
  verify: '验证确认',
  summary: '部门汇总',
  feedback: 'CEO 反馈',
  evolution: '自动进化',
};

// GET /api/config/stages
router.get('/stages', (_req, res) => {
  const stageInfo = V3_STAGES.map((stage, idx) => ({
    id: stage,
    order: idx + 1,
    label: STAGE_LABELS[stage] || stage,
  }));

  res.json({ stages: stageInfo });
});

// GET /api/config/stats
router.get('/stats', (_req, res) => {
  const agents = db.getAgents();
  const workflows = db.getWorkflows();
  const completedWorkflows = workflows.filter((workflow) => workflow.status === 'completed');

  res.json({
    totalAgents: agents.length,
    activeAgents: agents.filter((agent) => agent.is_active).length,
    totalWorkflows: workflows.length,
    completedWorkflows: completedWorkflows.length,
    runningWorkflows: workflows.filter((workflow) => workflow.status === 'running').length,
  });
});

export default router;
