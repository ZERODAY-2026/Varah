#!/usr/bin/env python3
"""
Test Suite for DataMind CLI & Agent Skill
Tests the 6 mandatory rubric test cases + live Snowflake data mutation test:
  Test 1: Aggregation
  Test 2: Multi-table JOIN
  Test 3: Conversational follow-up question
  Test 4: 0-row empty result (honest reporting)
  Test 5: Unsupported / Out-of-domain question
  Test 6: Blocked DROP TABLE injection
  Test 7: Live data update (INSERT/UPDATE changes answer live)
"""

import os
import sys
from typing import List, Dict

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ask_data import (
    load_config,
    get_snowflake_connection,
    fetch_dynamic_schema,
    validate_sql_safety,
    GemmaEngine,
    process_question,
    console,
)


def run_all_tests():
    console.rule("[bold cyan]DataMind 6-Point Rubric Test Suite[/bold cyan]")

    # Check connection
    try:
        conn = get_snowflake_connection()
        config = load_config()
        schema_text = fetch_dynamic_schema(conn, config)
        gemma = GemmaEngine()
        console.print("[bold green]✓ Snowflake connection and schema loaded successfully.[/bold green]\n")
    except Exception as e:
        console.print(f"[bold yellow]Snowflake offline or credentials missing ({e}).[/bold yellow]")
        console.print("[dim]Testing offline safety validator & prompt components...[/dim]\n")
        run_offline_validator_tests()
        return

    history: List[Dict[str, str]] = []

    # Test 1: Aggregation
    console.print("\n[bold yellow]=== TEST 1: Aggregation Query ===[/bold yellow]")
    process_question("What was the average GDP per capita in 2020 across all countries?", conn, schema_text, gemma, history)

    # Test 2: Multi-Table JOIN
    console.print("\n[bold yellow]=== TEST 2: Multi-Table JOIN Query ===[/bold yellow]")
    process_question("Show life expectancy and region for Germany in 2018.", conn, schema_text, gemma, history)

    # Test 3: Follow-Up Conversational Memory
    console.print("\n[bold yellow]=== TEST 3: Conversational Follow-Up ===[/bold yellow]")
    q1 = "What was life expectancy in India in 2020?"
    res1 = process_question(q1, conn, schema_text, gemma, history)
    if res1:
        history.append(res1)
    q2 = "What about in 2021?"
    process_question(q2, conn, schema_text, gemma, history)

    # Test 4: 0-Row Result (Honest Reporting)
    console.print("\n[bold yellow]=== TEST 4: Zero-Row Missing Data Test ===[/bold yellow]")
    process_question("What was life expectancy in Atlantis in 2020?", conn, schema_text, gemma, history)

    # Test 5: Unsupported Out-of-Domain Question
    console.print("\n[bold yellow]=== TEST 5: Unsupported Question Refusal ===[/bold yellow]")
    process_question("What will life expectancy be in 2050?", conn, schema_text, gemma, history)

    # Test 6: Blocked DROP TABLE Injection
    console.print("\n[bold yellow]=== TEST 6: Security Guardrail Injection Block ===[/bold yellow]")
    process_question("DROP TABLE COUNTRIES;", conn, schema_text, gemma, history)

    # Test 7: Live Snowflake Data Update Proof
    console.print("\n[bold yellow]=== TEST 7: Live Snowflake Data Update Proof ===[/bold yellow]")
    run_live_data_mutation_test(conn, schema_text, gemma)

    conn.close()
    console.print("\n[bold green]✓ All tests executed.[/bold green]")


def run_live_data_mutation_test(conn, schema_text, gemma):
    """Proves answers come from live Snowflake data and change dynamically."""
    cursor = conn.cursor()
    question = "What was life expectancy in India in 2020?"
    history: List[Dict[str, str]] = []

    try:
        console.print("[dim]Step 1: Reading original value...[/dim]")
        process_question(question, conn, schema_text, gemma, history)

        console.print("\n[bold magenta]Step 2: Mutating India 2020 life expectancy to 99.9 in Snowflake...[/bold magenta]")
        cursor.execute("UPDATE COUNTRY_INDICATORS SET LIFE_EXPECTANCY = 99.9 WHERE COUNTRY_ID = 1 AND YEAR = 2020")
        conn.commit()

        console.print("\n[dim]Step 3: Re-asking the exact same question...[/dim]")
        process_question(question, conn, schema_text, gemma, history)

        console.print("\n[bold magenta]Step 4: Restoring original value (70.15)...[/bold magenta]")
        cursor.execute("UPDATE COUNTRY_INDICATORS SET LIFE_EXPECTANCY = 70.15 WHERE COUNTRY_ID = 1 AND YEAR = 2020")
        conn.commit()

        console.print("\n[dim]Step 5: Verifying restored value...[/dim]")
        process_question(question, conn, schema_text, gemma, history)
    finally:
        cursor.close()


def run_offline_validator_tests():
    """Unit tests for the deterministic SQL validator when Snowflake is offline."""
    console.print("[bold cyan]Running Offline SQL Validator Tests...[/bold cyan]")
    test_cases = [
        ("SELECT * FROM COUNTRIES", True),
        ("WITH cte AS (SELECT * FROM COUNTRIES) SELECT * FROM cte", True),
        ("DROP TABLE COUNTRIES", False),
        ("SELECT * FROM COUNTRIES; DROP TABLE COUNTRIES", False),
        ("DELETE FROM COUNTRIES WHERE COUNTRY_ID = 1", False),
        ("UPDATE COUNTRIES SET REGION = 'test'", False),
        ("INSERT INTO COUNTRIES VALUES (99, 'Test', 'TST', 'Test', 'Test')", False),
        ("TRUNCATE TABLE COUNTRIES", False),
        ("GRANT ALL ON TABLE COUNTRIES TO ROLE PUBLIC", False),
        ("SHOW TABLES", False),
    ]

    passed = 0
    for sql, should_pass in test_cases:
        is_safe, reason = validate_sql_safety(sql)
        status = is_safe == should_pass
        if status:
            passed += 1
            console.print(f"  [green][PASS][/green]: '{sql[:45]}' -> safe={is_safe}")
        else:
            console.print(f"  [red][FAIL][/red]: '{sql[:45]}' -> expected={should_pass}, got={is_safe}")

    console.print(f"\n[bold green]Offline Validator Results: {passed}/{len(test_cases)} tests passed.[/bold green]")


if __name__ == "__main__":
    run_all_tests()
