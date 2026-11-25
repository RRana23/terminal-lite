"""Phase 3: company profile, institutional holders and insider trades from Yahoo Finance. Refreshed each weeknight."""
import datetime, json, os, time
from concurrent.futures import ThreadPoolExecutor

NAME = "holders"

def _records(df, keep, n):
    if df is None or getattr(df, "empty", True): return []
    df = df.reset_index() if df.index.name else df
    rows = []
    for r in df.head(n).to_dict("records"):
        o = {}
        for k in keep:
            v = r.get(k)
            if v is None or v != v: continue
            if hasattr(v, "isoformat"): v = v.isoformat()[:10]
            elif isinstance(v, float): v = float(f"{v:.6g}")
            elif hasattr(v, "item"): v = v.item()
            o[k] = v
        rows.append(o)
    return rows

def _one(t):
    import yfinance as yf
    for attempt in range(3):
        try:
            tk = yf.Ticker(t); info = tk.info or {}
            mh = tk.major_holders
            major = {}
            if mh is not None and not mh.empty and "Value" in mh.columns:
                major = {k: float(v) for k, v in mh["Value"].items() if isinstance(v, (int, float))}
            return t, {"about": (info.get("longBusinessSummary") or "")[:900], "emp": info.get("fullTimeEmployees"),
                       "web": info.get("website"), "ir": info.get("irWebsite"), "hq": ", ".join(x for x in [info.get("city"), info.get("state") or info.get("country")] if x),
                       "major": major,
                       "inst": _records(tk.institutional_holders, ["Date Reported", "Holder", "pctHeld", "Shares", "Value", "pctChange"], 10),
                       "funds": _records(tk.mutualfund_holders, ["Date Reported", "Holder", "pctHeld", "Shares", "Value", "pctChange"], 10),
                       "ins": _records(tk.insider_transactions, ["Start Date", "Insider", "Position", "Text", "Shares", "Value", "Ownership"], 25)}
        except Exception:
            time.sleep(2 + 3 * attempt)
    return t, None

def fetch(ctx):
    prev = ctx.get("prev")
    old, out, miss, ok_n, syms = (prev or {}).get("d", {}), {}, 0, 0, list(ctx["syms"])
    with ThreadPoolExecutor(4) as pool:
        for i in range(0, len(syms), 40):  # in chunks; stop early if Yahoo refuses most requests
            res = list(pool.map(_one, syms[i:i + 40]))
            n = sum(1 for _, d in res if d); ok_n += n
            for t, d in res:
                if d: out[t] = d
                else:
                    miss += 1
                    if t in old: out[t] = old[t]
            print(f"Holders: {min(i + 40, len(syms))}/{len(syms)} ({ok_n} ok)", flush=True)
            if n < 0.25 * len(res) and ok_n < 0.25 * (i + len(res)):
                print("Holders: Yahoo is refusing most requests right now; keeping the previous copy for the rest", flush=True); break
    for t in syms:
        if t not in out and t in old: out[t] = old[t]
    print(f"Holders: {len(out)} companies ({miss} failed; previous copy kept where available)")
    return {"_ts": datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None).isoformat(timespec="seconds"), "d": out}

def ok(data):
    return len(data.get("d", {})) >= 400

def build(data, meta, out):
    d = (data or {}).get("d", {})
    os.makedirs(f"{out}/data/own", exist_ok=True)
    for t, rec in d.items():
        json.dump(rec, open(f"{out}/data/own/{t}.json", "w"), separators=(",", ":"))
    meta["OWN"] = sorted(d)
