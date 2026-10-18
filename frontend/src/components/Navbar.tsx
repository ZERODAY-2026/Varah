import React from 'react';
import { Database, Cpu, Activity, ShieldCheck, Terminal, PlayCircle, BookOpen, Settings } from 'lucide-react';
import { SystemConfig } from '../types';

interface NavbarProps {
  config: SystemConfig;
  onOpenEval: () => void;
  onOpenDataChangeDemo: () => void;
  onOpenSchema: () => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  config,
  onOpenEval,
  onOpenDataChangeDemo,
  onOpenSchema,
  onOpenSettings
}) => {
  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                SYNAPDATA
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                PS1 • ZeroDay 2026
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              AI Data Agent: Talk to Your Data with Google Gemma & Snowflake
            </p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Snowflake Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium text-slate-200">Snowflake:</span>
            <span className="text-slate-400">{config.snowflakeWarehouse} (X-Small)</span>
          </div>

          {/* Gemma Model */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-medium text-slate-200">Gemma:</span>
            <span className="text-slate-400">{config.gemmaModel} (Ollama)</span>
          </div>

          {/* Mode Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">Mode:</span>
            <span className="font-semibold text-blue-400 capitalize">{config.backendMode}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenEval}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/50 rounded-lg transition-all shadow-sm hover:shadow-emerald-900/30"
            title="Run the 12 PS1 official benchmark evaluation questions"
          >
            <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Run 12 Evals</span>
          </button>

          <button
            onClick={onOpenDataChangeDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-700/50 rounded-lg transition-all shadow-sm"
            title="Demonstrate live data change in Snowflake (PS1 required extra)"
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>Data Change Demo</span>
          </button>

          <button
            onClick={onOpenSchema}
            className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all"
            title="Inspect Schema & Glossary"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenSettings}
            className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all"
            title="Configuration Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

