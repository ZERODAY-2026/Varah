# Varah (DataMind): Conversational Snowflake CLI

Varah lets users ask questions about a Snowflake database in plain English. The CLI discovers tables and columns, asks an open-weight language model to produce read-only SQL, executes the SQL in Snowflake, and displays the answer alongside the query and raw results.

This README focuses on the **CLI path** in `scripts/ask_data.py`. It documents the commands exercised during local testing and separates passing offline checks from live AI calls that can fail due to API availability.

## What the CLI returns

For a successful query, the CLI displays four blocks:

1. **Grounded Answer** — a plain-language answer based on the query result.
2. **Explanation, Filters & Assumptions** — a description of how the result was computed.
3. **Inspectable Evidence** — the executed SQL and Snowflake Query ID.
4. **Raw Data Rows** — the returned column headers and rows.

The application uses Snowflake for data retrieval and calculation. The model proposes SQL and then explains the returned results.

## Requirements

- Python and `pip`
- A Snowflake account, warehouse, database, schema, and user with permissions to list tables, describe tables, and run the read-only queries you need
- A Google AI Studio API key for the cloud model `gemma-4-31b-it`, or a supported local model configured through Ollama

**Environment verified during testing:** Arch Linux, Python `3.14.7`, and a Python virtual environment. Dependency installation succeeded in that environment. Other operating systems and Python versions were not verified in this test run.

## 1. Clone and install

```bash
git clone https://github.com/ZERODAY-2026/Varah.git
cd Varah

python -m venv .venv
source .venv/bin/activate

python -m pip install --upgrade pip
pip install -r requirements.txt
```

On Windows, activate the environment with:

```powershell
.venv\Scripts\Activate.ps1
```

## 2. Initialize a Snowflake session

Run `--init` once to connect, discover the schema, and save the session configuration. Replace the example values with your own. Do not paste real credentials into issues, chat messages, screenshots, or public logs.

```bash
python scripts/ask_data.py --init \
  --sf-url 'https://YOUR_ACCOUNT_IDENTIFIER.snowflakecomputing.com' \
  --sf-user 'YOUR_SNOWFLAKE_USER' \
  --sf-password 'YOUR_SNOWFLAKE_PASSWORD' \
  --sf-warehouse 'YOUR_WAREHOUSE' \
  --sf-db 'YOUR_DATABASE' \
  --sf-schema 'YOUR_SCHEMA' \
  --model 'gemma-4-31b-it' \
  --api-key 'YOUR_GOOGLE_AI_STUDIO_API_KEY'
```

The Snowflake URL parser also accepts the `app.snowflake.com/<region>/<account>` URL format and a raw account identifier. The command connects to Snowflake and uses `SHOW TABLES` and `DESCRIBE TABLE` to discover the selected schema.

### Example used during testing

The test session connected to `DATAMIND_DB.BANK_SCHEMA` and discovered the `BANK_MARKETING` table. Its discovered columns included `AGE`, `JOB`, `MARITAL`, `EDUCATION`, `HOUSING`, `LOAN`, `DURATION`, and `Y`.

Your database does not need to use these names. Set `--sf-db` and `--sf-schema` to the database and schema containing your own tables.

### Configuration and credential safety

Initialization writes `.session_config.json` in the repository root. It contains connection settings and the configured API key, so treat it as a secret file. It is listed in `.gitignore`; **never commit it**. On Linux, restrict its permissions:

```bash
chmod 600 .session_config.json
```

The initialization command accepts secrets as command-line arguments. Depending on your shell and system configuration, those arguments may be retained in shell history or visible to local processes. Use a trusted machine, avoid sharing terminal logs containing the command, and rotate credentials that have been exposed.

## 3. Ask a single question

After initialization, run a question without repeating the connection flags:

```bash
python scripts/ask_data.py "what percentage of clients subscribed to a term deposit"
```

Another question exercised against the test table was:

```bash
python scripts/ask_data.py "Which 5 job categories have the highest number of clients?"
```

In successful runs against the tested `BANK_MARKETING` data, the first query returned approximately **11.265417%**. The second returned the top five job categories: `admin`, `blue-collar`, `technician`, `services`, and `management`, with counts of `10422`, `9254`, `6743`, `3969`, and `2924` respectively. These are observed test results, not guaranteed values for other datasets.

The local schema-handling fix makes an omitted `--sf-schema` use the schema saved during initialization, falling back to `PUBLIC` only when no schema is saved. To explicitly override it for one run, supply the flag:

```bash
python scripts/ask_data.py \
  --sf-schema 'YOUR_SCHEMA' \
  "what percentage of clients subscribed to a term deposit"
```

## 4. Start an interactive session

Use interactive mode to ask follow-up questions in a single CLI session:

```bash
python scripts/ask_data.py --interactive
```

Type questions at the `Ask DataMind >` prompt. Type `exit`, `quit`, or `q` to leave. The CLI keeps a short history of prior questions and SQL statements within that interactive session.

## 5. Run the offline tests

The offline test suite does not require Snowflake credentials or an AI API key:

```bash
python -m py_compile scripts/ask_data.py
python scripts/test_pipeline.py
```

The seven existing unit tests cover Snowflake URL parsing, the model-name guardrail, acceptance of read-only SQL examples, and rejection of destructive SQL examples.

**Observed result in this test run:** `python -m py_compile scripts/ask_data.py` completed without errors, and all **7 of 7** tests in `scripts/test_pipeline.py` passed.

## 6. Optional live evaluation

After initialization, the repository also provides a live evaluation mode:

```bash
python scripts/test_pipeline.py --live
```

This makes real Snowflake and model calls using `.session_config.json`. It is not an offline test: it requires working credentials, available model/API service, a compatible schema, and successful live requests. The generic scenarios may not fit every database schema, so inspect the scenario results rather than assuming that the suite passed.

## Testing status observed during development

The following results were observed during local testing on the `BANK_MARKETING` table:

| Check | Observed result |
|---|---|
| Dependency installation in the test virtual environment | Succeeded |
| Python syntax check for `scripts/ask_data.py` | Passed |
| Offline guardrail/parser suite | 7/7 tests passed |
| `python scripts/ask_data.py --init` with the test Snowflake settings | Succeeded; discovered `BANK_SCHEMA.BANK_MARKETING` |
| Percentage aggregation query | Succeeded in an earlier run with an available API response |
| Top-five job-category query | Succeeded in an earlier run with an available API response |
| Newer direct/model requests during subsequent testing | Returned `500 INTERNAL` from the GenAI API, including a minimal prompt |

The `500 INTERNAL` response prevented subsequent end-to-end runs from completing reliably. It does not, by itself, prove that an API key is invalid or that the schema logic is broken. Retry a minimal model request, check Google AI Studio service status, and test another model if needed. Avoid changing SQL or schema-handling code based only on a model-service error.

## Troubleshooting

### `No tables found in DATABASE.SCHEMA`

Check that the database and schema are correct and that your Snowflake user can list tables in that schema. Reinitialize with the intended `--sf-db` and `--sf-schema` values. The included `setup.sql` creates its sample tables in `DATAMIND_DB.PUBLIC`; the `BANK_SCHEMA.BANK_MARKETING` table used in our testing is a separate dataset.

### Google GenAI returns `500 INTERNAL` or `503 UNAVAILABLE`

These responses can occur before SQL is generated. First test a minimal call to the configured model, check the API service status, and try again later or test another supported model. Do not assume that a `500` alone proves the key is invalid. Do not share API keys in logs or screenshots.

### Snowflake connector prints a `FutureWarning`

A connector `FutureWarning` about session keep-alive settings was printed during initialization, but initialization still succeeded in the observed test. The warning was not the cause of the model API error.

## Sample Snowflake data

If you need sample tables instead of an existing dataset, review [`setup.sql`](./setup.sql) and execute it in a Snowflake worksheet with an appropriately privileged account. It creates `DATAMIND_DB.PUBLIC` tables named `COUNTRIES` and `COUNTRY_INDICATORS`. Configure the CLI to use that database and schema after setup.

## Agent Skill

The repository includes [`SKILL.md`](./SKILL.md) describing the tool for compatible AI coding agents.

## License

Varah is distributed under the MIT License. See [`LICENSE`](./LICENSE) for details.
