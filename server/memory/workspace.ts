import fs from 'fs';
import path from 'path';

const AGENTS_ROOT = path.resolve(process.cwd(), 'data/agents');

export interface AgentWorkspacePaths {
  rootDir: string;
  sessionsDir: string;
  memoryDir: string;
  reportsDir: string;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getAgentWorkspacePaths(agentId: string): AgentWorkspacePaths {
  const rootDir = path.join(AGENTS_ROOT, agentId);
  return {
    rootDir,
    sessionsDir: path.join(rootDir, 'sessions'),
    memoryDir: path.join(rootDir, 'memory'),
    reportsDir: path.join(rootDir, 'reports'),
  };
}

export function ensureAgentWorkspace(agentId: string): AgentWorkspacePaths {
  const paths = getAgentWorkspacePaths(agentId);
  ensureDir(AGENTS_ROOT);
  ensureDir(paths.rootDir);
  ensureDir(paths.sessionsDir);
  ensureDir(paths.memoryDir);
  ensureDir(paths.reportsDir);
  return paths;
}
