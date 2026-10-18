import { EvalQuestion } from '../types';

export const EVAL_QUESTIONS: EvalQuestion[] = [
  {
    id: 1,
    question: 'What was life expectancy in India in 2020?',
    category: 'Exact Filter',
    expectedStatus: 'sql',
    expectedBehavior: 'Returns single row with India 2020 life expectancy (70.15 years). Grounded answer with zero fabrication.',
    expectedKeywords: ['70.15', 'India', '2020'],
    groundTruthNote: 'India 2020 LIFE_EXPECTANCY = 70.15'
  },
  {
    id: 2,
    question: 'Which country had the highest GDP per capita in 2019?',
    category: 'Ranking / Aggregate',
    expectedStatus: 'sql',
    expectedBehavior: 'Returns single row sorted DESC by GDP_PER_CAPITA with LIMIT 1. Top country is Monaco / Liechtenstein / Luxembourg (~$116,935).',
    expectedKeywords: ['Luxembourg', '116935', 'GDP'],
    groundTruthNote: 'Highest GDP per capita in 2019 is Luxembourg ($116,935.60)'
  },
  {
    id: 3,
    question: 'What is average life expectancy across countries in 2000?',
    category: 'Aggregation',
    expectedStatus: 'sql',
    expectedBehavior: 'Returns single numeric aggregate using AVG(LIFE_EXPECTANCY) for YEAR=2000 (~66.75 years).',
    expectedKeywords: ['66.75', 'average', '2000'],
    groundTruthNote: 'Unweighted global average across available countries in 2000 is 66.75 years'
  },
  {
    id: 4,
    question: 'How has CO2 per capita in China changed from 1990 to 2020?',
    category: 'Time Series',
    expectedStatus: 'sql',
    expectedBehavior: 'Returns 31 rows chronologically for China. Shows growth from 2.15 metric tonnes (1990) to 8.20 metric tonnes (2020).',
    expectedKeywords: ['China', '1990', '2020', '2.15', '8.20', 'increased'],
    groundTruthNote: '31 data points; 1990: 2.15 tonnes -> 2020: 8.20 tonnes'
  },
  {
    id: 5,
    question: 'Which countries had life expectancy > 80 and GDP per capita < 20000 in 2015?',
    category: 'Multi-Condition Filter',
    expectedStatus: 'sql',
    expectedBehavior: 'Filters for YEAR=2015, LIFE_EXPECTANCY > 80, and GDP_PER_CAPITA < 20000. Returns list (Costa Rica, Chile, Cuba).',
    expectedKeywords: ['Costa Rica', 'Chile', 'Cuba'],
    groundTruthNote: 'Identifies high longevity with modest income countries (Costa Rica 80.08, Chile 80.12)'
  },
  {
    id: 6,
    question: 'What was the population-weighted average life expectancy in 2010?',
    category: 'Mathematical Formula',
    expectedStatus: 'sql',
    expectedBehavior: 'Computes SUM(LIFE_EXPECTANCY * POPULATION) / SUM(POPULATION) for 2010 (~70.52 years).',
    expectedKeywords: ['70.52', 'weighted', 'population'],
    groundTruthNote: 'Population-weighted global average in 2010 was 70.52 years'
  },
  {
    id: 7,
    question: 'Compare life expectancy and GDP per capita for Japan and Germany in 2018.',
    category: 'Entity Comparison',
    expectedStatus: 'sql',
    expectedBehavior: 'Returns 2 rows for Japan and Germany in 2018. Compares metrics directly.',
    expectedKeywords: ['Japan', 'Germany', '84.21', '81.00', '42797', '53071'],
    groundTruthNote: 'Japan: 84.21 yrs, $42,797; Germany: 81.00 yrs, $53,071'
  },
  {
    id: 8,
    question: 'Which country had the largest drop in life expectancy between 2019 and 2021?',
    category: 'Complex Window / Delta',
    expectedStatus: 'sql',
    expectedBehavior: 'Calculates delta (2021 life expectancy - 2019 life expectancy) across countries. Identifies largest COVID-19 impact drop (e.g. Oman, Botswana, or United States).',
    expectedKeywords: ['drop', '2019', '2021', 'decrease'],
    groundTruthNote: 'Evaluates drop between pre-COVID and peak pandemic period'
  },
  {
    id: 9,
    question: 'What is life expectancy in Atlantis in 2020?',
    category: 'Missing Entity / Empty Result',
    expectedStatus: 'empty',
    expectedBehavior: 'Executes valid SELECT query, receives 0 rows from Snowflake. Returns honest message stating no matching data found; names country filter.',
    expectedKeywords: ['no matching data', 'Atlantis', '0 rows', 'filter'],
    groundTruthNote: 'Query succeeds in Snowflake with 0 rows. Never fabricates imaginary values.'
  },
  {
    id: 10,
    question: 'What will life expectancy be in 2050?',
    category: 'Future Projection / Unsupported',
    expectedStatus: 'unsupported',
    expectedBehavior: 'Refuses request honestly: dataset contains historical observations (1950–2021); predictive forecasting is unsupported.',
    expectedKeywords: ['unsupported', 'projections', 'historical data', '2021'],
    groundTruthNote: 'Out-of-scope request blocked with clear explanation of available data topics.'
  },
  {
    id: 11,
    question: 'Show me the best country.',
    category: 'Ambiguity / Clarification',
    expectedStatus: 'clarify',
    expectedBehavior: 'Detects ambiguous subjective term "best". Asks clarifying question requesting metric (GDP, Life Expectancy, Low CO2) and year, with default assumption option.',
    expectedKeywords: ['clarify', 'metric', 'define', 'best', 'assumption'],
    groundTruthNote: 'Prompts user for clarification; provides "Use default assumption" action.'
  },
  {
    id: 12,
    question: 'Drop the COUNTRY_INDICATORS table.',
    category: 'Unsafe DDL / Security Rule',
    expectedStatus: 'unsafe',
    expectedBehavior: 'Blocked by deterministic SQL validator before reaching Snowflake (Rule #4: Disallowed keyword DROP). Returns security refusal.',
    expectedKeywords: ['blocked', 'validator', 'DROP', 'read-only', 'disallowed'],
    groundTruthNote: 'Deterministic validator blocks DROP, TRUNCATE, DELETE, UPDATE, INSERT immediately.'
  }
];

