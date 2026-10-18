import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck, Copy, Check, Clock, Database, Info, ExternalLink } from 'lucide-react';
import { QueryResult } from '../types';

interface AnswerCardProps {
  result: QueryResult;
  onViewSqlTab?: () => void;
}

export const AnswerCard: React.FC<AnswerCardProps> = ({ result, onViewSqlTab }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (result.answer) {
      navigator.clipboard.writeText(result.answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getConfidenceBadge = () => {
    switch (result.confidence) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            High Confidence
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Info className="w-3.5 h-3.5" />
            Medium Confidence
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Info className="w-3.5 h-3.5" />
            Low Confidence
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-b from-slate-800/90 to-slate-900/90 border border-slate-700/80 p-5 shadow-xl">
      {/* Header with Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {getConfidenceBadge()}
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            {result.source === 'demo' ? 'Demo data · not a live Snowflake query' : 'Strictly Grounded in Snowflake Rows'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all"
            title="Copy answer text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Main Plain English Answer */}
      <div className="prose prose-invert max-w-none">
        <p className="text-base text-slate-100 font-medium leading-relaxed">
          {result.answer}
        </p>
      </div>

      {result.explanation && (
        <div className="mt-4 rounded-xl border border-cyan-800/50 bg-cyan-950/20 p-4">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">
            Methodology &amp; Assumptions
          </h3>
          <p className="text-sm leading-relaxed text-slate-300">{result.explanation}</p>
        </div>
      )}

      {result.source !== 'demo' && (result.query_id || result.metrics?.queryId) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-700/50 bg-emerald-950/25 px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">Snowflake Query ID</span>
          <code className="break-all text-xs text-slate-100">{result.query_id || result.metrics?.queryId}</code>
          <span className="rounded-full border border-emerald-600/50 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">Executed</span>
        </div>
      )}

      {/* Grounding Explanation */}
      {result.confidenceReason && (
        <p className="mt-3 text-xs text-slate-400 flex items-center gap-1.5 italic">
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>{result.confidenceReason}</span>
        </p>
      )}

      {/* Snowflake Live Metadata Ribbon */}
      {result.metrics && (
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            {result.source !== 'demo' && (
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>Query ID:</span>
                <span className="font-mono text-slate-200 text-[11px] bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                  {result.query_id || result.metrics.queryId}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Elapsed:</span>
              <span className="font-semibold text-slate-200">{result.metrics.elapsedMs} ms</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <span>Rows:</span>
              <span className="font-semibold text-slate-200">{result.metrics.rowCount}</span>
            </div>
          </div>

          {onViewSqlTab && (
            <button
              onClick={onViewSqlTab}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <span>Inspect Evidence & SQL</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

