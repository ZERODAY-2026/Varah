import { SafetyCheckResult } from '../types';

export const DISALLOWED_KEYWORDS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'MERGE',
  'DROP',
  'ALTER',
  'CREATE',
  'TRUNCATE',
  'GRANT',
  'REVOKE',
  'COPY',
  'PUT',
  'GET',
  'CALL',
  'EXECUTE',
  'USE',
  'SET',
  'UNSET'
];

/**
 * Deterministic SQL Safety Validator according to PS1 Rules:
 * Rule 1: Strip comments (-- and /* *\/) and normalize whitespace
 * Rule 2: Must begin with SELECT or WITH
 * Rule 3: Exactly one statement (reject multiple statements separated by ;)
 * Rule 4: Reject any disallowed DDL/DML keywords
 * Rule 5: Auto-append LIMIT 1000 if no LIMIT present
 * Rule 6: Reject empty SQL
 */
export function validateSql(rawSql: string): SafetyCheckResult {
  if (!rawSql || rawSql.trim().length === 0) {
    return {
      passed: false,
      ruleViolated: 'Rule 6: Empty SQL',
      reason: 'SQL query string cannot be empty.'
    };
  }

  // Rule 1: Strip comments (-- line comments and /* multi-line comments */)
  let cleaned = rawSql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();

  // Normalize internal whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');

  if (cleaned.length === 0) {
    return {
      passed: false,
      ruleViolated: 'Rule 6: Empty SQL after stripping comments',
      reason: 'SQL query contains only comments or whitespace.'
    };
  }

  // Rule 3: Single statement check (allow trailing semicolon, but no semicolon between statements)
  const withoutTrailingSemi = cleaned.replace(/;\s*$/, '');
  if (withoutTrailingSemi.includes(';')) {
    return {
      passed: false,
      ruleViolated: 'Rule 3: Multiple Statements',
      reason: 'Multiple statements detected. Semicolon-separated compound queries are strictly prohibited.'
    };
  }

  // Rule 2: Must match ^(SELECT|WITH)\b
  if (!/^(SELECT|WITH)\b/i.test(cleaned)) {
    return {
      passed: false,
      ruleViolated: 'Rule 2: Non-SELECT/WITH Statement',
      reason: 'Only read-only SELECT or WITH common table expressions are permitted.'
    };
  }

  // Rule 4: Check for disallowed DML/DDL keywords with word boundary
  for (const keyword of DISALLOWED_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(cleaned)) {
      return {
        passed: false,
        ruleViolated: `Rule 4: Disallowed Keyword [${keyword}]`,
        reason: `Query contains forbidden operation keyword "${keyword}". System is restricted to read-only queries.`
      };
    }
  }

  // Rule 5: Auto-append LIMIT 1000 if no LIMIT clause exists
  let normalizedSql = withoutTrailingSemi;
  if (!/\bLIMIT\s+\d+/i.test(normalizedSql)) {
    normalizedSql = `${normalizedSql} LIMIT 1000;`;
  } else {
    normalizedSql = `${normalizedSql};`;
  }

  return {
    passed: true,
    normalizedSql
  };
}

