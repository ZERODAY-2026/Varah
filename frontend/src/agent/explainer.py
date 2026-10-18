import json
from pathlib import Path
from typing import Dict, Any, List
from src.gemma_client import GemmaClient

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "explainer_system.txt"

class Explainer:
    def __init__(self, gemma_client: GemmaClient = None):
        self.gemma = gemma_client or GemmaClient()
        with open(PROMPT_PATH, "r", encoding="utf-8") as f:
            self.system_prompt = f.read()

    def explain(
        self,
        question: str,
        sql: str,
        rows: List[Dict[str, Any]],
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate grounded natural-language explanation derived ONLY from returned rows."""
        user_prompt = (
            f"USER QUESTION: {question}\n\n"
            f"EXECUTED SQL: {sql}\n\n"
            f"SNOWFLAKE RESULT ROWS (JSON):\n{json.dumps(rows[:100], indent=2)}\n\n"
            f"METADATA: row_count={len(rows)}, query_id={metadata.get('query_id')}, elapsed_ms={metadata.get('elapsed_ms')}\n\n"
            f"Return strict JSON following the explainer prompt rules."
        )

        try:
            return self.gemma.generate_json(self.system_prompt, user_prompt)
        except Exception as e:
            # Deterministic fallback if Gemma generation errors out
            if not rows:
                return {
                    "answer": f"The query executed successfully in Snowflake, but returned 0 rows. No matching records found.",
                    "how_i_got_this": ["Executed validated query against Snowflake", "Returned 0 matching records"],
                    "assumptions": ["Filter parameters matched no rows"],
                    "data_gaps": ["Empty result set returned"],
                    "evidence_refs": [],
                    "confidence": "high",
                    "confidence_reason": "Direct reflection of empty row count."
                }
            
            return {
                "answer": f"Query returned {len(rows)} record(s). First record values: {', '.join([f'{k}={v}' for k, v in list(rows[0].items())[:4]])}.",
                "how_i_got_this": ["Retrieved rows from Snowflake", "Extracted column values directly"],
                "assumptions": ["Grounded directly in returned rows"],
                "data_gaps": [],
                "evidence_refs": [{"claim": "Data extracted from rows", "rows": [0], "columns": list(rows[0].keys())}],
                "confidence": "high",
                "confidence_reason": "Extracted directly from query results."
            }

