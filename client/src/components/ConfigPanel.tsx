/**
 * Config Panel — AI model configuration
 * Design: Warm glass-morphism, left slide-in panel
 */
import { useAppStore } from '@/lib/store';
import { Settings, X, Eye, EyeOff, Save, Zap, Server, Key, Brain, Database, Tag } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export function ConfigPanel() {
  const { aiConfig, setAIConfig, isConfigOpen, toggleConfig } = useAppStore();
  const [localConfig, setLocalConfig] = useState(aiConfig);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setLocalConfig(aiConfig);
  }, [aiConfig]);

  if (!isConfigOpen) return null;

  const handleSave = () => {
    setAIConfig(localConfig);
    toast.success('配置已保存', {
      description: `模型: ${localConfig.model} | 推理: ${localConfig.modelReasoningEffort}`,
    });
  };

  const inputClass = `w-full px-3.5 py-2.5 text-sm bg-white border border-[#E8DDD0] rounded-xl
    text-[#3A2A1A] placeholder-[#C4B5A0]
    focus:outline-none focus:ring-2 focus:ring-[#2D5F4A]/20 focus:border-[#2D5F4A]/50
    transition-all`;

  const labelClass = 'flex items-center gap-2 text-xs font-semibold text-[#5A4A3A] mb-1.5';

  return (
    <div
      className="fixed top-0 left-0 h-full w-[340px] z-[55] flex flex-col
        bg-white/90 backdrop-blur-2xl border-r border-white/60
        shadow-[12px_0_40px_rgba(0,0,0,0.1)]
        animate-in slide-in-from-left duration-300"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0E8E0]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2D5F4A] to-[#3D7F5A] flex items-center justify-center shadow-sm">
            <Settings className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-sm font-bold text-[#3A2A1A]">AI 模型配置</h3>
        </div>
        <button
          onClick={toggleConfig}
          className="p-2 rounded-xl hover:bg-[#F0E8E0] transition-colors"
        >
          <X className="w-4 h-4 text-[#8B7355]" />
        </button>
      </div>

      {/* Provider info card */}
      <div className="mx-5 mt-4 p-3.5 rounded-xl bg-gradient-to-br from-[#F0E8E0] to-[#E8DDD0] border border-[#E0D5C5]">
        <div className="flex items-center gap-2 mb-1.5">
          <Server className="w-3.5 h-3.5 text-[#2D5F4A]" />
          <span className="text-xs font-bold text-[#3A2A1A]">当前提供商</span>
        </div>
        <p className="text-sm font-semibold text-[#2D5F4A]">{localConfig.providerName}</p>
        <p className="text-[10px] text-[#8B7355] mt-0.5">wire_api: responses | requires_openai_auth: true</p>
      </div>

      {/* Form fields */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* API Key */}
        <div>
          <label className={labelClass}>
            <Key className="w-3.5 h-3.5 text-[#C4956A]" />
            API Key
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={localConfig.apiKey}
              onChange={(e) => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
              placeholder="clp_..."
              className={`${inputClass} pr-10 font-mono text-xs`}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-[#F0E8E0] transition-colors"
            >
              {showKey
                ? <EyeOff className="w-3.5 h-3.5 text-[#8B7355]" />
                : <Eye className="w-3.5 h-3.5 text-[#8B7355]" />}
            </button>
          </div>
        </div>

        {/* Base URL */}
        <div>
          <label className={labelClass}>
            <Zap className="w-3.5 h-3.5 text-[#C4956A]" />
            Base URL
          </label>
          <input
            type="text"
            value={localConfig.baseUrl}
            onChange={(e) => setLocalConfig({ ...localConfig, baseUrl: e.target.value })}
            className={`${inputClass} font-mono text-xs`}
          />
        </div>

        {/* Model */}
        <div>
          <label className={labelClass}>
            <Brain className="w-3.5 h-3.5 text-[#C4956A]" />
            模型
          </label>
          <input
            type="text"
            value={localConfig.model}
            onChange={(e) => setLocalConfig({ ...localConfig, model: e.target.value })}
            className={inputClass}
          />
        </div>

        {/* Reasoning Effort */}
        <div>
          <label className={labelClass}>
            <Zap className="w-3.5 h-3.5 text-[#C4956A]" />
            推理强度
          </label>
          <select
            value={localConfig.modelReasoningEffort}
            onChange={(e) => setLocalConfig({ ...localConfig, modelReasoningEffort: e.target.value })}
            className={`${inputClass} cursor-pointer`}
          >
            <option value="low">低 (Low)</option>
            <option value="medium">中 (Medium)</option>
            <option value="high">高 (High)</option>
          </select>
        </div>

        {/* Max Context */}
        <div>
          <label className={labelClass}>
            <Database className="w-3.5 h-3.5 text-[#C4956A]" />
            最大上下文
          </label>
          <input
            type="number"
            value={localConfig.maxContext}
            onChange={(e) => setLocalConfig({ ...localConfig, maxContext: parseInt(e.target.value) || 0 })}
            className={`${inputClass} font-mono`}
          />
        </div>

        {/* Provider Name */}
        <div>
          <label className={labelClass}>
            <Tag className="w-3.5 h-3.5 text-[#C4956A]" />
            提供商名称
          </label>
          <input
            type="text"
            value={localConfig.providerName}
            onChange={(e) => setLocalConfig({ ...localConfig, providerName: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      {/* Save button */}
      <div className="px-5 py-4 border-t border-[#F0E8E0]">
        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold
            bg-gradient-to-r from-[#2D5F4A] to-[#3D7F5A] text-white
            hover:from-[#245040] hover:to-[#2D6F4A]
            active:scale-[0.98] transition-all duration-200 shadow-md"
        >
          <Save className="w-4 h-4" />
          保存配置
        </button>
      </div>
    </div>
  );
}
