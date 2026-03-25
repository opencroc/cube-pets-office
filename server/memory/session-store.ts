import fs from 'fs';
import path from 'path';

import db from '../db/index.js';
import { ensureAgentWorkspace } from './workspace.js';

export interface SessionEntry {
  timestamp: string;
  workflowId: string | null;
  stage: string | null;
  type: 'message' | 'llm_prompt' | 'llm_response' | 'workflow_summary';
  direction?: 'inbound' | 'outbound';
  agentId?: string;
  otherAgentId?: string;
  preview: string;
  content: string;
  metadata?: any;
}

export interface MemorySummary {
  workflowId: string;
  createdAt: string;
  directive: string;
  status: string;
  role: string;
  stage: string | null;
  summary: string;
  keywords: string[];
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[\u4e00-\u9fff]{1,8}|[a-z0-9_]+/g) || []).filter(
    (token) => token.length >= 2
  );
}

function uniqueSorted<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function buildKeywordList(text: string, limit: number = 12): string[] {
  const counts = new Map<string, number>();
  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([token]) => token);
}

function getSessionFile(agentId: string, workflowId?: string | null): string {
  const { sessionsDir } = ensureAgentWorkspace(agentId);
  return path.join(sessionsDir, `${workflowId || '_general'}.jsonl`);
}

function getSummaryFile(agentId: string): string {
  const { memoryDir } = ensureAgentWorkspace(agentId);
  return path.join(memoryDir, 'summaries.json');
}

function readJsonLines(filePath: string): SessionEntry[] {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, 'utf-8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as SessionEntry);
}

function readSummaryIndex(agentId: string): MemorySummary[] {
  const filePath = getSummaryFile(agentId);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as MemorySummary[];
  } catch {
    return [];
  }
}

function writeSummaryIndex(agentId: string, summaries: MemorySummary[]): void {
  const filePath = getSummaryFile(agentId);
  fs.writeFileSync(filePath, JSON.stringify(summaries, null, 2), 'utf-8');
}

class SessionStore {
  appendEntry(agentId: string, entry: Omit<SessionEntry, 'timestamp'> & { timestamp?: string }): void {
    const row: SessionEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
    };

    const sessionFile = getSessionFile(agentId, row.workflowId);
    fs.appendFileSync(sessionFile, `${JSON.stringify(row)}\n`, 'utf-8');
  }

  appendMessageLog(
    agentId: string,
    options: {
      workflowId: string;
      stage: string;
      direction: 'inbound' | 'outbound';
      otherAgentId: string;
      content: string;
      metadata?: any;
    }
  ): void {
    this.appendEntry(agentId, {
      workflowId: options.workflowId,
      stage: options.stage,
      type: 'message',
      direction: options.direction,
      otherAgentId: options.otherAgentId,
      preview: options.content.substring(0, 160),
      content: options.content,
      metadata: options.metadata || null,
    });
  }

  appendLLMExchange(
    agentId: string,
    options: {
      workflowId?: string;
      stage?: string;
      prompt: string;
      response: string;
      metadata?: any;
    }
  ): void {
    this.appendEntry(agentId, {
      workflowId: options.workflowId || null,
      stage: options.stage || null,
      type: 'llm_prompt',
      preview: options.prompt.substring(0, 160),
      content: options.prompt,
      metadata: options.metadata || null,
    });

    this.appendEntry(agentId, {
      workflowId: options.workflowId || null,
      stage: options.stage || null,
      type: 'llm_response',
      preview: options.response.substring(0, 160),
      content: options.response,
      metadata: options.metadata || null,
    });
  }

  getRecentEntries(agentId: string, workflowId?: string, limit: number = 8): SessionEntry[] {
    const sessionFile = getSessionFile(agentId, workflowId || null);
    const entries = readJsonLines(sessionFile);
    return entries.slice(-limit);
  }

  searchMemories(agentId: string, query: string, topK: number = 3): MemorySummary[] {
    const summaries = readSummaryIndex(agentId);
    const queryTokens = uniqueSorted(tokenize(query));
    if (queryTokens.length === 0) {
      return summaries.slice(-topK).reverse();
    }

    return summaries
      .map((summary) => {
        const haystack = `${summary.directive}\n${summary.summary}\n${summary.keywords.join(' ')}`.toLowerCase();
        const score = queryTokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0);
        return { summary, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || b.summary.createdAt.localeCompare(a.summary.createdAt))
      .slice(0, topK)
      .map((item) => item.summary);
  }

  buildPromptContext(agentId: string, query: string, workflowId?: string): string[] {
    const recentEntries = this.getRecentEntries(agentId, workflowId, 6);
    const relevantMemories = this.searchMemories(agentId, query, 3);
    const sections: string[] = [];

    if (recentEntries.length > 0) {
      const recentText = recentEntries
        .map((entry) => {
          const direction = entry.direction ? ` ${entry.direction}` : '';
          return `- [${entry.type}${direction}] ${entry.preview}`;
        })
        .join('\n');
      sections.push(`以下是你在当前工作流中的最近记忆，请保持连续性：\n${recentText}`);
    }

    if (relevantMemories.length > 0) {
      const memoryText = relevantMemories
        .map(
          (memory) =>
            `- 工作流 ${memory.workflowId}（${memory.status}）\n  指令：${memory.directive}\n  摘要：${memory.summary}`
        )
        .join('\n');
      sections.push(`以下是与你当前任务相关的历史经验，可作为参考但不要盲目照搬：\n${memoryText}`);
    }

    return sections;
  }

  materializeWorkflowMemories(workflowId: string): void {
    const workflow = db.getWorkflow(workflowId);
    if (!workflow) return;

    const messages = db.getMessagesByWorkflow(workflowId);
    const tasks = db.getTasksByWorkflow(workflowId);
    const agentIds = uniqueSorted(
      [
        ...messages.flatMap((message) => [message.from_agent, message.to_agent]),
        ...tasks.flatMap((task) => [task.worker_id, task.manager_id]),
        'ceo',
      ].filter(Boolean)
    );

    for (const agentId of agentIds) {
      const agent = db.getAgent(agentId);
      if (!agent) continue;

      const agentMessages = messages.filter(
        (message) => message.from_agent === agentId || message.to_agent === agentId
      );
      const agentTasks = tasks.filter(
        (task) => task.worker_id === agentId || task.manager_id === agentId
      );

      const summaryParts: string[] = [
        `角色：${agent.role}`,
        `工作流状态：${workflow.status}`,
        `消息数：${agentMessages.length}`,
        `相关任务数：${agentTasks.length}`,
      ];

      if (agentTasks.length > 0) {
        const taskSummary = agentTasks
          .map((task) => {
            const scoreText = task.total_score === null ? '未评分' : `${task.total_score}/20`;
            return `${task.description}（状态：${task.status}，分数：${scoreText}）`;
          })
          .join('；');
        summaryParts.push(`任务摘要：${taskSummary}`);
      }

      if (agentMessages.length > 0) {
        const latestMessages = agentMessages
          .slice(-3)
          .map(
            (message) => `${message.from_agent} -> ${message.to_agent} [${message.stage}] ${message.content.substring(0, 80)}`
          )
          .join('；');
        summaryParts.push(`近期消息：${latestMessages}`);
      }

      const summary = summaryParts.join('\n');
      const keywords = buildKeywordList(
        `${workflow.directive}\n${summary}\n${agentMessages.map((message) => message.content).join('\n')}`
      );

      const memory: MemorySummary = {
        workflowId,
        createdAt: new Date().toISOString(),
        directive: workflow.directive,
        status: workflow.status,
        role: agent.role,
        stage: workflow.current_stage,
        summary,
        keywords,
      };

      const summaries = readSummaryIndex(agentId).filter((item) => item.workflowId !== workflowId);
      summaries.push(memory);
      writeSummaryIndex(agentId, summaries);

      this.appendEntry(agentId, {
        workflowId,
        stage: workflow.current_stage,
        type: 'workflow_summary',
        preview: summary.substring(0, 160),
        content: summary,
        metadata: { keywords },
      });
    }
  }
}

export const sessionStore = new SessionStore();
