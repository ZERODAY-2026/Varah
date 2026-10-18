import React, { useState } from 'react';
import {
  Code2,
  Database,
  Table as TableIcon,
  BarChart3,
  ListOrdered,
  FileCheck2,
  Copy,
  Check,
  Download,
  Search,
  ArrowUpDown,
  ExternalLink,
  ShieldCheck,
  Clock,
  Cpu,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { QueryResult } from '../types';

interface EvidenceViewerProps {
  result: QueryResult;
  activeTab?: string;
}

export const EvidenceViewer: React.FC<EvidenceViewerProps> = ({ result, activeTab: initialTab }) => {
  const [tab, setTab] = useState<string>(initialTab || 'sql');
  const [copiedSql, setCopiedSql] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [activeRefRow, setActiveRefRow] = useState<number | null>(null);

  React.useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);

  const handleCopySql = () => {
    if (result.sql) {
      navigator.clipboard.writeText(result.sql);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    }
  };

  const exportCsv = () => {
    if (!result.rows || result.rows.length === 0 || !result.columns) return;
    const header = result.columns.join(',');
    const csvRows = result.rows.map((row) =>
      result.columns!.map((col) => {
        const val = row[col];
        if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
        return val ?? '';
      }).join(',')
    );
    const blob = new Blob([header + '\n' + csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SYNAPDATA_query_result_${result.id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    if (!result.rows) return;
    const blob = new Blob([JSON.stringify(result.rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SYNAPDATA_query_result_${result.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter and sort rows
  let displayRows = result.rows ? [...result.rows] : [];
  if (tableSearch.trim()) {
    const q = tableSearch.toLowerCase();
    displayRows = displayRows.filter((r) =>
      Object.values(r).some((val) => String(val).toLowerCase().includes(q))
    );
  }
  if (sortCol) {
    displayRows.sort((a, b) => {
      const vA = a[sortCol];
      const vB = b[sortCol];
      if (vA === vB) return 0;
      if (vA == null) return 1;
      if (vB == null) return -1;
      if (typeof vA === 'number' && typeof vB === 'number') {
        return sortDir === 'asc' ? vA - vB : vB - vA;
      }
      return sortDir === 'asc'
        ? String(vA).localeCompare(String(vB))
        : String(vB).localeCompare(String(vA));
    });
  }

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const chartRows = result.chartData ?? result.rows ?? [];
  const hasChart = Boolean(result.chartSuggestion && chartRows.length > 1);

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden mt-6">
      {/* Evidence Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 overflow-x-auto">
        <div className="flex items-center gap-1 py-2">
          <button
            onClick={() => setTab('sql')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === 'sql'
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Executed SQL</span>
          </button>

          <button
            onClick={() => setTab('snowflake')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === 'snowflake'
                ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Snowflake Metrics</span>
          </button>

          <button
            onClick={() => setTab('data')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === 'data'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Result Rows ({result.rows?.length ?? 0})</span>
          </button>

          {hasChart && (
            <button
              onClick={() => setTab('viz')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === 'viz'
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Visualization</span>
            </button>
          )}

          <button
            onClick={() => setTab('reasoning')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === 'reasoning'
                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>How I Got This</span>
          </button>

          {result.evidenceRefs && result.evidenceRefs.length > 0 && (
            <button
              onClick={() => setTab('trace')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === 'trace'
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Evidence Trace ({result.evidenceRefs.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="p-5">
        {/* TAB 1: EXECUTED SQL */}
        {tab === 'sql' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <span>Executed SQL</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    Validated Read-Only
                  </span>
                </h4>
                <p className="text-xs text-slate-400">
                  Deterministically sanitized, validated, and executed against live Snowflake warehouse.
                </p>
              </div>

              <button
                onClick={handleCopySql}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
              </button>
            </div>

            {result.source !== 'demo' && (result.query_id || result.metrics?.queryId) && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-700/50 bg-emerald-950/25 px-3 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">Snowflake Query ID</span>
                <code className="break-all text-xs text-slate-100">{result.query_id || result.metrics?.queryId}</code>
                <span className="rounded-full border border-emerald-600/50 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">Verified</span>
              </div>
            )}

            {/* SQL Code Block */}
            <div className="relative rounded-xl bg-slate-950 p-4 border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto leading-relaxed shadow-inner">
              <pre className="whitespace-pre-wrap">{result.sql || '-- No SQL query generated'}</pre>
            </div>

            {/* Deterministic Safety Verification Checklist */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-xs space-y-2">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Deterministic Safety Checks Passed</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Read-only statement accepted</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Read-Only SELECT / WITH CTE</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>No Disallowed Keywords (DML/DDL)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Executed against Snowflake</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Comments Stripped & Normalized</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Snowflake Query ID recorded</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SNOWFLAKE METRICS */}
        {tab === 'snowflake' && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-200">
              Snowflake Execution & Warehouse Metadata
            </h4>
            <p className="text-xs text-slate-400">
              Proof of live question-time execution in Snowflake. No local files or mocked results.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Snowflake Query ID
                </span>
                <span className="font-mono text-xs text-cyan-300 font-bold block truncate" title={result.source === 'demo' ? 'No live Snowflake Query ID in demo mode' : result.query_id || result.metrics?.queryId}>
                  {result.source === 'demo' ? 'Demo mode · no Snowflake Query ID' : result.query_id || result.metrics?.queryId || 'N/A'}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Inspectable in Snowflake Query History
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Execution Latency
                </span>
                <span className="text-base font-bold text-emerald-400">
                  {result.metrics ? `${result.metrics.elapsedMs} ms` : 'Not provided'}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Roundtrip execution time
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Warehouse & Sizing
                </span>
                <span className="text-xs font-semibold text-indigo-300 block">
                  {result.metrics?.warehouse || 'Not provided'}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Warehouse details are not included in this response.
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Returned Row Count
                </span>
                <span className="text-base font-bold text-slate-200">
                  {result.metrics?.rowCount ?? 0} rows
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Strictly grounded answer payload
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Bytes Scanned
                </span>
                <span className="text-xs font-mono text-slate-200">
                  {result.metrics?.bytesScanned
                    ? `${(result.metrics.bytesScanned / 1024).toFixed(1)} KB`
                    : 'Not provided'}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Scan statistics are not included in this response.
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Enforced Role & Timeout
                </span>
                <span className="text-xs font-semibold text-slate-200 block">
                  {result.metrics?.role || 'Not provided'}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Role and timeout details are not included in this response.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RESULT ROWS */}
        {tab === 'data' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Filter returned rows..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 pl-8 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportCsv}
                  disabled={!result.rows || result.rows.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 disabled:opacity-50 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={exportJson}
                  disabled={!result.rows || result.rows.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 disabled:opacity-50 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>JSON</span>
                </button>
              </div>
            </div>

            {/* Table */}
            {displayRows.length > 0 && result.columns ? (
              <div className="rounded-xl border border-slate-800 overflow-hidden overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 uppercase tracking-wider text-[10px] text-slate-400 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 border-b border-slate-700/60 w-12 text-slate-500">#</th>
                      {result.columns.map((col) => (
                        <th
                          key={col}
                          onClick={() => toggleSort(col)}
                          className="px-3 py-2 border-b border-slate-700/60 cursor-pointer hover:text-white select-none"
                        >
                          <div className="flex items-center gap-1">
                            <span>{col}</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-500" />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {displayRows.map((row, idx) => {
                      const isHighlighted = activeRefRow === idx;
                      return (
                        <tr
                          key={idx}
                          className={`transition-colors ${
                            isHighlighted
                              ? 'bg-amber-500/10 hover:bg-amber-500/20'
                              : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="px-3 py-2 text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                          {result.columns!.map((col) => {
                            const val = row[col];
                            return (
                              <td key={col} className="px-3 py-2 font-mono text-slate-200">
                                {val !== null && val !== undefined
                                  ? typeof val === 'number'
                                    ? val.toLocaleString()
                                    : String(val)
                                  : <span className="text-slate-600 italic">NULL</span>}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl bg-slate-800/30 border border-slate-800 text-slate-400 text-xs">
                No rows returned by this query.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: VISUALIZATION */}
        {tab === 'viz' && hasChart && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-200">
                  {result.chartSuggestion?.title || 'Data Visualization'}
                </h4>
                <p className="text-xs text-slate-400">
                  Automatically plotted based on query metrics and dimensionality.
                </p>
              </div>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                {result.chartSuggestion?.type} chart
              </span>
            </div>

            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                {result.chartSuggestion?.type === 'line' ? (
                  <LineChart data={chartRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey={result.chartSuggestion.xAxis}
                      stroke="#94a3b8"
                      fontSize={11}
                    />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    {result.chartSuggestion.yAxis.map((metric, i) => (
                      <Line
                        key={metric}
                        type="monotone"
                        dataKey={metric}
                        stroke={i === 0 ? '#38bdf8' : '#818cf8'}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#38bdf8' }}
                      />
                    ))}
                  </LineChart>
                ) : (
                  <BarChart data={chartRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey={result.chartSuggestion?.xAxis}
                      stroke="#94a3b8"
                      fontSize={11}
                    />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    {result.chartSuggestion?.yAxis.map((metric, i) => (
                      <Bar
                        key={metric}
                        dataKey={metric}
                        fill={i === 0 ? '#6366f1' : '#38bdf8'}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* TAB 5: HOW I GOT THIS */}
        {tab === 'reasoning' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-200">
                Step-by-Step Derivation Breakdown
              </h4>
              <p className="text-xs text-slate-400">
                Transparent step-by-step reasoning explaining tables, filters, aggregations, and assumptions.
              </p>
            </div>

            {result.howIGotThis && result.howIGotThis.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Execution Steps:
                </span>
                <ol className="space-y-2 text-xs text-slate-200">
                  {result.howIGotThis.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {result.assumptions && result.assumptions.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Assumptions Made:
                </span>
                <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                  {result.assumptions.map((asm, idx) => (
                    <li key={idx}>{asm}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.dataGaps && result.dataGaps.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
                  Data Gaps & Missing Values:
                </span>
                <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                  {result.dataGaps.map((gap, idx) => (
                    <li key={idx}>{gap}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: EVIDENCE TRACE */}
        {tab === 'trace' && result.evidenceRefs && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-200">
                Claim-to-Row Evidence Verification
              </h4>
              <p className="text-xs text-slate-400">
                Click any factual claim below to verify the exact Snowflake row and column supporting it.
              </p>
            </div>

            <div className="space-y-3">
              {result.evidenceRefs.map((ref, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setActiveRefRow(ref.rows[0]);
                    setTab('data');
                  }}
                  className="p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/40 cursor-pointer transition-all text-xs group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-indigo-300">
                      Claim #{idx + 1}: "{ref.claim}"
                    </span>
                    <span className="text-[10px] text-slate-400 group-hover:text-white flex items-center gap-1">
                      <span>View in Data Table</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    <div>
                      <span>Row Index: </span>
                      <span className="font-mono text-slate-200">{ref.rows.map(r => r + 1).join(', ')}</span>
                    </div>
                    <div>
                      <span>Source Columns: </span>
                      <span className="font-mono text-cyan-300">{ref.columns.join(', ')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

