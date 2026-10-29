#!/usr/bin/env python3
"""Re-vendor third-party skill packs into this repo: python tools/vendor.py <dir-with-clones>

Each pack keeps its upstream LICENSE and gets an UPSTREAM.md (source, commit, what was copied).
Packs with no license, or whose license forbids redistribution, are listed in LINKS only.
"""
import shutil, subprocess, sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SRC = Path(sys.argv[1])
SKIP = {".git", "node_modules", "__pycache__", ".DS_Store"}

# category, local name, upstream "owner/repo", clone dir, [paths to copy] (dirs/files, relative)
PACKS = [
    ("harness", "superpowers", "obra/superpowers", "superpowers", ["skills"]),
    ("harness", "ecc", "affaan-m/ECC", "ECC", ["skills"]),
    ("harness", "ponytail", "DietrichGebert/ponytail", "ponytail", ["skills"]),
    ("harness", "gstack", "garrytan/gstack", "gstack", ["*SKILLDIRS*"]),
    ("harness", "agent-skills", "addyosmani/agent-skills", "agent-skills", ["skills"]),
    ("design", "ui-ux-pro-max", "nextlevelbuilder/ui-ux-pro-max-skill", "ui-ux-pro-max-skill", [".claude/skills"]),
    ("design", "awesome-design-md", "VoltAgent/awesome-design-md", "awesome-design-md", ["design-md", "README.md"]),
    ("design", "taste-skill", "Leonxlnx/taste-skill", "taste-skill", ["skills"]),
    ("writing", "humanizer", "blader/humanizer", "humanizer", ["SKILL.md", "README.md"]),
    ("marketing", "marketingskills", "coreyhaines31/marketingskills", "marketingskills", ["skills"]),
    ("memory", "claude-mem", "thedotmack/claude-mem", "claude-mem", ["plugin/skills"]),
    ("memory", "codegraph", "colbymchenry/codegraph", "codegraph", [".claude/skills"]),
    ("memory", "obsidian-skills", "kepano/obsidian-skills", "obsidian-skills", ["skills"]),
    ("memory", "planning-with-files", "OthmanAdi/planning-with-files", "planning-with-files", ["skills"]),
    ("tools", "firecrawl", "firecrawl/firecrawl", "firecrawl", ["skills"]),
    ("tools", "agent-reach", "Panniantong/Agent-Reach", "Agent-Reach", ["agent_reach"]),
    ("tools", "last30days", "mvanhorn/last30days-skill", "last30days-skill", ["skills"]),
    ("tools", "context7", "upstash/context7", "context7", ["skills"]),
    ("tools", "workspace-cli", "googleworkspace/cli", "cli", ["skills"]),
    ("costopti", "caveman", "JuliusBrussee/caveman", "caveman", ["skills"]),
    ("security", "security-audit", "cloudflare/security-audit-skill", "security-audit-skill", ["skills"]),
    ("tools", "find-skills", "vercel-labs/skills", "skills", ["skills/find-skills"]),
    ("tools", "playwright-cli", "microsoft/playwright-cli", "playwright-cli", ["skills"]),
    ("design", "emil-skills", "emilkowalski/skills", "emil-skills", ["skills"]),
    ("design", "impeccable", "pbakaus/impeccable", "impeccable", [".claude/skills"]),
    ("tools", "hyperframes", "heygen-com/hyperframes", "hyperframes", ["skills"]),
    ("marketing", "knowledge-work-sales", "anthropics/knowledge-work-plugins", "knowledge-work-plugins", ["sales/skills"]),
    ("marketing", "knowledge-work-marketing", "anthropics/knowledge-work-plugins", "knowledge-work-plugins", ["marketing/skills"]),
]
OFFICIAL = ["academy-guide", "algorithmic-art", "brand-guidelines", "canvas-design", "claude-api", "discernment-nudge",
            "frontend-design", "internal-comms", "mcp-builder", "skill-creator", "slack-gif-creator", "theme-factory",
            "web-artifacts-builder", "webapp-testing"]


MEDIA = (".mp3", ".mp4", ".mov", ".wav", ".jpeg", ".jpg", ".png", ".gif", ".webm")


def _ignore(d, names):
    # demo media over 1 MB is README decoration, not skill content
    return [n for n in names if n in SKIP or (n.lower().endswith(MEDIA) and (Path(d) / n).stat().st_size > 1_000_000)]


def copy(src: Path, dst: Path):
    if src.is_dir():
        shutil.copytree(src, dst, dirs_exist_ok=True, ignore=_ignore)
    else:
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)


def commit(d: Path):
    return subprocess.run(["git", "-C", str(d), "log", "-1", "--format=%H %cs"], capture_output=True, text=True).stdout.strip()


def license_file(d: Path):
    for n in sorted(d.iterdir()):
        if n.is_file() and n.name.lower().startswith(("license", "licence", "copying")):
            return n


def vendor(cat, name, upstream, clone, paths):
    src = SRC / clone
    dst = REPO / cat / name
    if dst.exists():
        shutil.rmtree(dst)
    dst.mkdir(parents=True)
    copied = []
    for p in paths:
        if p == "*SKILLDIRS*":  # repo root holds one folder per skill
            for d in sorted(src.iterdir()):
                if d.is_dir() and (d / "SKILL.md").exists() and d.name not in SKIP:
                    copy(d, dst / "skills" / d.name); copied.append(d.name + "/")
            continue
        s = src / p
        if not s.exists():
            print("  missing", s); continue
        target = dst / ("skills" if p.endswith("skills") else Path(p).name)
        copy(s, target); copied.append(p)
    lic = license_file(src)
    if lic:
        shutil.copy2(lic, dst / "LICENSE")
    n = len(list(dst.rglob("SKILL.md")))
    (dst / "UPSTREAM.md").write_text(
        f"# {name}\n\nThird-party, vendored unchanged from [{upstream}](https://github.com/{upstream}) "
        f"at `{commit(src)}`.\nLicense: see `LICENSE` (upstream's). Copied: {', '.join(f'`{c}`' for c in copied)} "
        f"({n} skills).\n\nSome skills call scripts, CLIs, MCP servers or hooks that only exist in the full upstream "
        f"project; install it from upstream for those to work.\n", encoding="utf-8")
    print(f"{cat}/{name}: {n} skills")


def main():
    for pk in PACKS:
        vendor(*pk)
    off = SRC.parent / "dl_anthropic_skills" / "skills"
    dst = REPO / "official" / "anthropic"
    if dst.exists():
        shutil.rmtree(dst)
    for s in OFFICIAL:
        copy(off / s, dst / s)
    (dst / "UPSTREAM.md").write_text(
        f"# Anthropic official skills\n\nVendored from [anthropics/skills](https://github.com/anthropics/skills) at "
        f"`{commit(off.parent)}`. Each skill carries its own `LICENSE.txt` (Apache-2.0).\n\nNot copied: `docx`, `pdf`, "
        f"`pptx`, `xlsx` (Anthropic source-available, all rights reserved — install from upstream or the "
        f"`anthropic-skills` plugin) and `doc-coauthoring` (no license file).\n", encoding="utf-8")
    print(f"official/anthropic: {len(OFFICIAL)} skills")


if __name__ == "__main__":
    main()
