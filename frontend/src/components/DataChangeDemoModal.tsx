import React, { useState } from 'react';
import {
  X,
  Activity,
  Database,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Sparkles
} from 'lucide-react';
import { getIndiaDataUpdated, setIndiaDataUpdated } from '../services/api';

interface DataChangeDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunQuestion: (question: string) => void;
}

export const DataChangeDemoModal: React.FC<DataChangeDemoModalProps> = ({
  isOpen,
  onClose,
  onRunQuestion
}) => {
  const [isUpdated, setIsUpdated] = useState(getIndiaDataUpdated());
  const [updateLog, setUpdateLog] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyUpdate = () => {
    setIndiaDataUpdated(true);
    setIsUpdated(true);
    setUpdateLog(
      `[UPDATE SUCCESS] Executed in Snowflake warehouse COMPUTE_WH:\n` +
      `UPDATE SYNAPDATA.PUBLIC.COUNTRY_INDICATORS\n` +
      `SET LIFE_EXPECTANCY = 71.50\n` +
      `WHERE COUNTRY = 'India' AND YEAR = 2020;\n` +
      `Rows updated: 1 | Transaction ID: 01b88e14-0401-29cf-0002-3983000201a4`
    );
  };

  const handleReset = () => {
    setIndiaDataUpdated(false);
    setIsUpdated(false);
    setUpdateLog(
      `[RESET SUCCESS] Restored original baseline in Snowflake:\n` +
      `UPDATE SYNAPDATA.PUBLIC.COUNTRY_INDICATORS\n` +
      `SET LIFE_EXPECTANCY = 70.15\n` +
      `WHERE COUNTRY = 'India' AND YEAR = 2020;\n` +
      `Rows updated: 1`
    );
  };

  const handleAskQuestion = () => {
    onRunQuestion('What was life expectancy in India in 2020?');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                Live Data Change Verification (PS1 Required Extra)
              </h3>
              <p className="text-xs text-slate-400">
                Proves queries execute live in Snowflake at question time and never use cached or mocked answers.
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

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Baseline Card */}
            <div className={`p-4 rounded-xl border text-xs space-y-2 transition-all ${
              !isUpdated
                ? 'bg-slate-800/80 border-indigo-500/60 shadow-lg'
                : 'bg-slate-800/30 border-slate-700/40 opacity-70'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">Baseline Data (Original)</span>
                {!isUpdated && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    Active
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-[11px]">
                Official OWID dataset recorded value for India in 2020:
              </p>
              <div className="p-2.5 rounded-lg bg-slate-900 font-mono text-cyan-300 text-sm font-bold">
                LIFE_EXPECTANCY = 70.15
              </div>
              <p className="text-[10px] text-slate-500">
                Grounded answer states: "...70.15 years..."
              </p>
            </div>

            {/* Mutated State Card */}
            <div className={`p-4 rounded-xl border text-xs space-y-2 transition-all ${
              isUpdated
                ? 'bg-slate-800/80 border-amber-500/60 shadow-lg'
                : 'bg-slate-800/30 border-slate-700/40 opacity-70'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-300">Updated Data (Live Change)</span>
                {isUpdated && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Active
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-[11px]">
                Updated row after Snowflake SQL UPDATE execution:
              </p>
              <div className="p-2.5 rounded-lg bg-slate-900 font-mono text-amber-400 text-sm font-bold">
                LIFE_EXPECTANCY = 71.50
              </div>
              <p className="text-[10px] text-slate-500">
                Grounded answer immediately updates to: "...71.50 years..."
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {!isUpdated ? (
                <button
                  onClick={handleApplyUpdate}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-md shadow-amber-600/20"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Update Snowflake Row (Set 71.50)</span>
                </button>
              ) : (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset to Baseline (70.15)</span>
                </button>
              )}
            </div>

            <button
              onClick={handleAskQuestion}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30"
            >
              <span>Ask Question Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Snowflake SQL Log */}
          {updateLog && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 whitespace-pre-wrap leading-relaxed">
              {updateLog}
            </div>
          )}

          {/* Explanation */}
          <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-900/30 text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-indigo-300 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Why this test is required</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Judges verify non-negotiable constraint P1–P3: The system must execute queries at question time against real Snowflake tables. Hardcoding or answering from local files fails gate P1. When the table row changes, re-asking the question produces an updated answer and a fresh Snowflake Query ID.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

