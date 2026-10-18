import os
import time
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()

class SnowflakeClient:
    def __init__(self):
        self.account = os.getenv("SNOWFLAKE_ACCOUNT", "")
        self.user = os.getenv("SNOWFLAKE_USER", "")
        self.password = os.getenv("SNOWFLAKE_PASSWORD", "")
        self.warehouse = os.getenv("SNOWFLAKE_WAREHOUSE", "COMPUTE_WH")
        self.database = os.getenv("SNOWFLAKE_DATABASE", "DATAMIND_DB")
        self.schema = os.getenv("SNOWFLAKE_SCHEMA", "PUBLIC")
        self.role = os.getenv("SNOWFLAKE_ROLE", None)

    def connect(self):
        import snowflake.connector
        connect_kwargs = {
            "account": self.account,
            "user": self.user,
            "password": self.password,
            "warehouse": self.warehouse,
            "database": self.database,
            "schema": self.schema,
        }
        if self.role:
            connect_kwargs["role"] = self.role
        return snowflake.connector.connect(**connect_kwargs)

    def execute(self, sql: str) -> Dict[str, Any]:
        """Execute validated SQL query against Snowflake. Returns rows, columns, query_id, elapsed_ms."""
        start_time = time.time()
        
        try:
            conn = self.connect()
            cursor = conn.cursor()
            
            # Enforce 60s timeout
            cursor.execute("ALTER SESSION SET STATEMENT_TIMEOUT_IN_SECONDS = 60;")
            
            cursor.execute(sql)
            query_id = cursor.sfqid or "unknown"
            
            columns = [col[0] for col in cursor.description] if cursor.description else []
            raw_rows = cursor.fetchall()
            
            # Convert to dict list
            dict_rows = [dict(zip(columns, row)) for row in raw_rows]
            elapsed_ms = int((time.time() - start_time) * 1000)
            
            cursor.close()
            conn.close()
            
            return {
                "rows": dict_rows,
                "columns": columns,
                "query_id": query_id,
                "elapsed_ms": elapsed_ms,
                "warehouse": self.warehouse,
                "database": self.database,
                "schema": self.schema,
                "role": self.role or "DEFAULT",
                "row_count": len(dict_rows)
            }
        except Exception as e:
            elapsed_ms = int((time.time() - start_time) * 1000)
            raise RuntimeError(f"Snowflake execution error ({elapsed_ms}ms): {str(e)}")
