"""Analyst estimates (Bloomberg EE / ANR): EPS estimate trend and revisions, consensus EPS and revenue, ratings,
price targets and recent upgrades and downgrades, from Yahoo Finance. Refreshed each weeknight, and each night's
consensus is saved so the site builds its own estimate history over time. (Named zz_estimates so its page code
loads after the DCF view.)"""
import datetime, json, math, os, time
from concurrent.futures import ThreadPoolExecutor

NAME = "zz_estimates"
PER = ["0q", "+1q", "0y", "+1y"]
KEEP_DAYS = 800


def _n(v, d=4):
    try:
        v = float(v)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(v) or math.isinf(v) else round(v, d)


def _col(df, *names):
    """Column by any of several spellings (Yahoo's casing varies)."""
    low = {str(c).lower(): c for c in df.columns}
    for n in names:
        if n.lower() in low: return low[n.lower()]
    return None


def _per(df, cols):
    out = {}
    if df is None or getattr(df, "empty", True): return out
    cs = [_col(df, *c) if isinstance(c, tuple) else _col(df, c) for c in cols]
    for p in PER:
        if p in df.index:
            r = df.loc[p]
            out[p] = [_n(r[c]) if c is not None else None for c in cs]
    return out


def _one(t):
    import yfinance as yf
    for attempt in range(3):
        try:
            tk = yf.Ticker(t)
            d = {"tr": _per(tk.eps_trend, ["current", "7daysAgo", "30daysAgo", "60daysAgo", "90daysAgo"]),
                 "rv": _per(tk.eps_revisions, ["upLast7days", "upLast30days", ("downLast7days", "downLast7Days"), "downLast30days"]),
                 "ee": _per(tk.earnings_estimate, ["avg", "low", "high", "numberOfAnalysts", "yearAgoEps", "growth"]),
                 "re": _per(tk.revenue_estimate, ["avg", "low", "high", "numberOfAnalysts", "yearAgoRevenue", "growth"])}
            try:
                rc = tk.recommendations
                if rc is not None and not rc.empty:
                    d["rec"] = [[str(r.get("period", "")), *[int(_n(r.get(k)) or 0) for k in ("strongBuy", "buy", "hold", "sell", "strongSell")]]
                                for _, r in rc.iterrows()][:4]
            except Exception:
                pass
            try:
                ud = tk.upgrades_downgrades
                if ud is not None and not ud.empty:
                    ud = ud.sort_index(ascending=False).head(15)
                    d["ud"] = [[i.strftime("%Y-%m-%d"), str(r.get("Firm", "")), str(r.get("ToGrade", "")), str(r.get("FromGrade", "")),
                                str(r.get("Action", "")), _n(r.get("currentPriceTarget"), 2), _n(r.get("priorPriceTarget"), 2)] for i, r in ud.iterrows()]
            except Exception:
                pass
            try:
                pt = tk.analyst_price_targets or {}
                d["pt"] = {k: _n(pt.get(k), 2) for k in ("current", "low", "high", "mean", "median")}
            except Exception:
                pass
            if d["tr"] or d["ee"] or d.get("rec"):
                return t, d
        except Exception:
            pass
        time.sleep(2 + 3 * attempt)
    return t, None


def fetch(ctx):
    prev = (ctx.get("prev") or {}).get("d", {})
    today = datetime.date.today().isoformat()
    cut = (datetime.date.today() - datetime.timedelta(days=KEEP_DAYS)).isoformat()
    out, fails = {}, 0
    with ThreadPoolExecutor(4) as pool:
        for t, d in pool.map(_one, ctx["syms"]):
            old = prev.get(t) or {}
            if not d:
                fails += 1
                if old: out[t] = old
                continue
            # nightly snapshot of the current consensus for this fiscal year and next
            h = {k: [x for x in v if x[0] >= cut] for k, v in (old.get("h") or {}).items()}
            for p in ("0y", "+1y"):
                cur = (d["tr"].get(p) or [None])[0]
                if cur is None: continue
                s = h.setdefault(p, [])
                if s and s[-1][0] == today: s[-1] = [today, cur]
                else: s.append([today, cur])
            d["h"] = h
            out[t] = d
    print(f"Estimates: {len(out)} tickers ({fails} fetch failures, previous copy kept where available)")
    return {"asof": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"), "d": out}


def ok(data):
    return len(data.get("d", {})) >= 300


def build(data, meta, out):
    d = (data or {}).get("d", {})
    os.makedirs(f"{out}/data/est", exist_ok=True)
    er = {}
    for t, rec in d.items():
        json.dump(rec, open(f"{out}/data/est/{t}.json", "w"), separators=(",", ":"))
        tr = (rec.get("tr") or {}).get("0y") or []
        rv = (rec.get("rv") or {}).get("0y") or []
        if len(tr) >= 3 and tr[0] is not None and tr[2] is not None and abs(tr[2]) >= 0.25:  # skip tiny EPS bases
            er[t] = [round((tr[0] - tr[2]) / abs(tr[2]) * 100, 2), rv[1] if len(rv) > 1 else None, rv[3] if len(rv) > 3 else None]
    meta["EST"] = {"t": sorted(d), "asof": (data or {}).get("asof", ""), "r": er}
