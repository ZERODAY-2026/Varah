import { DatasetConfig } from '../types';

export const DATASETS: Record<string, DatasetConfig> = {
  bank_marketing: {
    id: 'bank_marketing',
    name: 'Bank Marketing (Live Snowflake)',
    tableName: 'DATAMIND_DB.BANK_SCHEMA.BANK_MARKETING',
    description: 'Real Snowflake dataset: 41,188 bank customers from direct marketing campaigns with demographic data, financial history, and term deposit subscription outcomes.',
    license: 'Open Data (CC BY 4.0)',
    source: 'Snowflake DATAMIND_DB.BANK_SCHEMA.BANK_MARKETING',
    rowCount: 41188,
    columns: [
      {
        name: 'AGE',
        type: 'NUMBER(38,0)',
        description: 'Customer age in years.',
        sampleValue: 41,
        range: '17 - 98 years'
      },
      {
        name: 'JOB',
        type: 'VARCHAR(50)',
        description: 'Type of job (admin, technician, blue-collar, services, management, retired, etc.).',
        sampleValue: 'technician'
      },
      {
        name: 'MARITAL',
        type: 'VARCHAR(30)',
        description: 'Marital status: married, single, divorced.',
        sampleValue: 'married'
      },
      {
        name: 'EDUCATION',
        type: 'VARCHAR(50)',
        description: 'Education qualification level (university.degree, high.school, basic.9y, etc.).',
        sampleValue: 'university.degree'
      },
      {
        name: 'DEFAULT_STATUS',
        type: 'VARCHAR(20)',
        description: 'Has credit in default? (no, yes, unknown).',
        sampleValue: 'no'
      },
      {
        name: 'HOUSING',
        type: 'VARCHAR(10)',
        description: 'Has housing loan? (yes, no, unknown).',
        sampleValue: 'yes'
      },
      {
        name: 'LOAN',
        type: 'VARCHAR(10)',
        description: 'Has personal loan? (yes, no, unknown).',
        sampleValue: 'no'
      },
      {
        name: 'CONTACT',
        type: 'VARCHAR(30)',
        description: 'Contact communication type (cellular, telephone).',
        sampleValue: 'cellular'
      },
      {
        name: 'MONTH',
        type: 'VARCHAR(10)',
        description: 'Last contact month of year (may, jul, aug, jun, nov, etc.).',
        sampleValue: 'may'
      },
      {
        name: 'DAY_OF_WEEK',
        type: 'VARCHAR(10)',
        description: 'Last contact day of the week (mon, tue, wed, thu, fri).',
        sampleValue: 'thu'
      },
      {
        name: 'DURATION',
        type: 'NUMBER(38,0)',
        description: 'Last contact call duration in seconds.',
        sampleValue: 261,
        range: '0 - 4918 seconds'
      },
      {
        name: 'CAMPAIGN',
        type: 'NUMBER(38,0)',
        description: 'Number of contacts performed during this campaign for this client.',
        sampleValue: 1
      },
      {
        name: 'PDAYS',
        type: 'NUMBER(38,0)',
        description: 'Days passed after client was last contacted (999 means not previously contacted).',
        sampleValue: 999
      },
      {
        name: 'PREVIOUS',
        type: 'NUMBER(38,0)',
        description: 'Number of contacts performed before this campaign.',
        sampleValue: 0
      },
      {
        name: 'POUTCOME',
        type: 'VARCHAR(30)',
        description: 'Outcome of previous campaign (nonexistent, failure, success).',
        sampleValue: 'nonexistent'
      },
      {
        name: 'EMP_VAR_RATE',
        type: 'FLOAT',
        description: 'Employment variation rate (quarterly indicator).',
        sampleValue: 1.1
      },
      {
        name: 'CONS_PRICE_IDX',
        type: 'FLOAT',
        description: 'Consumer price index (monthly indicator).',
        sampleValue: 93.994
      },
      {
        name: 'CONS_CONF_IDX',
        type: 'FLOAT',
        description: 'Consumer confidence index (monthly indicator).',
        sampleValue: -36.4
      },
      {
        name: 'EURIBOR3M',
        type: 'FLOAT',
        description: 'Euribor 3 month rate (daily indicator).',
        sampleValue: 4.857
      },
      {
        name: 'NR_EMPLOYED',
        type: 'FLOAT',
        description: 'Number of employees (quarterly indicator).',
        sampleValue: 5191.0
      },
      {
        name: 'Y',
        type: 'VARCHAR(10)',
        description: 'Target: has client subscribed a term deposit? (yes or no).',
        sampleValue: 'yes'
      }
    ],
    glossary: {
      'Y': 'Target variable: whether the client subscribed to a term deposit (yes or no).',
      'Age': 'Client age in years.',
      'Job': 'Client profession/employment category.',
      'Duration': 'Call duration in seconds for the last contact.',
      'PDays': 'Number of days since last contact (999 = never previously contacted).',
      'Housing': 'Whether the customer has an existing home loan.'
    },
    fewShotExamples: [
      {
        question: 'How many total customers are in the dataset?',
        sql: 'SELECT COUNT(*) AS TOTAL_CUSTOMERS FROM DATAMIND_DB.BANK_SCHEMA.BANK_MARKETING LIMIT 1000;',
        explanation: 'Counts total customer records in table.'
      },
      {
        question: 'What is the average age of customers who subscribed to term deposits?',
        sql: "SELECT ROUND(AVG(AGE), 1) AS AVG_AGE FROM DATAMIND_DB.BANK_SCHEMA.BANK_MARKETING WHERE Y = 'yes' LIMIT 1000;",
        explanation: "Filters for Y='yes' and calculates average age."
      },
      {
        question: 'Which job category has the highest number of customers?',
        sql: 'SELECT JOB, COUNT(*) AS CUSTOMER_COUNT FROM DATAMIND_DB.BANK_SCHEMA.BANK_MARKETING GROUP BY JOB ORDER BY CUSTOMER_COUNT DESC LIMIT 5;',
        explanation: 'Groups by JOB and sorts descending by count.'
      }
    ],
    sampleQuestions: [
      {
        category: 'Basic Filter',
        question: 'How many total customers are in the dataset?'
      },
      {
        category: 'Aggregation',
        question: 'What is the average age of customers who subscribed to term deposits?'
      },
      {
        category: 'Aggregation',
        question: 'Which job category has the highest number of customers?'
      },
      {
        category: 'Time Series',
        question: 'What is the distribution of contacts across different months?'
      },
      {
        category: 'Multi-Condition',
        question: 'How many customers aged over 50 have both housing and personal loans?'
      },
      {
        category: 'Edge Case',
        question: 'Show me the best customer.'
      },
      {
        category: 'Edge Case',
        question: 'Drop the BANK_MARKETING table.'
      }
    ]
  },
  owid: {
    id: 'owid',
    name: 'OWID Country Indicators (Backup)',
    tableName: 'DATAMIND_DB.BANK_SCHEMA.COUNTRY_INDICATORS',
    description: 'Merged country-year indicators (1950–2021) combining life expectancy, GDP per capita, population, and CO2 emissions.',
    license: 'Creative Commons BY 4.0 (Our World in Data)',
    source: 'https://github.com/owid/owid-datasets',
    rowCount: 14280,
    columns: [
      {
        name: 'COUNTRY',
        type: 'VARCHAR(255)',
        description: 'Standardized country name.',
        sampleValue: 'India'
      },
      {
        name: 'ISO_CODE',
        type: 'VARCHAR(3)',
        description: 'ISO 3-letter country code.',
        sampleValue: 'IND'
      },
      {
        name: 'YEAR',
        type: 'NUMBER(4,0)',
        description: 'Observation calendar year.',
        sampleValue: 2020
      },
      {
        name: 'LIFE_EXPECTANCY',
        type: 'NUMBER(5,2)',
        description: 'Period life expectancy at birth in years.',
        sampleValue: 70.15
      },
      {
        name: 'GDP_PER_CAPITA',
        type: 'NUMBER(12,2)',
        description: 'GDP per capita in constant 2017 international dollars.',
        sampleValue: 6997.86
      }
    ],
    glossary: {
      'Life Expectancy': 'Period life expectancy at birth measured in years.',
      'GDP per capita': 'Constant 2017 international dollars adjusted for purchasing power parity.'
    },
    fewShotExamples: [
      {
        question: 'What was life expectancy in India in 2020?',
        sql: "SELECT COUNTRY, YEAR, LIFE_EXPECTANCY FROM DATAMIND_DB.BANK_SCHEMA.COUNTRY_INDICATORS WHERE COUNTRY = 'India' AND YEAR = 2020 LIMIT 1000;"
      }
    ],
    sampleQuestions: [
      {
        category: 'Basic Filter',
        question: 'What was life expectancy in India in 2020?'
      }
    ]
  }
};
