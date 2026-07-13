-- Migration 012: 3 realistic AI engineer interview exercises
-- Run in Supabase SQL Editor

-- ─── Exercise 8: Implement Retry with Exponential Backoff ─────────────────────
-- Tested at: Anthropic, OpenAI, Cohere, virtually every AI company
-- Skill: API reliability, production engineering

INSERT INTO public.exercises (role_track, title, task_description, starter_code, language, reference_solution_notes, test_cases, explanation_required, difficulty)
VALUES (
  'ai_engineer',
  'Implement Retry with Exponential Backoff',
  E'You are building a wrapper around an LLM API client. The `call_llm` function sometimes raises `RateLimitError` or `ServerError` — transient failures that should be retried.\n\n**Your task:** Complete `call_with_retry` so that it:\n1. Retries up to `max_retries` times on `RateLimitError` or `ServerError`\n2. Waits `base_delay * (2 ** attempt)` seconds between retries (exponential backoff)\n3. Adds random jitter of 0–1 second to each wait (use `random.uniform(0, 1)`)\n4. Raises the last exception if all retries are exhausted\n5. Immediately raises any other exception type (do not retry `ValueError`, etc.)\n\n**Constraints:**\n- Use `time.sleep()` for waiting\n- `attempt` counts from 0 (first retry waits `base_delay * 1`, second waits `base_delay * 2`, etc.)\n- Do not modify the exception classes or `call_llm` stub',
  E'import time\nimport random\n\nclass RateLimitError(Exception): pass\nclass ServerError(Exception): pass\n\ndef call_llm(prompt: str) -> str:\n    """Stub — replaced by test harness with controlled failure sequences."""\n    raise NotImplementedError\n\ndef call_with_retry(\n    prompt: str,\n    max_retries: int = 3,\n    base_delay: float = 1.0,\n) -> str:\n    """\n    Call call_llm with exponential backoff retry on RateLimitError / ServerError.\n    Raises the last exception after max_retries attempts.\n    Immediately re-raises any other exception type.\n    """\n    # TODO: implement retry logic\n    return call_llm(prompt)\n',
  'python',
  E'Correct implementation:\n```python\ndef call_with_retry(prompt, max_retries=3, base_delay=1.0):\n    last_exc = None\n    for attempt in range(max_retries):\n        try:\n            return call_llm(prompt)\n        except (RateLimitError, ServerError) as e:\n            last_exc = e\n            wait = base_delay * (2 ** attempt) + random.uniform(0, 1)\n            time.sleep(wait)\n        except Exception:\n            raise\n    raise last_exc\n```\nKey points: (1) retry loop runs max_retries times, not max_retries+1; (2) only catch RateLimitError/ServerError, re-raise everything else immediately; (3) base_delay * 2**attempt gives 1x, 2x, 4x delays; (4) must raise last_exc after exhausting retries, not a new exception.',
  '[
    {
      "name": "succeeds on first try",
      "function": "call_with_retry",
      "setup": "call_count = [0]\ndef call_llm(p):\n    call_count[0] += 1\n    return \"ok\"",
      "call": "call_with_retry(\"test\")",
      "expected": "ok",
      "visible": true
    },
    {
      "name": "retries on RateLimitError and succeeds",
      "function": "call_with_retry",
      "setup": "import time\ntime.sleep = lambda s: None\nimport random\nrandom.uniform = lambda a, b: 0\ncall_count = [0]\ndef call_llm(p):\n    call_count[0] += 1\n    if call_count[0] < 3:\n        raise RateLimitError(\"rate limited\")\n    return \"success after retry\"",
      "call": "call_with_retry(\"test\", max_retries=3, base_delay=0)",
      "expected": "success after retry",
      "visible": true
    },
    {
      "name": "raises after max_retries exhausted",
      "function": "call_with_retry",
      "setup": "import time\ntime.sleep = lambda s: None\nimport random\nrandom.uniform = lambda a, b: 0\ndef call_llm(p):\n    raise ServerError(\"server down\")",
      "call": "call_with_retry(\"test\", max_retries=3, base_delay=0)",
      "expected_exception": "ServerError",
      "visible": true
    },
    {
      "name": "does not retry on ValueError",
      "function": "call_with_retry",
      "setup": "import time\ntime.sleep = lambda s: None\nimport random\nrandom.uniform = lambda a, b: 0\ncall_count = [0]\ndef call_llm(p):\n    call_count[0] += 1\n    raise ValueError(\"bad input\")",
      "call": "call_with_retry(\"test\", max_retries=3, base_delay=0)",
      "expected_exception": "ValueError",
      "expected_call_count": 1,
      "visible": true
    },
    {
      "name": "uses exponential backoff delays (hidden)",
      "function": "call_with_retry",
      "setup": "import random\nrandom.uniform = lambda a, b: 0\nslept = []\nimport time\ntime.sleep = lambda s: slept.append(s)\ncall_count = [0]\ndef call_llm(p):\n    call_count[0] += 1\n    if call_count[0] <= 3:\n        raise RateLimitError(\"limit\")\n    return \"done\"",
      "call": "call_with_retry(\"test\", max_retries=4, base_delay=1.0); slept",
      "expected": "[1.0, 2.0, 4.0]",
      "visible": false
    }
  ]',
  true,
  'medium'
);


-- ─── Exercise 9: Parse Structured LLM Output ──────────────────────────────────
-- Tested at: OpenAI, Anthropic, AI startups using structured output without function calling
-- Skill: Output parsing, reliability engineering

INSERT INTO public.exercises (role_track, title, task_description, starter_code, language, reference_solution_notes, test_cases, explanation_required, difficulty)
VALUES (
  'ai_engineer',
  'Parse Structured LLM Output',
  E'LLMs frequently return JSON wrapped in markdown code fences, extra prose, or with minor formatting issues. You need a robust parser that handles the messy reality of real LLM responses.\n\n**Your task:** Implement `extract_json(text: str) -> dict` that:\n1. Extracts and parses the first valid JSON object from `text`\n2. Handles these common LLM output patterns:\n   - Plain JSON: `{"key": "value"}`\n   - JSON in a markdown fence: ` ```json\\n{...}\\n``` ` or ` ```\\n{...}\\n``` `\n   - JSON preceded/followed by prose: `"Here is the result: {"key": "value"} Hope that helps!"`\n   - Nested objects and arrays inside the JSON\n3. Returns the parsed dict\n4. Raises `ValueError("No valid JSON found")` if no valid JSON object exists in the text\n\n**Constraints:**\n- Use only the Python standard library (`json`, `re`)\n- Must handle both ` ```json ` and ` ``` ` fence formats\n- Only extract objects `{...}` — not bare arrays `[...]`',
  E'import json\nimport re\n\ndef extract_json(text: str) -> dict:\n    """\n    Extract and parse the first valid JSON object from LLM output.\n    Handles markdown fences and surrounding prose.\n    Raises ValueError if no valid JSON object is found.\n    """\n    # TODO: implement robust JSON extraction\n    return json.loads(text)\n',
  'python',
  E'Robust implementation:\n```python\nimport json, re\n\ndef extract_json(text: str) -> dict:\n    # 1. Strip markdown code fences first\n    fence = re.search(r"```(?:json)?\\s*\\n?({.*?})\\s*\\n?```", text, re.DOTALL)\n    if fence:\n        return json.loads(fence.group(1))\n    # 2. Find the first { and try to parse progressively larger substrings\n    start = text.find("{")\n    if start == -1:\n        raise ValueError("No valid JSON found")\n    # Find matching closing brace by scanning for valid JSON\n    for end in range(len(text), start, -1):\n        candidate = text[start:end]\n        try:\n            result = json.loads(candidate)\n            if isinstance(result, dict):\n                return result\n        except json.JSONDecodeError:\n            continue\n    raise ValueError("No valid JSON found")\n```\nKey: handle fence format first, then fall back to greedy brace extraction. The reverse scan (longest first) is efficient because valid JSON is usually near the end of the object.',
  $tc_9$[
    {"name":"plain JSON","function":"extract_json","setup":"","call":"extract_json('{\"name\": \"Alice\", \"score\": 42}')","expected":"{\"name\": \"Alice\", \"score\": 42}","visible":true},
    {"name":"JSON in ```json fence","function":"extract_json","setup":"","call":"extract_json(\"```json\\n{\\\"result\\\": \\\"pass\\\", \\\"score\\\": 9}\\n```\")","expected":"{\"result\": \"pass\", \"score\": 9}","visible":true},
    {"name":"JSON preceded by prose","function":"extract_json","setup":"","call":"extract_json(\"Sure, here is the extracted info: {\\\"entity\\\": \\\"Paris\\\", \\\"type\\\": \\\"city\\\"}\")","expected":"{\"entity\": \"Paris\", \"type\": \"city\"}","visible":true},
    {"name":"raises ValueError when no JSON","function":"extract_json","setup":"","call":"extract_json(\"I cannot determine the answer from the context provided.\")","expected_exception":"ValueError","visible":true},
    {"name":"nested object (hidden)","function":"extract_json","setup":"","call":"extract_json(\"Result: {\\\"data\\\": {\\\"items\\\": [1, 2, 3], \\\"count\\\": 3}, \\\"status\\\": \\\"ok\\\"}\")","expected":"{\"data\": {\"items\": [1, 2, 3], \"count\": 3}, \"status\": \"ok\"}","visible":false}
  ]$tc_9$::jsonb,
  true,
  'medium'
);


-- ─── Exercise 10: Manage Context Window Overflow ───────────────────────────────
-- Tested at: Anthropic, OpenAI, any company building chat-based LLM products
-- Skill: Context management, token budget, system design

INSERT INTO public.exercises (role_track, title, task_description, starter_code, language, reference_solution_notes, test_cases, explanation_required, difficulty)
VALUES (
  'ai_engineer',
  'Manage Context Window Overflow',
  E'You are building a chat assistant. As conversations grow, the total token count approaches the model''s context window limit. You need to truncate older messages while preserving the system prompt and the most recent exchanges.\n\n**Your task:** Implement `truncate_messages(messages, max_tokens, count_tokens)` that:\n1. Always keeps the system message (role = "system") at position 0, if present\n2. Keeps as many of the **most recent** messages as fit within `max_tokens`\n3. Removes older messages from the middle to stay within the budget — not from the end\n4. Returns a new list (do not modify the input)\n5. If even the system message alone exceeds `max_tokens`, return just `[system_message]`\n\n`count_tokens(messages: list[dict]) -> int` counts total tokens for any message list. You may call it as many times as needed.\n\n**Message format:** each message is `{"role": str, "content": str}`\n\n**Constraints:**\n- Preserve message order in the output\n- The returned list must have total tokens ≤ max_tokens (unless only system message fits)\n- Do not split individual messages',
  E'def truncate_messages(\n    messages: list[dict],\n    max_tokens: int,\n    count_tokens,\n) -> list[dict]:\n    """\n    Truncate messages to fit within max_tokens while keeping:\n    - The system message (if any) at position 0\n    - The most recent messages\n    Returns a new list; does not modify the input.\n    """\n    # TODO: implement context window truncation\n    return messages[:]\n',
  'python',
  E'Correct implementation:\n```python\ndef truncate_messages(messages, max_tokens, count_tokens):\n    # Separate system message\n    system = [m for m in messages if m["role"] == "system"]\n    others = [m for m in messages if m["role"] != "system"]\n    # If system alone exceeds limit, return just system\n    if system and count_tokens(system) > max_tokens:\n        return system[:]\n    # Greedily add recent messages from the end\n    result = []\n    for msg in reversed(others):\n        candidate = system + [msg] + result\n        if count_tokens(candidate) <= max_tokens:\n            result = [msg] + result\n        else:\n            break\n    return system + result\n```\nKey insights: (1) always anchor system message; (2) iterate recent messages backwards, adding to front; (3) stop as soon as adding one more would overflow — older messages are dropped.',
  '[
    {
      "name": "returns all messages when under limit",
      "function": "truncate_messages",
      "setup": "def count_tokens(msgs): return sum(len(m[\"content\"].split()) for m in msgs)",
      "call": "truncate_messages([{\"role\": \"system\", \"content\": \"You are helpful.\"}, {\"role\": \"user\", \"content\": \"Hello\"}, {\"role\": \"assistant\", \"content\": \"Hi there\"}], 100, count_tokens)",
      "expected_length": 3,
      "visible": true
    },
    {
      "name": "drops oldest messages to stay within limit",
      "function": "truncate_messages",
      "setup": "def count_tokens(msgs): return sum(len(m[\"content\"].split()) for m in msgs)\nmsgs = [{\"role\": \"system\", \"content\": \"You are helpful.\"}, {\"role\": \"user\", \"content\": \"old message one two three four\"}, {\"role\": \"assistant\", \"content\": \"old reply one two three four\"}, {\"role\": \"user\", \"content\": \"recent question\"}, {\"role\": \"assistant\", \"content\": \"recent answer\"}]",
      "call": "truncate_messages(msgs, 10, count_tokens)",
      "expected_contains_role": "system",
      "expected_last_role": "assistant",
      "expected_last_content": "recent answer",
      "visible": true
    },
    {
      "name": "always preserves system message",
      "function": "truncate_messages",
      "setup": "def count_tokens(msgs): return sum(len(m[\"content\"].split()) * 2 for m in msgs)\nmsgs = [{\"role\": \"system\", \"content\": \"sys\"}, {\"role\": \"user\", \"content\": \"a b c d e f g h i j\"}, {\"role\": \"user\", \"content\": \"recent\"}]",
      "call": "result = truncate_messages(msgs, 5, count_tokens); result[0][\"role\"]",
      "expected": "system",
      "visible": true
    },
    {
      "name": "does not modify input list",
      "function": "truncate_messages",
      "setup": "def count_tokens(msgs): return len(msgs) * 10\norig = [{\"role\": \"user\", \"content\": \"a\"}, {\"role\": \"user\", \"content\": \"b\"}, {\"role\": \"user\", \"content\": \"c\"}]",
      "call": "truncate_messages(orig, 15, count_tokens); len(orig)",
      "expected": 3,
      "visible": true
    },
    {
      "name": "result token count within limit (hidden)",
      "function": "truncate_messages",
      "setup": "import random\nrandom.seed(42)\ndef count_tokens(msgs): return sum(len(m[\"content\"]) for m in msgs)\nmsgs = [{\"role\": \"system\", \"content\": \"sys\"}] + [{\"role\": \"user\" if i % 2 == 0 else \"assistant\", \"content\": \"x\" * (i * 5 + 10)} for i in range(20)]",
      "call": "result = truncate_messages(msgs, 100, count_tokens); count_tokens(result) <= 100",
      "expected": true,
      "visible": false
    }
  ]',
  true,
  'medium'
);
