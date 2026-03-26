/**
 * Config Panel - runtime mode, AI source, and browser runtime controls
 */
import {
  AlertTriangle,
  Brain,
  Database,
  Download,
  Eye,
  EyeOff,
  Globe,
  Key,
  Monitor,
  RefreshCw,
  RotateCcw,
  Server,
  Settings,
  ShieldAlert,
  Tag,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';

import {
  buildBrowserRuntimeExport,
  loadBrowserRuntimeMetadata,
  restoreBrowserRuntimeFromBundle,
  syncBrowserRuntimeFromServer,
} from '@/lib/browser-runtime-sync';
import type {
  BrowserRuntimeExportBundle,
  BrowserRuntimeMetadata,
} from '@/lib/browser-runtime-storage';
import { CAN_USE_ADVANCED_RUNTIME } from '@/lib/deploy-target';
import type { AIConfig } from '@/lib/store';
import { useAppStore } from '@/lib/store';
import { useWorkflowStore } from '@/lib/workflow-store';

function getSourceLabel(isFrontendMode: boolean, isBrowserMode: boolean) {
  if (isFrontendMode && !isBrowserMode) return 'Built-in browser preview';
  if (isBrowserMode) return 'Local browser storage';
  return 'Server-side .env';
}

export function ConfigPanel() {
  const {
    runtimeMode,
    setRuntimeMode,
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
  const {
    fetchAgents,
    fetchWorkflows,
    fetchHeartbeatStatuses,
    fetchHeartbeatReports,
  } = useWorkflowStore();

  const [showKey, setShowKey] = useState(false);
  const [runtimeMeta, setRuntimeMeta] = useState<BrowserRuntimeMetadata | null>(null);
  const [isRuntimeSyncing, setIsRuntimeSyncing] = useState(false);
  const [isRuntimeExporting, setIsRuntimeExporting] = useState(false);
  const [isRuntimeImporting, setIsRuntimeImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const isFrontendMode = runtimeMode === 'frontend';
  const isBrowserMode = aiConfig.mode === 'browser_direct';

  const refreshRuntimeMeta = async () => {
    try {
      setRuntimeMeta(await loadBrowserRuntimeMetadata());
    } catch (error) {
      console.error('[ConfigPanel] Failed to load browser runtime metadata:', error);
    }
  };

  useEffect(() => {
    if (!isConfigOpen) return;

    hydrateAIConfig().catch(error => {
      console.error('[ConfigPanel] Failed to refresh AI config:', error);
    });
    void refreshRuntimeMeta();
  }, [hydrateAIConfig, isConfigOpen]);

  if (!isConfigOpen) return null;

  const inputClass = `w-full px-3.5 py-2.5 text-sm bg-[#FFFCF8] border border-[#E8DDD0] rounded-xl
    text-[#3A2A1A] placeholder-[#C4B5A0] transition-all disabled:opacity-70 disabled:bg-[#F7F1EA]`;
  const labelClass = 'mb-1.5 flex items-center gap-2 text-xs font-semibold text-[#5A4A3A]';

  const handleRefresh = async () => {
    try {
      await hydrateAIConfig();
      toast.success('Config reloaded', {
        description: isFrontendMode
          ? 'Frontend mode refreshed local preview and browser-side AI settings.'
          : isBrowserMode
            ? 'Server defaults were refreshed. Your browser-side AI config was kept.'
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

  const handleRuntimeModeChange = async (mode: 'frontend' | 'advanced') => {
    await setRuntimeMode(mode);
    toast.success(mode === 'frontend' ? 'Frontend Mode enabled' : 'Advanced Mode enabled', {
      description:
        mode === 'frontend'
          ? 'Workflow uses the browser runtime and chat can stay local.'
          : 'Workflow uses the existing server runtime and reports pipeline.',
    });
  };

  const handleAISourceChange = (mode: AIConfig['mode']) => {
    setAIConfigMode(mode);
    toast.success(
      mode === 'browser_direct' ? 'Browser Direct enabled' : 'Server Proxy enabled',
      {
        description:
          mode === 'browser_direct'
            ? 'Model calls can run from this browser when your provider supports it.'
            : 'Chat will use the server-side .env configuration again.',
      }
    );
  };

  const formatRuntimeTime = (value: string | null | undefined) =>
    value ? new Date(value).toLocaleString('zh-CN') : '--';

  const handleSyncRuntime = async () => {
    setIsRuntimeSyncing(true);

    try {
      const summary = await syncBrowserRuntimeFromServer();
      await refreshRuntimeMeta();
      toast.success('Browser runtime synced', {
        description: `Cached ${summary.agentCount} agents, ${summary.workflowCount} workflows, and ${summary.heartbeatReportCount} heartbeat reports locally.`,
      });
    } catch (error: any) {
      toast.error('Failed to sync browser runtime', {
        description: error?.message || 'Please check the server connection.',
      });
    } finally {
      setIsRuntimeSyncing(false);
    }
  };

  const handleExportRuntime = async () => {
    setIsRuntimeExporting(true);

    try {
      const { fileName, bundle } = await buildBrowserRuntimeExport();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await refreshRuntimeMeta();
      toast.success('Browser runtime exported', {
        description: 'Configuration, reports, persona, and local history were downloaded as JSON.',
      });
    } catch (error: any) {
      toast.error('Failed to export browser runtime', {
        description: error?.message || 'No local runtime snapshot is available yet.',
      });
    } finally {
      setIsRuntimeExporting(false);
    }
  };

  const handleImportRuntime = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsRuntimeImporting(true);

    try {
      const raw = await file.text();
      const bundle = JSON.parse(raw) as BrowserRuntimeExportBundle;
      await restoreBrowserRuntimeFromBundle(bundle);
      await refreshRuntimeMeta();

      await hydrateAIConfig().catch(() => undefined);
      await fetchAgents();
      await fetchWorkflows();
      await fetchHeartbeatStatuses();
      await fetchHeartbeatReports(undefined, 12);

      toast.success('Browser runtime imported', {
        description: 'Local IndexedDB runtime data has been restored from the selected JSON file.',
      });
    } catch (error: any) {
      toast.error('Failed to import browser runtime', {
        description: error?.message || 'Please verify the selected JSON file.',
      });
    } finally {
      event.target.value = '';
      setIsRuntimeImporting(false);
    }
  };

  return (
    <div
      className="fixed top-0 left-0 h-full w-[390px] z-[55] flex flex-col
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
            <h3 className="text-sm font-bold text-[#3A2A1A]">Runtime & AI</h3>
            <p className="text-[10px] text-[#8B7355]">
              {isFrontendMode ? 'Frontend workflow runtime' : 'Advanced server runtime'}
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
        <div className="rounded-2xl border border-[#E8DDD0] bg-white/80 p-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#3A2A1A]">Run Mode</p>
              <p className="mt-1 text-[10px] leading-relaxed text-[#8B7355]">
                {CAN_USE_ADVANCED_RUNTIME
                  ? 'Frontend Mode keeps workflow execution inside the browser. Advanced Mode uses the existing server runtime, reports, and sockets.'
                  : 'GitHub Pages build only exposes the browser runtime path, so this static site stays in Frontend Mode.'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => void handleRuntimeModeChange('frontend')}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold transition-colors ${
                  isFrontendMode
                    ? 'bg-[#2D5F4A] text-white'
                    : 'bg-[#F7F1EA] text-[#5A4A3A] hover:bg-[#F0E8E0]'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                Frontend
              </button>
              {CAN_USE_ADVANCED_RUNTIME && (
                <button
                  onClick={() => void handleRuntimeModeChange('advanced')}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold transition-colors ${
                    isFrontendMode
                      ? 'bg-[#F7F1EA] text-[#5A4A3A] hover:bg-[#F0E8E0]'
                      : 'bg-[#D4845A] text-white'
                  }`}
                >
                  <Server className="w-3.5 h-3.5" />
                  Advanced
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F7F1EA] p-1.5 border border-[#E8DDD0]">
          <button
            onClick={() => handleAISourceChange('server_proxy')}
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
            onClick={() => handleAISourceChange('browser_direct')}
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
            {getSourceLabel(isFrontendMode, isBrowserMode)}
          </p>
          <p className="text-[10px] text-[#8B7355] mt-0.5">
            {isFrontendMode
              ? isBrowserMode
                ? 'Workflow stays in the browser runtime and chat uses browser-side AI settings.'
                : 'Workflow stays in the browser runtime and chat uses the built-in local preview.'
              : isBrowserMode
                ? 'Advanced workflow stays server-backed while chat can call the model directly from this browser.'
                : 'Workflow and chat both use the shared server-side .env config.'}
          </p>
        </div>

        {isBrowserMode && (
          <div className="rounded-xl border border-[#E8C27A] bg-[#FFF7E5] px-3.5 py-3">
            <div className="flex items-center gap-2 text-[#8A5A18]">
              <ShieldAlert className="w-4 h-4" />
              <span className="text-xs font-bold">Browser Direct notice</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-[#7A5B2B]">
              Your API key is stored in this browser. If the provider blocks browser CORS,
              fill the optional proxy URL below or switch back to Server Proxy.
            </p>
          </div>
        )}
      </div>

      <div className="mx-5 mt-3 rounded-xl border border-[#D8E6DE] bg-gradient-to-br from-[#F2FBF6] to-[#E7F4EC] p-3.5">
        <div className="flex items-center gap-2 mb-1.5">
          <Database className="w-3.5 h-3.5 text-[#2D5F4A]" />
          <span className="text-xs font-bold text-[#3A2A1A]">Browser Runtime</span>
        </div>
        <p className="text-[10px] text-[#5A6A5E]">
          Mirror workflow snapshots, memory, heartbeat reports, and AI config into IndexedDB for
          offline viewing, import, and export.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-[#5A6A5E]">
          <div className="rounded-lg bg-white/60 px-2.5 py-2">
            <p className="font-semibold text-[#2D5F4A]">Last Sync</p>
            <p className="mt-0.5">{formatRuntimeTime(runtimeMeta?.lastSyncedAt)}</p>
          </div>
          <div className="rounded-lg bg-white/60 px-2.5 py-2">
            <p className="font-semibold text-[#2D5F4A]">Last Import</p>
            <p className="mt-0.5">{formatRuntimeTime(runtimeMeta?.importedAt)}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2">
          {CAN_USE_ADVANCED_RUNTIME && (
            <button
              onClick={() => void handleSyncRuntime()}
              disabled={isRuntimeSyncing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2D5F4A] to-[#3D7F5A] px-3 py-2.5 text-xs font-bold text-white transition-all hover:from-[#245040] hover:to-[#2D6F4A] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRuntimeSyncing ? 'animate-spin' : ''}`} />
              {isRuntimeSyncing ? 'Syncing Browser Runtime...' : 'Sync Browser Runtime'}
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => void handleExportRuntime()}
              disabled={isRuntimeExporting}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/75 px-3 py-2.5 text-xs font-semibold text-[#315745] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" />
              {isRuntimeExporting ? 'Exporting...' : 'Export JSON'}
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              disabled={isRuntimeImporting}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/75 px-3 py-2.5 text-xs font-semibold text-[#315745] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload className="w-3.5 h-3.5" />
              {isRuntimeImporting ? 'Importing...' : 'Import JSON'}
            </button>
          </div>
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={event => void handleImportRuntime(event)}
        />
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
              onChange={event => updateField({ apiKey: event.target.value })}
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
            onChange={event => updateField({ baseUrl: event.target.value })}
            placeholder={isBrowserMode ? 'https://api.openai.com/v1' : ''}
            className={`${inputClass} font-mono text-xs`}
          />
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
              onChange={event => updateField({ proxyUrl: event.target.value })}
              placeholder="http://localhost:8787/v1"
              className={`${inputClass} font-mono text-xs`}
            />
            <p className="mt-1 text-[10px] text-[#8B7355]">
              If the provider cannot be called from the browser directly, chat can use this proxy.
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
            onChange={event => updateField({ model: event.target.value })}
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
            onChange={event => updateField({ wireApi: event.target.value as AIConfig['wireApi'] })}
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
            onChange={event => updateField({ modelReasoningEffort: event.target.value })}
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
            onChange={event => updateField({ timeoutMs: Number(event.target.value) || 45000 })}
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
            onChange={event => updateField({ maxContext: Number(event.target.value) || 1000000 })}
            className={`${inputClass} font-mono`}
          />
        </div>

        <div>
          <label className={labelClass}>
            <Tag className="w-3.5 h-3.5 text-[#C4956A]" />
            Provider Name
          </label>
          <input type="text" value={aiConfig.providerName} readOnly className={inputClass} />
        </div>

        {!isBrowserMode && (
          <div className="rounded-xl border border-[#D7C9B8] bg-[#F8F3EC] px-3.5 py-3">
            <div className="flex items-center gap-2 text-[#6F5B46]">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-bold">
                {isFrontendMode ? 'Preview-only chat' : 'Server-owned config'}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-[#8B7355]">
              {isFrontendMode
                ? 'Frontend Mode can use the built-in local preview without any backend setup. Switch to Browser Direct if you want real model calls from this browser.'
                : 'This mode stays read-only in the UI. To change the shared workflow/chat model, edit .env and restart the server.'}
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
              Browser Direct affects chat immediately in both runtime modes. In Frontend Mode it
              pairs with the browser runtime; in Advanced Mode the workflow still runs on the server.
            </p>
            <p className="mt-2 text-[10px] text-[#8B7355]">
              Server default: {serverAIConfig.model} / {serverAIConfig.providerName}
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
          {isAIConfigLoading ? 'Reloading...' : 'Reload Config'}
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
