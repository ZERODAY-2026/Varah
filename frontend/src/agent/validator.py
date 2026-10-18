import re
from typing import Tuple, Optional

DISALLOWED_KEYWORDS = [
    'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'DROP', 'ALTER', 'CREATE',
    'TRUNCATE', 'GRANT', 'REVOKE', 'COPY', 'PUT', 'GET', 'CALL',
    'EXECUTE', 'USE', 'SET', 'UNSET'
]

def validate_sql(raw_sql: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Deterministic SQL safety validation enforcing non-negotiable PS1 rules:
    Rule 1: Strip comments and normalize whitespace
    Rule 2: Must match ^\\s*(SELECT|WITH)\\b
    Rule 3: Exactly one statement (no ;-separated multiples)
    Rule 4: Reject disallowed DDL/DML keywords
    Rule 5: Auto-append LIMIT 1000 if not present
    Rule 6: Reject empty SQL
    
    Returns (passed, normalized_sql, rejection_reason).
    """
    if not raw_sql or not raw_sql.strip():
        return False, None, "Rule 6: SQL query string is empty."

    # Rule 1: Strip comments
    cleaned = re.sub(r"--.*$", "", raw_sql, flags=re.MULTILINE)
    cleaned = re.sub(r"/\*[\s\S]*?\*/", "", cleaned)
    cleaned = cleaned.strip()

    # Normalize internal whitespace
    cleaned = re.sub(r"\s+", " ", cleaned)

    if not cleaned:
        return False, None, "Rule 6: SQL is empty after stripping comments."

    # Rule 3: Single statement check
    without_trailing = re.sub(r";\s*$", "", cleaned)
    if ";" in without_trailing:
        return False, None, "Rule 3: Multiple statements detected. Semicolon-separated compound queries are prohibited."

    # Rule 2: Must start with SELECT or WITH
    if not re.match(r"^\s*(SELECT|WITH)\b", cleaned, re.IGNORECASE):
        return False, None, "Rule 2: Only read-only SELECT or WITH statements are allowed."

    # Rule 4: Disallowed keywords with word boundaries
    for kw in DISALLOWED_KEYWORDS:
        pattern = rf"\b{kw}\b"
        if re.search(pattern, cleaned, re.IGNORECASE):
            return False, None, f"Rule 4: Disallowed keyword '{kw}' detected. DDL/DML modifications are strictly forbidden."

    # Rule 5: Auto-append LIMIT 1000 if no LIMIT is present
    if not re.search(r"\bLIMIT\s+\d+", without_trailing, re.IGNORECASE):
        normalized = f"{without_trailing} LIMIT 1000;"
    else:
        normalized = f"{without_trailing};"

    return True, normalized, None

