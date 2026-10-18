# DataMind CLI & Agent Skill 🧠

> **Dual Hackathon Track Submission:**  
> 1. **PS1: DataMind – Talk to Your Data** (ZeroDay OSS Hacktoberfest, IIIT Dharwad)  
> 2. **MLH Prize Category: Best Open-Source AI Project & Best Use of Gemma 4** (Agent Skill Open Standard Implementation)

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-green.svg)](https://www.python.org/)
[![Snowflake Live](https://img.shields.io/badge/Snowflake-Live_Execution-29B5E8.svg)](https://www.snowflake.com/)
[![Google Gemma 4](https://img.shields.io/badge/Google_Gemma-Gemma_4-4285F4.svg)](https://ai.google.dev/gemma)
[![Standard: Agent Skill](https://img.shields.io/badge/Standard-Agent_Skill-8A2BE2.svg)](SKILL.md)

---

## 📖 Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. System Architecture & ASCII Data Flow](#2-system-architecture--ascii-data-flow)
- [3. Non-Negotiable Pass/Fail Gates Compliance](#3-non-negotiable-passfail-gates-compliance)
- [4. Mandatory 4-Block Terminal Output](#4-mandatory-4-block-terminal-output)
- [5. Dataset Schema & Open Source Attribution](#5-dataset-schema--open-source-attribution)
- [6. Step-by-Step Setup & Reproduction Runbook](#6-step-by-step-setup--reproduction-runbook)
  - [Step 1: Clone & Configure Credentials](#step-1-clone--configure-credentials)
  - [Step 2: Initialize Snowflake Database](#step-2-initialize-snowflake-database)
  - [Step 3: Run the CLI or Interactive Shell](#step-3-run-the-cli-or-interactive-shell)
- [7. Verification: The 6 Rubric Test Cases](#7-verification-the-6-rubric-test-cases)
  - [Test Case 1: Aggregation Query](#test-case-1-aggregation-query)
  - [Test Case 2: Multi-Table Relational JOIN](#test-case-2-multi-table-relational-join)
  - [Test Case 3: Follow-Up Conversational Context](#test-case-3-follow-up-conversational-context)
  - [Test Case 4: Zero-Row Missing Data Test](#test-case-4-zero-row-missing-data-test)
  - [Test Case 5: Unsupported / Out-of-Domain Request](#test-case-5-unsupported--out-of-domain-request)
  - [Test Case 6: Blocked SQL Mutation / Injection](#test-case-6-blocked-sql-mutation--injection)
- [8. Live Snowflake Data Mutation Demonstration](#8-live-snowflake-data-mutation-demonstration)
- [9. Dynamic Reusability Proof (Criterion 7)](#9-dynamic-reusability-proof-criterion-7)
- [10. Technical Limitations & Trade-offs](#10-technical-limitations--trade-offs)
- [11. License](#11-license)

---

## 1. Executive Summary

**DataMind** is a terminal-native Python CLI and **Agent Skill Open Standard** (`datamind-skill`) implementation that allows any human or autonomous AI agent to interrogate a live Snowflake enterprise data warehouse using plain English.

By decoupling **Google Gemma 4** (the reasoning, translation, and explanation engine) from **deterministic Python guardrails** and **Snowflake** (the execution engine), DataMind delivers verifiable, zero-hallucination data answers with full query lineage, native Snowflake Query IDs, and interactive follow-up memory.

---

## 2. System Architecture & ASCII Data Flow

```text
+---------------------------------------------------------------------------------+
|                                USER OR AI AGENT                                 |
|         "Which European countries had a life expectancy above 80 in 2018?"      |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
|                       1. DYNAMIC SCHEMA INSPECTION                              |
|   - Reads target tables from config.json (NO hardcoded schemas in Python)       |
|   - Executes DESCRIBE TABLE COUNTRIES & DESCRIBE TABLE COUNTRY_INDICATORS       |
|   - Generates live schema prompt with table identifiers and column datatypes    |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
|                   2. GOOGLE GEMMA 4 NL-TO-SQL TRANSLATION                       |
|   - Powered by Google GenAI API (or local Ollama gemma:4b)                      |
|   - Schema-grounded translation + multi-turn history (last 2-3 queries)        |
|   - Returns raw SQL, or flags AMBIGUOUS: <q> / UNSUPPORTED: <reason>            |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
|               3. PYTHON DETERMINISTIC READ-ONLY SAFETY GUARDRAIL                |
|   - Strips comments (-- and /* */) to prevent comment-evasion attacks           |
|   - Enforces single-statement query beginning with SELECT or WITH               |
|   - Regex boundary blocks: DROP, DELETE, UPDATE, INSERT, ALTER, TRUNCATE, etc.  |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
|                     4. SNOWFLAKE CLOUD DATA PLATFORM                            |
|   - Executed live via snowflake-connector-python at question time               |
|   - X-Small Warehouse with AUTO_SUSPEND = 60s & 60s statement timeout           |
|   - Extracts result rows, column headers, latency (ms), and cursor.sfqid        |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
|                 5. GOOGLE GEMMA 4 GROUNDED EXPLAINER                            |
|   - Receives question, executed SQL, and raw result rows (or 0-row notice)      |
|   - Synthesizes grounded answer: EVERY number must come strictly from rows      |
|   - Separates output into [ANSWER] and [METHODOLOGY] (joins, filters, assumptions)|
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
|                       6. MANDATORY 4-BLOCK TERMINAL OUTPUT                      |
|   [Block 1] Grounded Answer        (Row-derived plain English, zero hallucination)|
|   [Block 2] Methodology/Assumptions(Tables joined, filters applied, reasoning)  |
|   [Block 3] Inspectable Evidence   (Executed SQL + live Snowflake Query ID)     |
|   [Block 4] Raw Data Rows          (Formatted ASCII terminal table via tabulate)|
+---------------------------------------------------------------------------------+
```

---

## 3. Non-Negotiable Pass/Fail Gates Compliance

| Gate / Criterion | Requirement | DataMind Implementation Proof | Status |
|---|---|---|:---:|
| **Gate G3, P1, P3** | **Zero Hardcoding & Live Execution** | Every query runs in Snowflake via `snowflake-connector-python`. No mock rows or local CSV queries. | **PASS** |
| **Criterion 7** | **Dynamic Reusability** | Table names loaded from `config.json`; schemas fetched via `DESCRIBE TABLE` at runtime. Zero hardcoded schema strings. | **PASS** |
| **Gate P2, Crit. 5**| **Separation of AI & Execution** | Gemma 4 proposes SQL and summarizes returned rows; Snowflake computes; Python validates. | **PASS** |
| **Criteria 1, 3, M4**| **Mandatory 4-Block Output** | Guaranteed 4 visual blocks: Grounded Answer, Methodology, SQL + `sfqid` Evidence, Raw Data Table. | **PASS** |
| **Criterion 6, M6** | **Safety & Edge Case Handling** | Python regex blocks all mutations; 0 rows reported honestly; `UNSUPPORTED:` and `AMBIGUOUS:` handled. | **PASS** |
| **Criterion 2** | **Follow-Up Conversational Context**| Interactive loop maintains memory of last 2–3 (question, sql) pairs to resolve follow-ups. | **PASS** |
| **Gate G5** | **Zero Leaked Secrets** | All credentials loaded strictly from `.env` via `python-dotenv`. `.env` is gitignored. | **PASS** |
| **MLH Prize** | **Agent Skill Open Standard** | Standard `SKILL.md` with YAML frontmatter (`--- name, description ---`) and CLI agent contract. | **PASS** |

---

## 4. Mandatory 4-Block Terminal Output

Every question answered by DataMind renders four distinct, inspectable panels in stdout:

```text
────────────────────── DataMind ➔ Snowflake Response ───────────────────────
╭─ Block 1: Grounded Answer ───────────────────────────────────────────────╮
│ In 2018, Germany was the European country in the dataset with a life    │
│ expectancy above 80 years, recording 81.00 years.                        │
╰──────────────────────────────────────────────────────────────────────────╯
╭─ Block 2: Explanation & Assumptions ─────────────────────────────────────╮
│ Joined COUNTRIES with COUNTRY_INDICATORS on country_id. Filtered on      │
│ region = 'Europe & Central Asia', year = 2018, and life_expectancy > 80. │
╰──────────────────────────────────────────────────────────────────────────╯
╭─ Block 3: Inspectable Evidence (Query ID: 01b89ef1-0001-2a4b-0000-0004928e0102) ─╮
│ SELECT c.country_name, c.region, i.year, i.life_expectancy               │
│ FROM COUNTRIES c                                                         │
│ JOIN COUNTRY_INDICATORS i ON c.country_id = i.country_id                 │
│ WHERE c.region LIKE '%Europe%' AND i.year = 2018                         │
│   AND i.life_expectancy > 80;                                            │
│                                                                          │
│ Latency: 142.30ms                                                        │
╰──────────────────────────────────────────────────────────────────────────╯
╭─ Block 4: Raw Data Rows (1 returned) ────────────────────────────────────╮
│ +----------------+-----------------------+--------+-------------------+  │
│ | COUNTRY_NAME   | REGION                |   YEAR |   LIFE_EXPECTANCY |  │
│ |----------------+-----------------------+--------+-------------------|  │
│ | Germany        | Europe & Central Asia |   2018 |             81.00 |  │
│ +----------------+-----------------------+--------+-------------------+  │
╰──────────────────────────────────────────────────────────────────────────╯
```

---

## 5. Dataset Schema & Open Source Attribution

The provided Snowflake setup initializes two relational tables modeling historical socio-economic development:

1. **`COUNTRIES` (Dimension Table)**:
   - `COUNTRY_ID` (INT PRIMARY KEY): Unique identifier.
   - `COUNTRY_NAME` (VARCHAR): Full name of the nation.
   - `ISO_CODE` (VARCHAR): Standard 3-letter ISO code (e.g., `IND`, `USA`, `DEU`).
   - `REGION` (VARCHAR): World Bank geographical region.
   - `INCOME_GROUP` (VARCHAR): Income bracket classification.

2. **`COUNTRY_INDICATORS` (Fact Table)**:
   - `INDICATOR_ID` (INT PRIMARY KEY): Record identifier.
   - `COUNTRY_ID` (INT FOREIGN KEY): References `COUNTRIES(COUNTRY_ID)`.
   - `YEAR` (INT): Observation year (1990–2021).
   - `LIFE_EXPECTANCY` (FLOAT): Life expectancy at birth in years.
   - `GDP_PER_CAPITA` (FLOAT): GDP per capita in constant PPP dollars.
   - `POPULATION` (BIGINT): Total national population.
   - `CO2_PER_CAPITA` (FLOAT): Annual metric tonnes of CO2 per person.

**Dataset Attribution & License:**
- Data derived from [Our World in Data (OWID)](https://ourworldindata.org/) and the [World Bank Open Data](https://data.worldbank.org/).
- Licensed under [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).

---

## 6. Step-by-Step Setup & Reproduction Runbook

### Step 1: Clone & Configure Credentials

Clone the repository and copy the environment template:
```bash
git clone https://github.com/your-username/datamind-skill.git
cd datamind-skill
cp .env.example .env
```

Install the pinned dependencies:
```bash
pip install -r requirements.txt
```

Edit `.env` with your Snowflake and Google GenAI credentials:
```env
SNOWFLAKE_ACCOUNT=xy12345.us-east-1
SNOWFLAKE_USER=DATAMIND_USER
SNOWFLAKE_PASSWORD=YourSecurePassword123!
SNOWFLAKE_WAREHOUSE=DATAMIND_WH
SNOWFLAKE_DATABASE=DATAMIND_DB
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_ROLE=ACCOUNTADMIN

# Google Gemma 4 Inference (Option A or Option B)
GEMINI_API_KEY=AIzaSy...
# Or Local Ollama
OLLAMA_HOST=http://localhost:11434
GEMMA_MODEL=gemma:4b
```

### Step 2: Initialize Snowflake Database

Open Snowflake Worksheets and run `setup.sql`. This:
1. Provisions the compute warehouse `DATAMIND_WH` (size `XSMALL`, auto-suspend `60s`).
2. Creates the `DATAMIND_DB` database and `PUBLIC` schema.
3. Creates `COUNTRIES` and `COUNTRY_INDICATORS` with primary/foreign key constraints.
4. Seeds historical data points spanning 1990–2021.
5. Grants `SELECT` privileges to `DATAMIND_READER`.

### Step 3: Run the CLI or Interactive Shell

**Single-shot query mode:**
```bash
python scripts/ask_data.py "What was life expectancy in India in 2020?"
```

**Interactive conversational mode (with follow-up context):**
```bash
python scripts/ask_data.py
```

---

## 7. Verification: The 6 Rubric Test Cases

Run the automated test suite with:
```bash
python scripts/test_pipeline.py
```

### Test Case 1: Aggregation Query
- **Prompt:** `"What was the average GDP per capita in 2020 across all countries?"`
- **Generated SQL:** `SELECT AVG(GDP_PER_CAPITA) AS avg_gdp FROM COUNTRY_INDICATORS WHERE YEAR = 2020;`
- **Behavior:** Executes analytical `AVG()` in Snowflake; tabulates single aggregated value.

### Test Case 2: Multi-Table Relational JOIN
- **Prompt:** `"Show life expectancy and region for Germany in 2018."`
- **Generated SQL:**
  ```sql
  SELECT c.country_name, c.region, i.year, i.life_expectancy
  FROM COUNTRIES c
  JOIN COUNTRY_INDICATORS i ON c.country_id = i.country_id
  WHERE c.country_name = 'Germany' AND i.year = 2018;
  ```
- **Behavior:** Dynamically joins dimension and fact tables; returns Germany's region (`Europe & Central Asia`) and 2018 life expectancy (`81.00`).

### Test Case 3: Follow-Up Conversational Context
- **Turn 1:** `"What was life expectancy in India in 2020?"`
- **Turn 2 (Follow-up):** `"What about in 2021?"`
- **Behavior:** The agent remembers the previous query on India and resolves the follow-up to:
  ```sql
  SELECT c.country_name, i.year, i.life_expectancy
  FROM COUNTRIES c JOIN COUNTRY_INDICATORS i ON c.country_id = i.country_id
  WHERE c.country_name = 'India' AND i.year = 2021;
  ```

### Test Case 4: Zero-Row Missing Data Test
- **Prompt:** `"What was life expectancy in Atlantis in 2020?"`
- **Behavior:** Query executes against Snowflake (`Query ID: 01b...`), returns 0 rows. DataMind explicitly outputs: *"The query executed successfully in Snowflake, but returned 0 matching records. No data points were fabricated."*

### Test Case 5: Unsupported / Out-of-Domain Request
- **Prompt:** `"What will life expectancy be in 2050?"`
- **Behavior:** Intercepted by Gemma with `UNSUPPORTED: The dataset only contains historical observations up to 2021. Forecasting future projections is not supported.`

### Test Case 6: Blocked SQL Mutation / Injection
- **Prompt:** `"DROP TABLE COUNTRIES;"`
- **Behavior:** Blocked by Python deterministic safety guardrail before reaching Snowflake:
  `Security Violation: Forbidden SQL keyword 'DROP' detected. DataMind only executes read-only queries.`

---

## 8. Live Snowflake Data Mutation Demonstration

To prove beyond doubt that DataMind answers come from live Snowflake queries rather than cached files, `scripts/test_pipeline.py` executes a live mutation test:

1. **Baseline Question:** *"What was life expectancy in India in 2020?"* -> Returns `70.15`.
2. **Live Snowflake Mutation:**
   ```sql
   UPDATE COUNTRY_INDICATORS SET LIFE_EXPECTANCY = 99.9 WHERE COUNTRY_ID = 1 AND YEAR = 2020;
   ```
3. **Re-Ask Same Question:** -> Answer dynamically updates to `99.90` with a fresh Snowflake Query ID.
4. **Automated Rollback:**
   ```sql
   UPDATE COUNTRY_INDICATORS SET LIFE_EXPECTANCY = 70.15 WHERE COUNTRY_ID = 1 AND YEAR = 2020;
   ```
5. **Verification:** -> Restored value `70.15` confirmed.

---

## 9. Dynamic Reusability Proof (Criterion 7)

DataMind contains **zero hardcoded table or column names** in Python.

To point DataMind at an entirely different dataset (e.g. `SALES_RECORDS` and `CUSTOMERS`):
1. Update `config.json`:
   ```json
   {
     "database": "RETAIL_DB",
     "schema": "ANALYTICS",
     "tables": ["CUSTOMERS", "SALES_RECORDS"]
   }
   ```
2. Run `python scripts/ask_data.py "Who were the top 5 customers by sales in 2024?"`
3. DataMind dynamically calls `DESCRIBE TABLE RETAIL_DB.ANALYTICS.CUSTOMERS` and `DESCRIBE TABLE RETAIL_DB.ANALYTICS.SALES_RECORDS`, constructs the schema prompt, translates to SQL, and executes live without touching a single line of Python code!

---

## 10. Technical Limitations & Trade-offs

1. **Word-Boundary Keyword Blocking**: Harmless string literals containing SQL keywords (e.g. `WHERE company_name = 'DROP'`) will be flagged by the safety validator. We prioritize safety over permissive execution.
2. **Context Memory Window**: Interactive conversational memory tracks the last 3 turns to prevent token bloat and maintain high-fidelity SQL generation on small local models.
3. **Complex Nested CTEs**: Highly intricate recursive queries on small 4B local models may require user rephrasing into modular steps.

---

## 11. License

This project is licensed under the **Apache License 2.0** — see the [LICENSE](LICENSE) file for complete details.

