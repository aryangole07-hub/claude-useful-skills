"""Headless render lab for the uiux skill: render motion frame by frame on a controlled clock, synthesise the
soundtrack, lock cuts to the beat, stitch with ffmpeg, then hunt dead frames and build contact sheets to critique.

Needs: Python with playwright (+ `playwright install chromium`), numpy, pillow; ffmpeg on PATH (winget install Gyan.FFmpeg).

  python render_lab.py capture URL OUT [--seconds 4] [--fps 60] [--w 1440] [--h 900] [--scroll PX] [--selector CSS]
        frames OUT/f00000.png ... rendered on Playwright's fake clock (page.clock): every frame is exactly 1/fps apart,
        so springs and timers are sampled deterministically, never "whatever the GPU managed". --scroll PX scrolls that
        many px over the clip (scroll scenes); --selector clips to one element.
  python render_lab.py audio OUT.wav [--seconds 8] [--bpm 120] [--key 220]
        synthesised track (no samples): kick on every beat, hat on off-beats, a soft pad; plus OUT.beats.json.
  python render_lab.py cuts BEATS.json t1 t2 ...       snap proposed cut times (s) to the nearest beat.
  python render_lab.py stitch FRAMES_DIR OUT.mp4 [--fps 60] [--audio OUT.wav]
  python render_lab.py dead FRAMES_DIR [--still 0.0015] [--blank 4.0]
        flags dead frames: STILL (no change from the previous frame inside a motion segment = a stall / hitch),
        BLANK (near-uniform frame = empty / flash), JUMP (change > 6x the clip median = a pop / discontinuity).
        Writes FRAMES_DIR/dead.json.
  python render_lab.py sheet FRAMES_DIR OUT.png [--every 6] [--cols 6]   contact sheet for visual critique.
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


def ffmpeg() -> str:
    exe = shutil.which("ffmpeg")
    if not exe:
        cand = Path.home() / "AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe"
        exe = str(cand) if cand.exists() else None
    if not exe:
        sys.exit("ffmpeg not found - install it (winget install Gyan.FFmpeg)")
    return exe


def capture(a):
    from playwright.sync_api import sync_playwright
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    n = int(a.seconds * a.fps); step = 1000.0 / a.fps
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": a.w, "height": a.h})
        pg.clock.install()                                   # fake timers + rAF: time only moves when we say so
        pg.goto(a.url, wait_until="load")
        pg.clock.run_for(50)
        el = pg.locator(a.selector).first if a.selector else None
        for i in range(n):
            if a.scroll:
                pg.mouse.wheel(0, a.scroll / n)
            pg.clock.run_for(int(round((i + 1) * step) - round(i * step)))
            (el or pg).screenshot(path=str(out / f"f{i:05d}.png"))
        b.close()
    print(f"{n} frames -> {out}")


def audio(a):
    sr, dur = 44100, a.seconds
    t = np.arange(int(sr * dur)) / sr
    beat = 60.0 / a.bpm
    y = 0.08 * (np.sin(2 * np.pi * a.key * t) + 0.5 * np.sin(2 * np.pi * a.key * 1.5 * t)) * (0.6 + 0.4 * np.sin(2 * np.pi * t / (beat * 8)))
    beats = np.arange(0, dur, beat)
    for b in beats:                                           # kick: pitch-dropping sine with a fast decay
        i = int(b * sr); k = np.arange(min(int(0.25 * sr), len(t) - i)) / sr
        y[i:i + len(k)] += 0.7 * np.sin(2 * np.pi * (50 + 120 * np.exp(-k * 30)) * k) * np.exp(-k * 12)
    rng = np.random.default_rng(1)
    for b in beats + beat / 2:                                # hat: filtered noise burst on the off-beat
        i = int(b * sr); k = min(int(0.05 * sr), len(t) - i)
        if k > 0:
            y[i:i + k] += 0.15 * np.diff(rng.standard_normal(k + 1)) * np.exp(-np.arange(k) / sr * 80)
    y = np.clip(y / max(1e-9, np.abs(y).max()) * 0.9, -1, 1)
    with wave.open(a.out, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((y * 32767).astype("<i2").tobytes())
    Path(a.out).with_suffix(".beats.json").write_text(json.dumps({"bpm": a.bpm, "beats": [round(float(x), 4) for x in beats]}))
    print(f"{a.out}: {dur}s @ {a.bpm} bpm, {len(beats)} beats")


def cuts(a):
    beats = np.array(json.loads(Path(a.beats).read_text())["beats"])
    for c in a.times:
        s = beats[np.abs(beats - c).argmin()]
        print(f"{c:.3f}s -> {s:.3f}s (beat {int(np.abs(beats - c).argmin())})")


def stitch(a):
    cmd = [ffmpeg(), "-y", "-framerate", str(a.fps), "-i", str(Path(a.frames) / "f%05d.png")]
    if a.audio:
        cmd += ["-i", a.audio, "-shortest", "-c:a", "aac", "-b:a", "192k"]
    cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", a.out]
    subprocess.run(cmd, check=True, capture_output=True)
    print(a.out)


def _gray(p: Path) -> np.ndarray:
    return np.asarray(Image.open(p).convert("L").resize((320, 200)), dtype=np.float32) / 255.0


def dead(a):
    fs = sorted(Path(a.frames).glob("f*.png"))
    g = [_gray(f) for f in fs]
    diff = np.array([0.0] + [float(np.abs(g[i] - g[i - 1]).mean()) for i in range(1, len(g))])
    moving = diff > a.still
    med = float(np.median(diff[moving])) if moving.any() else 0.0
    out = []
    for i, f in enumerate(fs):
        why = []
        if g[i].std() * 255 < a.blank:
            why.append("BLANK")
        # a still frame between moving neighbours = a hitch; a still run at the very start/end is just rest
        if 0 < i < len(fs) - 1 and not moving[i] and moving[max(0, i - 3):i].any() and moving[i + 1:i + 4].any():
            why.append("STILL")
        if med and diff[i] > 6 * med:
            why.append("JUMP")
        if why:
            out.append({"frame": f.name, "i": i, "why": why, "diff": round(float(diff[i]), 5)})
    Path(a.frames, "dead.json").write_text(json.dumps(out, indent=1))
    print(f"{len(out)} dead / suspect frames of {len(fs)} (median motion {med:.5f}) -> dead.json")
    for r in out[:20]:
        print(" ", r)


def sheet(a):
    fs = sorted(Path(a.frames).glob("f*.png"))[::a.every]
    if not fs:
        sys.exit("no frames")
    w0, h0 = Image.open(fs[0]).size
    tw = 360; th = int(h0 * tw / w0); rows = -(-len(fs) // a.cols)
    S = Image.new("RGB", (a.cols * tw, rows * (th + 18)), "white"); d = ImageDraw.Draw(S)
    for k, f in enumerate(fs):
        x, y = (k % a.cols) * tw, (k // a.cols) * (th + 18)
        S.paste(Image.open(f).convert("RGB").resize((tw, th)), (x, y + 18)); d.text((x + 4, y + 3), f.stem, fill="black")
    S.save(a.out); print(a.out)


if __name__ == "__main__":
    P = argparse.ArgumentParser(); s = P.add_subparsers(dest="cmd", required=True)
    c = s.add_parser("capture"); c.add_argument("url"); c.add_argument("out"); c.add_argument("--seconds", type=float, default=4)
    c.add_argument("--fps", type=int, default=60); c.add_argument("--w", type=int, default=1440); c.add_argument("--h", type=int, default=900)
    c.add_argument("--scroll", type=float, default=0); c.add_argument("--selector")
    c = s.add_parser("audio"); c.add_argument("out"); c.add_argument("--seconds", type=float, default=8)
    c.add_argument("--bpm", type=float, default=120); c.add_argument("--key", type=float, default=220)
    c = s.add_parser("cuts"); c.add_argument("beats"); c.add_argument("times", type=float, nargs="+")
    c = s.add_parser("stitch"); c.add_argument("frames"); c.add_argument("out"); c.add_argument("--fps", type=int, default=60); c.add_argument("--audio")
    c = s.add_parser("dead"); c.add_argument("frames"); c.add_argument("--still", type=float, default=0.0015); c.add_argument("--blank", type=float, default=4.0)
    c = s.add_parser("sheet"); c.add_argument("frames"); c.add_argument("out"); c.add_argument("--every", type=int, default=6); c.add_argument("--cols", type=int, default=6)
    a = P.parse_args()
    {"capture": capture, "audio": audio, "cuts": cuts, "stitch": stitch, "dead": dead, "sheet": sheet}[a.cmd](a)
