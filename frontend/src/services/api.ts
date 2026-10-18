import { QueryResult, DatasetConfig, SystemConfig, EvalRunResult, BackendEvalQuestion } from '../types';
import { executeMockQuery, getIndiaDataUpdated, setIndiaDataUpdated } from '../data/mockDataEngine';
import { EVAL_QUESTIONS } from '../data/evalQuestions';
import { DATASETS } from '../data/datasets';

const DEFAULT_CONFIG: SystemConfig = {
  backendMode: 'standalone',
  backendUrl: 'http://localhost:8000',
  ollamaEndpoint: 'http://localhost:11434',
  gemmaModel: 'gemma3:4b',
  snowflakeAccount: 'JEEATYD-FA11867',
  snowflakeWarehouse: 'DATAMIND_WH',
  snowflakeDatabase: 'DATAMIND_DB',
  snowflakeSchema: 'BANK_SCHEMA',
  snowflakeRole: 'ACCOUNTADMIN'
};

const STORAGE_KEY = 'SynapData_system_config';

export function loadSystemConfig(): SystemConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Error loading config:', e);
  }
  return DEFAULT_CONFIG;
}

export function saveSystemConfig(cfg: SystemConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.error('Error saving config:', e);
  }
}

export async function checkBackendHealth(backendUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${backendUrl}/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

function makeChartData(
  columns: string[],
  rawRows: unknown[][],
  rows: Record<string, unknown>[]
): Pick<QueryResult, 'chartSuggestion' | 'chartData'> {
  if (rawRows.length < 2 || columns.length < 2) return {};

  const numericColumns = columns.filter((_, columnIndex) =>
    rawRows.every((row) => {
      const value = row[columnIndex];
      return value !== null && value !== undefined && String(value).trim() !== '' && Number.isFinite(Number(value));
    })
  );
  const xAxis = columns.find((column) => /date|year|month|time|country|name|category|region|\bid\b/i.test(column))
    ?? columns.find((column) => !numericColumns.includes(column))
    ?? columns[0];
  const yAxis = numericColumns.filter((column) => column !== xAxis);
  if (yAxis.length === 0) return {};

  const type = /date|year|month|time/i.test(xAxis) ? 'line' : 'bar';
  const chartData = rows.map((row) => ({
    ...row,
    ...Object.fromEntries(yAxis.map((column) => [column, Number(row[column])]))
  })) as Record<string, string | number | null>[];

  return {
    chartSuggestion: { type, xAxis, yAxis, title: `Results by ${xAxis}` },
    chartData
  };
}

function normalizeVarahResponse(payload: unknown, question: string): QueryResult {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Backend returned an invalid response.');
  }

  const data = payload as Record<string, unknown>;
  const allowedStatuses = ['ok', 'empty', 'refused', 'blocked'];
  if (typeof data.status !== 'string' || !allowedStatuses.includes(data.status)) {
    throw new Error('Backend response did not contain a recognized status.');
  }

  const columns = Array.isArray(data.columns) ? data.columns.map(String) : [];
  const rawRows = Array.isArray(data.rows) ? data.rows as unknown[][] : [];
  const rows = rawRows.map((row) => {
    if (!Array.isArray(row)) return {};
    return Object.fromEntries(columns.map((column, index) => [column, row[index] ?? null]));
  });
  const queryId = typeof data.query_id === 'string' ? data.query_id : undefined;
  const explanation = typeof data.explanation === 'string' ? data.explanation : undefined;

  return {
    id: queryId || `varah-${Date.now()}`,
    source: 'live',
    query_id: queryId,
    question,
    status: data.status as QueryResult['status'],
    answer: typeof data.answer === 'string' ? data.answer : undefined,
    explanation,
    howIGotThis: explanation ? [explanation] : [],
    sql: typeof data.sql === 'string' ? data.sql : undefined,
    columns,
    rows,
    ...makeChartData(columns, rawRows, rows)
  };
}

async function askVarah(question: string, backendUrl: string): Promise<QueryResult> {
  const response = await fetch(`${backendUrl.replace(/\/$/, '')}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
    signal: AbortSignal.timeout(210000)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.detail || `Backend request failed (HTTP ${response.status}).`);
  }

  return normalizeVarahResponse(await response.json(), question);
}

export async function askSYNAPDATA(
  question: string,
  dataset: DatasetConfig,
  config: SystemConfig
): Promise<QueryResult> {
  // Live mode must not silently substitute mock data for a failed real query.
  if (config.backendMode === 'live') {
    return askVarah(question, config.backendUrl);
  }

  // Standalone / Simulation mode:
  // Add realistic small artificial latency (180ms - 350ms) to mirror Snowflake query execution
  await new Promise((resolve) => setTimeout(resolve, 300));
  return { ...executeMockQuery(question, dataset), source: 'demo' };
}

export async function runAllEvals(
  config: SystemConfig,
  onProgress?: (completed: number, total: number, latest?: EvalRunResult) => void
): Promise<EvalRunResult[]> {
  if (config.backendMode === 'live') {
    const questionsResponse = await fetch(`${config.backendUrl.replace(/\/$/, '')}/eval/questions`);
    if (!questionsResponse.ok) {
      const errorBody = await questionsResponse.json().catch(() => null);
      throw new Error(errorBody?.detail || `Could not load evaluation questions (HTTP ${questionsResponse.status}).`);
    }

    const questions = await questionsResponse.json() as BackendEvalQuestion[];
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('The backend evaluation suite contains no questions.');
    }
    onProgress?.(0, questions.length);
    const results: EvalRunResult[] = [];
    for (const item of questions) {
      let result: QueryResult;
      try {
        result = await askVarah(item.question, config.backendUrl);
      } catch (error) {
        result = {
          id: `eval-${item.id}`,
          question: item.question,
          status: 'error',
          answer: error instanceof Error ? error.message : 'Request failed.'
        };
      }

      const passed = item.expected_status.includes(result.status);
      const evaluation: EvalRunResult = {
        questionId: item.id,
        question: item.question,
        status: result.status,
        expectedStatus: item.expected_status,
        passed,
        sql: result.sql,
        queryId: result.query_id,
        answer: result.answer,
        evaluationNote: `${passed ? 'Passed' : 'Failed'}: expected ${item.expected_status.join(' or ')}; received ${result.status}. ${item.expected_behavior}`
      };
      results.push(evaluation);
      onProgress?.(results.length, questions.length, evaluation);
    }
    return results;
  }

  const results: EvalRunResult[] = [];
  const dataset = DATASETS.owid;
  const total = EVAL_QUESTIONS.length;

  for (let i = 0; i < total; i++) {
    const eq = EVAL_QUESTIONS[i];
    // Small delay between questions for visual feedback
    await new Promise((res) => setTimeout(res, 200));

    const queryResult = executeMockQuery(eq.question, dataset);
    let passed = false;
    let evalNote = '';

    if (eq.expectedStatus === 'sql') {
      passed = queryResult.status === 'sql' && (queryResult.rows?.length ?? 0) > 0;
      evalNote = passed
        ? `Demo check passed: built-in sample results matched status 'sql' with rows.`
        : `Demo check failed: expected status 'sql' with rows, got '${queryResult.status}'.`;
    } else if (eq.expectedStatus === 'empty') {
      passed = queryResult.status === 'empty' && (queryResult.rows?.length ?? 0) === 0;
      evalNote = passed
        ? 'Demo check passed: built-in sample data represents an empty result.'
        : `Demo check failed: expected empty result, got '${queryResult.status}'.`;
    } else if (eq.expectedStatus === 'clarify') {
      passed = queryResult.status === 'clarify' && Boolean(queryResult.clarification?.question);
      evalNote = passed
        ? 'Demo check passed: built-in sample data returned a clarification.'
        : `Demo check failed: expected clarification, got '${queryResult.status}'.`;
    } else if (eq.expectedStatus === 'unsupported') {
      passed = queryResult.status === 'unsupported';
      evalNote = passed
        ? 'Demo check passed: built-in sample data returned an unsupported status.'
        : `Demo check failed: expected unsupported, got '${queryResult.status}'.`;
    } else if (eq.expectedStatus === 'unsafe') {
      passed = queryResult.status === 'unsafe';
      evalNote = passed
        ? 'Demo check passed: built-in sample data returned a safety block.'
        : `Demo check failed: expected unsafe, got '${queryResult.status}'.`;
    }

    const item: EvalRunResult = {
      questionId: eq.id,
      question: eq.question,
      status: queryResult.status,
      passed,
      sql: queryResult.sql,
      queryId: queryResult.metrics?.queryId,
      elapsedMs: queryResult.metrics?.elapsedMs,
      answer: queryResult.answer || queryResult.unsupportedReason || queryResult.clarification?.question,
      evaluationNote: evalNote
    };

    results.push(item);
    if (onProgress) {
      onProgress(i + 1, total, item);
    }
  }

  return results;
}

export { getIndiaDataUpdated, setIndiaDataUpdated };
