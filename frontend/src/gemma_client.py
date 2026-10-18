import os
import json
import time
import re
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

class GemmaClient:
    def __init__(self):
        self.model = os.getenv("GEMMA_MODEL", "gemma3:4b")
        self.host = os.getenv("OLLAMA_HOST", "http://localhost:11434")

    def generate_json(self, system_prompt: str, user_prompt: str, max_retries: int = 2) -> Dict[str, Any]:
        """
        Generate structured JSON output using Google Gemma on Ollama at temperature 0.
        Retries up to max_retries if response is not valid JSON.
        """
        import ollama
        client = ollama.Client(host=self.host)
        
        last_error = None
        for attempt in range(max_retries + 1):
            start = time.time()
            try:
                response = client.chat(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    options={"temperature": 0.0},
                    format="json"
                )
                elapsed_ms = int((time.time() - start) * 1000)
                content = response['message']['content'].strip()
                
                # Clean markdown json blocks if present
                cleaned = re.sub(r"^```json\s*", "", content, flags=re.IGNORECASE)
                cleaned = re.sub(r"\s*```$", "", cleaned)
                
                parsed = json.loads(cleaned)
                parsed["_latency_ms"] = elapsed_ms
                parsed["_model"] = self.model
                return parsed
            except Exception as e:
                last_error = e
                # Retry prompt with error note
                user_prompt = f"{user_prompt}\n\n[Previous attempt failed to parse as valid JSON. Return ONLY strict JSON without markdown formatting. Error: {str(e)}]"
        
        raise RuntimeError(f"Gemma failed to produce valid JSON after {max_retries} retries: {str(last_error)}")

