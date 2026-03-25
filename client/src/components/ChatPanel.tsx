/**
 * Chat Panel — Talk to pets about the paper using AI
 * Design: Warm chat bubbles, pet avatars, glass-morphism
 */
import { useAppStore, type ChatMessage } from '@/lib/store';
import { Send, X, Trash2, MessageCircle } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

const PET_EMOJIS: Record<string, string> = {
  cat: '🐱',
  dog: '🐶',
  bunny: '🐰',
  monkey: '🐵',
  chick: '🐥',
};

const PET_NAMES: Record<string, string> = {
  cat: '猫咪主管',
  dog: '狗狗研究员',
  bunny: '兔兔管理员',
  monkey: '猴子讨论家',
  chick: '小鸡记录员',
};

const PET_ROLES: Record<string, string> = {
  cat: 'CEO，负责战略方向与跨部门协调，语气沉稳有领导力',
  dog: 'AI部经理，擅长分析论文与模型架构，语气认真严谨',
  bunny: '元部门管理员，负责整理文献与知识库，语气温柔细心',
  monkey: '游戏部经理，喜欢讨论系统架构设计，语气活泼好动',
  chick: '生活部Worker，负责记录会议要点，语气可爱呆萌',
};

const PAPER_CONTEXT = `你是一个可爱的立方宠物研究助手，正在一间温馨的书房里工作。你正在研究一篇论文：
《从单一指令到全组织行动：面向多智能体 LLM 系统的组织镜像方法》
作者：金永勋 (Yongxun Jin)

论文核心内容：
- 提出"组织镜像"(organizational mirroring)方法，使简单自然语言指令即可驱动整个LLM智能体组织
- 基于八项架构原则：层级委派、独立记忆、分层记忆压缩、元部门组织自分析、基于技能编排的部门组合、自进化机制、可替换执行器、真实工作流映射
- 在OpenClaw框架上实现了18个智能体、四个部门（游戏部、AI部、生活部、元部门）
- 系统架构：三层层级 - CEO → 经理(Manager) → Worker
- 意图放大比(IAR)：衡量系统将单一指令放大为多少具体行动的能力
- 实验结果：组织拓扑输出量是单智能体基线的3.1-5.9倍
- 层级结构将通信链路减少了85.7%
- 独立记忆消除了跨领域词汇入侵

请用简短、可爱的语气回答关于这篇论文的问题。每次回答控制在150字以内。`;

export function ChatPanel() {
  const {
    chatMessages, addMessage, clearChat, isChatOpen, toggleChat,
    isLoading, setLoading, aiConfig, selectedPet,
  } = useAppStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isChatOpen]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    const currentInput = input.trim();
    setInput('');
    setLoading(true);

    const petName = selectedPet || 'cat';

    try {
      const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: aiConfig.model,
          messages: [
            {
              role: 'system',
              content: `${PAPER_CONTEXT}\n\n你现在扮演的是${PET_NAMES[petName]}（${PET_EMOJIS[petName]}），角色定位：${PET_ROLES[petName]}。请用符合角色的语气回答。`,
            },
            ...chatMessages.slice(-10).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            { role: 'user', content: currentInput },
          ],
          max_tokens: 400,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`API ${response.status}: ${errText.substring(0, 100)}`);
      }

      const data = await response.json();
      const assistantContent = data.choices?.[0]?.message?.content || '喵...我好像没听清，能再说一次吗？';

      addMessage({
        role: 'assistant',
        content: assistantContent,
        petName,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      addMessage({
        role: 'assistant',
        content: `哎呀，连接出了点问题...\n${error.message || '请检查API配置'}`,
        petName,
        timestamp: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  }, [input, isLoading, aiConfig, chatMessages, selectedPet, addMessage, setLoading]);

  if (!isChatOpen) return null;

  return (
    <div
      className="fixed bottom-6 right-5 w-[380px] h-[500px] z-[55] flex flex-col
        bg-white/90 backdrop-blur-2xl rounded-3xl border border-white/60
        shadow-[0_12px_48px_rgba(0,0,0,0.12)]
        animate-in slide-in-from-bottom-4 fade-in duration-300"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0E8E0]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D4845A] to-[#E4946A] flex items-center justify-center shadow-sm">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#3A2A1A]">
              与{selectedPet ? PET_NAMES[selectedPet] : '宠物'}聊天
            </h3>
            {selectedPet && (
              <p className="text-[10px] text-[#8B7355]">{PET_ROLES[selectedPet]?.split('，')[0]}</p>
            )}
          </div>
          {selectedPet && <span className="text-lg">{PET_EMOJIS[selectedPet]}</span>}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="p-2 rounded-xl hover:bg-[#F0E8E0] transition-colors"
            title="清空对话"
          >
            <Trash2 className="w-3.5 h-3.5 text-[#8B7355]" />
          </button>
          <button
            onClick={toggleChat}
            className="p-2 rounded-xl hover:bg-[#F0E8E0] transition-colors"
          >
            <X className="w-3.5 h-3.5 text-[#8B7355]" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F0E8E0] to-[#E8DDD0] flex items-center justify-center mb-3">
              <span className="text-2xl">{selectedPet ? PET_EMOJIS[selectedPet] : '🐾'}</span>
            </div>
            <p className="text-sm font-semibold text-[#3A2A1A] mb-1">
              {selectedPet ? `${PET_NAMES[selectedPet]}准备好了！` : '点击场景中的宠物开始对话'}
            </p>
            <p className="text-xs text-[#8B7355] leading-relaxed">
              问我关于论文的任何问题吧！
              <br />
              比如"论文的核心贡献是什么？"
            </p>
          </div>
        )}

        {chatMessages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}
          >
            <div className="max-w-[82%]">
              {msg.role === 'assistant' && msg.petName && (
                <div className="flex items-center gap-1.5 mb-1 ml-1">
                  <span className="text-xs">{PET_EMOJIS[msg.petName]}</span>
                  <span className="text-[10px] text-[#8B7355] font-medium">{PET_NAMES[msg.petName]}</span>
                </div>
              )}
              <div
                className={`px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-[#2D5F4A] to-[#3D7F5A] text-white rounded-2xl rounded-br-lg shadow-sm'
                    : 'bg-[#F8F4F0] text-[#3A2A1A] rounded-2xl rounded-bl-lg border border-[#F0E8E0]'
                }`}
              >
                {msg.content}
              </div>
              <div className={`text-[9px] text-[#C4B5A0] mt-1 ${msg.role === 'user' ? 'text-right mr-1' : 'ml-1'}`}>
                {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-in fade-in duration-200">
            <div className="bg-[#F8F4F0] border border-[#F0E8E0] rounded-2xl rounded-bl-lg px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-[#C4956A] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-[#C4956A] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-[#C4956A] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#F0E8E0]">
        <div className="flex items-center gap-2.5">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={selectedPet ? `问问${PET_NAMES[selectedPet]}...` : '问问关于论文的问题...'}
            className="flex-1 px-4 py-2.5 text-sm bg-[#F8F4F0] border border-[#F0E8E0] rounded-2xl
              text-[#3A2A1A] placeholder-[#C4B5A0]
              focus:outline-none focus:ring-2 focus:ring-[#D4845A]/20 focus:border-[#D4845A]/50 focus:bg-white
              transition-all"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-2xl bg-gradient-to-r from-[#D4845A] to-[#E4946A] text-white
              hover:from-[#C07050] hover:to-[#D0845A]
              disabled:opacity-30 disabled:cursor-not-allowed
              active:scale-95 transition-all duration-200 shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
