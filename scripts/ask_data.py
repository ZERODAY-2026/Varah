import argparse
import json
import os
import re
import urllib.request
from pathlib import Path
import snowflake.connector
from google import genai
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()
SESSION_FILE = Path(__file__).resolve().parent.parent / ".session_config.json"

# Allowed Open-Source / Open-Weight prefixes (Blocks GPT, Claude, Gemini Pro)
BLOCKED_PROPRIETARY = ("gpt-", "claude-", "gemini-1", "gemini-2", "o1-", "o3-")


def parse_snowflake_link(url_or_account: str) -> str:
    """
    Extracts the Snowflake account identifier from any URL format:
    - https://xy12345.ap-south-1.snowflakecomputing.com
    - https://app.snowflake.com/ap-south-1/xy12345/...
    - xy12345.ap-south-1
    """
    raw = url_or_account.strip()
    # Match app.snowflake.com/<region>/<account>
    app_match = re.search(r"app\.snowflake\.com/([^/]+)/([^/?#]+)", raw)
    if app_match:
        region, acct = app_match.group(1), app_match.group(2)
        return f"{acct}.{region}"
    
    # Match standard <account>.snowflakecomputing.com
    cleaned = re.sub(r"^https?://", "", raw)
    return cleaned.split(".snowflakecomputing.com")[0].split("/")[0]


def verify_open_source_model(model_name: str):
    """Ensures strictly Gemma or Open-Source models are used."""
    lower = model_name.strip().lower()
    if any(lower.startswith(bad) for bad in BLOCKED_PROPRIETARY):
        raise ValueError(
            f"Model '{model_name}' is proprietary and blocked by hackathon rules. "
            "Use Google Gemma (e.g., 'gemma-4-31b-it', 'ollama/gemma4') or an open-source model."
        )


def call_open_source_ai(prompt: str, model_name: str = "gemma-4-31b-it", api_key: str = "") -> str:
    """
    Calls Google Gemma (via Google GenAI SDK) or any local Open-Source model (via Ollama).
    """
    verify_open_source_model(model_name)

    # 1. Local Ollama Open-Source Models (e.g., "ollama/gemma4", "ollama/llama3.2")
    if model_name.startswith("ollama/"):
        ollama_model = model_name.split("ollama/", 1)[1]
        payload = json.dumps({
            "model": ollama_model,
            "prompt": prompt,
            "stream": False
        }).encode("utf-8")
        req = urllib.request.Request(
            "http://localhost:11434/api/generate",
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=90) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("response", "").strip()

    # 2. Default: Gemma 4 via Google GenAI SDK
    key = api_key or os.getenv("GEMINI_API_KEY", "")
    if not key:
        raise ValueError("API Key required for cloud Gemma model (or use 'ollama/gemma4' for local execution).")
    
    client = genai.Client(api_key=key)
    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
    )
    return response.text.strip()


def connect_snowflake(sf_config: dict):
    """Connects to Snowflake using parsed URL and user-supplied details."""
    account_id = parse_snowflake_link(sf_config["url"])
    conn = snowflake.connector.connect(
        account=account_id,
        user=sf_config["user"],
        password=sf_config["password"],
        warehouse=sf_config.get("warehouse") or "COMPUTE_WH",
        database=sf_config["database"],
        schema=sf_config.get("schema") or "PUBLIC",
    )
    return conn


def discover_schema(conn, database: str, schema: str) -> str:
    """Automatically finds tables and columns so the user never has to configure them manually."""
    cursor = conn.cursor()
    cursor.execute(f"SHOW TABLES IN SCHEMA {database}.{schema}")
    tables = [row[1] for row in cursor.fetchall()]

    if not tables:
        raise RuntimeError(f"No tables found in {database}.{schema}.")

    schema_lines = []
    for tbl in tables[:10]:  # Cap at 10 tables to keep prompt fast
        cursor.execute(f"DESCRIBE TABLE {database}.{schema}.{tbl}")
        cols = [f"{r[0]} ({r[1]})" for r in cursor.fetchall()]
        schema_lines.append(f"Table {database}.{schema}.{tbl}: " + ", ".join(cols))

    return "\n".join(schema_lines)


def is_safe_readonly_sql(sql: str) -> bool:
    """Blocks any destructive or non-SELECT query (Mandatory Requirement M6)."""
    cleaned = re.sub(r"--.*$", "", sql, flags=re.MULTILINE).strip().upper()
    if not (cleaned.startswith("SELECT") or cleaned.startswith("WITH") or cleaned.startswith("SHOW")):
        return False
    forbidden = r"\b(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|MERGE)\b"
    return not bool(re.search(forbidden, cleaned))


def run_datamind_pipeline(question: str, sf_config: dict, ai_config: dict, history: list = None) -> dict:
    """
    Main orchestrator used by BOTH the Frontend and SKILL.md!
    1. Connects to Snowflake via URL
    2. Discovers schema automatically
    3. Translates English -> SQL via Gemma / Open-Source AI
    4. Validates Read-Only safety
    5. Executes on Snowflake & captures Query ID (sfqid)
    6. Generates Grounded Answer + Explanation
    """
    history = history or []
    model_name = ai_config.get("model") or "gemma-4-31b-it"
    api_key = ai_config.get("api_key") or ""

    conn = connect_snowflake(sf_config)
    try:
        schema_text = discover_schema(
            conn, sf_config["database"], sf_config.get("schema") or "PUBLIC"
        )

        history_context = ""
        if history:
            history_context = "Previous Context:\n" + "\n".join(
                [f"Q: {h['q']}\nSQL: {h['sql']}" for h in history[-3:]]
            )

        # Call 1: Natural Language to Snowflake SQL
        sql_prompt = f"""You are a Snowflake SQL generator.
Database Schema:
{schema_text}

{history_context}

User Question: {question}

Rules:
1. Output ONLY a single valid read-only Snowflake SELECT query. Do NOT include markdown backticks.
2. Always qualify table names or use the exact column names from the schema above.
3. If the question cannot be answered using the schema, output exactly: UNSUPPORTED: <reason>
4. If the question is too ambiguous to write SQL, output exactly: AMBIGUOUS: <what needs clarification>
"""
        raw_sql_resp = call_open_source_ai(sql_prompt, model_name, api_key)
        cleaned_sql = re.sub(r"^```(?:sql)?|```$", "", raw_sql_resp.strip(), flags=re.IGNORECASE).strip()

        if cleaned_sql.startswith("UNSUPPORTED:") or cleaned_sql.startswith("AMBIGUOUS:"):
            return {
                "status": "refused",
                "answer": cleaned_sql,
                "explanation": "The request could not be mapped to the available database columns without guessing.",
                "sql": "NONE (Refused before execution)",
                "query_id": "N/A",
                "columns": [],
                "rows": [],
            }

        if not is_safe_readonly_sql(cleaned_sql):
            return {
                "status": "blocked",
                "answer": "Blocked: Only read-only SELECT queries are permitted.",
                "explanation": "Safety guardrail triggered to protect database integrity (Requirement M6).",
                "sql": cleaned_sql,
                "query_id": "N/A (Blocked by Guardrail)",
                "columns": [],
                "rows": [],
            }

        # Execute live on Snowflake
        cursor = conn.cursor()
        cursor.execute(cleaned_sql)
        query_id = cursor.sfqid
        columns = [col[0] for col in cursor.description] if cursor.description else []
        rows = cursor.fetchall()

        if not rows:
            return {
                "status": "empty",
                "answer": "The query executed successfully on Snowflake, but returned 0 matching rows.",
                "explanation": "No records in the database matched the filters for your question. No values were guessed.",
                "sql": cleaned_sql,
                "query_id": query_id,
                "columns": columns,
                "rows": [],
            }

        # Call 2: Grounded Explanation
        sample_rows = [dict(zip(columns, [str(v) for v in r])) for r in rows[:25]]
        explain_prompt = f"""You are a data analyst explaining verified Snowflake query results.
User Question: {question}
Executed SQL: {cleaned_sql}
Snowflake Result Rows (JSON): {json.dumps(sample_rows)}

Provide your response in EXACTLY two sections separated by '---SPLIT---':
Section 1: A direct, plain-language answer using ONLY the numbers/facts from the result rows. Never invent data.
---SPLIT---
Section 2: A brief plain-language explanation of how the answer was computed (which tables, columns, filters, aggregations, or assumptions were used).
"""
        explanation_raw = call_open_source_ai(explain_prompt, model_name, api_key)
        parts = explanation_raw.split("---SPLIT---")
        grounded_answer = parts[0].strip()
        methodology = parts[1].strip() if len(parts) > 1 else "Computed directly via the executed SQL query shown below."

        return {
            "status": "ok",
            "answer": grounded_answer,
            "explanation": methodology,
            "sql": cleaned_sql,
            "query_id": query_id,
            "columns": columns,
            "rows": [list(map(str, r)) for r in rows],
        }
    finally:
        conn.close()

def render_cli_output(res: dict):
    """Prints the 4 Mandatory Rubric Blocks cleanly in the terminal."""
    console.print("\n")
    console.print(Panel(res["answer"], title="[bold green]1. Grounded Answer[/bold green]", border_style="green"))
    console.print(Panel(res["explanation"], title="[bold cyan]2. Explanation, Filters & Assumptions[/bold cyan]", border_style="cyan"))

    evidence_text = f"[bold yellow]Executed SQL:[/bold yellow]\n{res['sql']}\n\n[bold magenta]Snowflake Query ID:[/bold magenta] {res['query_id']}"
    console.print(Panel(evidence_text, title="[bold yellow]3. Inspectable Evidence[/bold yellow]", border_style="yellow"))

    if res["rows"]:
        table = Table(title="4. Raw Data Rows (Top 15 shown)", show_lines=True)
        for col in res["columns"]:
            table.add_column(str(col), style="white")
        for row in res["rows"][:15]:
            table.add_row(*[str(cell) for cell in row])
        console.print(table)
    else:
        console.print(Panel("0 rows returned.", title="[bold red]4. Raw Data Rows[/bold red]", border_style="red"))


def main():
    parser = argparse.ArgumentParser(description="Varah DataMind: Talk to Snowflake Data via Gemma / Open-Source AI")
    parser.add_argument("question", nargs="?", help="Plain-English question to ask your Snowflake data")
    parser.add_argument("--init", action="store_true", help="Verify and save Snowflake & AI settings for future runs")
    parser.add_argument("--interactive", "-i", action="store_true", help="Start an interactive follow-up chat session")

    # Dynamic connection & AI flags (no .env editing required)
    parser.add_argument("--sf-url", help="Snowflake URL or Account Identifier")
    parser.add_argument("--sf-user", help="Snowflake Username")
    parser.add_argument("--sf-password", help="Snowflake Password")
    parser.add_argument("--sf-warehouse", default="COMPUTE_WH", help="Snowflake Warehouse (default: COMPUTE_WH)")
    parser.add_argument("--sf-db", help="Snowflake Database Name")
    parser.add_argument("--sf-schema", default="PUBLIC", help="Snowflake Schema Name (default: PUBLIC)")
    parser.add_argument("--model", default="gemma-4-31b-it", help="Gemma or Open-Source model (e.g. gemma-4-31b-it, ollama/gemma4)")
    parser.add_argument("--api-key", default="", help="Google AI Studio API Key (if using cloud Gemma)")

    args = parser.parse_args()

    # Load previously saved session config if it exists
    saved = {}
    if SESSION_FILE.exists():
        saved = json.loads(SESSION_FILE.read_text())

    sf_config = {
        "url": args.sf_url or saved.get("sf_config", {}).get("url"),
        "user": args.sf_user or saved.get("sf_config", {}).get("user"),
        "password": args.sf_password or saved.get("sf_config", {}).get("password"),
        "warehouse": args.sf_warehouse or saved.get("sf_config", {}).get("warehouse", "COMPUTE_WH"),
        "database": args.sf_db or saved.get("sf_config", {}).get("database"),
        "schema": args.sf_schema or saved.get("sf_config", {}).get("schema", "PUBLIC"),
    }
    ai_config = {
        "model": args.model if args.model != "gemma-4-31b-it" or "ai_config" not in saved else saved["ai_config"].get("model", "gemma-4-31b-it"),
        "api_key": args.api_key or saved.get("ai_config", {}).get("api_key", ""),
    }

    # Mode A: --init (Save config and test connection)
    if args.init:
        verify_open_source_model(ai_config["model"])
        conn = connect_snowflake(sf_config)
        schema_str = discover_schema(conn, sf_config["database"], sf_config["schema"])
        conn.close()
        SESSION_FILE.write_text(json.dumps({"sf_config": sf_config, "ai_config": ai_config}, indent=2))
        console.print(Panel(f"[bold green]Connected & Saved Session![/bold green]\n\nDiscovered Schema:\n{schema_str}", title="Init Success"))
        return

    if not sf_config.get("url") or not sf_config.get("database"):
        console.print("[bold red]Error:[/bold red] Missing Snowflake connection info. Run with `--init` first or pass `--sf-url`, `--sf-user`, `--sf-password`, and `--sf-db`.")
        return

    # Mode C: --interactive loop
    if args.interactive:
        history = []
        console.print("[bold green]Varah Interactive Mode[/bold green] (Type 'exit' to quit)\n")
        while True:
            q = console.input("\n[bold cyan]Ask DataMind > [/bold cyan]").strip()
            if q.lower() in ("exit", "quit", "q"):
                break
            if not q:
                continue
            res = run_datamind_pipeline(q, sf_config, ai_config, history)
            render_cli_output(res)
            if res["status"] == "ok":
                history.append({"q": q, "sql": res["sql"]})
        return

    # Mode B: Single question
    if args.question:
        res = run_datamind_pipeline(args.question, sf_config, ai_config)
        render_cli_output(res)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
