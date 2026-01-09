"""
JSON Cleaner Utility - Enterprise Grade
Extracts and sanitizes JSON from LLM outputs that may contain markdown, thought tags, etc.
"""

import re
import json
from typing import Optional, Tuple, Any

def extract_json_from_text(text: str) -> Tuple[Optional[dict | list], str, Optional[str]]:
    """
    Extract JSON from text that may contain markdown, thought tags, or other content.
    
    Returns:
        Tuple of (parsed_json, cleaned_text, error_message)
        - parsed_json: The extracted JSON object/list, or None if extraction failed
        - cleaned_text: The cleaned text that was attempted to parse
        - error_message: Error description if parsing failed, None otherwise
    """
    if not text or not text.strip():
        return None, "", "Empty input text"
    
    original_text = text
    
    # Step 1: Remove thought tags (DeepSeek reasoning)
    text = re.sub(r'<thought>.*?</thought>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL | re.IGNORECASE)
    
    # Step 2: Remove markdown code block markers
    text = re.sub(r'^```json\s*\n?', '', text, flags=re.MULTILINE)
    text = re.sub(r'^```\s*\n?', '', text, flags=re.MULTILINE)
    text = re.sub(r'\n?```$', '', text, flags=re.MULTILINE)
    
    # Step 3: Try to find JSON array or object
    # Look for the outermost [ ] or { }
    
    # First, try direct parse after cleaning
    cleaned = text.strip()
    try:
        parsed = json.loads(cleaned)
        return parsed, cleaned, None
    except json.JSONDecodeError:
        pass
    
    # Try to find JSON block using regex
    # Match outermost { } or [ ]
    json_patterns = [
        r'(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})',  # Simple nested objects
        r'(\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\])',  # Simple nested arrays
        r'(\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})',  # More complex nesting
        r'(\[(?:[^\[\]]|\[(?:[^\[\]]|\[[^\[\]]*\])*\])*\])',  # More complex arrays
    ]
    
    for pattern in json_patterns:
        matches = re.findall(pattern, cleaned, re.DOTALL)
        for match in matches:
            try:
                parsed = json.loads(match)
                return parsed, match, None
            except json.JSONDecodeError:
                continue
    
    # Last resort: find first { and last } or first [ and last ]
    brace_start = cleaned.find('{')
    brace_end = cleaned.rfind('}')
    bracket_start = cleaned.find('[')
    bracket_end = cleaned.rfind(']')
    
    attempts = []
    if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
        attempts.append(cleaned[brace_start:brace_end + 1])
    if bracket_start != -1 and bracket_end != -1 and bracket_end > bracket_start:
        attempts.append(cleaned[bracket_start:bracket_end + 1])
    
    for attempt in attempts:
        try:
            parsed = json.loads(attempt)
            return parsed, attempt, None
        except json.JSONDecodeError as e:
            last_error = str(e)
    
    # All attempts failed
    return None, cleaned, f"Could not extract valid JSON: {last_error if 'last_error' in dir() else 'No JSON structure found'}"


def safe_parse_json(text: str) -> dict:
    """
    Safely parse JSON with fallback to raw text.
    
    Returns a dict with:
    - success: bool
    - data: parsed JSON or None
    - raw_text: original text
    - error: error message if failed
    """
    parsed, cleaned, error = extract_json_from_text(text)
    
    if parsed is not None:
        return {
            "success": True,
            "data": parsed,
            "raw_text": text,
            "error": None
        }
    else:
        return {
            "success": False,
            "data": None,
            "raw_text": text,
            "error": error
        }


def clean_for_display(text: str, max_length: int = 2000) -> str:
    """
    Clean raw LLM output for user display.
    Removes technical artifacts but keeps the content readable.
    """
    # Remove thought tags
    text = re.sub(r'<thought>.*?</thought>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL | re.IGNORECASE)
    
    # Remove code block markers
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```', '', text)
    
    # Normalize whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = text.strip()
    
    # Truncate if needed
    if len(text) > max_length:
        text = text[:max_length] + "...[truncado]"
    
    return text
