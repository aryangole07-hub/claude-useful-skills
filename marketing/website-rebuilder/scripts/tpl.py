"""Template library for the website rebuilder: start a site from a template instead of designing from zero.

  python tpl.py list                                   templates and the niches they fit (templates/INDEX.md)
  python tpl.py new <template> <site_dir>              copy engine + template into <site_dir>, write one HTML shell per page
  python tpl.py shells <site_dir>                      rewrite the HTML shells after editing content.js (pages, titles)
  python tpl.py save <site_dir> <name> "<niches>" "<summary>"   add a finished site as a NEW template (then replace its
                                                       real facts in templates/<name>/content.js with sample ones)

A site = engine.css + engine.js (shared, never edited per site) + theme.css (colours, fonts) + content.js
(window.SITE = {...}: business facts, nav, and per page the list of sections) + img/. content.js must stay strict JSON
after "window.SITE = " so this script can read it.
"""
from __future__ import annotations

import datetime as dt
import html
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "templates"
ENGINE = ROOT / "_engine"
INDEX = ROOT / "INDEX.md"


def load_site(d: Path) -> dict:
    t = (d / "content.js").read_text(encoding="utf-8")
    return json.loads(t[t.index("=") + 1:].strip().rstrip(";"))


def shell(site: dict, page: str, cfg: dict) -> str:
    b = site["business"]
    title = html.escape(cfg.get("title") or b["name"])
    desc = html.escape(cfg.get("description") or b.get("tagline", ""))
    robots = "" if site.get("live") else '\n<meta name="robots" content="noindex">'   # previews stay out of search until sold
    return f"""<!doctype html>
<html lang="{site.get('lang', 'en')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">{robots}
<link rel="icon" href="{html.escape(b.get('favicon') or b.get('logo') or 'data:,')}">
<link rel="stylesheet" href="engine.css">
<link rel="stylesheet" href="theme.css">
</head>
<body data-page="{page}">
<script src="content.js"></script>
<script src="engine.js"></script>
</body>
</html>
"""


def write_shells(d: Path) -> list[str]:
    site = load_site(d)
    for page, cfg in site["pages"].items():
        (d / f"{page}.html").write_text(shell(site, page, cfg), encoding="utf-8")
    return list(site["pages"])


def cmd_new(name: str, out: str) -> None:
    src, dst = ROOT / name, Path(out)
    if not (src / "content.js").exists():
        sys.exit(f"no template {name!r}; run: python tpl.py list")
    if dst.exists() and any(dst.iterdir()):
        sys.exit(f"{dst} is not empty")
    dst.mkdir(parents=True, exist_ok=True)
    for f in ("engine.css", "engine.js"):
        shutil.copy2(ENGINE / f, dst / f)
    for f in ("content.js", "theme.css"):
        shutil.copy2(src / f, dst / f)
    if (src / "img").exists():
        shutil.copytree(src / "img", dst / "img")
    pages = write_shells(dst)
    print(f"{dst}: template {name}, pages {', '.join(pages)}. Now edit content.js (real facts) and theme.css (brand), add img/, "
          f"then: python tpl.py shells {dst}")


def cmd_save(site: str, name: str, niches: str, summary: str) -> None:
    src, dst = Path(site), ROOT / name
    if dst.exists():
        sys.exit(f"template {name!r} exists; pick another name")
    dst.mkdir(parents=True)
    for f in ("content.js", "theme.css"):
        shutil.copy2(src / f, dst / f)
    s = load_site(src)
    pages = ", ".join(f"{p} ({len(c['sections'])})" for p, c in s["pages"].items())
    (dst / "DESIGN.md").write_text(f"# {name}\n\nNiches: {niches}\n\n{summary}\n\nPages (sections): {pages}\n\n"
                                   f"Saved from {src.name} on {dt.date.today()}. Replace that business's facts in content.js "
                                   f"with sample ones marked SAMPLE before reusing.\n", encoding="utf-8")
    with open(INDEX, "a", encoding="utf-8") as fh:
        fh.write(f"| {name} | {niches} | {pages} | {summary} | {dt.date.today()} |\n")
    print(f"saved templates/{name}; added to INDEX.md. Now swap the real business facts in templates/{name}/content.js for samples.")


def main(a: list[str]) -> None:
    if not a or a[0] == "list":
        print(INDEX.read_text(encoding="utf-8"))
    elif a[0] == "new" and len(a) == 3:
        cmd_new(a[1], a[2])
    elif a[0] == "shells" and len(a) == 2:
        print("pages:", ", ".join(write_shells(Path(a[1]))))
    elif a[0] == "save" and len(a) == 5:
        cmd_save(*a[1:])
    else:
        sys.exit(__doc__)


# self-check: a shell names its page and keeps previews out of search
_s = {"business": {"name": "A & B"}, "pages": {"index": {"sections": []}}}
assert 'data-page="index"' in shell(_s, "index", {}) and "noindex" in shell(_s, "index", {}) and "A &amp; B" in shell(_s, "index", {})

if __name__ == "__main__":
    main(sys.argv[1:])
