"""Phase 5: real options chains (Yahoo Finance) for a watchlist of heavily traded names. Refreshed each weeknight.
(Named x_options so its page code loads after the other add-ons.)"""
import datetime, json, math, os, time
from concurrent.futures import ThreadPoolExecutor

NAME = "x_options"
WATCH = ("SPY QQQ IWM DIA GLD SLV TLT HYG XLF XLE XLK SMH ARKK EEM "
         "AAPL MSFT NVDA AMZN GOOGL META TSLA AVGO AMD NFLX ORCL CRM ADBE PLTR INTC MU QCOM ARM SMCI "
         "JPM BAC WFC C GS MS V MA PYPL COIN HOOD XOM CVX OXY UNH LLY JNJ PFE MRK ABBV "
         "WMT COST HD TGT KO PEP MCD SBUX NKE DIS BA CAT GE F GM UBER T VZ").split()

def _monthly(d):
    x = datetime.date.fromisoformat(d)
    return x.weekday() == 4 and 15 <= x.day <= 21

def _rows(df, lo, hi):
    out = []
    for r in df.itertuples():
        k = float(r.strike)
        if not lo <= k <= hi: continue
        num = lambda v, d=2: 0 if v is None or (isinstance(v, float) and math.isnan(v)) else round(float(v), d)
        out.append([k, num(r.bid), num(r.ask), num(r.lastPrice), int(num(r.volume, 0)), int(num(r.openInterest, 0)), num(r.impliedVolatility, 4)])
    return out

def _one(t):
    import yfinance as yf
    for attempt in range(3):
        try:
            tk = yf.Ticker(t)
            exps = list(tk.options or [])
            if not exps: return t, None
            spot = float(tk.fast_info["last_price"])
            pick = exps[:4] + [e for e in exps[4:] if _monthly(e)][:6]
            lo, hi = spot * 0.6, spot * 1.4
            xs = []
            for e in pick:
                oc = tk.option_chain(e)
                xs.append({"e": e, "c": _rows(oc.calls, lo, hi), "p": _rows(oc.puts, lo, hi)})
            return t, {"s": round(spot, 2), "x": xs}
        except Exception:
            time.sleep(2 + 3 * attempt)
    return t, None

def fetch(ctx):
    prev = (ctx.get("prev") or {}).get("d", {})
    out, miss = {}, 0
    with ThreadPoolExecutor(4) as pool:
        for t, d in pool.map(_one, WATCH):
            if d: out[t] = d
            else:
                miss += 1
                if t in prev: out[t] = prev[t]
    print(f"Options: {len(out)} of {len(WATCH)} tickers ({miss} failed; previous chain kept where available)")
    return {"asof": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"), "d": out}

def ok(data):
    return len(data.get("d", {})) >= 30

def build(data, meta, out):
    d = (data or {}).get("d", {})
    os.makedirs(f"{out}/data/opt", exist_ok=True)
    for t, rec in d.items():
        json.dump(rec, open(f"{out}/data/opt/{t}.json", "w"), separators=(",", ":"))
    meta["OPT"] = {"t": sorted(d), "asof": (data or {}).get("asof", "")}
