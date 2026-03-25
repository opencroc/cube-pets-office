/**
 * Workflow Routes — REST API for workflow management
 */
import { Router } from 'express';
import db from '../db/index.js';
import { workflowEngine } from '../core/workflow-engine.js';

const router = Router();

// POST /api/workflows — Start a new workflow
router.post('/', async (req, res) => {
  const { directive } = req.body;
  if (!directive || typeof directive !== 'string') {
    return res.status(400).json({ error: 'directive is required' });
  }

  try {
    const workflowId = await workflowEngine.startWorkflow(directive);
    res.json({ workflowId, status: 'running' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workflows — List all workflows
router.get('/', (_req, res) => {
  const workflows = db.getWorkflows();
  res.json({ workflows });
});

// GET /api/workflows/:id — Get workflow details
router.get('/:id', (req, res) => {
  const wf = db.getWorkflow(req.params.id);
  if (!wf) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  const tasks = db.getTasksByWorkflow(req.params.id);
  const messages = db.getMessagesByWorkflow(req.params.id);

  res.json({
    workflow: wf,
    tasks,
    messages,
  });
});

// GET /api/workflows/:id/tasks — Get tasks for a workflow
router.get('/:id/tasks', (req, res) => {
  const tasks = db.getTasksByWorkflow(req.params.id);
  res.json({ tasks });
});

// GET /api/workflows/:id/messages — Get messages for a workflow
router.get('/:id/messages', (req, res) => {
  const messages = db.getMessagesByWorkflow(req.params.id);
  res.json({ messages });
});

export default router;
