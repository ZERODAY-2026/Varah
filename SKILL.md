---
name: datamind-skill
description: Talk to your live Snowflake data warehouse in plain English using Google Gemma 4. Translates questions into validated, read-only SQL queries, executes live in Snowflake, and returns grounded answers with inspectable query IDs and row evidence.
---

# DataMind Agent Skill 🧠

The `datamind-skill` is an **Open-Standard Agent Skill** that equips AI agents and autonomous coding assistants with the ability to query live enterprise data warehouses in Snowflake using natural language.

---

## 🎯 When to Use This Skill

Activate this skill whenever:
- A user asks analytical, numerical, or statistical questions about data stored in Snowflake (e.g., aggregations, rankings, multi-table joins, or time-series trends).
- You need to verify data points against a live data warehouse with zero hallucination.
- You need traceable execution evidence, including executed SQL, execution latency, and native Snowflake Query IDs (`cursor.sfqid`).
- You need to inspect or answer follow-up questions over tabular datasets without writing SQL manually.

---

## ⚙️ Prerequisites & Environment

Before invoking the skill, ensure the following environment variables are exported in `.env` or the agent's execution environment:

```bash
# Snowflake Credentials
SNOWFLAKE_ACCOUNT=xy12345.us-east-1
SNOWFLAKE_USER=DATAMIND_USER
SNOWFLAKE_PASSWORD=YourSecurePassword123!
SNOWFLAKE_WAREHOUSE=DATAMIND_WH
SNOWFLAKE_DATABASE=DATAMIND_DB
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_ROLE=ACCOUNTADMIN

# Google Gemma 4 Inference (Choose Option A or Option B)
# Option A: Google AI Studio API Key (Cloud)
GEMINI_API_KEY=AIzaSy...

# Option B: Local Ollama (Offline / Air-Gapped)
OLLAMA_HOST=http://localhost:11434
GEMMA_MODEL=gemma:4b
```

And install the pinned dependencies:
```bash
pip install -r requirements.txt
```

---

## 🚀 Invocation Contract

### CLI Command Invocation

An AI agent or human operator invokes the skill via the terminal:

```bash
# Single question execution mode
python scripts/ask_data.py "<your natural language question>"
```

### Interactive Multi-Turn Shell

For interactive workflows supporting conversational follow-up memory (e.g. "What about in 2021?", "Compare that to Japan"):

```bash
# Launches persistent terminal session with 3-turn memory
python scripts/ask_data.py
```

---

## 🛡️ Guardrails & Execution Pipeline

The skill executes in a strictly deterministic 5-stage pipeline:

1. **Dynamic Schema Inspection**: Reads target tables from `config.json` and runs `DESCRIBE TABLE` in Snowflake. Never relies on hardcoded column names in prompts.
2. **Gemma 4 NL-to-SQL Translation**: Translates English to Snowflake SQL using schema grounding and multi-turn context.
3. **Deterministic Read-Only Validator**: Strips comments and asserts query starts with `SELECT` or `WITH`. Blocks any query containing forbidden keywords: `DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER`, `TRUNCATE`, `GRANT`, `REVOKE`, `COPY`, `CALL`, etc.
4. **Live Execution in Snowflake**: Runs against Snowflake warehouse with `STATEMENT_TIMEOUT_IN_SECONDS=60`. Captures native Snowflake Query ID (`cursor.sfqid`) and latency.
5. **Grounded Explainer Synthesis**: Summarizes results strictly from returned row tuples. If 0 rows match, explicitly states zero records found.

---

## 📋 Mandatory 4-Block Output Format

Every execution returns four visually distinct blocks in stdout:

| Block | Section Title | Description |
|---|---|---|
| **Block 1** | **Grounded Answer** | Plain-English answer strictly derived from returned row tuples (zero hallucination). |
| **Block 2** | **Explanation & Assumptions** | Technical explanation of tables joined, filters applied, and reasoning. |
| **Block 3** | **Inspectable Evidence** | Exact executed SQL query, execution latency (ms), and native Snowflake Query ID (`sfqid`). |
| **Block 4** | **Raw Data Rows** | ASCII terminal table (`tabulate` / `rich`) showing actual records returned by Snowflake. |

---

## 💡 Example Agent Invocations

### Example 1: Multi-Table Analytical JOIN
```bash
python scripts/ask_data.py "Which European countries had a life expectancy above 80 in 2018?"
```
*Expected Behavior*: Gemma joins `COUNTRIES` and `COUNTRY_INDICATORS` on `country_id`, filters `region = 'Europe & Central Asia'` and `year = 2018`, executes live in Snowflake, and returns grounded answers for Germany.

### Example 2: Aggregation & Grouping
```bash
python scripts/ask_data.py "What is the average life expectancy for High income countries in 2020?"
```
*Expected Behavior*: Computes `AVG(i.LIFE_EXPECTANCY)` grouped by `c.INCOME_GROUP = 'High income'`, displays Snowflake Query ID, and tabulates the result.

### Example 3: Zero-Row Filter (Honest Reporting)
```bash
python scripts/ask_data.py "What was life expectancy in Atlantis in 2020?"
```
*Expected Behavior*: Executes query, receives 0 rows, and outputs: *"The query executed successfully in Snowflake (Query ID: ...), but returned 0 matching records."*

### Example 4: Security Attack Mitigation
```bash
python scripts/ask_data.py "Drop table COUNTRIES;"
```
*Expected Behavior*: Deterministic validator intercepts and blocks before hitting Snowflake: `Security Violation: Forbidden SQL keyword 'DROP' detected.`

