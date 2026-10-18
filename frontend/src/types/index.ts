export type QueryStatus = 'sql' | 'ok' | 'clarify' | 'unsupported' | 'unsafe' | 'blocked' | 'refused' | 'empty' | 'error';

export interface EvidenceRef {
  claim: string;
  rows: number[];
  columns: string[];
}

export interface ClarificationDetails {
  question: string;
  options?: string[];
  defaultAssumption: string;
}

export interface ExecutionMetrics {
  queryId: string;
  warehouse: string;
  database: string;
  schema: string;
  role: string;
  elapsedMs: number;
  rowCount: number;
  bytesScanned?: number;
  statementTimeoutSeconds: number;
  timestamp: string;
}

export interface SafetyCheckResult {
  passed: boolean;
  ruleViolated?: string;
  reason?: string;
  normalizedSql?: string;
}

export interface QueryResult {
  id: string;
  question: string;
  status: QueryStatus;
  source?: 'live' | 'demo';
  query_id?: string;
  sql?: string;
  explanation?: string;
  plan?: string;
  answer?: string;
  howIGotThis?: string[];
  assumptions?: string[];
  dataGaps?: string[];
  evidenceRefs?: EvidenceRef[];
  confidence?: 'high' | 'medium' | 'low';
  confidenceReason?: string;
  clarification?: ClarificationDetails;
  unsupportedReason?: string;
  safetyViolation?: string;
  columns?: string[];
  rows?: Record<string, any>[];
  chartData?: Record<string, string | number | null>[];
  metrics?: ExecutionMetrics;
  safetyChecks?: {
    singleStatement: boolean;
    readOnlySelect: boolean;
    noDisallowedKeywords: boolean;
    limitAppended: boolean;
    commentsStripped: boolean;
  };
  chartSuggestion?: {
    type: 'line' | 'bar' | 'table';
    xAxis: string;
    yAxis: string[];
    title: string;
  };
}

export interface DatasetColumn {
  name: string;
  type: string;
  description: string;
  sampleValue?: string | number;
  range?: string;
}

export interface FewShotExample {
  question: string;
  sql: string;
  explanation?: string;
}

export interface DatasetConfig {
  id: string;
  name: string;
  tableName: string;
  description: string;
  license: string;
  source: string;
  rowCount: number;
  columns: DatasetColumn[];
  glossary: Record<string, string>;
  fewShotExamples: FewShotExample[];
  sampleQuestions: {
    category: 'Basic Filter' | 'Aggregation' | 'Time Series' | 'Multi-Condition' | 'Edge Case';
    question: string;
  }[];
}

export interface EvalQuestion {
  id: number;
  question: string;
  category: string;
  expectedStatus: QueryStatus;
  expectedBehavior: string;
  expectedKeywords?: string[];
  groundTruthNote?: string;
}

export interface EvalRunResult {
  questionId: number;
  question: string;
  status: QueryStatus;
  expectedStatus?: string[];
  passed: boolean;
  sql?: string;
  queryId?: string;
  elapsedMs?: number;
  answer?: string;
  evaluationNote: string;
}

export interface BackendEvalQuestion {
  id: number;
  name: string;
  question: string;
  expected_status: QueryStatus[];
  expected_behavior: string;
}

export interface SystemConfig {
  backendMode: 'standalone' | 'live';
  backendUrl: string;
  ollamaEndpoint: string;
  gemmaModel: string;
  snowflakeAccount: string;
  snowflakeWarehouse: string;
  snowflakeDatabase: string;
  snowflakeSchema: string;
  snowflakeRole: string;
}

