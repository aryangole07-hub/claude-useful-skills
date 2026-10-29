---
name: more-credits
description: Fallback for when Claude Code's usage or tokens run out - switch Claude Code to a local free-model router (FreeLLMAPI first, OmniRoute second; both pool free LLM tiers behind one Anthropic-compatible endpoint) so work can continue. Use when the user says "more credits", "I'm out of tokens", "usage limit reached", "rate limited, keep going", "switch to freellmapi", or when a session hits a usage-limit error and the user wants to continue.
---

# More credits (FreeLLMAPI fallback)

When Claude's usage runs out, keep working through **FreeLLMAPI** (github.com/tashfeenahmed/freellmapi): a self-hosted router that pools ~34 free LLM providers behind one endpoint and speaks Anthropic's `/v1/messages`, so Claude Code runs against it unchanged. This is the required fallback: don't stop at a usage limit if FreeLLMAPI is available; switch to it.

## What a skill can and can't do (be straight with the user)

Once the limit is hit, this model can't run, so nothing here can switch over by itself mid-reply. The switch is a relaunch: the user runs the launcher (below), and the new session runs on FreeLLMAPI's models. Before the limit hits (for example, when a usage warning appears), say so and offer the command, and save state so the next session can pick up the work.

## Second router: OmniRoute (installed: `npm i -g omniroute`)

OmniRoute (github.com/cheaper-inference/OmniRoute, MIT) is a bigger gateway: ~375 providers, 150+ free tiers, prompt compression, and auto-fallback across tiers. Start it with `omniroute`, open its dashboard, connect providers, and create an OmniRoute API key. It serves `http://localhost:20128/v1`. The launcher finds it automatically when FreeLLMAPI isn't running (or pass `-Url http://localhost:20128 -Key <omniroute key>`). Use only connections you're entitled to: your own API keys and official free tiers. Don't route through consumer subscriptions or "stealth" / reverse-engineered endpoints, which break providers' terms and can get accounts banned.

## One-time setup (ask before installing anything)

1. Install FreeLLMAPI: the Windows `.exe` from github.com/tashfeenahmed/freellmapi/releases/latest (tray app, dashboard at http://127.0.0.1:31415), or Docker (`curl -fsSL https://freellmapi.co/install.sh | bash`; API on http://localhost:3001).
2. In its dashboard, add free provider keys (Gemini, Groq, Cerebras, Mistral, NVIDIA and so on) and copy the **unified key**.
3. Store the key as a user environment variable, never in a repo or a skill file: `setx FREELLMAPI_KEY "<unified key>"`.
4. Optional: FreeLLMAPI's own helpers, `npx freellmapi setup-claude --url http://localhost:3001 --api-key <key>` or `npx freellmapi launch` (keeps credentials out of config files).

## Switching (when tokens run out)

1. **Save state first** if this session still can: write a short handoff (task, files changed, next step) to the project notes or memory, so the fallback session can resume.
2. Tell the user to run, in a new terminal:
   `powershell -ExecutionPolicy Bypass -File "$HOME\.claude\skills\more-credits\more-credits.ps1"`
   It finds the router (localhost:3001 or 127.0.0.1:31415), sets `ANTHROPIC_BASE_URL` and `ANTHROPIC_AUTH_TOKEN` for that process only, and starts `claude`. Normal Claude Code is untouched: just open a plain terminal.
3. Return to Claude once usage resets: start `claude` normally (the env vars only lived in the fallback process).

## Rules while on the fallback

- **Lower quality.** Free models are weaker. Prefer small, verifiable steps, run tests after each change, and don't start risky or irreversible work (deploys, migrations, live trading changes, mass deletes) until back on Claude.
- **Privacy.** Prompts go to third-party free providers, some of which may log or train on them. Never send secrets, `.env` contents, credentials, private keys or personal data through the fallback. In the signal1 project, don't open `E:\projects\signal\secrets\` while on it.
- Check which provider served a reply with the `X-Routed-Via` response header (FreeLLMAPI dashboard logs).
- This doesn't change any app's LLM cascade (for example, signal1's own provider list); it only affects Claude Code.
