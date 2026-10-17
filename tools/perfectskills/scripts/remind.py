#!/usr/bin/env python3
"""UserPromptSubmit hook: reminds Claude to route the prompt through perfectskills."""
import json, sys
from pathlib import Path

here = Path(__file__).resolve().parent
msg = (
    "perfectskills: before acting on this prompt, apply the perfectskills skill - unless the prompt is trivial, "
    f'run `python "{here / "skilldex.py"}" find "<task keywords>" -n 6`, load the best 0-3 skills, '
    "name them in one short line, and log the outcome with `skilldex.py learn` when the task ends."
)
print(json.dumps({"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": msg}}))
