import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Trash2, X } from 'lucide-react';

import {
  DEFAULT_AGENT_ID,
  getAgentChatRole,
  getAgentEmoji,
  getAgentLabel,
} from '@/lib/agent-config';
import { useAppStore, type ChatMessage } from '@/lib/store';

const PAPER_CONTEXT = `你是一个可爱的立方宠物研究助手，正在一间温馨的书房里工作。

你正在研究一篇论文：《从单一指令到全组织行动：面向多智能体 LLM 系统的组织镜像方法》。

论文核心内容：
- 用组织镜像的方法，把一条自然语言指令放大成多角色协同执行。
- 构建了 CEO -> Manager -> Worker 的三层结构。
- 系统包含 18 个智能体、4 个部门，以及独立记忆、层级委派、评审修订、元审计等机制。
- 前端 3D 场景用于实时展示各个智能体的工作状态。

请用简洁、自然、有一点角色感的方式回答问题。
- 优先说人话，不要堆术语。
- 回答尽量控制在 150 字内。
- 如果问题和论文无关，也可以礼貌地拉回到论文或系统设计上。`;

export function ChatPanel() {
  const {
    chatMessages,
    addMessage,
    clearChat,
    isChatOpen,
    toggleChat,
    isLoading,
    setLoading,
    aiConfig,
    selectedPet,
  } = useAppStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const agentId = selectedPet || DEFAULT_AGENT_ID;
  const agentName = getAgentLabel(agentId);
  const agentEmoji = getAgentEmoji(agentId);
  const agentRole = getAgentChatRole(agentId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (!isChatOpen) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 250);
    return () => window.clearTimeout(timer);
  }, [isChatOpen]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const currentInput = input.trim();
    const userMessage: ChatMessage = {
      role: 'user',
      content: currentInput,
      timestamp: Date.now(),
    };

    addMessage(userMessage);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: aiConfig.model,
          messages: [
            {
              role: 'system',
              content: `${PAPER_CONTEXT}\n\n你现在扮演的是 ${agentName}（${agentEmoji}），角色定位：${agentRole}`,
            },
            ...chatMessages.slice(-10).map((message) => ({
              role: message.role,
              content: message.content,
            })),
            { role: 'user', content: currentInput },
          ],
          max_tokens: 400,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`API ${response.status}: ${errorText.substring(0, 120)}`);
      }

      const data = await response.json();
      const assistantContent =
        data.choices?.[0]?.message?.content || '我刚刚有点走神了，可以再问我一次吗？';

      addMessage({
        role: 'assistant',
        content: assistantContent,
        petName: agentId,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      addMessage({
        role: 'assistant',
        content: `连接出了点问题。\n${error?.message || '请检查 API 配置'}`,
        petName: agentId,
        timestamp: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  }, [addMessage, agentEmoji, agentId, agentName, agentRole, aiConfig, chatMessages, input, isLoading, setLoading]);

  if (!isChatOpen) return null;

  return (
    <div
      className="fixed bottom-6 right-5 z-[55] flex h-[500px] w-[380px] flex-col rounded-3xl border border-white/60 bg-white/90 shadow-[0_12px_48px_rgba(0,0,0,0.12)] backdrop-blur-2xl animate-in slide-in-from-bottom-4 fade-in duration-300"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="flex items-center justify-between border-b border-[#F0E8E0] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4845A] to-[#E4946A] shadow-sm">
            <MessageCircle className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#3A2A1A]">与 {agentName} 聊天</h3>
            <p className="text-[10px] text-[#8B7355]">{agentRole}</p>
          </div>
          <span className="text-lg">{agentEmoji}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="rounded-xl p-2 transition-colors hover:bg-[#F0E8E0]"
            title="清空对话"
          >
            <Trash2 className="h-3.5 w-3.5 text-[#8B7355]" />
          </button>
          <button
            onClick={toggleChat}
            className="rounded-xl p-2 transition-colors hover:bg-[#F0E8E0]"
          >
            <X className="h-3.5 w-3.5 text-[#8B7355]" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {chatMessages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F0E8E0] to-[#E8DDD0]">
              <span className="text-2xl">{agentEmoji}</span>
            </div>
            <p className="mb-1 text-sm font-semibold text-[#3A2A1A]">{agentName} 准备好了</p>
            <p className="text-xs leading-relaxed text-[#8B7355]">
              可以直接问我这篇论文的核心观点、架构设计，
              <br />
              也可以问这个 18 Agent 系统是怎么跑起来的。
            </p>
          </div>
        )}

        {chatMessages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}
          >
            <div className="max-w-[82%]">
              {message.role === 'assistant' && message.petName && (
                <div className="mb-1 ml-1 flex items-center gap-1.5">
                  <span className="text-xs">{getAgentEmoji(message.petName)}</span>
                  <span className="text-[10px] font-medium text-[#8B7355]">
                    {getAgentLabel(message.petName)}
                  </span>
                </div>
              )}

              <div
                className={`px-3.5 py-2.5 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'rounded-2xl rounded-br-lg bg-gradient-to-r from-[#2D5F4A] to-[#3D7F5A] text-white shadow-sm'
                    : 'rounded-2xl rounded-bl-lg border border-[#F0E8E0] bg-[#F8F4F0] text-[#3A2A1A]'
                }`}
              >
                {message.content}
              </div>

              <div
                className={`mt-1 text-[9px] text-[#C4B5A0] ${
                  message.role === 'user' ? 'mr-1 text-right' : 'ml-1'
                }`}
              >
                {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-in fade-in duration-200">
            <div className="rounded-2xl rounded-bl-lg border border-[#F0E8E0] bg-[#F8F4F0] px-4 py-3">
              <div className="flex gap-1.5">
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-[#C4956A]"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-[#C4956A]"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-[#C4956A]"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-[#F0E8E0] p-4">
        <div className="flex items-center gap-2.5">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            placeholder={`问问 ${agentName}...`}
            className="flex-1 rounded-2xl border border-[#F0E8E0] bg-[#F8F4F0] px-4 py-2.5 text-sm text-[#3A2A1A] placeholder-[#C4B5A0] transition-all focus:border-[#D4845A]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4845A]/20"
          />
          <button
            onClick={() => void sendMessage()}
            disabled={!input.trim() || isLoading}
            className="rounded-2xl bg-gradient-to-r from-[#D4845A] to-[#E4946A] p-2.5 text-white shadow-sm transition-all duration-200 hover:from-[#C07050] hover:to-[#D0845A] active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
