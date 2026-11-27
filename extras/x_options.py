"""Phase 5: real options chains (Yahoo Finance) for every stock, ETF and index on the site that has listed options.
Refreshed each weeknight. Expirations follow a terminal-style ladder: 4 weekly, 6 monthly, 2 long-dated January.
(Named x_options so its page code loads after the other add-ons.)"""
import datetime, json, math, os, time
from concurrent.futures import ThreadPoolExecutor

NAME = "x_options"
WATCH = ("SPY QQQ IWM DIA GLD SLV TLT HYG XLF XLE XLK SMH ARKK EEM "
         "AAPL MSFT NVDA AMZN GOOGL META TSLA AVGO AMD NFLX ORCL CRM ADBE PLTR INTC MU QCOM ARM SMCI "
         "JPM BAC WFC C GS MS V MA PYPL COIN HOOD XOM CVX OXY UNH LLY JNJ PFE MRK ABBV "
         "WMT COST HD TGT KO PEP MCD SBUX NKE DIS BA CAT GE F GM UBER T VZ").split()

INDEX_OPT = {"^GSPC": "^SPX", "^RUT": "^RUT", "^VIX": "^VIX"}  # site ticker: Yahoo ticker for its index options
TIME_CAP = 120 * 60  # seconds; past this, keep last night's chains for the rest so the build stays well under 6 hours


def _d(s):
    return datetime.date.fromisoformat(s)


def pick_expiries(exps, today=None):
    """Terminal-style ladder: the next 4 weekly (Friday) expirations, the next 6 monthly (third Friday) and the
    next 2 long-dated January expirations. An expiration moved to Thursday by a Friday holiday counts as that
    Friday's. Daily Monday-Thursday expirations are skipped. Returns [(date, tag)] with tag W, M or L."""
    today = today or datetime.date.today()
    ds = sorted({e for e in exps if _d(e) > today})  # the build runs after the close, so today's expirations are done
    have = set(ds)
    fri = lambda x: x.weekday() == 4 or (x.weekday() == 3 and (x + datetime.timedelta(days=1)).isoformat() not in have)
    third = lambda x: (x.weekday() == 4 and 15 <= x.day <= 21) or (x.weekday() == 3 and 14 <= x.day <= 20 and (x + datetime.timedelta(days=1)).isoformat() not in have)
    week = [e for e in ds if fri(_d(e))][:4]
    month = [e for e in ds if third(_d(e))][:6]
    last_m = _d(month[-1]) if month else today
    leap = [e for e in ds if third(_d(e)) and _d(e).month == 1 and _d(e) > last_m and (_d(e) - today).days > 180][:2]
    tag = {e: "W" for e in week}
    tag.update({e: "M" for e in month})
    tag.update({e: "L" for e in leap})
    if not tag:  # unusual calendars: just take the nearest few
        tag = {e: "W" for e in ds[:6]}
    return sorted(tag.items())


def _rows(df, lo, hi):
    out = []
    for r in df.itertuples():
        k = float(r.strike)
        if not lo <= k <= hi: continue
        num = lambda v, d=2: 0 if v is None or (isinstance(v, float) and math.isnan(v)) else round(float(v), d)
        out.append([k, num(r.bid), num(r.ask), num(r.lastPrice), int(num(r.volume, 0)), int(num(r.openInterest, 0)), num(r.impliedVolatility, 4)])
    return out


def _one(t):
    """(ticker, chain) on success, (ticker, "none") if Yahoo lists no options for it, (ticker, None) on failure."""
    import yfinance as yf
    for attempt in range(3):
        try:
            tk = yf.Ticker(INDEX_OPT.get(t, t))
            exps = list(tk.options or [])
            if not exps: return t, "none"
            spot = float(tk.fast_info["last_price"])
            xs = []
            for e, g in pick_expiries(exps):
                lo, hi = (spot * 0.5, spot * 1.6) if g == "L" else (spot * 0.65, spot * 1.35)
                oc = tk.option_chain(e)
                c, p = _rows(oc.calls, lo, hi), _rows(oc.puts, lo, hi)
                if c or p: xs.append({"e": e, "g": g, "c": c, "p": p})
            return t, ({"s": round(spot, 2), "x": xs} if xs else "none")
        except Exception:
            time.sleep(2 + 3 * attempt)
    return t, None


def universe(ctx):
    """Every stock, ETF, bond ETF, mutual fund, crypto and index on the site that could have listed options.
    The most traded names go first so a throttled night still covers them."""
    import sys
    G = getattr(sys.modules.get("__main__"), "G", None) or getattr(sys.modules.get("update"), "G", None) or {}
    other = []
    for g in ("ETFs", "Funds", "Bonds", "Crypto"):
        lst = G.get(g, "")
        other += [t for t in (lst.split() if isinstance(lst, str) else lst) if not t.startswith("^")]
    return list(dict.fromkeys(WATCH + list(INDEX_OPT) + other + list(ctx.get("syms") or [])))


def fetch(ctx):
    prev = ctx.get("prev") or {}
    old, old_none = prev.get("d", {}), set(prev.get("none", []))
    syms = universe(ctx)
    # tickers with no listed options last time are re-checked on Mondays only, to save requests
    recheck = datetime.date.today().weekday() == 0
    todo = [t for t in syms if recheck or t not in old_none]
    out, none, fail, t0, stopped = {}, set() if recheck else old_none & set(syms), [], time.time(), False
    with ThreadPoolExecutor(6) as pool:
        for i in range(0, len(todo), 48):
            part = todo[i:i + 48]
            res = list(pool.map(_one, part))
            n = 0
            for t, r in res:
                if r == "none": none.add(t); n += 1
                elif r: out[t] = r; n += 1
                else:
                    fail.append(t)
                    if t in old: out[t] = old[t]
            print(f"Options: {min(i + 48, len(todo))}/{len(todo)} checked, {len(out)} chains, {len(none)} with no options", flush=True)
            if n < 0.25 * len(part) and (len(out) + len(none)) < 0.25 * (i + len(part)):
                print("Options: Yahoo is refusing most requests right now; keeping last night's chains for the rest", flush=True); stopped = True
            elif time.time() - t0 > TIME_CAP:
                print("Options: time limit reached; keeping last night's chains for the rest", flush=True); stopped = True
            if stopped:
                rest = todo[i + 48:]
                for t in rest:
                    if t in old: out[t] = old[t]
                fail += rest
                break
    fail = [t for t in fail if t not in none]
    print(f"Options: {len(out)} chains, {len(none)} with no listed options, {len(fail)} not refreshed tonight"
          + (" (e.g. " + ", ".join(fail[:15]) + ")" if fail else ""))
    return {"asof": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"), "d": out,
            "none": sorted(none), "fail": sorted(fail)}


def ok(data):
    return len(data.get("d", {})) >= 30

def build(data, meta, out):
    d = (data or {}).get("d", {})
    os.makedirs(f"{out}/data/opt", exist_ok=True)
    for t, rec in d.items():
        json.dump(rec, open(f"{out}/data/opt/{''.join(ch if ch.isalnum() or ch == '-' else '_' for ch in t)}.json", "w"), separators=(",", ":"))
    meta["OPT"] = {"t": sorted(d), "asof": (data or {}).get("asof", ""), "none": (data or {}).get("none", []),
                   "fail": [t for t in (data or {}).get("fail", []) if t not in d]}
