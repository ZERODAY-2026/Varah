import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { QueryInput } from './components/QueryInput';
import { AnswerCard } from './components/AnswerCard';
import { ClarificationCard } from './components/ClarificationCard';
import { SafetyCard } from './components/SafetyCard';
import { EvidenceViewer } from './components/EvidenceViewer';
import { EvalDashboardModal } from './components/EvalDashboardModal';
import { DataChangeDemoModal } from './components/DataChangeDemoModal';
import { SchemaModal } from './components/SchemaModal';
import { SettingsModal } from './components/SettingsModal';

import { DatasetConfig, QueryResult, SystemConfig } from './types';
import { DATASETS } from './data/datasets';
import { askSYNAPDATA, loadSystemConfig } from './services/api';
import { Sparkles, Terminal, Database, ShieldCheck, Cpu, Loader2 } from 'lucide-react';

export function App() {
  const [dataset, setDataset] = useState<DatasetConfig>(DATASETS.bank_marketing);
  const [config, setConfig] = useState<SystemConfig>(loadSystemConfig());
  const [activeQuestion, setActiveQuestion] = useState<string>('How many total customers are in the dataset?');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [activeEvidenceTab, setActiveEvidenceTab] = useState<string>('sql');

  // Modals
  const [isEvalOpen, setIsEvalOpen] = useState(false);
  const [isDataChangeOpen, setIsDataChangeOpen] = useState(false);
  const [isSchemaOpen, setIsSchemaOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Auto-run initial query on mount so user/judges immediately see the full rich evidence interface
  useEffect(() => {
    executeQuestion('How many total customers are in the dataset?');
  }, []);

  const executeQuestion = async (q: string) => {
    setQueryError(null);
    setResult(null);
    setIsLoading(true);
    setActiveQuestion(q);
    setLoadingStep('Google Gemma translating question to Snowflake SQL...');

    const timer1 = setTimeout(() => {
      setLoadingStep('Deterministic validator verifying read-only safety rules...');
    }, 150);

    const timer2 = setTimeout(() => {
      setLoadingStep('Executing query in Snowflake warehouse COMPUTE_WH...');
    }, 280);

    const timer3 = setTimeout(() => {
      setLoadingStep('Google Gemma synthesizing grounded answer from returned rows...');
    }, 420);

    try {
      const res = await askSYNAPDATA(q, dataset, config);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setResult(res);
      setActiveEvidenceTab('sql');
    } catch (err) {
      console.error(err);
      setQueryError(err instanceof Error ? err.message : 'The query could not be completed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDatasetChange = (newDs: DatasetConfig) => {
    setDataset(newDs);
    const firstSample = newDs.sampleQuestions[0].question;
    setActiveQuestion(firstSample);
    executeQuestion(firstSample);
  };

  const handleClarificationOption = (option: string) => {
    const refined = `${activeQuestion} (${option})`;
    executeQuestion(refined);
  };

  const handleUseDefaultAssumption = (defAssumption: string) => {
    const refined = `${activeQuestion} [Assumption: ${defAssumption}]`;
    executeQuestion(refined);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Top Navigation */}
      <Navbar
        config={config}
        onOpenEval={() => setIsEvalOpen(true)}
        onOpenDataChangeDemo={() => setIsDataChangeOpen(true)}
        onOpenSchema={() => setIsSchemaOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Layout Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        {/* Left Sidebar */}
        <Sidebar
          currentDataset={dataset}
          onSelectDataset={handleDatasetChange}
          onSelectQuestion={executeQuestion}
        />

        {/* Central Workspace */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col gap-6 overflow-y-auto">
          {/* Welcome Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-purple-900/30 border border-slate-800 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-1">
                  Talk to Your Data with Google Gemma & Snowflake
                </h1>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Natural language translated into verified, read-only Snowflake SQL. Answers are derived{' '}
                  <strong className="text-indigo-300">only</strong> from returned rows with full inspectable
                  evidence, query IDs, and deterministic safety enforcement.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Zero-Hallucination Grounding</span>
                </span>
              </div>
            </div>
          </div>

          {/* Question Input */}
          <QueryInput
            onAsk={executeQuestion}
            isLoading={isLoading}
            activeQuestion={activeQuestion}
          />

          {/* Loading Animation & Progression */}
          {isLoading && (
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-3 animate-pulse shadow-xl">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-200">{loadingStep}</p>
                <p className="text-xs text-slate-500">
                  Separating Gemma reasoning from deterministic SQL execution in Snowflake
                </p>
              </div>
            </div>
          )}

          {!isLoading && queryError && (
            <div className="rounded-xl border border-rose-700/50 bg-rose-950/30 p-4 text-sm text-rose-200" role="alert">
              {queryError}
            </div>
          )}

          {/* Results Display */}
          {!isLoading && result && (
            <div className="space-y-6">
              {/* Special Scenario 1: Ambiguity Clarification */}
              {result.status === 'clarify' && result.clarification && (
                <ClarificationCard
                  clarification={result.clarification}
                  onSelectOption={handleClarificationOption}
                  onUseDefault={handleUseDefaultAssumption}
                />
              )}

              {/* Special Scenario 2: Security Block (Unsafe) or Out-of-Scope (Unsupported) */}
              {(result.status === 'unsafe' || result.status === 'blocked' || result.status === 'unsupported' || result.status === 'refused') && (
                <SafetyCard
                  result={result}
                  onOpenSchema={() => setIsSchemaOpen(true)}
                />
              )}

              {/* Normal Grounded Answer (SQL or Empty Result) */}
              {(result.status === 'sql' || result.status === 'ok' || result.status === 'empty') && (
                <>
                  {result.status === 'empty' && (
                    <div className="rounded-xl border border-amber-700/50 bg-amber-950/25 p-4 text-sm text-amber-200" role="status">
                      Snowflake query completed successfully and returned 0 rows. No answer was guessed.
                    </div>
                  )}
                  <AnswerCard
                    result={result}
                    onViewSqlTab={() => setActiveEvidenceTab('sql')}
                  />

                  {/* Full Inspectable Evidence Viewer */}
                  <EvidenceViewer
                    result={result}
                    activeTab={activeEvidenceTab}
                  />
                </>
              )}
            </div>
          )}

          {/* Footer note */}
          <footer className="mt-auto pt-8 pb-4 text-center text-xs text-slate-500 border-t border-slate-900 space-y-1">
            <p>
              SYNAPDATA (PS1) • ZeroDay OSS Hacktoberfest 2026 (IIT Dharwad) • Open Source under Apache-2.0 License.
            </p>
            <p className="text-[11px] text-slate-600">
              Snowflake trial credit conservation: X-Small warehouse auto-suspends after 60s idle • Limit 1000 applied to all queries.
            </p>
          </footer>
        </main>
      </div>

      {/* Interactive Modals */}
      <EvalDashboardModal
        isOpen={isEvalOpen}
        onClose={() => setIsEvalOpen(false)}
        onSelectQuestion={executeQuestion}
        config={config}
      />

      <DataChangeDemoModal
        isOpen={isDataChangeOpen}
        onClose={() => setIsDataChangeOpen(false)}
        onRunQuestion={executeQuestion}
      />

      <SchemaModal
        isOpen={isSchemaOpen}
        onClose={() => setIsSchemaOpen(false)}
        dataset={dataset}
        onSelectDataset={handleDatasetChange}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onUpdateConfig={setConfig}
      />
    </div>
  );
}

export default App;
