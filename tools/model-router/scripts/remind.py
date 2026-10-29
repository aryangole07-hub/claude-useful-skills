#!/usr/bin/env python3
"""UserPromptSubmit hook: reminds Claude to route the prompt's work by model rank (model-router skill)."""
import json
msg = ("model-router: grade this prompt's subtasks easy / normal / hardest and route by rank to save tokens: "
       "easy self-contained work -> Agent model 'haiku' (effort lower), normal -> 'sonnet', hardest (architecture, "
       "subtle bugs, security, backtest integrity, final review) -> 'opus'. Never 'fable'. Trivial or tightly coupled "
       "work stays inline. See the model-router skill.")
print(json.dumps({"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": msg}}))
