"""Rates tab: Treasury yields, curve spreads, real yields, policy rates and credit spreads from FRED.
Refreshed each weeknight. (Named z_rates so its page code loads after the command bar.)"""
import datetime, json, os, time
import requests

NAME = "z_rates"
URL = "https://api.stlouisfed.org/fred/series/observations"
SERIES = ["DGS1MO", "DGS3MO", "DGS6MO", "DGS1", "DGS2", "DGS3", "DGS5", "DGS7", "DGS10", "DGS20", "DGS30",
          "T10Y2Y", "T10Y3M", "DFF", "SOFR", "DFII10", "T10YIE", "BAMLC0A0CM", "BAMLC0A4CBBB", "BAMLH0A0HYM2"]
START = "2006-01-01"


def _one(sid, key):
    for attempt in range(3):
        try:
            j = requests.get(URL, timeout=30, params={"series_id": sid, "api_key": key, "file_type": "json",
                                                      "observation_start": START}).json()
            return {o["date"]: float(o["value"]) for o in j["observations"] if o["value"] not in (".", "")}
        except Exception:
            time.sleep(2 + 3 * attempt)
    return None


def fetch(ctx):
    key = os.environ.get("FRED_API_KEY", "").strip()
    if not key:
        raise RuntimeError("FRED_API_KEY not set")
    prev = ctx.get("prev") or {}
    pd_, ps = prev.get("d", []), prev.get("s", {})
    cols, miss = {}, []
    for sid in SERIES:
        c = _one(sid, key)
        if c:
            cols[sid] = c
        else:
            miss.append(sid)
            if sid in ps:  # keep last night's copy of a series that failed
                cols[sid] = {d: v for d, v in zip(pd_, ps[sid]) if v is not None}
    base = cols.get("DGS10") or {}
    dates = sorted(base) if base else sorted(set().union(*[c.keys() for c in cols.values()]))
    s = {sid: [c.get(d) for d in dates] for sid, c in cols.items()}
    print(f"Rates: {len(cols)} of {len(SERIES)} FRED series, {len(dates)} days" + (f" (failed: {', '.join(miss)})" if miss else ""))
    return {"asof": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"), "d": dates, "s": s}


def ok(data):
    s = data.get("s", {})
    return all(k in s for k in ("DGS2", "DGS10", "DGS30", "DGS3MO")) and len(data.get("d", [])) > 1000


def build(data, meta, out):
    if not data:
        return
    os.makedirs(f"{out}/data", exist_ok=True)
    json.dump(data, open(f"{out}/data/rates.json", "w"), separators=(",", ":"))
    meta["RATES"] = {"asof": data.get("asof", ""), "last": data["d"][-1] if data.get("d") else ""}
