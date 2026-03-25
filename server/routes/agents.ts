/**
 * Agent Routes — REST API for agent management
 */
import { Router } from 'express';
import db from '../db/index.js';
import { registry } from '../core/registry.js';

const router = Router();

// GET /api/agents — List all agents
router.get('/', (_req, res) => {
  const agents = db.getAgents().map((a) => ({
    id: a.id,
    name: a.name,
    department: a.department,
    role: a.role,
    managerId: a.manager_id,
    model: a.model,
    isActive: a.is_active,
  }));
  res.json({ agents });
});

// GET /api/agents/:id — Get agent details
router.get('/:id', (req, res) => {
  const agent = db.getAgent(req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json({ agent });
});

// GET /api/agents/:id/soul — Get agent SOUL.md
router.get('/:id/soul', (req, res) => {
  const agent = db.getAgent(req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json({ soulMd: agent.soul_md });
});

// GET /api/agents/department/:dept — Get agents by department
router.get('/department/:dept', (req, res) => {
  const agents = db.getAgentsByDepartment(req.params.dept);
  res.json({ agents });
});

// GET /api/agents/org/tree — Get organization tree
router.get('/org/tree', (_req, res) => {
  const ceo = db.getAgent('ceo');
  const managers = db.getAgentsByRole('manager');
  const workers = db.getAgentsByRole('worker');

  const tree = {
    ceo: ceo ? { id: ceo.id, name: ceo.name } : null,
    departments: managers.map((m) => ({
      manager: { id: m.id, name: m.name, department: m.department },
      workers: workers
        .filter((w) => w.manager_id === m.id)
        .map((w) => ({ id: w.id, name: w.name })),
    })),
  };

  res.json(tree);
});

export default router;
