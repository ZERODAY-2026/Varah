import React, { useState } from 'react';
import { X, BookOpen, Layers, Database, Code, FileText, CheckCircle2 } from 'lucide-react';
import { DatasetConfig } from '../types';
import { DATASETS } from '../data/datasets';

interface SchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: DatasetConfig;
  onSelectDataset: (dataset: DatasetConfig) => void;
}

export const SchemaModal: React.FC<SchemaModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onSelectDataset
}) => {
  const [tab, setTab] = useState<'columns' | 'glossary' | 'fewshots'>('columns');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                Dataset Schema & Knowledge Base
              </h3>
              <p className="text-xs text-slate-400">
                Table definition, column descriptions, glossary, and few-shot examples for Gemma.
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

        {/* Dataset Switcher & Tabs */}
        <div className="p-4 border-b border-slate-800 bg-slate-800/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Dataset:</span>
            <select
              value={dataset.id}
              onChange={(e) => onSelectDataset(DATASETS[e.target.value])}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-medium focus:outline-none"
            >
              {Object.values(DATASETS).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <span className="text-xs font-mono text-cyan-300 ml-2">
              {dataset.tableName}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
            <button
              onClick={() => setTab('columns')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                tab === 'columns'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Columns ({dataset.columns.length})
            </button>
            <button
              onClick={() => setTab('glossary')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                tab === 'glossary'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Glossary
            </button>
            <button
              onClick={() => setTab('fewshots')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                tab === 'fewshots'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Few-Shot SQL ({dataset.fewShotExamples.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {tab === 'columns' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2.5">
                {dataset.columns.map((col) => (
                  <div
                    key={col.name}
                    className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-slate-100 text-sm">
                          {col.name}
                        </span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                          {col.type}
                        </span>
                        {col.range && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            [{col.range}]
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        {col.description}
                      </p>
                    </div>

                    {col.sampleValue !== undefined && (
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-500 block">Sample Value</span>
                        <span className="font-mono text-cyan-300 font-medium">
                          {String(col.sampleValue)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'glossary' && (
            <div className="space-y-3">
              {Object.entries(dataset.glossary).map(([term, def]) => (
                <div
                  key={term}
                  className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs"
                >
                  <span className="font-bold text-slate-200 text-sm block mb-1">
                    {term}
                  </span>
                  <p className="text-slate-400 leading-relaxed">{def}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'fewshots' && (
            <div className="space-y-4">
              {dataset.fewShotExamples.map((ex, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs space-y-2"
                >
                  <span className="font-semibold text-slate-200 text-sm block">
                    Q: {ex.question}
                  </span>
                  <div className="p-3 rounded-lg bg-slate-950 font-mono text-cyan-300 overflow-x-auto">
                    {ex.sql}
                  </div>
                  {ex.explanation && (
                    <p className="text-[11px] text-slate-400 italic">
                      Note: {ex.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

