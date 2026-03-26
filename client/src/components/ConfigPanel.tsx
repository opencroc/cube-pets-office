/**
 * Config Panel - AI model configuration
 * Supports server proxy mode and browser-direct mode.
 */
import {
  AlertTriangle,
  Brain,
  Database,
  Eye,
  EyeOff,
  Globe,
  Key,
  RefreshCw,
  RotateCcw,
  Server,
  Settings,
  ShieldAlert,
  Tag,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { AIConfig } from '@/lib/store';
import { useAppStore } from '@/lib/store';

export function ConfigPanel() {
  const {
    aiConfig,
    serverAIConfig,
    hydrateAIConfig,
    updateBrowserAIConfig,
    setAIConfigMode,
    resetBrowserAIConfig,
    isAIConfigLoading,
    isConfigOpen,
    toggleConfig,
  } = useAppStore();
  const [showKey, setShowKey] = useState(false);

  const isBrowserMode = aiConfig.mode === 'browser_direct';

  useEffect(() => {
    if (!isConfigOpen) return;

    hydrateAIConfig().catch((error) => {
      console.error('[ConfigPanel] Failed to refresh AI config:', error);
    });
  }, [hydrateAIConfig, isConfigOpen]);

  if (!isConfigOpen) return null;

  const inputClass = `w-full px-3.5 py-2.5 text-sm bg-[#FFFCF8] border border-[#E8DDD0] rounded-xl
    text-[#3A2A1A] placeholder-[#C4B5A0] transition-all disabled:opacity-70 disabled:bg-[#F7F1EA]`;

  const labelClass = 'flex items-center gap-2 text-xs font-semibold text-[#5A4A3A] mb-1.5';

  const handleRefresh = async () => {
    try {
      await hydrateAIConfig();
      toast.success('Server config reloaded', {
        description: isBrowserMode
          ? 'Server defaults were refreshed. Your local browser config was kept.'
          : 'Values were refreshed from .env on the server.',
      });
    } catch (error: any) {
      toast.error('Failed to reload config', {
        description: error?.message || 'Please check the server.',
      });
    }
  };

  const updateField = (patch: Partial<AIConfig>) => {
    if (!isBrowserMode) return;
    updateBrowserAIConfig(patch);
  };

  const switchMode = (mode: AIConfig['mode']) => {
    setAIConfigMode(mode);
    toast.success(
      mode === 'browser_direct' ? 'Browser Direct enabled' : 'Server Proxy enabled',
      {
        description:
          mode === 'browser_direct'
            ? 'API settings now live in this browser for local use.'
            : 'Chat requests now use the server-side .env config again.',
      }
    );
  };

  return (
    <div
      className="fixed top-0 left-0 h-full w-[380px] z-[55] flex flex-col
        bg-white/90 backdrop-blur-2xl border-r border-white/60
        shadow-[12px_0_40px_rgba(0,0,0,0.1)]
        animate-in slide-in-from-left duration-300"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0E8E0]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2D5F4A] to-[#3D7F5A] flex items-center justify-center shadow-sm">
            <Settings className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#3A2A1A]">AI Config</h3>
            <p className="text-[10px] text-[#8B7355]">
              {isBrowserMode ? 'Browser Direct mode' : 'Server Proxy mode'}
            </p>
          </div>
        </div>
        <button
          onClick={toggleConfig}
          className="p-2 rounded-xl hover:bg-[#F0E8E0] transition-colors"
        >
          <X className="w-4 h-4 text-[#8B7355]" />
        </button>
      </div>

      <div className="px-5 pt-4 space-y-3">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F7F1EA] p-1.5 border border-[#E8DDD0]">
          <button
            onClick={() => switchMode('server_proxy')}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              !isBrowserMode
                ? 'bg-white text-[#2D5F4A] shadow-sm'
                : 'text-[#8B7355] hover:bg-white/70'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            Server Proxy
          </button>
          <button
            onClick={() => switchMode('browser_direct')}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              isBrowserMode
                ? 'bg-white text-[#2D5F4A] shadow-sm'
                : 'text-[#8B7355] hover:bg-white/70'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Browser Direct
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#F0E8E0] to-[#E8DDD0] border border-[#E0D5C5]">
          <div className="flex items-center gap-2 mb-1.5">
            {isBrowserMode
              ? <Globe className="w-3.5 h-3.5 text-[#2D5F4A]" />
              : <Server className="w-3.5 h-3.5 text-[#2D5F4A]" />}
            <span className="text-xs font-bold text-[#3A2A1A]">Current Source</span>
          </div>
          <p className="text-sm font-semibold text-[#2D5F4A]">
            {isBrowserMode ? 'Local browser storage' : '`.env` on the server'}
          </p>
          <p className="text-[10px] text-[#8B7355] mt-0.5">
            {isBrowserMode
              ? 'Chat uses your browser-side API settings directly or through the optional proxy URL.'
              : 'Chat and workflow both use the same server-side config from `.env`.'}
          </p>
        </div>

        {isBrowserMode && (
          <div className="rounded-xl border border-[#E8C27A] bg-[#FFF7E5] px-3.5 py-3">
            <div className="flex items-center gap-2 text-[#8A5A18]">
              <ShieldAlert className="w-4 h-4" />
              <span className="text-xs font-bold">Local-use warning</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-[#7A5B2B]">
              Browser Direct is only suitable for local use. Your API key is stored in this
              browser and may be exposed to the local environment. If your provider blocks
              browser CORS, fill the optional proxy URL below.
            </p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div>
          <label className={labelClass}>
            <Key className="w-3.5 h-3.5 text-[#C4956A]" />
            API Key
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={aiConfig.apiKey}
              readOnly={!isBrowserMode}
              onChange={(event) => updateField({ apiKey: event.target.value })}
              placeholder={isBrowserMode ? 'sk-...' : ''}
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

        <div>
          <label className={labelClass}>
            <Server className="w-3.5 h-3.5 text-[#C4956A]" />
            Base URL
          </label>
          <input
            type="text"
            value={aiConfig.baseUrl}
            readOnly={!isBrowserMode}
            onChange={(event) => updateField({ baseUrl: event.target.value })}
            placeholder={isBrowserMode ? 'https://api.openai.com/v1' : ''}
            className={`${inputClass} font-mono text-xs`}
          />
          {isBrowserMode && (
            <p className="mt-1 text-[10px] text-[#8B7355]">
              Use a browser-reachable OpenAI-compatible endpoint with CORS enabled.
            </p>
          )}
        </div>

        {isBrowserMode && (
          <div>
            <label className={labelClass}>
              <Globe className="w-3.5 h-3.5 text-[#C4956A]" />
              Optional Proxy URL
            </label>
            <input
              type="text"
              value={aiConfig.proxyUrl}
              onChange={(event) => updateField({ proxyUrl: event.target.value })}
              placeholder="http://localhost:8787/v1"
              className={`${inputClass} font-mono text-xs`}
            />
            <p className="mt-1 text-[10px] text-[#8B7355]">
              If the provider cannot be called from the browser directly, the chat panel will
              use this proxy URL instead of Base URL.
            </p>
          </div>
        )}

        <div>
          <label className={labelClass}>
            <Brain className="w-3.5 h-3.5 text-[#C4956A]" />
            Model
          </label>
          <input
            type="text"
            value={aiConfig.model}
            readOnly={!isBrowserMode}
            onChange={(event) => updateField({ model: event.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>
            <Tag className="w-3.5 h-3.5 text-[#C4956A]" />
            Wire API
          </label>
          <select
            value={aiConfig.wireApi}
            disabled={!isBrowserMode}
            onChange={(event) => updateField({ wireApi: event.target.value as AIConfig['wireApi'] })}
            className={inputClass}
          >
            <option value="chat_completions">chat_completions</option>
            <option value="responses">responses</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>
            <Tag className="w-3.5 h-3.5 text-[#C4956A]" />
            Reasoning Effort
          </label>
          <input
            type="text"
            value={aiConfig.modelReasoningEffort}
            readOnly={!isBrowserMode}
            onChange={(event) => updateField({ modelReasoningEffort: event.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>
            <Database className="w-3.5 h-3.5 text-[#C4956A]" />
            Timeout (ms)
          </label>
          <input
            type="number"
            value={aiConfig.timeoutMs}
            readOnly={!isBrowserMode}
            onChange={(event) => updateField({ timeoutMs: Number(event.target.value) || 45000 })}
            className={`${inputClass} font-mono`}
          />
        </div>

        <div>
          <label className={labelClass}>
            <Database className="w-3.5 h-3.5 text-[#C4956A]" />
            Max Context
          </label>
          <input
            type="number"
            value={aiConfig.maxContext}
            readOnly={!isBrowserMode}
            onChange={(event) => updateField({ maxContext: Number(event.target.value) || 1000000 })}
            className={`${inputClass} font-mono`}
          />
        </div>

        <div>
          <label className={labelClass}>
            <Tag className="w-3.5 h-3.5 text-[#C4956A]" />
            Provider Name
          </label>
          <input
            type="text"
            value={aiConfig.providerName}
            readOnly
            className={inputClass}
          />
        </div>

        {!isBrowserMode && (
          <div className="rounded-xl border border-[#D7C9B8] bg-[#F8F3EC] px-3.5 py-3">
            <div className="flex items-center gap-2 text-[#6F5B46]">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-bold">Server-owned config</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-[#8B7355]">
              This mode stays read-only in the UI. To change the shared workflow/chat model,
              edit `.env` and restart the server.
            </p>
          </div>
        )}

        {isBrowserMode && (
          <div className="rounded-xl border border-[#D7C9B8] bg-[#F8F3EC] px-3.5 py-3">
            <div className="flex items-center gap-2 text-[#6F5B46]">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-bold">Current scope</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-[#8B7355]">
              Browser Direct is wired into the chat panel now. The long-running workflow engine
              still runs on the server until the browser runtime phases are completed.
            </p>
            <p className="mt-2 text-[10px] text-[#8B7355]">
              Server default: {serverAIConfig.model} · {serverAIConfig.providerName}
            </p>
          </div>
        )}
      </div>

      <div className="px-5 py-4 border-t border-[#F0E8E0] flex gap-2">
        <button
          onClick={() => void handleRefresh()}
          disabled={isAIConfigLoading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold
            bg-gradient-to-r from-[#2D5F4A] to-[#3D7F5A] text-white
            hover:from-[#245040] hover:to-[#2D6F4A]
            active:scale-[0.98] transition-all duration-200 shadow-md
            disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${isAIConfigLoading ? 'animate-spin' : ''}`} />
          {isAIConfigLoading ? 'Reloading...' : 'Reload Server'}
        </button>

        {isBrowserMode && (
          <button
            onClick={() => {
              resetBrowserAIConfig();
              toast.success('Browser config reset', {
                description: 'Local browser fields were reset from the latest server defaults.',
              });
            }}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold
              bg-[#F7F1EA] text-[#5A4A3A] border border-[#E8DDD0]
              hover:bg-[#F0E8E0] active:scale-[0.98] transition-all duration-200"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Local
          </button>
        )}
      </div>
    </div>
  );
}
