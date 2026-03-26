/**
 * Server-side agent wrapper built on top of the shared runtime agent core.
 */
import type { RuntimeAgentDependencies } from "../../shared/runtime-agent.js";
import {
  RuntimeAgent,
  type AgentInvokeOptions,
} from "../../shared/runtime-agent.js";
import db from "../db/index.js";
import { sessionStore } from "../memory/session-store.js";
import { soulStore } from "../memory/soul-store.js";
import {
  ensureAgentWorkspace,
  type AgentWorkspaceScope,
} from "../memory/workspace.js";
import { readAgentWorkspaceFile, writeAgentWorkspaceFile } from "./access-guard.js";
import { callLLM, callLLMJson } from "./llm-client.js";
import { messageBus } from "./message-bus.js";
import { emitEvent } from "./socket.js";

export interface AgentConfig {
  id: string;
  name: string;
  department: string;
  role: "ceo" | "manager" | "worker";
  managerId: string | null;
  model: string;
  soulMd: string;
}

const sharedAgentDependencies: RuntimeAgentDependencies = {
  memoryRepo: {
    buildPromptContext: (agentId, query, workflowId) =>
      sessionStore.buildPromptContext(agentId, query, workflowId),
    appendLLMExchange: (agentId, options) =>
      sessionStore.appendLLMExchange(agentId, options),
    appendMessageLog: (agentId, options) =>
      sessionStore.appendMessageLog(agentId, options),
    materializeWorkflowMemories: workflowId =>
      sessionStore.materializeWorkflowMemories(workflowId),
    getSoulText: (agentId, fallbackSoulMd) =>
      soulStore.getSoulText(agentId, fallbackSoulMd),
    appendLearnedBehaviors: (agentId, behaviors) =>
      soulStore.appendLearnedBehaviors(agentId, behaviors),
  },
  llmProvider: {
    call: (messages, options) => callLLM(messages, options),
    callJson: (messages, options) => callLLMJson(messages, options),
  },
  eventEmitter: {
    emit: event => emitEvent(event),
  },
};

export class Agent extends RuntimeAgent {
  constructor(config: AgentConfig) {
    super(config, sharedAgentDependencies);
  }

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
      soulMd: soulStore.getSoulText(agentId, row.soul_md || ""),
    });
  }

  async sendMessage(
    toAgentId: string,
    content: string,
    workflowId: string,
    stage: string
  ): Promise<void> {
    await messageBus.send(this.config.id, toAgentId, content, workflowId, stage);
  }

  async getHistory(workflowId?: string, limit?: number): Promise<any[]> {
    const messages = await messageBus.getInbox(this.config.id, workflowId);
    return limit ? messages.slice(-limit) : messages;
  }

  ensureWorkspace(): string {
    return ensureAgentWorkspace(this.config.id).rootDir;
  }

  saveToWorkspace(
    filename: string,
    content: string,
    scope: AgentWorkspaceScope = "root"
  ): string {
    this.ensureWorkspace();
    return writeAgentWorkspaceFile(this.config.id, filename, content, scope);
  }

  readFromWorkspace(
    filename: string,
    scope: AgentWorkspaceScope = "root"
  ): string | null {
    this.ensureWorkspace();
    return readAgentWorkspaceFile(this.config.id, filename, scope);
  }
}

export type { AgentInvokeOptions };
