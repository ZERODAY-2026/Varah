import React, { useState } from 'react';
import { X, Settings, Database, Cpu, Check, Activity, Save, RefreshCw } from 'lucide-react';
import { SystemConfig } from '../types';
import { checkBackendHealth, saveSystemConfig } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SystemConfig;
  onUpdateConfig: (newCfg: SystemConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig
}) => {
  const [formState, setFormState] = useState<SystemConfig>({ ...config });
  const [healthStatus, setHealthStatus] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleHealthCheck = async () => {
    setIsChecking(true);
    const ok = await checkBackendHealth(formState.backendUrl);
    setHealthStatus(ok);
    setIsChecking(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSystemConfig(formState);
    onUpdateConfig(formState);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                System & Connection Configuration
              </h3>
              <p className="text-xs text-slate-400">
                Choose a backend. Live Snowflake and model credentials are configured by Varah.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* Execution Mode */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Execution Architecture Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormState({ ...formState, backendMode: 'standalone' })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  formState.backendMode === 'standalone'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span className="font-bold text-xs block mb-0.5">Standalone / Demo Engine</span>
                <span className="text-[10px] text-slate-400 leading-snug block">
                  Built-in verified Snowflake query results for reliable offline demo & judging.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFormState({ ...formState, backendMode: 'live' })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  formState.backendMode === 'live'
                    ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span className="font-bold text-xs block mb-0.5">Live Snowflake + Backend</span>
                <span className="text-[10px] text-slate-400 leading-snug block">
                  Connects to FastAPI Python backend proxy querying live Snowflake account.
                </span>
              </button>
            </div>
          </div>

          {/* Backend Proxy URL */}
          {formState.backendMode === 'live' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Backend API Endpoint
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formState.backendUrl}
                  onChange={(e) => setFormState({ ...formState, backendUrl: e.target.value })}
                  placeholder="http://localhost:8000"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleHealthCheck}
                  disabled={isChecking}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 flex items-center gap-1.5"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Check</span>
                </button>
              </div>
              {healthStatus !== null && (
                <p className={`text-[11px] ${healthStatus ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {healthStatus
                    ? 'Backend connected and healthy.'
                    : 'Could not connect to backend endpoint.'}
                </p>
              )}
              <p className="text-[11px] leading-relaxed text-slate-500">
                The browser sends only your question. Initialize Snowflake and the open-weight model in Varah before asking live questions.
              </p>
            </div>
          )}

          {/* Snowflake Configuration */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              <Database className="w-3.5 h-3.5" />
              <span>Snowflake Target Settings</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Account Identifier</label>
                <input
                  type="text"
                  value={formState.snowflakeAccount}
                  onChange={(e) => setFormState({ ...formState, snowflakeAccount: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Warehouse</label>
                <input
                  type="text"
                  value={formState.snowflakeWarehouse}
                  onChange={(e) => setFormState({ ...formState, snowflakeWarehouse: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Database & Schema</label>
                <input
                  type="text"
                  value={`${formState.snowflakeDatabase}.${formState.snowflakeSchema}`}
                  readOnly
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-1.5 text-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Read-Only Role</label>
                <input
                  type="text"
                  value={formState.snowflakeRole}
                  onChange={(e) => setFormState({ ...formState, snowflakeRole: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Gemma Model Settings */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5" />
              <span>Google Gemma AI Model</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Model Variant</label>
                <input
                  type="text"
                  value={formState.gemmaModel}
                  onChange={(e) => setFormState({ ...formState, gemmaModel: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Ollama Host</label>
                <input
                  type="text"
                  value={formState.ollamaEndpoint}
                  onChange={(e) => setFormState({ ...formState, ollamaEndpoint: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Footer Save */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            {savedNotice ? (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-4 h-4" />
                Settings saved successfully!
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">
                Changes persist in browser local storage.
              </span>
            )}

            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

