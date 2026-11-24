"""Growth and inflation detail for the Economy tab: real GDP growth back to 1947 and its components, GDPNow,
consumer spending (PCE), saving rate, retail sales, and CPI/PCE inflation with shelter, food and energy, plus
recession dates. All from FRED, full history. Refreshed each weeknight. (Named z_macro so its page code loads
after the Jobs view.)"""
import datetime, json, os, time
import requests

NAME = "z_macro"
URL = "https://api.stlouisfed.org/fred/series/observations"
SERIES = [
    # growth
    "A191RL1Q225SBEA", "GDPC1", "GDP", "DPCERY2Q224SBEA", "A006RY2Q224SBEA", "A019RY2Q224SBEA", "A822RY2Q224SBEA",
    "GDPNOW", "PCE", "PCEC96", "PSAVERT", "RSAFS", "RRSFS", "RSXFS",
    # inflation
    "CPIAUCSL", "CPILFESL", "PCEPI", "PCEPILFE", "CUSR0000SAH1", "CPIUFDSL", "CPIENGSL",
    # NBER recession indicator (monthly, 1 = recession)
    "USREC"]


def _one(sid, key):
    for attempt in range(3):
        try:
            j = requests.get(URL, timeout=40, params={"series_id": sid, "api_key": key, "file_type": "json"}).json()
            obs = [(o["date"], float(o["value"])) for o in j["observations"] if o["value"] not in (".", "")]
            if obs: return {"d": [d for d, _ in obs], "v": [round(v, 4) for _, v in obs]}
        except Exception:
            pass
        time.sleep(2 + 3 * attempt)
    return None


def fetch(ctx):
    key = os.environ.get("FRED_API_KEY", "").strip()
    if not key:
        raise RuntimeError("FRED_API_KEY not set")
    prev = (ctx.get("prev") or {}).get("s", {})
    s, miss = {}, []
    for sid in SERIES:
        c = _one(sid, key)
        if c: s[sid] = c
        else:
            miss.append(sid)
            if sid in prev: s[sid] = prev[sid]
    # recessions as [start, end] month ranges, so the page doesn't need the whole 0/1 series
    rec = s.pop("USREC", None)
    bands, start = [], None
    if rec:
        for d, v in zip(rec["d"], rec["v"]):
            if v >= 1 and start is None: start = d
            if v < 1 and start is not None: bands.append([start, d]); start = None
        if start: bands.append([start, rec["d"][-1]])
    elif (ctx.get("prev") or {}).get("rec"):
        bands = ctx["prev"]["rec"]
    print(f"Growth and inflation: {len(SERIES) - len(miss)} of {len(SERIES)} FRED series" + (f" (failed: {', '.join(miss)})" if miss else ""))
    return {"asof": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"), "s": s, "rec": bands}


def ok(data):
    s = data.get("s", {})
    return all(k in s for k in ("A191RL1Q225SBEA", "CPIAUCSL", "PCE", "RSAFS"))


def build(data, meta, out):
    if not data:
        return
    os.makedirs(f"{out}/data", exist_ok=True)
    json.dump(data, open(f"{out}/data/macro.json", "w"), separators=(",", ":"))
    meta["MACRO"] = {"asof": data.get("asof", "")}
