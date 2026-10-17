#!/usr/bin/env python3
"""perfectskills index + ranker + learning log (stdlib only).

  python skilldex.py index                 # (re)scan every skill source -> data/catalog.json
  python skilldex.py find "task text" [-n 5]   # best skills for a task (uses learned scores)
  python skilldex.py show <name>           # print the path + description of one skill
  python skilldex.py learn --task "..." --skills a,b --outcome good|bad|neutral [--note "..."]
  python skilldex.py stats                 # what has been learned so far

Sources scanned (any that exist):
  ~/.claude/skills                      installed personal skills
  ~/.claude/plugins/**/skills           plugin skills (e.g. anthropic-skills)
  $PERFECTSKILLS_LIBRARY or the claude-useful-skills clone this script lives in (the full library)
"""
import argparse, json, math, os, re, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = Path(os.environ.get("PERFECTSKILLS_DATA", Path.home() / ".claude" / "perfectskills"))
CATALOG = DATA / "catalog.json"
LEARN = DATA / "learnings.jsonl"
STOP = set("a an the and or of to for in on with is are be use when this that it as by from your you any into at not no do does all can".split())


def library_root() -> Path:
    env = os.environ.get("PERFECTSKILLS_LIBRARY")
    if env:
        return Path(env)
    # tools/perfectskills/scripts -> repo root
    for p in [HERE.parents[2], Path.home() / "projects" / "claude-useful-skills"]:
        if (p / "README.md").exists() and (p / "tools").exists():
            return p
    return HERE.parents[2]


def frontmatter(text: str) -> dict:
    m = re.match(r"^---\s*\n(.*?)\n---", text, re.S)
    if not m:
        return {}
    out, key = {}, None
    for line in m.group(1).splitlines():
        km = re.match(r"^([A-Za-z_-]+):\s*(.*)$", line)
        if km:
            key, val = km.group(1), km.group(2).strip()
            out[key] = "" if val in (">", "|", ">-", "|-") else val.strip("'\"")
        elif key and line.startswith((" ", "\t")):
            out[key] = (out[key] + " " + line.strip()).strip()
    return out


def scan():
    sources = [("installed", Path.home() / ".claude" / "skills")]
    plug = Path.home() / ".claude" / "plugins"
    if plug.exists():
        sources.append(("plugin", plug))
    sources.append(("library", library_root()))
    seen, items = set(), []
    for kind, root in sources:
        if not root.exists():
            continue
        for f in root.rglob("SKILL.md"):
            parts = set(f.parts)
            if parts & {".git", "node_modules", "docs", "ja-JP", "zh-CN", "ko-KR"}:
                continue
            try:
                text = f.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            fm = frontmatter(text)
            name = fm.get("name") or f.parent.name
            desc = fm.get("description", "")[:600]
            rel = f.relative_to(root).as_posix()
            category = rel.split("/")[0] if kind == "library" else kind
            key = (name.lower(), desc[:80])
            if key in seen:
                continue
            seen.add(key)
            items.append({"name": name, "description": desc, "path": str(f), "source": kind, "category": category, "words": len(text.split())})
    DATA.mkdir(parents=True, exist_ok=True)
    CATALOG.write_text(json.dumps({"built": time.time(), "skills": items}, indent=0), encoding="utf-8")
    return items


def load():
    if not CATALOG.exists() or time.time() - json.loads(CATALOG.read_text(encoding="utf-8"))["built"] > 7 * 86400:
        return scan()
    return json.loads(CATALOG.read_text(encoding="utf-8"))["skills"]


def toks(s: str):
    return [w for w in re.findall(r"[a-z0-9][a-z0-9+#.-]*", s.lower()) if w not in STOP and len(w) > 1]


def learned_scores():
    """skill -> (good, bad), and word -> skill -> weight from past tasks."""
    score, assoc = {}, {}
    if LEARN.exists():
        for line in LEARN.read_text(encoding="utf-8").splitlines():
            try:
                e = json.loads(line)
            except ValueError:
                continue
            w = {"good": 1.0, "neutral": 0.2, "bad": -1.0}.get(e.get("outcome"), 0)
            for s in e.get("skills", []):
                g, b = score.get(s, (0, 0))
                score[s] = (g + (w > 0), b + (w < 0))
                for t in set(toks(e.get("task", ""))):
                    assoc.setdefault(t, {}).setdefault(s, 0.0)
                    assoc[t][s] += w
    return score, assoc


def find(query: str, n: int):
    items = load()
    q = toks(query)
    df = {}
    docs = []
    for it in items:
        d = toks(it["name"].replace("-", " ") + " " + it["name"] + " " + it["description"])
        docs.append(d)
        for t in set(d):
            df[t] = df.get(t, 0) + 1
    N = max(1, len(items))
    score, assoc = learned_scores()
    ranked = []
    for it, d in zip(items, docs):
        if not d:
            continue
        s = 0.0
        dl = len(d)
        for t in q:
            tf = d.count(t)
            if tf:
                idf = math.log(1 + (N - df[t] + 0.5) / (df[t] + 0.5))
                s += idf * tf * 2.2 / (tf + 1.2 * (0.25 + 0.75 * dl / 40))
            if t in it["name"].lower():
                s += 1.5
        for t in set(q):
            s += 0.8 * assoc.get(t, {}).get(it["name"], 0.0)
        g, b = score.get(it["name"], (0, 0))
        s += 0.5 * (g - 1.5 * b) / (1 + g + b)
        if it["source"] == "installed":
            s += 1.2  # already loaded: zero extra cost to use
        if s > 0:
            ranked.append((s, it))
    ranked.sort(key=lambda x: -x[0])
    return ranked[:n]


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("index")
    f = sub.add_parser("find"); f.add_argument("query"); f.add_argument("-n", type=int, default=5)
    s = sub.add_parser("show"); s.add_argument("name")
    l = sub.add_parser("learn"); l.add_argument("--task", required=True); l.add_argument("--skills", required=True)
    l.add_argument("--outcome", choices=["good", "bad", "neutral"], required=True); l.add_argument("--note", default="")
    sub.add_parser("stats")
    a = ap.parse_args()
    if a.cmd == "index":
        items = scan()
        by = {}
        for it in items:
            by[it["source"]] = by.get(it["source"], 0) + 1
        print(f"indexed {len(items)} skills {by} -> {CATALOG}")
    elif a.cmd == "find":
        for sc, it in find(a.query, a.n):
            print(f"{sc:5.2f}  {it['name']}  [{it['source']}/{it['category']}, ~{it['words']}w]\n       {it['description'][:180]}\n       {it['path']}")
    elif a.cmd == "show":
        hits = [it for it in load() if it["name"].lower() == a.name.lower()]
        for it in hits:
            print(f"{it['name']} [{it['source']}/{it['category']}]\n{it['path']}\n{it['description']}")
        if not hits:
            sys.exit(f"no skill named {a.name}")
    elif a.cmd == "learn":
        DATA.mkdir(parents=True, exist_ok=True)
        with LEARN.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps({"t": time.strftime("%Y-%m-%d"), "task": a.task, "skills": [x.strip() for x in a.skills.split(",") if x.strip()], "outcome": a.outcome, "note": a.note}) + "\n")
        print("learned")
    elif a.cmd == "stats":
        score, _ = learned_scores()
        for k, (g, b) in sorted(score.items(), key=lambda x: -(x[1][0] - x[1][1])):
            print(f"{k}: +{g} -{b}")
        if not score:
            print("nothing learned yet")


if __name__ == "__main__":
    main()
