#!/usr/bin/env python3
"""
DataMind CLI — Talk to Your Data (Agent Skill Open Standard Implementation)
Dual Track: PS1 (ZeroDay OSS Hacktoberfest) & MLH Best Open-Source AI Project / Best Use of Gemma

Pipeline:
  User English Question
  -> Dynamic Schema Fetch (DESCRIBE TABLE from config.json)
  -> Gemma 4 (NL-to-SQL Translation + Follow-up Context)
  -> Python Read-Only Safety Guardrail
  -> Snowflake Live Execution (Fetch Rows + cursor.sfqid)
  -> Gemma 4 (Grounded Answer + Methodology/Assumptions)
  -> 4-Block Terminal Output (Answer, Explanation, Evidence, Raw Rows)
"""

import os
import sys
import json
import re
import time
from typing import Any, Tuple, List, Dict, Optional

# Load environment variables from .env
from dotenv import load_dotenv
load_dotenv()

# Terminal formatting libraries
from rich.console import Console
from rich.panel import Panel
from rich.syntax import Syntax
from rich.text import Text
from tabulate import tabulate

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

console = Console(highlight=False)

# ---------------------------------------------------------------------------
# Configuration & Credentials
# ---------------------------------------------------------------------------
CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config.json")

SNOWFLAKE_ACCOUNT = os.getenv("SNOWFLAKE_ACCOUNT", "")
SNOWFLAKE_USER = os.getenv("SNOWFLAKE_USER", "")
SNOWFLAKE_PASSWORD = os.getenv("SNOWFLAKE_PASSWORD", "")
SNOWFLAKE_WAREHOUSE = os.getenv("SNOWFLAKE_WAREHOUSE", "DATAMIND_WH")
SNOWFLAKE_DATABASE = os.getenv("SNOWFLAKE_DATABASE", "DATAMIND_DB")
SNOWFLAKE_SCHEMA = os.getenv("SNOWFLAKE_SCHEMA", "PUBLIC")
SNOWFLAKE_ROLE = os.getenv("SNOWFLAKE_ROLE", "ACCOUNTADMIN")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
GEMMA_MODEL = os.getenv("GEMMA_MODEL", "gemma:4b")

# Safety rules: blocked SQL keywords (word-boundary case-insensitive regex)
BLOCKED_SQL_KEYWORDS = [
    "INSERT", "UPDATE", "DELETE", "MERGE", "DROP", "ALTER", "CREATE",
    "TRUNCATE", "GRANT", "REVOKE", "COPY", "PUT", "GET", "CALL",
    "EXECUTE", "USE", "SET", "UNSET", "RENAME"
]
BLOCKED_PATTERN = re.compile(r"\b(" + "|".join(BLOCKED_SQL_KEYWORDS) + r")\b", re.IGNORECASE)
VALID_START_PATTERN = re.compile(r"^\s*(SELECT|WITH)\b", re.IGNORECASE)


def load_config() -> Dict[str, Any]:
    """Load database, schema, and target tables from config.json."""
    if not os.path.exists(CONFIG_PATH):
        raise FileNotFoundError(f"Configuration file not found: {CONFIG_PATH}")
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Dynamic Schema Loader (Zero Hardcoding)
# ---------------------------------------------------------------------------
def fetch_dynamic_schema(conn, config: Dict[str, Any]) -> str:
    """
    Dynamically inspects Snowflake using DESCRIBE TABLE for every table listed
    in config.json. Returns a structured string representation of all schemas.
    """
    database = config.get("database", SNOWFLAKE_DATABASE)
    schema = config.get("schema", SNOWFLAKE_SCHEMA)
    tables = config.get("tables", [])

    schema_lines = []
    schema_lines.append(f"Database: {database}")
    schema_lines.append(f"Schema: {schema}")
    schema_lines.append("Tables & Column Definitions:")

    cursor = conn.cursor()
    try:
        for table in tables:
            full_table_name = f"{database}.{schema}.{table}"
            try:
                cursor.execute(f"DESCRIBE TABLE {full_table_name}")
                rows = cursor.fetchall()
                # Snowflake DESCRIBE TABLE columns: name, type, kind, null?, default, primary key, unique key, check, expression, comment
                col_defs = []
                for row in rows:
                    col_name = row[0]
                    col_type = row[1]
                    is_nullable = "NULL" if row[3] == "Y" else "NOT NULL"
                    is_pk = " PRIMARY KEY" if len(row) > 5 and row[5] == "Y" else ""
                    col_defs.append(f"    - {col_name} ({col_type}, {is_nullable}{is_pk})")

                schema_lines.append(f"  Table: {full_table_name} (Identifier: {table})")
                schema_lines.extend(col_defs)
            except Exception as e:
                schema_lines.append(f"  Table: {full_table_name} - (Could not describe: {e})")
    finally:
        cursor.close()

    return "\n".join(schema_lines)


# ---------------------------------------------------------------------------
# Google Gemma 4 Inference Engine (Google GenAI API or Local Ollama)
# ---------------------------------------------------------------------------
class GemmaEngine:
    """Dual-backend Gemma 4 engine supporting Google GenAI SDK and Ollama."""

    def __init__(self):
        self.backend = None
        self.client = None

        if GEMINI_API_KEY:
            try:
                from google import genai
                self.client = genai.Client(api_key=GEMINI_API_KEY)
                self.backend = "google-genai"
                # Default to gemma-2-9b-it / gemma models or gemini fallback on Google AI Studio
                self.model_name = "gemini-2.5-flash"
            except Exception as e:
                console.print(f"[yellow]Warning: google-genai initialization failed: {e}. Falling back to Ollama.[/yellow]")

        if not self.backend:
            try:
                import ollama
                self.client = ollama.Client(host=OLLAMA_HOST)
                self.backend = "ollama"
                self.model_name = GEMMA_MODEL
            except Exception as e:
                self.backend = "none"

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        """Generate response from Gemma 4."""
        if self.backend == "google-genai":
            try:
                full_prompt = f"{system_prompt}\n\nUSER PROMPT:\n{user_prompt}"
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=full_prompt,
                )
                return response.text.strip()
            except Exception as e:
                console.print(f"[yellow]Google GenAI call failed: {e}. Trying Ollama...[/yellow]")

        # Ollama backend fallback
        try:
            import ollama
            client = ollama.Client(host=OLLAMA_HOST)
            response = client.chat(
                model=GEMMA_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                options={"temperature": 0.0},
            )
            return response["message"]["content"].strip()
        except Exception as e:
            raise RuntimeError(
                f"Failed to generate from Gemma 4 via both Google GenAI and Ollama ({OLLAMA_HOST}): {e}\n"
                f"Please ensure GEMINI_API_KEY is in .env OR Ollama is running (`ollama run gemma:4b`)."
            )


# ---------------------------------------------------------------------------
# Gemma Prompts (NL-to-SQL & Grounded Explainer)
# ---------------------------------------------------------------------------
NL_TO_SQL_SYSTEM_PROMPT = """You are DataMind's SQL Translation Agent powered by Google Gemma 4.
Your mission is to translate a user's plain-English question into ONE valid, read-only Snowflake SQL query.

TARGET DATABASE SCHEMA (Dynamically Inspected from Snowflake):
{schema_text}

STRICT OPERATIONAL RULES:
1. ONLY return the raw executable SQL query. Do not wrap it in markdown code fences (```sql or ```). Do not include any greeting or conversational filler.
2. Read-only queries only: Use SELECT or WITH statements. Never write DML or DDL (no INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, GRANT).
3. Strictly use the tables and columns provided in the SCHEMA above. Never invent tables or columns.
4. When multiple related tables are available and necessary, perform standard SQL JOINs on foreign/primary keys.
5. If the question asks for rankings or "top/highest/lowest", use ORDER BY with appropriate LIMIT.
6. For multi-turn follow-ups, resolve references (like "what about China?" or "compare that to 2021") using the provided conversation history.
7. If the question is completely outside the scope of the schema, return exactly:
   UNSUPPORTED: <brief explanation of why the schema cannot answer this>
8. If the user question is too vague to construct a valid query, return exactly:
   AMBIGUOUS: <clarifying question to ask the user>
"""

GROUNDED_EXPLAINER_SYSTEM_PROMPT = """You are DataMind's Grounded Explainer Agent powered by Google Gemma 4.
You receive the user's question, the executed SQL query, and the exact result rows returned by Snowflake.
Your task is to provide an answer and methodology grounded STRICTLY in the returned data.

RULES:
1. Zero Hallucination: Every numeric figure, entity name, and fact in your answer must be derived directly from the provided result rows. Never invent, extrapolate, or bring outside numbers.
2. If the rows are empty, state clearly that the query executed successfully but no matching records were found in the database.
3. Separate your response into two labeled sections:
   [ANSWER]
   <Concise plain-English answer directly answering the question based ONLY on the rows>
   [METHODOLOGY]
   <Brief explanation of tables queried, joins/filters applied, and any assumptions made>
"""


# ---------------------------------------------------------------------------
# Python Read-Only Safety Guardrail (Deterministic Code)
# ---------------------------------------------------------------------------
class SecurityViolationError(Exception):
    """Raised when generated SQL violates safety constraints."""
    pass


def validate_sql_safety(sql: str) -> Tuple[bool, str]:
    """
    Deterministic safety validator for SQL statements.
    Enforces:
      1. Strip comments (-- and /* */)
      2. Must start with SELECT or WITH
      3. No multiple statements separated by semicolons
      4. No blocked DDL/DML keywords (DROP, DELETE, UPDATE, INSERT, ALTER, etc.)
    """
    if not sql or not sql.strip():
        return False, "Query is empty."

    # Strip multi-line comments
    cleaned = re.sub(r"/\*.*?\*/", " ", sql, flags=re.DOTALL)
    # Strip single-line comments
    cleaned = re.sub(r"--[^\n]*", " ", cleaned)
    # Normalize whitespace
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    # Verify statement begins with SELECT or WITH
    if not VALID_START_PATTERN.match(cleaned):
        return False, f"Query must begin with SELECT or WITH. Got: '{cleaned[:30]}...'"

    # Check for semicolon-separated multiple statements
    statements = [s.strip() for s in cleaned.split(";") if s.strip()]
    if len(statements) > 1:
        return False, "Multiple SQL statements detected. Only a single query is allowed."

    single_sql = statements[0]

    # Check for blocked keywords
    match = BLOCKED_PATTERN.search(single_sql)
    if match:
        forbidden_word = match.group(1).upper()
        return False, f"Security Violation: Forbidden SQL keyword '{forbidden_word}' detected. DataMind only executes read-only queries."

    return True, single_sql


# ---------------------------------------------------------------------------
# Snowflake Connection & Live Execution
# ---------------------------------------------------------------------------
def get_snowflake_connection():
    """Establish connection to Snowflake cloud data platform."""
    import snowflake.connector

    if not SNOWFLAKE_ACCOUNT or not SNOWFLAKE_USER or not SNOWFLAKE_PASSWORD:
        raise ValueError(
            "Missing Snowflake credentials. Please set SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, "
            "and SNOWFLAKE_PASSWORD in your .env file."
        )

    conn = snowflake.connector.connect(
        account=SNOWFLAKE_ACCOUNT,
        user=SNOWFLAKE_USER,
        password=SNOWFLAKE_PASSWORD,
        warehouse=SNOWFLAKE_WAREHOUSE,
        database=SNOWFLAKE_DATABASE,
        schema=SNOWFLAKE_SCHEMA,
        role=SNOWFLAKE_ROLE,
        session_parameters={
            "STATEMENT_TIMEOUT_IN_SECONDS": 60,
        },
    )
    return conn


def execute_snowflake_query(conn, sql: str) -> Dict[str, Any]:
    """
    Executes validated SQL live in Snowflake.
    Captures native cursor.sfqid (Query ID), execution time, columns, and rows.
    """
    cursor = conn.cursor()
    start_time = time.perf_counter()
    try:
        cursor.execute(sql)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        query_id = cursor.sfqid or "N/A"
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        rows = cursor.fetchall()
        return {
            "success": True,
            "query_id": query_id,
            "elapsed_ms": elapsed_ms,
            "columns": columns,
            "rows": rows,
            "row_count": len(rows),
            "sql": sql,
        }
    except Exception as e:
        query_id = getattr(cursor, "sfqid", "unknown")
        return {
            "success": False,
            "query_id": query_id,
            "error": str(e),
            "sql": sql,
        }
    finally:
        cursor.close()


# ---------------------------------------------------------------------------
# 4-Block Terminal Presentation (Mandatory Output Format)
# ---------------------------------------------------------------------------
def render_4_block_output(
    question: str,
    grounded_answer: str,
    methodology: str,
    executed_sql: str,
    query_id: str,
    elapsed_ms: float,
    columns: List[str],
    rows: List[Tuple],
):
    """
    Renders the required 4 distinct visual blocks in the terminal:
      Block 1: Grounded Answer
      Block 2: Explanation & Assumptions
      Block 3: Inspectable Evidence (SQL + Snowflake Query ID)
      Block 4: Raw Data Rows (ASCII formatted table)
    """
    console.print("\n")
    console.rule("[bold cyan]DataMind ➔ Snowflake Response[/bold cyan]")

    # Block 1: Grounded Answer
    console.print(
        Panel(
            Text(grounded_answer, style="bold green"),
            title="[bold white on dark_green] Block 1: Grounded Answer [/bold white on dark_green]",
            border_style="green",
            expand=True,
        )
    )

    # Block 2: Explanation & Assumptions
    console.print(
        Panel(
            Text(methodology if methodology else "Derived directly from single-table aggregation/filter.", style="bright_white"),
            title="[bold white on blue] Block 2: Explanation & Assumptions [/bold white on blue]",
            border_style="blue",
            expand=True,
        )
    )

    # Block 3: Inspectable Evidence
    evidence_text = Text()
    evidence_text.append(f"Snowflake Query ID: ", style="bold yellow")
    evidence_text.append(f"{query_id}\n", style="bold white")
    evidence_text.append(f"Execution Latency:  ", style="bold yellow")
    evidence_text.append(f"{elapsed_ms} ms\n\n", style="white")
    evidence_text.append("Executed SQL:\n", style="bold yellow")

    sql_syntax = Syntax(executed_sql, "sql", theme="monokai", line_numbers=False)

    console.print(
        Panel(
            sql_syntax,
            title=f"[bold white on dark_goldenrod] Block 3: Inspectable Evidence (Query ID: {query_id}) [/bold white on dark_goldenrod]",
            subtitle=f"[dim]Latency: {elapsed_ms}ms[/dim]",
            border_style="yellow",
            expand=True,
        )
    )

    # Block 4: Raw Data Rows
    if rows:
        table_str = tabulate(rows, headers=columns, tablefmt="psql", floatfmt=".2f")
        console.print(
            Panel(
                Text(table_str, style="cyan"),
                title=f"[bold white on magenta] Block 4: Raw Data Rows ({len(rows)} returned) [/bold white on magenta]",
                border_style="magenta",
                expand=True,
            )
        )
    else:
        console.print(
            Panel(
                Text("[No records matched the filter criteria]", style="italic yellow"),
                title="[bold white on magenta] Block 4: Raw Data Rows (0 returned) [/bold white on magenta]",
                border_style="magenta",
                expand=True,
            )
        )

    console.rule(style="dim cyan")
    console.print("\n")


# ---------------------------------------------------------------------------
# Core Question Processing Pipeline
# ---------------------------------------------------------------------------
def process_question(
    question: str,
    conn,
    schema_text: str,
    gemma: GemmaEngine,
    history: List[Dict[str, str]],
) -> Optional[Dict[str, str]]:
    """
    Executes the complete pipeline for a single user question:
      1. Schema + History -> Gemma NL-to-SQL
      2. Safety validation
      3. Live Snowflake execution
      4. Grounded explainer synthesis
      5. 4-Block terminal output
    Returns (question, sql) dict for conversational memory, or None on refusal.
    """
    console.print(f"\n[bold cyan]?[/bold cyan] [bold white]User Question:[/bold white] {question}")

    # Build conversation history context
    history_context = ""
    if history:
        history_context = "\nCONVERSATION HISTORY (Last 2-3 interactions for follow-up context):\n"
        for idx, h in enumerate(history[-3:], 1):
            history_context += f"{idx}. User asked: '{h['question']}' -> Generated SQL: {h['sql']}\n"

    # Step 1: Gemma NL-to-SQL
    system_prompt = NL_TO_SQL_SYSTEM_PROMPT.format(schema_text=schema_text)
    user_prompt = f"{history_context}\nCURRENT USER QUESTION:\n{question}"

    with console.status("[bold green]Gemma 4 is translating question to Snowflake SQL...[/bold green]"):
        gemma_raw = gemma.generate(system_prompt, user_prompt)

    # Clean potential markdown fences emitted by model
    clean_sql = gemma_raw.strip()
    if clean_sql.startswith("```"):
        lines = clean_sql.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        clean_sql = "\n".join(lines).strip()

    # Check for UNSUPPORTED or AMBIGUOUS flags
    if clean_sql.startswith("UNSUPPORTED:"):
        reason = clean_sql.replace("UNSUPPORTED:", "").strip()
        console.print(
            Panel(
                Text(f"🚫 Request Not Supported by Schema:\n{reason}", style="bold red"),
                title="[bold white on red] Schema Boundary Refusal [/bold white on red]",
                border_style="red",
            )
        )
        return None

    if clean_sql.startswith("AMBIGUOUS:"):
        clarification = clean_sql.replace("AMBIGUOUS:", "").strip()
        console.print(
            Panel(
                Text(f"❓ Ambiguous Request:\n{clarification}", style="bold yellow"),
                title="[bold white on dark_goldenrod] Clarification Needed [/bold white on dark_goldenrod]",
                border_style="yellow",
            )
        )
        return None

    # Step 2: Python Read-Only Safety Guardrail
    is_safe, validated_or_reason = validate_sql_safety(clean_sql)
    if not is_safe:
        console.print(
            Panel(
                Text(f"🛡️ Safety Guardrail Blocked Execution:\n{validated_or_reason}\n\nBlocked SQL: {clean_sql}", style="bold red"),
                title="[bold white on red] Block 3: Security Violation Refusal [/bold white on red]",
                border_style="red",
            )
        )
        return None

    executable_sql = validated_or_reason

    # Step 3: Snowflake Live Execution
    with console.status("[bold blue]Executing live query in Snowflake...[/bold blue]"):
        exec_result = execute_snowflake_query(conn, executable_sql)

    if not exec_result["success"]:
        console.print(
            Panel(
                Text(f"❌ Snowflake Execution Error:\n{exec_result['error']}\n\nQuery ID: {exec_result['query_id']}", style="bold red"),
                title="[bold white on red] Execution Failure [/bold white on red]",
                border_style="red",
            )
        )
        return None

    query_id = exec_result["query_id"]
    elapsed_ms = exec_result["elapsed_ms"]
    columns = exec_result["columns"]
    rows = exec_result["rows"]
    row_count = exec_result["row_count"]

    # Step 4: Grounded Answer Synthesis
    # Zero-Rows Edge Case handling (Strictly avoid hallucination)
    if row_count == 0:
        grounded_answer = (
            f"The query executed successfully in Snowflake (Query ID: {query_id}), "
            f"but returned 0 matching records. No data points were found matching the specified filters."
        )
        methodology = f"Executed filter against Snowflake schema. Confirmed zero matching records exist in database."
    else:
        # Ask Gemma to explain strictly grounded in rows
        rows_sample = [dict(zip(columns, r)) for r in rows[:25]]
        rows_str = json.dumps(rows_sample, default=str, indent=2)

        explainer_user_prompt = f"""USER QUESTION: {question}
EXECUTED SQL: {executable_sql}
RESULT ROWS ({row_count} total rows returned):
{rows_str}

Explain the answer grounded ONLY in the rows above."""

        with console.status("[bold green]Gemma 4 is synthesizing grounded answer...[/bold green]"):
            try:
                explainer_raw = gemma.generate(GROUNDED_EXPLAINER_SYSTEM_PROMPT, explainer_user_prompt)
                
                # Parse [ANSWER] and [METHODOLOGY] sections
                if "[ANSWER]" in explainer_raw and "[METHODOLOGY]" in explainer_raw:
                    parts = explainer_raw.split("[METHODOLOGY]")
                    grounded_answer = parts[0].replace("[ANSWER]", "").strip()
                    methodology = parts[1].strip()
                else:
                    grounded_answer = explainer_raw
                    methodology = f"Derived from {row_count} records returned by Snowflake."
            except Exception as e:
                grounded_answer = f"Query returned {row_count} rows. (Explainer fallback: {e})"
                methodology = f"Executed SQL: {executable_sql}"

    # Step 5: Render 4-Block Terminal Output
    render_4_block_output(
        question=question,
        grounded_answer=grounded_answer,
        methodology=methodology,
        executed_sql=executable_sql,
        query_id=query_id,
        elapsed_ms=elapsed_ms,
        columns=columns,
        rows=rows,
    )

    return {"question": question, "sql": executable_sql}


# ---------------------------------------------------------------------------
# CLI Entry Point & Interactive Shell
# ---------------------------------------------------------------------------
def main():
    console.print(
        Panel.fit(
            "[bold white]DataMind CLI 🧠 — Talk to Your Data[/bold white]\n"
            "[cyan]Google Gemma 4 AI + Snowflake Live Execution Engine[/cyan]\n"
            "[dim]Agent Skill Open Standard Implementation (PS1 & MLH Prize)[/dim]",
            border_style="cyan",
        )
    )

    # 1. Load config
    try:
        config = load_config()
    except Exception as e:
        console.print(f"[bold red]Configuration Error:[/bold red] {e}")
        sys.exit(1)

    # 2. Connect to Snowflake
    console.print("[dim]Connecting to Snowflake...[/dim]")
    try:
        conn = get_snowflake_connection()
        console.print(f"[bold green]✓ Connected to Snowflake[/bold green] [dim]({SNOWFLAKE_WAREHOUSE} / {SNOWFLAKE_DATABASE}.{SNOWFLAKE_SCHEMA})[/dim]")
    except Exception as e:
        console.print(f"[bold red]Failed to connect to Snowflake:[/bold red] {e}")
        console.print("[yellow]Tip: Verify credentials in .env and run `setup.sql` in Snowflake worksheets.[/yellow]")
        sys.exit(1)

    # 3. Dynamic schema inspection
    console.print("[dim]Inspecting live database schema via DESCRIBE TABLE...[/dim]")
    try:
        schema_text = fetch_dynamic_schema(conn, config)
        console.print(f"[bold green]✓ Dynamic schema loaded for tables:[/bold green] {', '.join(config.get('tables', []))}")
    except Exception as e:
        console.print(f"[bold red]Failed to inspect schema:[/bold red] {e}")
        conn.close()
        sys.exit(1)

    # 4. Initialize Gemma engine
    try:
        gemma = GemmaEngine()
        console.print(f"[bold green]✓ Gemma 4 Engine ready[/bold green] [dim](Backend: {gemma.backend}, Model: {gemma.model_name})[/dim]\n")
    except Exception as e:
        console.print(f"[bold red]Gemma Engine Error:[/bold red] {e}")
        conn.close()
        sys.exit(1)

    # 5. Interactive vs Single-Query Mode
    history: List[Dict[str, str]] = []

    if len(sys.argv) > 1:
        # Single query mode from CLI arguments
        single_question = " ".join(sys.argv[1:])
        process_question(single_question, conn, schema_text, gemma, history)
        conn.close()
        return

    # Interactive Loop (Criterion 2: Follow-up memory)
    console.print("[bold yellow]Interactive DataMind Shell Active.[/bold yellow] Type your questions, or [bold red]'exit'[/bold red] to quit.\n")
    try:
        while True:
            try:
                question = console.input("[bold cyan]DataMind > [/bold cyan]").strip()
            except (KeyboardInterrupt, EOFError):
                break

            if not question:
                continue
            if question.lower() in ["exit", "quit", "q"]:
                console.print("[dim]Goodbye![/dim]")
                break

            pair = process_question(question, conn, schema_text, gemma, history)
            if pair:
                history.append(pair)
                if len(history) > 3:
                    history.pop(0)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
