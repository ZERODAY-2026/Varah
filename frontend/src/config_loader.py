import os
import yaml
from pathlib import Path
from typing import Dict, Any

CONFIG_DIR = Path(__file__).resolve().parent.parent / "config" / "datasets"

def load_dataset_config(dataset_id: str = "owid") -> Dict[str, Any]:
    """Load dataset YAML configuration by id (owid or wine_quality)."""
    cfg_file = CONFIG_DIR / f"{dataset_id}.yaml"
    if not cfg_file.exists():
        raise FileNotFoundError(f"Dataset config not found: {cfg_file}")
    
    with open(cfg_file, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def format_schema_text(config: Dict[str, Any]) -> str:
    """Format dataset columns into a readable text schema for Gemma prompt."""
    lines = [f"Table: {config.get('table_name')}"]
    lines.append("Columns:")
    for col in config.get("columns", []):
        sample = f" (e.g. {col.get('sample_value')})" if "sample_value" in col else ""
        lines.append(f"  - {col.get('name')} ({col.get('type')}): {col.get('description')}{sample}")
    return "\n".join(lines)

def format_few_shots(config: Dict[str, Any]) -> str:
    """Format few-shot Q->SQL pairs for prompt."""
    examples = config.get("few_shot_examples", [])
    chunks = []
    for ex in examples:
        chunks.append(f"Question: {ex.get('question')}\nSQL: {ex.get('sql')}")
    return "\n\n".join(chunks)

