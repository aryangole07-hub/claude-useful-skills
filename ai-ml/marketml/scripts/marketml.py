#!/usr/bin/env python
"""marketml engine: task-driven selection over six stock-ranking methods, honest train/test evaluation,
and long-short combination. Works on any panel that follows the data contract below.

    python marketml.py select    --data panel.parquet --task top10    --train-end 2020-12-31 --out runs/top10
    python marketml.py select    --data panel.parquet --task bottom10 --train-end 2020-12-31 --out runs/bottom10
    python marketml.py longshort --top runs/top10 --bottom runs/bottom10 --out runs/ls [--short-top-n 200]

DATA CONTRACT (one row per rebalance date x stock; parquet or csv)
  date        rebalance date (e.g. month-ends)                                   required
  id          stock identifier                                                    required
  <features>  numeric predictors known AT `date` (point-in-time)                  required
  fwd         forward return used as the label (e.g. next 63 trading days)        --label (default fwd)
  label_end   date the label window closes (for purging); if absent it is
              approximated as date + horizon_days * 7/5 + 3 calendar days         optional
  period_ret  return from this rebalance to the next (what a monthly portfolio
              earns); last date may be NaN                                        required
  liquid      1 if tradable (e.g. top-500 by traded value) at `date`              optional (all 1)
  sector      coarse sector label (needed for V4; ~10 groups, not 40)             optional
  adv         average daily traded value (short-universe restriction)             optional
  <external>  an external model's score/percentile (the "champion"); NaN where
              it has no out-of-sample score                                       optional (--external)
  --daily-prices  long csv/parquet (date, id, close) -> drawdowns from daily values (strongly advised;
                  without it drawdowns are month-end only and UNDERSTATE risk)
  --benchmark     csv (date, ret) with the index return over each rebalance period

METHODS (ridge with equal weight per date; features rank-normalised per date to [-0.5, 0.5], NaN -> 0)
  V1   broad universe, target rank(fwd), alpha tuned
  V2   broad universe, target x alpha x external-score emphasis tuned to the task
  V2L  V2 on the liquid universe only
  V3   V1 features + V2L's out-of-sample percentile (+ missing flag); target x alpha x V2L emphasis
  V4   V3 + per-sector ridge on the global fit's residual, shrunk by lambda (tuned)
  EXT  the external score itself (no training)
Bottom tasks report V1..V4 as S1, S2, S2L, S3, S4.

SELECTION (training data only; the choice is written before any test number exists)
  stage 1  per method: hyperparameters by the task objective on moving-window OOS predictions
           (fit on labels that end before year V, predict year V)
  stage 2  method: task objective on the common inner window where every method (incl. EXT) has
           OOS scores; the full-window score is reported alongside
TASKS  top10 top5 bottom10 bottom5 (hit rates), cagr sharpe (top-decile portfolio), ic
Requires numpy, pandas, scikit-learn (+ pyarrow for parquet).
"""
from __future__ import annotations

import argparse
import json
import math
import time
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge

TASKS = ("top10", "top5", "bottom10", "bottom5", "cagr", "sharpe", "ic")
ALPHAS = (1.0, 10.0, 100.0, 1000.0, 10000.0, 100000.0)
EMPH = (1.0, 4.0)
V3_EMPH = (1.0, 16.0, 256.0)
V4_LAMBDA = (300.0, 3000.0, 30000.0)
METHODS = ("V1", "V2", "V2L", "V3", "V4", "EXT")
S_NAMES = {"V1": "S1", "V2": "S2", "V2L": "S2L", "V3": "S3", "V4": "S4"}
RESERVED = {"date", "id", "label_end", "period_ret", "liquid", "sector", "adv"}


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


# ── data ──────────────────────────────────────────────────────────────────────────────────────
def read(path) -> pd.DataFrame:
    p = Path(path)
    return pd.read_parquet(p) if p.suffix in (".parquet", ".pq") else pd.read_csv(p)


class Panel:
    def __init__(self, a):
        df = read(a.data)
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values(["date", "id"]).reset_index(drop=True)
        reserved = RESERVED | {a.label} | ({a.external} if a.external else set())
        feats = [c for c in df.columns if c not in reserved and pd.api.types.is_numeric_dtype(df[c])
                 and not c.startswith("fwd")]
        if a.features:
            import re
            feats = [c for c in feats if re.search(a.features, c)]
        if not feats:
            raise SystemExit("no feature columns found")
        self.feats = feats
        g = df.groupby("date")
        X = (g[feats].rank(pct=True) - 0.5).fillna(0.0).astype("float32")
        if a.external:
            ext = g[a.external].rank(pct=True)
            X["ext"] = (ext - 0.5).fillna(0.0).astype("float32")
            X["ext_missing"] = ext.isna().astype("float32")
            self.ext_pct = ext * 100
        else:
            self.ext_pct = None
        self.X = X
        self.y = g[a.label].rank(pct=True) - 0.5
        if "label_end" in df:
            self.label_end = pd.to_datetime(df["label_end"])
        else:
            self.label_end = df["date"] + pd.Timedelta(days=math.ceil(a.horizon_days * 7 / 5) + 3)
        self.liquid = df["liquid"].astype(bool) if "liquid" in df else pd.Series(True, index=df.index)
        self.sector = df["sector"] if "sector" in df else None
        self.meta = df[["date", "id", "period_ret", a.label] + [c for c in ("adv",) if c in df]].rename(columns={a.label: "fwd"})
        self.dates = df["date"]
        self.embargo = pd.Timedelta(days=a.embargo_days)
        self.train_end = pd.Timestamp(a.train_end)
        self.test_end = pd.Timestamp(a.test_end) if a.test_end else self.dates.max()
        self.obj_end = self.train_end - pd.Timedelta(days=math.ceil(a.horizon_days * 7 / 5) + 3)
        first = self.dates.dt.year.min()
        self.inner = list(range(first + a.min_train_years, self.train_end.year + 1))
        self.inner3 = self.inner[1:]


def rank_pct(raw: pd.Series, dates: pd.Series) -> pd.Series:
    return raw.groupby(dates.loc[raw.index]).rank(pct=True) * 100


def target(y: pd.Series, kind: str) -> pd.Series:
    if kind == "rank":
        return y
    q = float(kind[3:]) / 100
    if kind.startswith("top"):
        return ((y + 0.5) >= 1 - q).astype(float).where(y.notna()) - q
    return -(((y + 0.5) <= q).astype(float).where(y.notna()) - q)


def targets_for(task):
    return ("rank", "bot10", "bot20") if task.startswith("bottom") else ("rank",) if task == "ic" else ("rank", "top10", "top20")


def ridge(Z, yt, dates, alpha):
    w = 1.0 / dates.map(dates.value_counts()).to_numpy()
    w = w * (dates.nunique() / w.sum())
    return Ridge(alpha=alpha).fit(Z.to_numpy(), yt.to_numpy(), sample_weight=w)


# ── metrics ───────────────────────────────────────────────────────────────────────────────────
def accuracy(f: pd.DataFrame) -> dict:
    d = f[["date", "pct", "fwd"]].dropna()
    rp = d.groupby("date")["fwd"].rank(pct=True)
    p = d["pct"] / 100
    hit = lambda sel, ok: float(ok[sel].mean()) if sel.any() else np.nan  # noqa: E731
    return {"top10": hit(p >= .90, rp > .90), "top5": hit(p >= .95, rp > .95),
            "bottom10": hit(p <= .10, rp <= .10), "bottom5": hit(p <= .05, rp <= .05)}


def simulate(f: pd.DataFrame, lo=90.0, hi=100.01, bps=25.0) -> pd.DataFrame:
    rows, prev = [], pd.Series(dtype=float)
    for d, g in f.groupby("date", sort=True):
        g = g.dropna(subset=["period_ret"])
        if g.empty:
            continue
        sel = g[(g["pct"] >= lo) & (g["pct"] < hi)]
        w = pd.Series(1 / len(sel), index=sel["id"].to_numpy()) if len(sel) else pd.Series(dtype=float)
        r = g.set_index("id")["period_ret"]
        i = prev.index.union(w.index)
        turn = float((w.reindex(i).fillna(0) - prev.reindex(i).fillna(0)).abs().sum())
        rows.append({"date": d, "ret": float((w * r.reindex(w.index).fillna(0)).sum()) - turn * bps / 1e4,
                     "turnover": turn, "ids": list(w.index)})
        v = w * (1 + r.reindex(w.index).fillna(0))
        prev = v / v.sum() if v.sum() else w
    return pd.DataFrame(rows).set_index("date") if rows else pd.DataFrame(columns=["ret", "turnover", "ids"])


def perf(r: pd.Series) -> dict:
    if len(r) < 3:
        return {"cagr": np.nan, "sharpe": np.nan}
    nav = (1 + r).cumprod()
    return {"cagr": float(nav.iloc[-1] ** (12 / len(r)) - 1),
            "sharpe": float(r.mean() / r.std(ddof=1) * np.sqrt(12)) if r.std() > 0 else np.nan}


def score(task, f: pd.DataFrame) -> float:
    if f.empty:
        return np.nan
    if task in ("top10", "top5", "bottom10", "bottom5"):
        return accuracy(f)[task]
    if task in ("cagr", "sharpe"):
        return perf(simulate(f)["ret"])[task]
    d = f[["date", "pct", "fwd"]].dropna()
    return float(d.groupby("date").apply(lambda g: g["pct"].corr(g["fwd"], method="spearman")).mean())


def drawdowns(nav: pd.Series) -> tuple[float, float]:
    v = nav.to_numpy()
    if len(v) < 2:
        return 0.0, 0.0
    dd = v[1:] / np.maximum.accumulate(v)[1:] - 1
    return float(dd.min()), float(np.median(dd))


class Daily:
    """Daily closes (wide) for drawdowns; period i holds from close(date_i) to close(date_i+1)."""
    def __init__(self, path):
        p = read(path)
        p["date"] = pd.to_datetime(p["date"])
        self.c = p.pivot(index="date", columns="id", values="close").sort_index().ffill()

    def nav(self, legs: list[tuple[pd.Timestamp, list, list]], turnover: pd.Series, bps=25.0) -> pd.Series:
        c, out, level = self.c, [], 1.0
        for i, (d, longs, shorts) in enumerate(legs[:-1]):
            seg_idx = c.index[(c.index >= d) & (c.index <= legs[i + 1][0])]
            if len(seg_idx) < 2:
                continue
            px = c.loc[seg_idx]

            def rel(ids):
                ids = [x for x in ids if x in px.columns]
                return (px[ids] / px[ids].iloc[0]).mean(axis=1) if ids else pd.Series(1.0, index=seg_idx)
            level *= 1 - float(turnover.get(d, 0.0)) * bps / 1e4
            seg = level * (rel(longs) - (rel(shorts) - 1 if shorts else 0))
            out.append(seg if not out else seg.iloc[1:])
            level = float(seg.iloc[-1])
        return pd.concat(out) if out else pd.Series(dtype=float)


# ── selection ─────────────────────────────────────────────────────────────────────────────────
class Selector:
    def __init__(self, P: Panel, task: str):
        self.P, self.task = P, task

    def liquid(self, f):
        f = f[self.P.liquid.loc[f.index].to_numpy()]
        return f.assign(pct=f.groupby("date")["pct"].rank(pct=True) * 100)

    def frame(self, raw):
        return self.P.meta.loc[raw.index].assign(pct=rank_pct(raw, self.P.dates))

    def tscore(self, f, window=None):
        f = self.liquid(f)
        f = f[f["date"] <= self.P.obj_end]
        if window is not None:
            f = f[f["date"].isin(window)]
        return score(self.task, f)

    def fit(self, Z, yt, alpha, cutoff, pred_mask, univ, sector_lambda=None):
        P = self.P
        k = univ & (P.label_end < cutoff - P.embargo) & (P.dates < cutoff) & yt.notna()
        m = ridge(Z[k], yt[k], P.dates[k], alpha)
        pred = pd.Series(m.predict(Z[pred_mask].to_numpy()), index=Z.index[pred_mask])
        deltas = {}
        if sector_lambda is not None and P.sector is not None:
            res = yt[k] - m.predict(Z[k].to_numpy())
            for s in P.sector[k].dropna().unique():
                ks = k & (P.sector == s)
                if ks.sum() < 2000:
                    continue
                d = ridge(Z[ks], res[ks[k].to_numpy()], P.dates[ks], sector_lambda)
                pm = pred_mask & (P.sector == s)
                if pm.any():
                    pred.loc[Z.index[pm]] += d.predict(Z[pm].to_numpy())
                deltas[s] = pd.Series(m.coef_ + d.coef_, index=Z.columns)
        return pred, (pd.Series(m.coef_, index=Z.columns), deltas)

    def walk(self, Z, yt, alpha, years, univ, sector_lambda=None):
        P = self.P
        return pd.concat([self.fit(Z, yt, alpha, pd.Timestamp(year=V, month=1, day=1), P.dates.dt.year == V, univ, sector_lambda)[0]
                          for V in years])

    def run(self, out: Path) -> dict:
        P, task, t0 = self.P, self.task, time.time()
        tg = targets_for(task)
        broad = P.y.notna() | True
        test_mask = (P.dates > P.train_end) & (P.dates <= P.test_end)
        test_cut = P.train_end + pd.Timedelta(days=1)
        has_ext = P.ext_pct is not None
        emph = EMPH if has_ext else (1.0,)

        def scaled(col, m, base=None):
            Z = (P.X if base is None else base).copy()
            if col in Z:
                Z[col] = Z[col] * m
            return Z

        best, tune, inner, test = {}, {}, {}, {}

        def tune_family(name, univ, Zfun, grid, years):
            rows, keep = [], None
            for params in grid:
                Z, yt = Zfun(params)
                raw = self.walk(Z, yt, params["alpha"], years, univ, params.get("sector_lambda"))
                raw = raw[P.dates.loc[raw.index].dt.year >= self.P.inner3[0]]
                sc = self.tscore(self.frame(raw))
                rows.append({**params, "train_score": sc})
                if keep is None or (sc > keep[0]):
                    keep = (sc, raw, params)
            tune[name] = sorted(rows, key=lambda r: -np.nan_to_num(r["train_score"], nan=-9))
            best[name] = keep[2] | {"train_score": keep[0]}
            inner[name] = self.frame(keep[1])
            log(f"  {name}: {best[name]} ({time.time() - t0:.0f}s)")
            return keep[2]

        grid2 = [{"target": t, "emphasis": m, "alpha": a} for t in tg for m in emph for a in ALPHAS]
        zf2 = lambda p: (scaled("ext", p["emphasis"]), target(P.y, p["target"]))  # noqa: E731
        b = tune_family("V2L", P.liquid, zf2, grid2, P.inner)
        Z, yt = zf2(b)
        v2l_in = self.walk(Z, yt, b["alpha"], P.inner, P.liquid)
        v2l_te, _ = self.fit(Z, yt, b["alpha"], test_cut, test_mask, P.liquid)
        test["V2L"] = self.frame(v2l_te)
        allv = pd.concat([v2l_in, v2l_te])
        v2l_pct = rank_pct(allv, P.dates).reindex(P.X.index)

        b = tune_family("V1", broad, lambda p: (P.X, P.y), [{"alpha": a} for a in ALPHAS], P.inner3)
        test["V1"] = self.frame(self.fit(P.X, P.y, b["alpha"], test_cut, test_mask, broad)[0])
        b = tune_family("V2", broad, zf2, grid2, P.inner3)
        Z, yt = zf2(b)
        test["V2"] = self.frame(self.fit(Z, yt, b["alpha"], test_cut, test_mask, broad)[0])

        X3 = P.X.copy()
        X3["v2l"] = (v2l_pct / 100 - 0.5).fillna(0.0).astype("float32")
        X3["v2l_missing"] = v2l_pct.isna().astype("float32")
        grid3 = [{"target": t, "v2l_emphasis": m, "alpha": a} for t in tg for m in V3_EMPH for a in ALPHAS]
        zf3 = lambda p: (scaled("v2l", p["v2l_emphasis"], X3), target(P.y, p["target"]))  # noqa: E731
        b3 = tune_family("V3", broad, zf3, grid3, P.inner3)
        Z3, y3 = zf3(b3)
        test["V3"] = self.frame(self.fit(Z3, y3, b3["alpha"], test_cut, test_mask, broad)[0])
        v4_weights = {}
        if P.sector is not None:
            grid4 = [b3 | {"sector_lambda": lam} for lam in V4_LAMBDA]
            b4 = tune_family("V4", broad, zf3, grid4, P.inner3)
            te, (gw, deltas) = self.fit(Z3, y3, b3["alpha"], test_cut, test_mask, broad, b4["sector_lambda"])
            test["V4"] = self.frame(te)
            v4_weights = {str(s): w.round(5).to_dict() for s, w in deltas.items()}
        if has_ext:
            ok = P.ext_pct.notna()
            inner["EXT"] = P.meta[ok & (P.dates <= P.obj_end)].assign(pct=P.ext_pct[ok & (P.dates <= P.obj_end)])
            test["EXT"] = P.meta[ok & test_mask].assign(pct=P.ext_pct[ok & test_mask])
            best["EXT"] = {"train_score": np.nan}

        # stage 2: common window
        common = None
        for f in inner.values():
            ds = set(self.liquid(f)["date"])
            common = ds if common is None else common & ds
        common = sorted(d for d in common if d <= P.obj_end)
        board = sorted(({"method": m, "select_score": self.tscore(inner[m], common), "train_score": best[m]["train_score"]}
                        for m in inner), key=lambda r: -np.nan_to_num(r["select_score"], nan=-9))
        chosen = board[0]["method"]
        names = S_NAMES if task.startswith("bottom") else {}
        res = {"task": task, "chosen": names.get(chosen, chosen), "common_window": [str(common[0].date()), str(common[-1].date()), len(common)],
               "leaderboard": [r | {"method": names.get(r["method"], r["method"])} for r in board],
               "settings": {names.get(k, k): v for k, v in best.items()}, "tuning": tune, "v4_sector_weights": v4_weights}
        out.mkdir(parents=True, exist_ok=True)
        (out / "selection.json").write_text(json.dumps(res, indent=1, default=str))
        log(f"  CHOSEN {res['chosen']}: " + ", ".join(f"{r['method']} {r['select_score']:.4f}" for r in res["leaderboard"]))
        pd.to_pickle({"inner": {m: self.liquid(f) for m, f in inner.items()},
                      "test": {m: self.liquid(f) for m, f in test.items()}, "names": names}, out / "frames.pkl")
        return res


# ── reporting ─────────────────────────────────────────────────────────────────────────────────
def periods_for(dates: pd.DatetimeIndex, recent: int) -> dict:
    out = {str(y): (pd.Timestamp(y, 1, 1), pd.Timestamp(y, 12, 31)) for y in sorted(set(dates.year))}
    out["overall"] = (dates.min(), dates.max())
    if recent:
        out[f"last_{recent}_months"] = (dates[-recent], dates.max())
    return out


def scorecards(L: dict, a, bench: pd.Series | None, daily: Daily | None) -> dict:
    ref = next(iter(L.values()))
    dates = pd.DatetimeIndex(sorted(ref.dropna(subset=["period_ret"])["date"].unique()))
    per = periods_for(dates, a.recent_months)
    rows = {}
    series = {}
    for k, f in L.items():
        s = simulate(f)
        series[k] = (s["ret"], [(d, ids, []) for d, ids in s["ids"].items()], s["turnover"])
    ew = ref.dropna(subset=["period_ret"]).groupby("date")["period_ret"].mean()
    series["Median stock"] = (ew, None, None)
    for p, (lo, hi) in per.items():
        rows[p] = {}
        for k, (r, legs, turn) in series.items():
            s = r[(r.index >= lo) & (r.index <= hi)]
            if s.empty:
                continue
            tot = float((1 + s).prod() - 1)
            if daily is not None and legs is not None:
                lg = [x for x in legs if lo <= x[0] <= hi]
                nxt = [x for x in legs if x[0] > hi][:1] or [(daily.c.index[-1], [], [])]
                nav = daily.nav(lg + nxt, turn)
                mdd, med = drawdowns(nav)
            else:
                mdd, med = drawdowns(pd.concat([pd.Series([1.0]), (1 + s).cumprod()]))
            row = {"return": tot, "annualised": float((1 + tot) ** (12 / len(s)) - 1), "max_dd": mdd, "median_dd": med,
                   "months": len(s)}
            if bench is not None:
                b = bench.reindex(s.index)
                row["beat_market"] = float((s > b)[b.notna()].mean()) if b.notna().any() else np.nan
            if k in L:
                f = L[k]
                row |= accuracy(f[(f["date"] >= lo) & (f["date"] <= hi)])
            rows[p][k] = row
    return rows


def md_tables(cards: dict, chosen: str) -> str:
    pc = lambda x: "" if x is None or (isinstance(x, float) and np.isnan(x)) else f"{x * 100:.1f}%"  # noqa: E731
    out = []
    for p, res in cards.items():
        out.append(f"\n### {p}\n\n| | Return | Max DD | Median DD | Beat mkt | Top 10% | Top 5% | Bottom 10% | Bottom 5% |\n|---|---|---|---|---|---|---|---|---|")
        for k, v in res.items():
            name = f"**{k}** (chosen)" if k == chosen else k
            acc = " | ".join(pc(v.get(x)) for x in ("top10", "top5", "bottom10", "bottom5")) if "top10" in v else "*10* | *5* | *10* | *5*"
            out.append(f"| {name} | {pc(v['return'])} | {pc(v['max_dd'])} | {pc(v['median_dd'])} | {pc(v.get('beat_market'))} | {acc} |")
    return "\n".join(out) + "\n"


def cmd_select(a):
    out = Path(a.out)
    P = Panel(a)
    log(f"panel: {len(P.X):,} rows, {len(P.feats)} features, inner years {P.inner[0]}-{P.inner[-1]}, task {a.task}")
    res = Selector(P, a.task).run(out)
    fr = pd.read_pickle(out / "frames.pkl")
    names = fr["names"]
    L = {names.get(k, k): v for k, v in fr["test"].items()}
    bench = None
    if a.benchmark:
        b = read(a.benchmark)
        bench = pd.Series(b["ret"].to_numpy(), index=pd.to_datetime(b["date"]))
    daily = Daily(a.daily_prices) if a.daily_prices else None
    cards = scorecards(L, a, bench, daily)
    res["test"] = cards
    res["drawdowns"] = "daily" if daily else "month-end only (understates risk; pass --daily-prices)"
    (out / "results.json").write_text(json.dumps(res, indent=1, default=str))
    (out / "report.md").write_text(f"# marketml {a.task}: chosen {res['chosen']}\n\nDrawdowns: {res['drawdowns']}.\n"
                                   + md_tables(cards, res["chosen"]), encoding="utf-8")
    log(f"done -> {out / 'report.md'}")


# ── long-short ────────────────────────────────────────────────────────────────────────────────
def ls_legs(lf, sf, short_top_n):
    rows = []
    for d, g in lf.groupby("date", sort=True):
        s = sf[sf["date"] == d]
        if short_top_n and "adv" in s:
            s = s.nlargest(short_top_n, "adv")
        if s.empty:
            continue
        sp = s["pct"].rank(pct=True)
        rows.append((d, g.loc[g["pct"] >= 90, "id"].tolist(), s.loc[sp <= 0.10, "id"].tolist()))
    return rows


def ls_sim(legs, ret: pd.Series, bps=25.0) -> pd.DataFrame:
    out, pl, ps = [], pd.Series(dtype=float), pd.Series(dtype=float)
    for d, L_, S_ in legs:
        if d not in ret.index.get_level_values(0):
            continue
        r = ret.xs(d, level=0)
        wl = pd.Series(1 / len(L_), index=L_) if L_ else pd.Series(dtype=float)
        ws = pd.Series(1 / len(S_), index=S_) if S_ else pd.Series(dtype=float)
        t = sum(float((n.reindex(p.index.union(n.index)).fillna(0) - p.reindex(p.index.union(n.index)).fillna(0)).abs().sum())
                for p, n in ((pl, wl), (ps, ws)))
        rl, rs = float((wl * r.reindex(wl.index).fillna(0)).sum()), float((ws * r.reindex(ws.index).fillna(0)).sum())
        out.append({"date": d, "ret": rl - rs - t * bps / 1e4, "long": rl, "short": rs, "turnover": t})
        dr = lambda w: (w * (1 + r.reindex(w.index).fillna(0))) / (w * (1 + r.reindex(w.index).fillna(0))).sum() if len(w) else w  # noqa: E731
        pl, ps = dr(wl), dr(ws)
    return pd.DataFrame(out).set_index("date")


def cmd_longshort(a):
    top, bot = pd.read_pickle(Path(a.top) / "frames.pkl"), pd.read_pickle(Path(a.bottom) / "frames.pkl")
    names = bot["names"]
    ret = lambda fr: pd.concat([v[["date", "id", "period_ret"]] for v in fr.values()]).drop_duplicates(["date", "id"]) \
        .set_index(["date", "id"])["period_ret"].dropna()  # noqa: E731
    r_in, r_te = ret(top["inner"]), ret(top["test"])
    common = None
    for fr in (top["inner"], bot["inner"]):
        for f in fr.values():
            common = set(f["date"]) if common is None else common & set(f["date"])
    board = []
    for ln, lf in top["inner"].items():
        for sn, sf in bot["inner"].items():
            w = lambda f: f[f["date"].isin(common)]  # noqa: E731
            s = ls_sim(ls_legs(w(lf), w(sf), a.short_top_n), r_in)
            board.append({"long": ln, "short": names.get(sn, sn), "_s": sn, **perf(s["ret"])})
    board.sort(key=lambda r: -np.nan_to_num(r["sharpe"], nan=-9))
    b = board[0]
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    res = {"chosen": {"long": b["long"], "short": b["short"]}, "selection_window": [str(min(common).date()), str(max(common).date())],
           "leaderboard": [{k: v for k, v in r.items() if k != "_s"} for r in board]}
    (out / "selection.json").write_text(json.dumps(res, indent=1, default=str))
    log(f"  CHOSEN long {b['long']} / short {b['short']} (train Sharpe {b['sharpe']:.2f})")
    legs = ls_legs(top["test"][b["long"]], bot["test"][b["_s"]], a.short_top_n)
    s = ls_sim(legs, r_te)
    dates = pd.DatetimeIndex(s.index)
    daily = Daily(a.daily_prices) if a.daily_prices else None
    nav = daily.nav(legs + [(daily.c.index[-1], [], [])], s["turnover"]) if daily else None
    cards = {}
    for p, (lo, hi) in periods_for(dates, a.recent_months).items():
        x = s[(s.index >= lo) & (s.index <= hi)]
        tot = float((1 + x["ret"]).prod() - 1)
        if nav is not None:
            mdd, med = drawdowns(nav[(nav.index >= lo) & (nav.index <= hi + pd.Timedelta(days=40))])
        else:
            mdd, med = drawdowns(pd.concat([pd.Series([1.0]), (1 + x["ret"]).cumprod()]))
        cards[p] = {"return": tot, "annualised": float((1 + tot) ** (12 / len(x)) - 1), **perf(x["ret"]),
                    "max_dd": mdd, "median_dd": med, "positive_months": float((x["ret"] > 0).mean()),
                    "long_leg": float((1 + x["long"]).prod() - 1), "short_leg": float((1 + x["short"]).prod() - 1)}
    res["test"] = cards
    (out / "results.json").write_text(json.dumps(res, indent=1, default=str))
    log(f"done -> {out / 'results.json'}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("select")
    s.add_argument("--data", required=True)
    s.add_argument("--task", choices=TASKS, required=True)
    s.add_argument("--train-end", required=True)
    s.add_argument("--test-end")
    s.add_argument("--label", default="fwd")
    s.add_argument("--horizon-days", type=int, default=63, help="trading days in the label window")
    s.add_argument("--embargo-days", type=int, default=7)
    s.add_argument("--min-train-years", type=int, default=5)
    s.add_argument("--features", help="regex selecting feature columns")
    s.add_argument("--external", help="column with an external model's score (the champion)")
    s.add_argument("--benchmark")
    s.add_argument("--daily-prices")
    s.add_argument("--recent-months", type=int, default=6)
    s.add_argument("--out", required=True)
    l_ = sub.add_parser("longshort")
    l_.add_argument("--top", required=True)
    l_.add_argument("--bottom", required=True)
    l_.add_argument("--short-top-n", type=int, default=0, help="short only inside the N highest-adv stocks (e.g. F&O list)")
    l_.add_argument("--daily-prices")
    l_.add_argument("--recent-months", type=int, default=6)
    l_.add_argument("--out", required=True)
    a = ap.parse_args()
    cmd_select(a) if a.cmd == "select" else cmd_longshort(a)


if __name__ == "__main__":
    main()
