from typing import Dict, Any, Tuple
from src.agent.validator import validate_sql
from src.snowflake_client import SnowflakeClient
from src.gemma_client import GemmaClient

class Executor:
    def __init__(self, snowflake_client: SnowflakeClient = None, gemma_client: GemmaClient = None):
        self.snowflake = snowflake_client or SnowflakeClient()
        self.gemma = gemma_client or GemmaClient()

    def execute(self, raw_sql: str, retry_count: int = 1) -> Dict[str, Any]:
        """
        Validate and execute SQL in Snowflake.
        If validation fails, rejects immediately with machine-readable reason.
        If Snowflake returns syntax/schema error, allows 1 repair attempt via Gemma.
        """
        passed, normalized_sql, rejection_reason = validate_sql(raw_sql)
        if not passed:
            return {
                "success": False,
                "error_type": "VALIDATION_FAILED",
                "reason": rejection_reason,
                "sql": raw_sql
            }

        try:
            exec_res = self.snowflake.execute(normalized_sql)
            exec_res["success"] = True
            exec_res["sql"] = normalized_sql
            return exec_res
        except Exception as e:
            if retry_count > 0:
                # Attempt Gemma SQL repair
                repaired_sql = self._repair_sql(normalized_sql, str(e))
                if repaired_sql and repaired_sql != normalized_sql:
                    return self.execute(repaired_sql, retry_count=retry_count - 1)

            return {
                "success": False,
                "error_type": "SNOWFLAKE_ERROR",
                "reason": str(e),
                "sql": normalized_sql
            }

    def _repair_sql(self, failed_sql: str, error_msg: str) -> str:
        prompt = (
            f"The following Snowflake SQL query failed with error:\n"
            f"SQL: {failed_sql}\n"
            f"Error: {error_msg}\n\n"
            f"Fix the Snowflake SQL syntax error. Return strict JSON with key 'sql': '...'"
        )
        try:
            res = self.gemma.generate_json("You are a Snowflake SQL repair expert.", prompt)
            return res.get("sql", failed_sql)
        except Exception:
            return failed_sql

