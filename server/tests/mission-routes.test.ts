import type { AddressInfo } from 'node:net';

import express from 'express';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTaskRouter } from '../routes/tasks.js';
import { MissionRuntime } from '../tasks/mission-runtime.js';
import { MissionStore } from '../tasks/mission-store.js';

async function startServer(runtime: MissionRuntime) {
  const app = express();
  app.use(express.json());
  app.use('/api/tasks', createTaskRouter(runtime));

  const server = await new Promise<ReturnType<typeof app.listen>>(resolve => {
    const instance = app.listen(0, () => resolve(instance));
  });

  const { port } = server.address() as AddressInfo;
  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`,
  };
}

describe('tasks routes', () => {
  let runtime: MissionRuntime;
  let server: ReturnType<express.Express['listen']> | null = null;
  let baseUrl = '';

  beforeEach(async () => {
    runtime = new MissionRuntime({
      store: new MissionStore(),
      autoRecover: false,
    });

    const started = await startServer(runtime);
    server = started.server;
    baseUrl = started.baseUrl;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      if (!server) {
        resolve();
        return;
      }

      server.close(error => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    server = null;
  });

  it('returns recent tasks from GET /api/tasks', async () => {
    const task = runtime.createTask({
      kind: 'chat',
      title: 'Summarize relay state',
      sourceText: 'Need a stable summary',
      stageLabels: [
        { key: 'receive', label: 'Receive task' },
        { key: 'understand', label: 'Understand problem' },
      ],
    });
    runtime.markMissionRunning(
      task.id,
      'understand',
      'Scanning current state',
      42
    );

    const response = await fetch(`${baseUrl}/api/tasks?limit=10`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      tasks: [
        {
          id: task.id,
          title: 'Summarize relay state',
          status: 'running',
          progress: 42,
        },
      ],
    });
  });

  it('returns a task detail from GET /api/tasks/:id', async () => {
    const task = runtime.createTask({
      kind: 'chat',
      title: 'Inspect task detail route',
      stageLabels: [{ key: 'receive', label: 'Receive task' }],
    });

    const response = await fetch(`${baseUrl}/api/tasks/${task.id}`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      task: {
        id: task.id,
        title: 'Inspect task detail route',
        status: 'queued',
      },
    });
  });

  it('submits a waiting decision and resumes mission progress', async () => {
    const task = runtime.createChatTask('Decision task');
    runtime.markMissionRunning(task.id, 'receive', 'Task accepted', 10);
    runtime.waitOnMission(task.id, 'product direction', 'Need a direction', 42, {
      prompt: 'Choose a path',
      options: [
        { id: 'continue', label: 'Continue' },
        { id: 'report', label: 'Report only' },
      ],
    });

    const response = await fetch(`${baseUrl}/api/tasks/${task.id}/decision`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        optionId: 'continue',
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      decision: {
        optionId: 'continue',
        optionLabel: 'Continue',
      },
      task: {
        id: task.id,
        status: 'running',
      },
    });
    expect(runtime.getTask(task.id)?.waitingFor).toBeUndefined();
    expect(runtime.getTask(task.id)?.decision).toBeUndefined();
  });

  it('returns 404 for missing task detail', async () => {
    const response = await fetch(`${baseUrl}/api/tasks/task_missing`);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'Task not found' });
  });
});
