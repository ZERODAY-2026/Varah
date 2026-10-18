import React, { useState } from 'react';
import {
  X,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Award,
  Clock,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { EvalRunResult, SystemConfig } from '../types';
import { EVAL_QUESTIONS } from '../data/evalQuestions';
import { runAllEvals } from '../services/api';

interface EvalDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuestion: (question: string) => void;
  config: SystemConfig;
}

export const EvalDashboardModal: React.FC<EvalDashboardModalProps> = ({
  isOpen,
  onClose,
  onSelectQuestion,
  config
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<EvalRunResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [runError, setRunError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunAll = async () => {
    setIsRunning(true);
    setResults([]);
    setProgress({ current: 0, total: 0 });
    setRunError(null);
    try {
      await runAllEvals(config, (completed, total, latest) => {
        setProgress({ current: completed, total });
        if (latest) setResults((prev) => [...prev, latest]);
      });
    } catch (error) {
      setRunError(error instanceof Error ? error.message : 'Evaluation run failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const passCount = results.filter((r) => r.passed).length;
  const accuracy = results.length > 0 ? Math.round((passCount / results.length) * 100) : 0;

  const exportReport = () => {
    if (results.length === 0) return;
    const lines = [
      '# Varah DataMind Benchmark Evaluation Report',
      `Date: ${new Date().toISOString()}`,
      `Mode: ${config.backendMode}`,
      `Total Questions: ${results.length}`,
      `Passed: ${passCount}`,
      `Accuracy: ${accuracy}%`,
      '',
      '| # | Question | Expected Status | Actual Status | Latency (ms) | Result | Notes |',
      '|---|---|---|---|---|---|---|'
    ];

    results.forEach((r, idx) => {
      const eq = EVAL_QUESTIONS.find((q) => q.id === r.questionId);
      lines.push(
        `| ${idx + 1} | ${r.question} | ${r.expectedStatus?.join(' or ') ?? eq?.expectedStatus ?? '-'} | ${r.status} | ${r.elapsedMs ?? '-'} | ${
          r.passed ? 'PASSED' : 'FAILED'
        } | ${r.evaluationNote} |`
      );
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'EVAL_RESULTS.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                Varah DataMind Benchmark Evaluation Suite
              </h3>
              <p className="text-xs text-slate-400">
                {config.backendMode === 'live'
                  ? 'Live Varah questions from the backend evaluation suite, executed against Snowflake.'
                  : 'Offline demo checks using the built-in sample dataset.'}
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

        {/* Modal Controls & Stats */}
        <div className="p-5 border-b border-slate-800 bg-slate-800/40 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleRunAll}
              disabled={isRunning}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all ${
                isRunning
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
              }`}
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Running ({progress.current}/{progress.total})...</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4" />
                  <span>{config.backendMode === 'live' ? 'Run Live Varah Evaluation' : 'Run Demo Evaluation'}</span>
                </>
              )}
            </button>

            {results.length > 0 && !isRunning && (
              <button
                onClick={exportReport}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export EVAL_RESULTS.md</span>
              </button>
            )}
          </div>

          {results.length > 0 && (
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Score:</span>
                <span className="font-bold text-slate-100">
                  {passCount} / {results.length} Passed
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                <span>Accuracy: {accuracy}%</span>
              </div>
            </div>
          )}
        </div>

        {isRunning && progress.total > 0 && (
          <div className="px-5 pt-4" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.current}>
            <div className="h-2 overflow-hidden rounded bg-slate-800">
              <div
                className="h-full bg-emerald-500 transition-[width]"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {runError && (
          <p className="mx-5 mt-4 rounded-lg border border-rose-700/50 bg-rose-950/30 p-3 text-xs text-rose-300" role="alert">
            {runError}
          </p>
        )}

        {/* Results List */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3">
          {results.length === 0 && !isRunning && (
            <div className="p-8 text-center text-slate-400 text-xs space-y-2">
              <Sparkles className="w-8 h-8 text-indigo-400 mx-auto animate-bounce" />
              <p className="font-semibold text-slate-200 text-sm">Evaluation suite ready to execute</p>
              <p className="max-w-md mx-auto text-slate-400">
                Click "Run All 12 Eval Questions" to execute the comprehensive test suite across all PS1 categories and verify deterministic accuracy.
              </p>
            </div>
          )}

          {results.map((res, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border text-xs transition-all ${
                res.passed
                  ? 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                  : 'bg-rose-950/20 border-rose-800/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-2 flex-1">
                  {res.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-slate-200">
                        Q{res.questionId}: {res.question}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {res.evaluationNote}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {res.elapsedMs && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {res.elapsedMs}ms
                    </span>
                  )}
                  <button
                    onClick={() => {
                      onSelectQuestion(res.question);
                      onClose();
                    }}
                    className="p-1 text-slate-400 hover:text-indigo-400 transition-colors"
                    title="Ask this question in the main view"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {res.sql && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 font-mono text-[10px] text-cyan-300 truncate">
                  <span className="text-slate-500">SQL: </span>
                  {res.sql}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

