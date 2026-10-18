
import os

from pathlib import Path
from typing import Dict, Any
from src.config_loader import load_dataset_config, format_schema_text, format_few_shots
from src.gemma_client import GemmaClient

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "planner_system.txt"


class Planner:
    def __init__(self, gemma_client: GemmaClient = None):
        self.gemma = gemma_client or GemmaClient()
        with open(PROMPT_PATH, "r", encoding="utf-8") as f:
            self.system_template = f.read()

    def plan(self, question: str, dataset_id: str = "owid") -> Dict[str, Any]:
        """Generate execution plan from user question via Google Gemma."""
        config = load_dataset_config(dataset_id)
        schema_text = format_schema_text(config)
        few_shots = format_few_shots(config)
        glossary_text = "\n".join(
            [f"{k}: {v}" for k, v in config.get("glossary", {}).items()]
        )

        system_prompt = self.system_template.format(
            schema_text=schema_text,
            glossary=glossary_text,
            few_shot_examples=few_shots,
            question=question
        )

        user_prompt = f"USER QUESTION: {question}\nGenerate planning JSON."

        return self.gemma.generate_json(system_prompt, user_prompt)


if __name__ == "__main__":
    import sys

    q = sys.argv[1] if len(sys.argv) > 1 else "Which country had the highest GDP per capita in 2019?"
    p = Planner()
    print(p.plan(q))
