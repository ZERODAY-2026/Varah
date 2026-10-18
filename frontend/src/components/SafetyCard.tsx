import React from 'react';
import { ShieldAlert, AlertOctagon, Ban, CheckCircle2, BookOpen } from 'lucide-react';
import { QueryResult } from '../types';

interface SafetyCardProps {
  result: QueryResult;
  onOpenSchema?: () => void;
}

export const SafetyCard: React.FC<SafetyCardProps> = ({ result, onOpenSchema }) => {
  const isUnsafe = result.status === 'unsafe' || result.status === 'blocked';

  return (
    <div
      className={`rounded-2xl border p-5 shadow-xl ${
        isUnsafe
          ? 'bg-gradient-to-b from-rose-950/40 to-slate-900 border-rose-600/40'
          : 'bg-gradient-to-b from-amber-950/30 to-slate-900 border-amber-600/40'
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div
          className={`p-2.5 rounded-xl border shrink-0 ${
            isUnsafe
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}
        >
          {isUnsafe ? <ShieldAlert className="w-6 h-6" /> : <Ban className="w-6 h-6" />}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                isUnsafe ? 'text-rose-400' : 'text-amber-400'
              }`}
            >
              {isUnsafe ? 'Security Policy Block' : 'Unsupported Request'}
            </span>
            <span className="text-xs text-slate-400">
              • {isUnsafe ? 'Deterministic SQL Validator' : 'Gemma Scope Evaluation'}
            </span>
          </div>

          <h3 className="text-base font-semibold text-slate-100 mb-2">
            {isUnsafe ? 'Request Blocked by Deterministic Safety Rules' : 'Request Cannot Be Answered From Available Data'}
          </h3>

          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 mb-3 text-xs leading-relaxed text-slate-200">
            {result.answer || result.unsupportedReason || result.safetyViolation || 'The request was refused by the backend safety or schema checks.'}
          </div>

          {isUnsafe && (
            <div className="mb-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Enforced Deterministic Rules:
              </span>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex items-center gap-2 text-rose-400 font-medium">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>{result.safetyViolation || 'Disallowed DDL/DML keyword detected'}</span>
                </li>
                <li className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Rule #2: Only SELECT or WITH CTE queries permitted</span>
                </li>
                <li className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Rule #8: Mandatory read-only role (SYNAPDATA_READER)</span>
                </li>
              </ul>
            </div>
          )}

          {result.assumptions && result.assumptions.length > 0 && (
            <div className="mb-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Data Boundary Explanations:
              </span>
              <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                {result.assumptions.map((asm, i) => (
                  <li key={i}>{asm}</li>
                ))}
              </ul>
            </div>
          )}

          {onOpenSchema && (
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Need to see what data and metrics are available?
              </span>
              <button
                onClick={onOpenSchema}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-700/50 rounded-lg transition-all"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>View Schema & Glossary</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

