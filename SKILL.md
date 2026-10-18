---
name: varah-datamind-snowflake
description: Query any live Snowflake database in plain English using Google Gemma 4 or local open-source Ollama models. Automatically discovers table schemas, enforces read-only SQL guardrails, and returns grounded answers with verifiable Snowflake Query IDs (sfqid) and raw result rows.
---

# Varah DataMind Snowflake Agent Skill

This skill allows an AI agent to autonomously connect to any Snowflake database, discover table schemas dynamically, translate natural language questions into safe read-only SQL via Google Gemma 4 or local open-source models, and retrieve grounded answers backed by verifiable Snowflake Query IDs (`sfqid`).

## When to Use This Skill
Activate this skill whenever the user asks to:
- Query, analyze, or inspect data stored inside a Snowflake database.
- Answer business intelligence, operational, or analytical questions from structured data without writing manual SQL.
- Verify database records with auditable SQL queries and Snowflake Query IDs.

## Prerequisites
Ensure dependencies are installed from the repository root:

```bash
pip install -r requirements.txt
```

## Step 1: Initialize the Session (Run Once per Target Database)
Before running queries, initialize the connection using the user's Snowflake URL (or Account ID), credentials, target database/schema, and open-source model choice. This validates the connection, discovers the tables, and caches the configuration locally in `.session_config.json` (no `.env` file editing required):

```bash
python scripts/ask_data.py --init \
  --sf-url "<SNOWFLAKE_URL_OR_ACCOUNT_ID>" \
  --sf-user "<SNOWFLAKE_USERNAME>" \
  --sf-password "<SNOWFLAKE_PASSWORD>" \
  --sf-warehouse "COMPUTE_WH" \
  --sf-db "<DATABASE_NAME>" \
  --sf-schema "<SCHEMA_NAME>" \
  --model "gemma-4-31b-it" \
  --api-key "<GOOGLE_AI_STUDIO_API_KEY>"
```

### Supported Open-Source Models (`--model`)
- **Cloud Open-Weight (Default):** `gemma-4-31b-it` or `gemma-4-26b-it` (requires `--api-key` from Google AI Studio).
- **Local Open-Source (via Ollama):** `ollama/gemma4`, `ollama/gemma3n`, `ollama/llama3.2`, or `ollama/qwen2.5-coder` (no API key needed; requires local Ollama server running on port `11434`).
- *Note: Proprietary closed-source models (such as GPT, Claude, or Gemini Pro) are strictly blocked by the guardrail.*

## Step 2: Execute Natural Language Queries
Once initialized, run any plain-English question against the live Snowflake warehouse:

```bash
python scripts/ask_data.py "<USER_QUESTION_IN_PLAIN_ENGLISH>"
```

You can also pass connection or model flags inline without running `--init` first:

```bash
python scripts/ask_data.py "What are the top 5 nations by total order revenue?" \
  --sf-url "<SNOWFLAKE_URL>" \
  --sf-user "<USER>" \
  --sf-password "<PASSWORD>" \
  --sf-db "SNOWFLAKE_SAMPLE_DATA" \
  --sf-schema "TPCH_SF1" \
  --model "gemma-4-31b-it" \
  --api-key "<API_KEY>"
```

## Step 3: How the Agent Must Interpret and Report Outputs
Every execution of `scripts/ask_data.py` prints four structured verification blocks to standard output:
1. **Block 1 (`1. Grounded Answer`):** Direct plain-language answer computed strictly from the returned Snowflake rows.
2. **Block 2 (`2. Explanation, Filters & Assumptions`):** Plain-language breakdown of which tables were joined, which filters/aggregations were applied, and any schema assumptions made.
3. **Block 3 (`3. Inspectable Evidence`):** The exact executed Snowflake `SELECT` query and the official **Snowflake Query ID (`sfqid`)**.
4. **Block 4 (`4. Raw Data Rows`):** Tabular view of the actual rows returned by Snowflake.

### Mandatory Agent Reporting Rules
- **Zero Hallucination:** Never invent, extrapolate, or guess numbers that are not explicitly present in Block 1 and Block 4.
- **Always Cite Evidence:** When presenting the answer to the user, always include the **Executed SQL** and the **Snowflake Query ID (`sfqid`)** from Block 3 so the user can audit the query in their Snowflake Query History.
- **Respect Empty & Refused States:**
  - If the script returns `0 rows returned`, report clearly that the query executed (`sfqid` provided) but no matching records exist in the dataset.
  - If the script returns `UNSUPPORTED` or `AMBIGUOUS`, ask the user for clarification or explain which columns are missing from the database schema.
  - Never attempt to bypass the read-only SQL guardrail (`DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER` are strictly prohibited).
