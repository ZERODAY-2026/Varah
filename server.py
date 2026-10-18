import json
from pathlib import Path
from typing import Any

import yaml
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from scripts.ask_data import SESSION_FILE, run_datamind_pipeline

ROOT_DIR = Path(__file__).resolve().parent
EVAL_FILE = ROOT_DIR / "tests" / "eval_questions.yaml"

app = FastAPI(title="Varah DataMind API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:4173",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class AskRequest(BaseModel):
    question: str


def load_session() -> dict[str, Any]:
    if not SESSION_FILE.is_file():
        raise HTTPException(
            status_code=503,
            detail="Varah is not initialized. Run scripts/ask_data.py --init first.",
        )
    try:
        return json.loads(SESSION_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=503, detail="Varah session configuration is invalid.") from exc


@app.get("/health")
def health_check() -> dict[str, Any]:
    return {
        "status": "healthy",
        "initialized": SESSION_FILE.is_file(),
        "service": "Varah DataMind API",
    }


@app.get("/eval/questions")
def evaluation_questions() -> list[dict[str, Any]]:
    if not EVAL_FILE.is_file():
        raise HTTPException(status_code=404, detail="Evaluation question file was not found.")
    try:
        questions = yaml.safe_load(EVAL_FILE.read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as exc:
        raise HTTPException(status_code=500, detail="Evaluation questions could not be loaded.") from exc
    if not isinstance(questions, list):
        raise HTTPException(status_code=500, detail="Evaluation question file must contain a list.")
    return questions


@app.post("/ask")
def ask(request: AskRequest) -> dict[str, Any]:
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=422, detail="Question must not be empty.")

    session = load_session()
    try:
        result = run_datamind_pipeline(
            question,
            session.get("sf_config", {}),
            session.get("ai_config", {}),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return result


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=False)