/**
 * Core agent abstraction.
 * Each agent carries identity, prompt context, workspace helpers,
 * and a consistent LLM invocation interface.
 */
import fs from 'fs';
import path from 'path';

import db from '../db/index.js';
import { sessionStore } from '../memory/session-store.js';
import { callLLM, callLLMJson } from './llm-client.js';
import { messageBus } from './message-bus.js';
import { emitEvent } from './socket.js';

const DATA_DIR = path.resolve(process.cwd(), 'data/agents');

export interface AgentConfig {
  id: string;
  name: string;
  department: string;
  role: 'ceo' | 'manager' | 'worker';
  managerId: string | null;
  model: string;
  soulMd: string;
}

export interface AgentInvokeOptions {
  workflowId?: string;
  stage?: string;
}

export class Agent {
  config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * Load an agent from the database.
   */
  static fromDB(agentId: string): Agent | null {
    const row = db.getAgent(agentId);
    if (!row) return null;

    return new Agent({
      id: row.id,
      name: row.name,
      department: row.department,
      role: row.role,
      managerId: row.manager_id,
      model: row.model,
      soulMd: row.soul_md || '',
    });
  }

  /**
   * Invoke the LLM with the agent identity and optional context.
   */
  async invoke(prompt: string, context?: string[], options: AgentInvokeOptions = {}): Promise<string> {
    emitEvent({
      type: 'agent_active',
      agentId: this.config.id,
      action: 'thinking',
    });

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: this.buildSystemPrompt() },
    ];

    const memoryContext = sessionStore.buildPromptContext(this.config.id, prompt, options.workflowId);
    for (const ctx of memoryContext) {
      messages.push({ role: 'user', content: ctx });
    }

    if (context && context.length > 0) {
      for (const ctx of context) {
        messages.push({ role: 'user', content: ctx });
      }
    }

    messages.push({ role: 'user', content: prompt });

    const response = await callLLM(messages, {
      model: this.config.model,
      temperature: 0.7,
      maxTokens: 3000,
    });

    emitEvent({
      type: 'agent_active',
      agentId: this.config.id,
      action: 'idle',
    });
    sessionStore.appendLLMExchange(this.config.id, {
      workflowId: options.workflowId,
      stage: options.stage,
      prompt,
      response: response.content,
    });

    return response.content;
  }

  /**
   * Invoke the LLM and require a JSON response.
   */
  async invokeJson<T = any>(
    prompt: string,
    context?: string[],
    options: AgentInvokeOptions = {}
  ): Promise<T> {
    emitEvent({
      type: 'agent_active',
      agentId: this.config.id,
      action: 'thinking',
    });

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: `${this.buildSystemPrompt()}

重要要求：
- 你必须只返回合法 JSON
- 不要输出 Markdown 代码块
- 不要输出 JSON 以外的任何解释文字`,
      },
    ];

    const memoryContext = sessionStore.buildPromptContext(this.config.id, prompt, options.workflowId);
    for (const ctx of memoryContext) {
      messages.push({ role: 'user', content: ctx });
    }

    if (context && context.length > 0) {
      for (const ctx of context) {
        messages.push({ role: 'user', content: ctx });
      }
    }

    messages.push({ role: 'user', content: prompt });

    const result = await callLLMJson<T>(messages, {
      model: this.config.model,
      temperature: 0.5,
      maxTokens: 3000,
    });

    emitEvent({
      type: 'agent_active',
      agentId: this.config.id,
      action: 'idle',
    });
    sessionStore.appendLLMExchange(this.config.id, {
      workflowId: options.workflowId,
      stage: options.stage,
      prompt,
      response: JSON.stringify(result, null, 2),
    });

    return result;
  }

  /**
   * Send a message to another agent.
   */
  async sendMessage(
    toAgentId: string,
    content: string,
    workflowId: string,
    stage: string
  ): Promise<void> {
    await messageBus.send(this.config.id, toAgentId, content, workflowId, stage);
  }

  /**
   * Read inbox history for the current agent.
   */
  async getHistory(workflowId?: string, limit?: number): Promise<any[]> {
    const messages = await messageBus.getInbox(this.config.id, workflowId);
    return limit ? messages.slice(-limit) : messages;
  }

  /**
   * Build the system prompt from SOUL.md plus runtime identity info.
   */
  private buildSystemPrompt(): string {
    return `${this.config.soulMd}

---
当前身份：${this.config.name}
角色：${this.config.role}
部门：${this.config.department}`;
  }

  /**
   * Ensure the agent workspace directory exists.
   */
  ensureWorkspace(): string {
    const dir = path.join(DATA_DIR, this.config.id);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Save a file to the agent workspace.
   */
  saveToWorkspace(filename: string, content: string): void {
    const dir = this.ensureWorkspace();
    fs.writeFileSync(path.join(dir, filename), content, 'utf-8');
  }

  /**
   * Read a file from the agent workspace.
   */
  readFromWorkspace(filename: string): string | null {
    const filepath = path.join(DATA_DIR, this.config.id, filename);
    if (fs.existsSync(filepath)) {
      return fs.readFileSync(filepath, 'utf-8');
    }
    return null;
  }
}
