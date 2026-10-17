# Upstream

Vendored unchanged from [morluto/rea](https://github.com/morluto/rea) (`.agents/skills/reverse-engineer-anything`),
commit `54c71313aeb2cbdf21626af9557673a6f6397180` (2026-10-17), skill metadata version 42. MIT licensed, see `LICENSE`
(copyright 2026 morluto). Not written by this repo's author.

The skill is the operating manual for the **REA MCP server**: installing the skill alone adds no tools.
To get the tools, register the server (writes your client's MCP config; review the dry run first):

```bash
npx -y rea-agents@latest setup --client claude_code --dry-run --json
npx -y rea-agents@latest setup --client claude_code --yes
```

Native decompilation needs your own Ghidra/Hopper/IDA; Android needs JADX + Java. Static JavaScript/Electron (ASAR)
analysis, ZIP/APK inventory, PE resources, Go/Rust metadata and SQLite need no extra engine.

To refresh: re-copy `.agents/skills/reverse-engineer-anything` from upstream and update the commit above.
