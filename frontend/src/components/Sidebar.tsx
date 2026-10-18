import React from 'react';
import { Database, Sparkles, AlertTriangle, ShieldAlert, HelpCircle, Layers, ChevronRight, FileText } from 'lucide-react';
import { DatasetConfig } from '../types';
import { DATASETS } from '../data/datasets';

interface SidebarProps {
  currentDataset: DatasetConfig;
  onSelectDataset: (dataset: DatasetConfig) => void;
  onSelectQuestion: (question: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentDataset,
  onSelectDataset,
  onSelectQuestion
}) => {
  return (
    <aside className="w-full md:w-80 bg-slate-900/60 border-r border-slate-800/80 p-4 flex flex-col gap-5 overflow-y-auto max-h-screen">
      {/* Dataset Picker */}
      <div>
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
          Active Dataset
        </label>
        <div className="relative">
          <select
            value={currentDataset.id}
            onChange={(e) => onSelectDataset(DATASETS[e.target.value])}
            aria-label="Select Active Dataset"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer pr-8"
          >
            {Object.values(DATASETS).map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        {/* Dataset Meta Pill */}
        <div className="mt-2.5 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs text-slate-300 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-mono text-[11px] truncate" title={currentDataset.tableName}>
              {currentDataset.tableName}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
              {currentDataset.rowCount.toLocaleString()} rows
            </span>
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-2">
            {currentDataset.description}
          </p>
          <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-700/40">
            <span>License: {currentDataset.license.split('(')[0].trim()}</span>
            <span>{currentDataset.columns.length} columns</span>
          </div>
        </div>
      </div>

      {/* Suggested Questions categorized */}
      <div className="flex-1 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sample Questions</span>
          </span>
          <span className="text-[10px] text-slate-500">Click to ask</span>
        </div>

        <div className="space-y-2 text-xs">
          {currentDataset.sampleQuestions.map((sq, idx) => {
            let badgeBg = 'bg-slate-800 text-slate-300';
            let icon = <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 shrink-0" />;

            if (sq.category === 'Edge Case') {
              if (sq.question.toLowerCase().includes('drop')) {
                badgeBg = 'bg-rose-500/10 text-rose-300 border border-rose-500/20';
                icon = <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
              } else if (sq.question.toLowerCase().includes('best')) {
                badgeBg = 'bg-amber-500/10 text-amber-300 border border-amber-500/20';
                icon = <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
              } else {
                badgeBg = 'bg-purple-500/10 text-purple-300 border border-purple-500/20';
                icon = <AlertTriangle className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
              }
            } else if (sq.category === 'Time Series') {
              badgeBg = 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20';
            } else if (sq.category === 'Aggregation') {
              badgeBg = 'bg-blue-500/10 text-blue-300 border border-blue-500/20';
            }

            return (
              <button
                key={idx}
                onClick={() => onSelectQuestion(sq.question)}
                className="w-full text-left p-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/40 hover:border-indigo-500/40 transition-all flex items-start gap-2 group"
              >
                {icon}
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${badgeBg}`}>
                      {sq.category}
                    </span>
                  </div>
                  <p className="text-slate-300 group-hover:text-white transition-colors leading-snug">
                    {sq.question}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Architecture Note */}
      <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-900/30 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
          <Database className="w-3.5 h-3.5" />
          <span>Deterministic Separation</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Google Gemma proposes SQL. Code validates deterministically. Snowflake executes at question time. Gemma explains from rows only.
        </p>
      </div>
    </aside>
  );
};

