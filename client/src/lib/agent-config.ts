import { PET_MODELS } from '@/lib/assets';

export type AgentAnimationType =
  | 'typing'
  | 'reading'
  | 'organizing'
  | 'discussing'
  | 'noting';

export interface AgentVisualConfig {
  id: string;
  name: string;
  shortLabel: string;
  title: string;
  department: 'game' | 'ai' | 'life' | 'meta';
  role: 'ceo' | 'manager' | 'worker';
  emoji: string;
  animal: keyof typeof PET_MODELS;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  animationType: AgentAnimationType;
  idleText: string;
  chatRole: string;
}

export const DEFAULT_AGENT_ID = 'ceo';

export const DEPARTMENT_COLORS: Record<AgentVisualConfig['department'], string> = {
  game: '#D97706',
  ai: '#2563EB',
  life: '#059669',
  meta: '#7C3AED',
};

export const DEPARTMENT_SOFT_COLORS: Record<AgentVisualConfig['department'], string> = {
  game: 'bg-amber-100 text-amber-800',
  ai: 'bg-blue-100 text-blue-800',
  life: 'bg-emerald-100 text-emerald-800',
  meta: 'bg-violet-100 text-violet-800',
};

export const AGENT_VISUAL_CONFIGS: AgentVisualConfig[] = [
  {
    id: 'ceo',
    name: 'CEO Gateway',
    shortLabel: 'CEO',
    title: '全局编排中枢',
    department: 'meta',
    role: 'ceo',
    emoji: '🐱',
    animal: 'cat',
    position: [0, 0, -2.45],
    rotation: [0, Math.PI, 0],
    scale: 0.38,
    animationType: 'typing',
    idleText: '我在盯全局。\n有新指令就来。',
    chatRole: 'CEO，负责战略拆解、优先级判断和跨部门协同，语气沉稳、清晰、有全局感。',
  },
  {
    id: 'pixel',
    name: 'Pixel',
    shortLabel: 'Pixel',
    title: '游戏部经理',
    department: 'game',
    role: 'manager',
    emoji: '🐯',
    animal: 'tiger',
    position: [-3.2, 0, -1.8],
    rotation: [0, Math.PI * 0.92, 0],
    scale: 0.34,
    animationType: 'reading',
    idleText: '游戏部待命。\n先看节奏，再拆任务。',
    chatRole: '游戏部经理，擅长玩法策略、活动包装和项目推进，回答要具体、有节奏感。',
  },
  {
    id: 'nova',
    name: 'Nova',
    shortLabel: 'Nova',
    title: '游戏策划',
    department: 'game',
    role: 'worker',
    emoji: '🐵',
    animal: 'monkey',
    position: [-4.45, 0, -0.85],
    rotation: [0, Math.PI / 2, 0],
    scale: 0.28,
    animationType: 'discussing',
    idleText: '我在磨玩法点子。\n最好要新鲜一点。',
    chatRole: '游戏策划，擅长活动玩法、节奏设计和奖励结构，回答偏创意策划但要可执行。',
  },
  {
    id: 'blaze',
    name: 'Blaze',
    shortLabel: 'Blaze',
    title: '技术实现',
    department: 'game',
    role: 'worker',
    emoji: '🐶',
    animal: 'dog',
    position: [-3.15, 0, -0.65],
    rotation: [0, Math.PI / 1.15, 0],
    scale: 0.28,
    animationType: 'typing',
    idleText: '实现路径我来拆。\n风险也会一起算。',
    chatRole: '技术型游戏 worker，擅长实现方案、工程拆解和风险判断，回答要务实。',
  },
  {
    id: 'lyra',
    name: 'Lyra',
    shortLabel: 'Lyra',
    title: '交互体验',
    department: 'game',
    role: 'worker',
    emoji: '🐰',
    animal: 'bunny',
    position: [-4.2, 0, -2.65],
    rotation: [0, Math.PI * 0.72, 0],
    scale: 0.26,
    animationType: 'organizing',
    idleText: '我盯用户体验。\n哪里别扭我一眼能看出。',
    chatRole: '游戏体验设计 worker，擅长交互路径、反馈设计和体验诊断，回答要贴近用户。',
  },
  {
    id: 'volt',
    name: 'Volt',
    shortLabel: 'Volt',
    title: '增长分析',
    department: 'game',
    role: 'worker',
    emoji: '🐷',
    animal: 'pig',
    position: [-2.2, 0, -2.55],
    rotation: [0, Math.PI * 1.1, 0],
    scale: 0.27,
    animationType: 'noting',
    idleText: '先别拍脑袋。\n让我看看数据。',
    chatRole: '增长分析 worker，擅长留存、漏斗和验证设计，回答尽量量化。',
  },
  {
    id: 'nexus',
    name: 'Nexus',
    shortLabel: 'Nexus',
    title: 'AI 部经理',
    department: 'ai',
    role: 'manager',
    emoji: '🦁',
    animal: 'lion',
    position: [3.2, 0, -1.8],
    rotation: [0, Math.PI, 0],
    scale: 0.34,
    animationType: 'reading',
    idleText: 'AI 部在线。\n先判断可行性，再定方案。',
    chatRole: 'AI 部经理，擅长模型、数据、算法和产品落地的综合判断，回答理性直接。',
  },
  {
    id: 'flux',
    name: 'Flux',
    shortLabel: 'Flux',
    title: '模型优化',
    department: 'ai',
    role: 'worker',
    emoji: '🦒',
    animal: 'giraffe',
    position: [2.15, 0, -2.6],
    rotation: [0, Math.PI * 0.95, 0],
    scale: 0.29,
    animationType: 'typing',
    idleText: '模型怎么训、怎么调，\n我来算最优解。',
    chatRole: '模型优化 worker，擅长训练策略、推理表现和成本效果权衡。',
  },
  {
    id: 'tensor',
    name: 'Tensor',
    shortLabel: 'Tensor',
    title: '数据工程',
    department: 'ai',
    role: 'worker',
    emoji: '🐘',
    animal: 'elephant',
    position: [4.1, 0, -2.6],
    rotation: [0, Math.PI * 1.08, 0],
    scale: 0.29,
    animationType: 'organizing',
    idleText: '脏数据先别进来。\n我会把管道梳干净。',
    chatRole: '数据工程 worker，擅长数据清洗、标注、特征工程和流程设计。',
  },
  {
    id: 'quark',
    name: 'Quark',
    shortLabel: 'Quark',
    title: '算法研究',
    department: 'ai',
    role: 'worker',
    emoji: '🦜',
    animal: 'parrot',
    position: [2.85, 0, -0.7],
    rotation: [0, Math.PI / 1.35, 0],
    scale: 0.27,
    animationType: 'discussing',
    idleText: '方案对比这件事，\n得把边界讲清楚。',
    chatRole: '算法研究 worker，擅长方法比较、适用边界和推理链路说明。',
  },
  {
    id: 'iris',
    name: 'Iris',
    shortLabel: 'Iris',
    title: '应用集成',
    department: 'ai',
    role: 'worker',
    emoji: '🐟',
    animal: 'fish',
    position: [4.35, 0, -0.75],
    rotation: [0, Math.PI * 1.25, 0],
    scale: 0.26,
    animationType: 'noting',
    idleText: '纸上方案不算数。\n我更关心怎么真正接进去。',
    chatRole: 'AI 应用集成 worker，擅长接口接入、服务化部署和真实业务落地。',
  },
  {
    id: 'echo',
    name: 'Echo',
    shortLabel: 'Echo',
    title: '生活部经理',
    department: 'life',
    role: 'manager',
    emoji: '🐥',
    animal: 'chick',
    position: [-2.8, 0, 2.2],
    rotation: [0, -Math.PI / 6, 0],
    scale: 0.3,
    animationType: 'discussing',
    idleText: '内容和用户感受，\n我来兜底。',
    chatRole: '生活部经理，擅长内容表达、用户沟通和品牌温度，回答要自然有人味。',
  },
  {
    id: 'zen',
    name: 'Zen',
    shortLabel: 'Zen',
    title: '内容创作',
    department: 'life',
    role: 'worker',
    emoji: '🐰',
    animal: 'bunny',
    position: [-4.25, 0, 3.2],
    rotation: [0, -Math.PI / 12, 0],
    scale: 0.24,
    animationType: 'reading',
    idleText: '文案别空，\n也别硬卖。',
    chatRole: '内容创作 worker，擅长文案、选题和品牌表达，回答轻盈但要有信息量。',
  },
  {
    id: 'coco',
    name: 'Coco',
    shortLabel: 'Coco',
    title: '社区运营',
    department: 'life',
    role: 'worker',
    emoji: '🐛',
    animal: 'caterpillar',
    position: [-2.15, 0, 3.1],
    rotation: [0, Math.PI / 12, 0],
    scale: 0.24,
    animationType: 'noting',
    idleText: '用户怎么想，\n得听他们自己说。',
    chatRole: '社区运营 worker，擅长社群互动、反馈整理和长期关系维护。',
  },
  {
    id: 'warden',
    name: 'Warden',
    shortLabel: 'Warden',
    title: '元部门经理',
    department: 'meta',
    role: 'manager',
    emoji: '🐗',
    animal: 'hog',
    position: [2.9, 0, 2.2],
    rotation: [0, Math.PI + Math.PI / 6, 0],
    scale: 0.32,
    animationType: 'discussing',
    idleText: '流程有没有跑顺，\n我会盯到底。',
    chatRole: '元部门经理，负责流程审视、质量把关和跨角色复盘，回答要客观锋利。',
  },
  {
    id: 'forge',
    name: 'Forge',
    shortLabel: 'Forge',
    title: '流程分析',
    department: 'meta',
    role: 'worker',
    emoji: '🐮',
    animal: 'cow',
    position: [1.7, 0, 3.15],
    rotation: [0, Math.PI + Math.PI / 8, 0],
    scale: 0.27,
    animationType: 'organizing',
    idleText: '哪里卡住了，\n我会顺着流程往回找。',
    chatRole: '流程分析 worker，擅长识别协作卡点、链路断点和可执行优化。',
  },
  {
    id: 'prism',
    name: 'Prism',
    shortLabel: 'Prism',
    title: '质量审计',
    department: 'meta',
    role: 'worker',
    emoji: '🐛',
    animal: 'caterpillar',
    position: [3.25, 0, 3.3],
    rotation: [0, Math.PI + Math.PI / 18, 0],
    scale: 0.23,
    animationType: 'noting',
    idleText: '哪句是套话，\n我很快就能挑出来。',
    chatRole: '质量审计 worker，擅长识别空话、浅层回答和结构缺口，回答要挑问题挑得准。',
  },
  {
    id: 'scout',
    name: 'Scout',
    shortLabel: 'Scout',
    title: '效能评估',
    department: 'meta',
    role: 'worker',
    emoji: '🐶',
    animal: 'dog',
    position: [4.75, 0, 2.95],
    rotation: [0, Math.PI * 1.08, 0],
    scale: 0.24,
    animationType: 'reading',
    idleText: '单次表现不够，\n我更看长期趋势。',
    chatRole: '效能评估 worker，擅长趋势判断、薄弱项识别和持续改进建议。',
  },
];

export const AGENT_VISUAL_MAP = Object.fromEntries(
  AGENT_VISUAL_CONFIGS.map((config) => [config.id, config])
) as Record<string, AgentVisualConfig>;

export function getAgentConfig(agentId?: string | null): AgentVisualConfig {
  return AGENT_VISUAL_MAP[agentId || DEFAULT_AGENT_ID] || AGENT_VISUAL_MAP[DEFAULT_AGENT_ID];
}

export function getAgentLabel(agentId?: string | null): string {
  return getAgentConfig(agentId).name;
}

export function getAgentEmoji(agentId?: string | null): string {
  return getAgentConfig(agentId).emoji;
}

export function getAgentChatRole(agentId?: string | null): string {
  return getAgentConfig(agentId).chatRole;
}

export function getAgentToolbarLabel(agentId?: string | null): string {
  const config = getAgentConfig(agentId);
  return `${config.emoji} ${config.name} · ${config.title}`;
}
