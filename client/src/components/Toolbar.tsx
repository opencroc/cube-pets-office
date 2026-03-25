/**
 * Toolbar — Floating action buttons for the 3D scene
 * Design: Warm glass-morphism buttons, fixed z-index above canvas
 */
import { useAppStore } from '@/lib/store';
import { useWorkflowStore } from '@/lib/workflow-store';
import { BookOpen, Settings, MessageCircle, HelpCircle, X, Brain } from 'lucide-react';
import { useState } from 'react';

const PET_LABELS: Record<string, string> = {
  cat: '🐱 猫咪主管',
  dog: '🐶 狗狗研究员',
  bunny: '🐰 兔兔管理员',
  monkey: '🐵 猴子讨论家',
  chick: '🐥 小鸡记录员',
};

export function Toolbar() {
  const { togglePdf, toggleConfig, toggleChat, isPdfOpen, isConfigOpen, isChatOpen, selectedPet } = useAppStore();
  const { isWorkflowPanelOpen, toggleWorkflowPanel } = useWorkflowStore();
  const [showInfo, setShowInfo] = useState(false);

  const btnBase = `
    relative flex items-center gap-2.5 px-4 py-2.5 rounded-2xl
    backdrop-blur-xl border transition-all duration-300 shadow-lg
    hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md
  `;

  const btnActive = 'text-white border-transparent shadow-xl';
  const btnInactive = 'bg-white/80 text-[#5A4A3A] border-white/50 hover:bg-white/95';

  return (
    <>
      {/* Top title bar */}
      <div
        className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center py-3"
        style={{ pointerEvents: 'none' }}
      >
        <div
          className="bg-white/75 backdrop-blur-xl rounded-2xl px-6 py-2 border border-white/60 shadow-lg"
          style={{ pointerEvents: 'auto' }}
        >
          <h1
            className="text-lg font-bold text-[#3A2A1A] tracking-wide"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Cube Pets Office
          </h1>
          <p className="text-[10px] text-[#8B7355] text-center tracking-[0.2em] uppercase">
            立方宠物研究室
          </p>
        </div>
      </div>

      {/* Action buttons — left side, vertically stacked */}
      <div
        className="fixed bottom-6 left-5 z-[60] flex flex-col gap-2.5"
        style={{ pointerEvents: 'auto' }}
      >
        {/* PDF Viewer */}
        <button
          onClick={(e) => { e.stopPropagation(); togglePdf(); }}
          className={`${btnBase} ${isPdfOpen ? `${btnActive} bg-gradient-to-r from-[#C4956A] to-[#D4A57A]` : btnInactive}`}
        >
          <BookOpen className="w-4 h-4" />
          <span className="text-sm font-semibold">论文</span>
        </button>

        {/* Config */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleConfig(); }}
          className={`${btnBase} ${isConfigOpen ? `${btnActive} bg-gradient-to-r from-[#2D5F4A] to-[#3D7F5A]` : btnInactive}`}
        >
          <Settings className="w-4 h-4" />
          <span className="text-sm font-semibold">配置</span>
        </button>

        {/* Workflow Panel */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleWorkflowPanel(); }}
          className={`${btnBase} ${isWorkflowPanelOpen ? `${btnActive} bg-gradient-to-r from-[#D4845A] to-[#E4946A]` : btnInactive}`}
        >
          <Brain className="w-4 h-4" />
          <span className="text-sm font-semibold">编排</span>
        </button>

        {/* Chat */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleChat(); }}
          className={`${btnBase} ${isChatOpen ? `${btnActive} bg-gradient-to-r from-[#C4956A] to-[#D4A57A]` : btnInactive}`}
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-sm font-semibold">聊天</span>
        </button>

        {/* Info */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }}
          className={`${btnBase} ${showInfo ? `${btnActive} bg-gradient-to-r from-[#6B5B4A] to-[#8B7B6A]` : btnInactive}`}
        >
          <HelpCircle className="w-4 h-4" />
          <span className="text-sm font-semibold">帮助</span>
        </button>
      </div>

      {/* Info panel */}
      {showInfo && (
        <div
          className="fixed bottom-6 left-32 z-[60] bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-2xl max-w-[300px]
            animate-in fade-in slide-in-from-left-4 duration-300"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h4
              className="text-sm font-bold text-[#3A2A1A]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              使用指南
            </h4>
            <button
              onClick={() => setShowInfo(false)}
              className="p-1 rounded-lg hover:bg-[#F0E8E0] transition-colors"
            >
              <X className="w-3.5 h-3.5 text-[#8B7355]" />
            </button>
          </div>
          <div className="space-y-2.5 text-xs text-[#5A4A3A] leading-relaxed">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#F0E8E0] flex items-center justify-center text-[10px] shrink-0 mt-0.5">🖱️</span>
              <span>拖拽旋转3D场景，滚轮缩放视角</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#F0E8E0] flex items-center justify-center text-[10px] shrink-0 mt-0.5">🐾</span>
              <span>点击宠物查看它们在做什么，并开始AI对话</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#F0E8E0] flex items-center justify-center text-[10px] shrink-0 mt-0.5">📄</span>
              <span>打开论文面板浏览完整的33页PDF论文</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#F0E8E0] flex items-center justify-center text-[10px] shrink-0 mt-0.5">⚙️</span>
              <span>在配置面板中设置Codex API参数</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#F0E8E0] flex items-center justify-center text-[10px] shrink-0 mt-0.5">💬</span>
              <span>在聊天中向宠物提问关于论文的问题</span>
            </div>
          </div>
        </div>
      )}

      {/* Selected pet indicator — top right */}
      {selectedPet && (
        <div
          className="fixed top-16 right-5 z-[60] bg-white/85 backdrop-blur-xl rounded-xl px-3.5 py-2 border border-white/60 shadow-lg
            animate-in fade-in slide-in-from-right-2 duration-300"
          style={{ pointerEvents: 'auto' }}
        >
          <p className="text-xs text-[#5A4A3A]">
            当前选中: <span className="text-[#D4845A] font-bold">{PET_LABELS[selectedPet]}</span>
          </p>
        </div>
      )}
    </>
  );
}
