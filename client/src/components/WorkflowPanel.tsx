/**
 * Multi-agent workflow dashboard.
 */
import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  History,
  Loader2,
  Network,
  Send,
  Shield,
  Star,
  X,
  Zap,
} from 'lucide-react';

import {
  useWorkflowStore,
  type PanelView,
  type StageInfo,
  type TaskInfo,
} from '@/lib/workflow-store';

const DEPARTMENT_NAMES: Record<string, string> = {
  game: '游戏部',
  ai: 'AI 部',
  life: '生活部',
  meta: '元部门',
};

const DEPARTMENT_ICONS: Record<string, string> = {
  game: 'GE',
  ai: 'AI',
  life: 'LF',
  meta: 'MT',
};

const AGENT_STATUS_COLORS: Record<string, string> = {
  idle: 'bg-gray-300',
  thinking: 'bg-yellow-400 animate-pulse',
  executing: 'bg-blue-500 animate-pulse',
  reviewing: 'bg-purple-500 animate-pulse',
  planning: 'bg-indigo-500 animate-pulse',
  analyzing: 'bg-amber-500 animate-pulse',
  auditing: 'bg-red-400 animate-pulse',
  revising: 'bg-orange-500 animate-pulse',
  verifying: 'bg-teal-500 animate-pulse',
  summarizing: 'bg-cyan-500 animate-pulse',
  evaluating: 'bg-pink-500 animate-pulse',
};

const STATUS_LABELS: Record<string, string> = {
  idle: '空闲',
  thinking: '思考中',
  executing: '执行中',
  reviewing: '评审中',
  planning: '规划中',
  analyzing: '分析中',
  auditing: '审计中',
  revising: '修订中',
  verifying: '验证中',
  summarizing: '汇总中',
  evaluating: '评估中',
};

function getTaskStatusLabel(status: string): string {
  return (
    {
      assigned: '已分配',
      executing: '执行中',
      submitted: '已提交',
      reviewed: '已评审',
      audited: '已审计',
      revising: '修订中',
      verified: '待三修',
      passed: '已通过',
      failed: '失败',
    }[status] || status
  );
}

function StageProgressBar({
  stages,
  currentStage,
  status,
}: {
  stages: StageInfo[];
  currentStage: string | null;
  status: string;
}) {
  const currentIdx = stages.findIndex((stage) => stage.id === currentStage);

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {stages.map((stage, idx) => {
        let stageStatus: 'done' | 'active' | 'pending' = 'pending';
        if (status === 'completed') stageStatus = 'done';
        else if (idx < currentIdx) stageStatus = 'done';
        else if (idx === currentIdx) stageStatus = 'active';

        return (
          <div key={stage.id} className="flex items-center shrink-0">
            <div
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition-all ${
                stageStatus === 'done'
                  ? 'bg-emerald-100 text-emerald-700'
                  : stageStatus === 'active'
                    ? 'bg-blue-100 text-blue-700 animate-pulse'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {stageStatus === 'done' && <CheckCircle2 className="h-3 w-3" />}
              {stageStatus === 'active' && <Loader2 className="h-3 w-3 animate-spin" />}
              {stageStatus === 'pending' && <Circle className="h-3 w-3" />}
              <span>{stage.label}</span>
            </div>
            {idx < stages.length - 1 && (
              <ChevronRight
                className={`mx-0.5 h-3 w-3 shrink-0 ${
                  stageStatus === 'done' ? 'text-emerald-400' : 'text-gray-300'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function DirectiveView() {
  const { submitDirective, isSubmitting } = useWorkflowStore();
  const [directive, setDirective] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!directive.trim() || isSubmitting) return;
    await submitDirective(directive.trim());
    setDirective('');
  };

  const examples = [
    '本周聚焦用户增长，请各部门制定具体行动方案',
    '分析竞品最新动态，并制定我们的应对策略',
    '优化核心产品体验，提升用户留存与复访',
    '策划一次跨部门协作的新活动，兼顾传播与转化',
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#F0E8E0] px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#3A2A1A]">
          <Zap className="h-4 w-4 text-amber-500" />
          发布战略指令
        </h3>
        <p className="mt-0.5 text-[10px] text-[#8B7355]">
          输入一条指令，系统会由 CEO 自动拆解并分发给相关部门执行。
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="mb-4">
          <p className="mb-2 text-[10px] font-medium text-[#8B7355]">示例指令</p>
          <div className="space-y-1.5">
            {examples.map((example) => (
              <button
                key={example}
                onClick={() => setDirective(example)}
                className="w-full rounded-xl border border-transparent bg-[#F8F4F0] px-3 py-2 text-left text-xs text-[#5A4A3A] transition-colors hover:border-[#E8DDD0] hover:bg-[#F0E8E0]"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#E8DDD0] bg-gradient-to-br from-[#F8F4F0] to-[#F0E8E0] p-3">
          <p className="mb-2 text-[10px] font-bold text-[#3A2A1A]">十阶段工作流</p>
          <div className="grid grid-cols-2 gap-1 text-[9px] text-[#5A4A3A]">
            {[
              ['1. 方向下发', 'CEO 判断需要哪些部门参与'],
              ['2. 任务规划', '经理拆解任务并指派成员'],
              ['3. 执行任务', 'Worker 产出第一版结果'],
              ['4. 评审打分', '经理按四维度给分'],
              ['5. 元审计', '审查角色边界与内容质量'],
              ['6. 修订改进', '低分结果进入修订'],
              ['7. 验证确认', '经理确认反馈是否解决'],
              ['8. 部门汇总', '经理向 CEO 汇总成果'],
              ['9. CEO 反馈', '给出整体复盘与建议'],
              ['10. 自动进化', '根据弱项更新 SOUL.md'],
            ].map(([step, desc]) => (
              <div key={step} className="flex items-start gap-1">
                <span className="font-medium text-[#D4845A]">{step}</span>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-[#F0E8E0] p-4">
        <textarea
          ref={inputRef}
          value={directive}
          onChange={(event) => setDirective(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="输入战略指令..."
          rows={3}
          className="w-full resize-none rounded-xl border border-[#F0E8E0] bg-[#F8F4F0] px-3 py-2 text-sm text-[#3A2A1A] placeholder-[#C4B5A0] transition-all focus:border-[#D4845A]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4845A]/20"
        />
        <button
          onClick={handleSubmit}
          disabled={!directive.trim() || isSubmitting}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4845A] to-[#E4946A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:from-[#C07050] hover:to-[#D0845A] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>正在启动工作流...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>发布指令</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function OrgTreeView() {
  const { agents, agentStatuses } = useWorkflowStore();

  const ceo = agents.find((agent) => agent.role === 'ceo');
  const managers = agents.filter((agent) => agent.role === 'manager');

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#F0E8E0] px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#3A2A1A]">
          <Network className="h-4 w-4 text-indigo-500" />
          组织结构
        </h3>
        <p className="mt-0.5 text-[10px] text-[#8B7355]">18 个智能体，4 个部门，3 层协作关系。</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {ceo && (
          <div className="mb-4">
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  AGENT_STATUS_COLORS[agentStatuses[ceo.id] || 'idle']
                }`}
              />
              <span className="text-sm font-bold text-amber-800">{ceo.name}</span>
              <span className="ml-auto text-[9px] text-amber-600">
                {STATUS_LABELS[agentStatuses[ceo.id] || 'idle'] || '空闲'}
              </span>
            </div>
          </div>
        )}

        {managers.map((manager) => {
          const workers = agents.filter(
            (agent) => agent.managerId === manager.id && agent.role === 'worker'
          );
          const dept = manager.department;

          return (
            <div key={manager.id} className="mb-3">
              <div className="flex items-center gap-2 rounded-xl border border-[#E8DDD0] bg-[#F8F4F0] px-3 py-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-[10px] font-bold text-[#8B7355]">
                  {DEPARTMENT_ICONS[dept] || 'DP'}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#3A2A1A]">
                      {DEPARTMENT_NAMES[dept] || dept}
                    </span>
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${
                        AGENT_STATUS_COLORS[agentStatuses[manager.id] || 'idle']
                      }`}
                    />
                  </div>
                  <span className="text-[9px] text-[#8B7355]">{manager.name}</span>
                </div>
                <span className="text-[9px] text-[#8B7355]">
                  {STATUS_LABELS[agentStatuses[manager.id] || 'idle'] || '空闲'}
                </span>
              </div>

              <div className="ml-4 mt-1 space-y-1">
                {workers.map((worker) => (
                  <div
                    key={worker.id}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-[#F8F4F0]"
                  >
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${
                        AGENT_STATUS_COLORS[agentStatuses[worker.id] || 'idle']
                      }`}
                    />
                    <span className="text-[11px] text-[#5A4A3A]">{worker.name}</span>
                    <span className="ml-auto text-[9px] text-[#B0A090]">
                      {agentStatuses[worker.id] !== 'idle'
                        ? STATUS_LABELS[agentStatuses[worker.id]] || agentStatuses[worker.id]
                        : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WorkflowProgressView() {
  const { currentWorkflow, tasks, stages, messages, fetchWorkflowDetail, currentWorkflowId } =
    useWorkflowStore();

  useEffect(() => {
    if (!currentWorkflowId || currentWorkflow?.status !== 'running') return;
    const timer = setInterval(() => {
      fetchWorkflowDetail(currentWorkflowId);
    }, 3000);
    return () => clearInterval(timer);
  }, [currentWorkflowId, currentWorkflow?.status, fetchWorkflowDetail]);

  if (!currentWorkflow) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <BarChart3 className="mb-3 h-10 w-10 text-[#C4B5A0]" />
        <p className="text-sm font-medium text-[#5A4A3A]">暂无活跃工作流</p>
        <p className="mt-1 text-[10px] text-[#8B7355]">发布一条战略指令后，这里会显示执行进度。</p>
      </div>
    );
  }

  const tasksByDept = new Map<string, TaskInfo[]>();
  for (const task of tasks) {
    const list = tasksByDept.get(task.department) || [];
    list.push(task);
    tasksByDept.set(task.department, list);
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case 'assigned':
        return <Clock className="h-3 w-3 text-gray-400" />;
      case 'executing':
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />;
      case 'submitted':
        return <CheckCircle2 className="h-3 w-3 text-blue-500" />;
      case 'reviewed':
        return <Star className="h-3 w-3 text-purple-500" />;
      case 'audited':
        return <Shield className="h-3 w-3 text-orange-500" />;
      case 'revising':
        return <Loader2 className="h-3 w-3 animate-spin text-orange-500" />;
      case 'passed':
        return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Circle className="h-3 w-3 text-gray-300" />;
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#F0E8E0] px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#3A2A1A]">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            工作流进度
          </h3>
          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
              currentWorkflow.status === 'running'
                ? 'bg-blue-100 text-blue-700'
                : currentWorkflow.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-700'
                  : currentWorkflow.status === 'failed'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600'
            }`}
          >
            {currentWorkflow.status === 'running'
              ? '运行中'
              : currentWorkflow.status === 'completed'
                ? '已完成'
                : currentWorkflow.status === 'failed'
                  ? '失败'
                  : '等待中'}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-[10px] text-[#8B7355]">{currentWorkflow.directive}</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        <StageProgressBar
          stages={stages}
          currentStage={currentWorkflow.current_stage}
          status={currentWorkflow.status}
        />

        {currentWorkflow.status === 'failed' && (
          <div className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-orange-50 p-3">
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-red-800">
              <AlertCircle className="h-3.5 w-3.5" />
              工作流执行失败
            </h4>
            <div className="whitespace-pre-wrap text-[10px] leading-5 text-red-700">
              {currentWorkflow.results?.last_error || '出现了未知错误，请查看服务端日志。'}
            </div>
            <p className="mt-2 text-[9px] text-red-600">
              如果报错与模型调用有关，优先检查 `.env` 中的 LLM 配置和备用供应商是否可用。
            </p>
          </div>
        )}

        {Array.from(tasksByDept.entries()).map(([dept, deptTasks]) => (
          <div key={dept} className="rounded-xl border border-[#E8DDD0] bg-[#F8F4F0] p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-bold text-[#3A2A1A]">
                {DEPARTMENT_NAMES[dept] || dept}
              </span>
              <span className="text-[9px] text-[#8B7355]">
                {deptTasks.filter((task) => task.status === 'passed').length}/{deptTasks.length} 完成
              </span>
            </div>
            <div className="space-y-1.5">
              {deptTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-2 rounded-lg bg-white/60 px-2.5 py-2"
                >
                  {statusIcon(task.status)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-[#3A2A1A]">
                        {task.worker_id}
                      </span>
                      <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[8px] text-[#7C6A59]">
                        {getTaskStatusLabel(task.status)}
                      </span>
                      {task.total_score !== null && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                            task.total_score >= 16
                              ? 'bg-emerald-100 text-emerald-700'
                              : task.total_score >= 10
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {task.total_score}/20
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[9px] text-[#8B7355]">
                      {task.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {currentWorkflow.status === 'completed' && currentWorkflow.results && (
          <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-3">
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              工作流已完成
            </h4>
            {currentWorkflow.results.ceo_feedback && (
              <div className="max-h-40 overflow-y-auto whitespace-pre-wrap text-[10px] text-emerald-700">
                {currentWorkflow.results.ceo_feedback}
              </div>
            )}
          </div>
        )}

        {messages.length > 0 && (
          <div>
            <h4 className="mb-1.5 text-[10px] font-bold text-[#8B7355]">最近消息</h4>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {messages
                .slice(-10)
                .reverse()
                .map((msg) => (
                  <div
                    key={msg.id}
                    className="rounded-lg bg-white/40 px-2 py-1.5 text-[9px] text-[#5A4A3A]"
                  >
                    <span className="font-medium text-[#D4845A]">{msg.from_agent}</span>
                    <span className="text-[#B0A090]"> → </span>
                    <span className="font-medium text-[#3A7A5A]">{msg.to_agent}</span>
                    <span className="text-[#B0A090]"> [{msg.stage}]</span>
                    <p className="mt-0.5 line-clamp-2 text-[#8B7355]">
                      {msg.content.substring(0, 100)}...
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewView() {
  const { tasks } = useWorkflowStore();
  const scoredTasks = tasks.filter((task) => task.total_score !== null);

  if (scoredTasks.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <Star className="mb-3 h-10 w-10 text-[#C4B5A0]" />
        <p className="text-sm font-medium text-[#5A4A3A]">暂无评审数据</p>
        <p className="mt-1 text-[10px] text-[#8B7355]">进入评审阶段后，这里会展示每项任务的得分。</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#F0E8E0] px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#3A2A1A]">
          <Star className="h-4 w-4 text-amber-500" />
          评审得分
        </h3>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {scoredTasks.map((task) => (
          <div key={task.id} className="rounded-xl border border-[#E8DDD0] bg-white/80 p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-[#3A2A1A]">{task.worker_id}</span>
              <span
                className={`text-sm font-bold ${
                  (task.total_score || 0) >= 16
                    ? 'text-emerald-600'
                    : (task.total_score || 0) >= 10
                      ? 'text-amber-600'
                      : 'text-red-600'
                }`}
              >
                {task.total_score}/20
              </span>
            </div>

            <div className="mb-2 space-y-1.5">
              {[
                { label: '准确性', score: task.score_accuracy, color: 'bg-blue-500' },
                { label: '完整性', score: task.score_completeness, color: 'bg-green-500' },
                { label: '可执行性', score: task.score_actionability, color: 'bg-purple-500' },
                { label: '格式', score: task.score_format, color: 'bg-orange-500' },
              ].map(({ label, score, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-12 text-[9px] text-[#8B7355]">{label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full rounded-full ${color} transition-all duration-500`}
                      style={{ width: `${((score || 0) / 5) * 100}%` }}
                    />
                  </div>
                  <span className="w-5 text-right text-[9px] font-medium text-[#5A4A3A]">
                    {score || 0}
                  </span>
                </div>
              ))}
            </div>

            {task.manager_feedback && (
              <div className="mt-2 rounded-lg bg-[#F8F4F0] p-2 text-[9px] text-[#8B7355]">
                <span className="font-medium">反馈：</span>
                {task.manager_feedback.substring(0, 200)}
              </div>
            )}

            <div className="mt-2 flex items-center gap-1">
              {[1, 2, 3].map((version) => {
                const hasVersion =
                  version === 1
                    ? task.deliverable
                    : version === 2
                      ? task.deliverable_v2
                      : task.deliverable_v3;

                return (
                  <span
                    key={version}
                    className={`rounded px-1.5 py-0.5 text-[8px] ${
                      hasVersion ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    v{version}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryView() {
  const { workflows, setCurrentWorkflow, setActiveView, fetchWorkflows } = useWorkflowStore();

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#F0E8E0] px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#3A2A1A]">
          <History className="h-4 w-4 text-[#8B7355]" />
          历史工作流
        </h3>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {workflows.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-[#8B7355]">暂无历史记录</p>
          </div>
        ) : (
          workflows.map((workflow) => (
            <button
              key={workflow.id}
              onClick={() => {
                setCurrentWorkflow(workflow.id);
                setActiveView('workflow');
              }}
              className="w-full rounded-xl border border-[#E8DDD0] bg-[#F8F4F0] p-3 text-left transition-colors hover:bg-[#F0E8E0]"
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                    workflow.status === 'running'
                      ? 'bg-blue-100 text-blue-700'
                      : workflow.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : workflow.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {workflow.status === 'running'
                    ? '运行中'
                    : workflow.status === 'completed'
                      ? '已完成'
                      : workflow.status === 'failed'
                        ? '失败'
                        : '等待中'}
                </span>
                <span className="text-[9px] text-[#B0A090]">
                  {new Date(workflow.created_at).toLocaleString('zh-CN')}
                </span>
              </div>
              <p className="line-clamp-2 text-xs text-[#3A2A1A]">{workflow.directive}</p>
              {workflow.current_stage && (
                <p className="mt-1 text-[9px] text-[#8B7355]">当前阶段：{workflow.current_stage}</p>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function WorkflowPanel() {
  const {
    isWorkflowPanelOpen,
    toggleWorkflowPanel,
    activeView,
    setActiveView,
    initSocket,
    fetchAgents,
    fetchStages,
    fetchWorkflows,
    connected,
  } = useWorkflowStore();

  useEffect(() => {
    initSocket();
    fetchAgents();
    fetchStages();
    fetchWorkflows();
  }, [initSocket, fetchAgents, fetchStages, fetchWorkflows]);

  if (!isWorkflowPanelOpen) return null;

  const views: Array<{ id: PanelView; icon: typeof Zap; label: string }> = [
    { id: 'directive', icon: Zap, label: '指令' },
    { id: 'org', icon: Network, label: '组织' },
    { id: 'workflow', icon: BarChart3, label: '进度' },
    { id: 'review', icon: Star, label: '评审' },
    { id: 'history', icon: History, label: '历史' },
  ];

  return (
    <div
      className="fixed bottom-6 right-5 z-[55] flex h-[560px] w-[400px] flex-col rounded-3xl border border-white/60 bg-white/92 shadow-[0_12px_48px_rgba(0,0,0,0.15)] backdrop-blur-2xl animate-in slide-in-from-bottom-4 fade-in duration-300"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="flex items-center justify-between border-b border-[#F0E8E0] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4845A] to-[#E4946A] shadow-sm">
            <Brain className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#3A2A1A]">多智能体编排</h3>
            <div className="flex items-center gap-1.5">
              <div className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-400'}`} />
              <span className="text-[9px] text-[#8B7355]">{connected ? '已连接' : '未连接'}</span>
            </div>
          </div>
        </div>

        <button
          onClick={toggleWorkflowPanel}
          className="rounded-xl p-2 transition-colors hover:bg-[#F0E8E0]"
        >
          <X className="h-4 w-4 text-[#8B7355]" />
        </button>
      </div>

      <div className="flex items-center gap-1 border-b border-[#F0E8E0] px-3 py-2">
        {views.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveView(id)}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-all ${
              activeView === id
                ? 'bg-[#D4845A] text-white shadow-sm'
                : 'text-[#8B7355] hover:bg-[#F0E8E0]'
            }`}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeView === 'directive' && <DirectiveView />}
        {activeView === 'org' && <OrgTreeView />}
        {activeView === 'workflow' && <WorkflowProgressView />}
        {activeView === 'review' && <ReviewView />}
        {activeView === 'history' && <HistoryView />}
      </div>
    </div>
  );
}
