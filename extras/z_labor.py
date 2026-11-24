"""Labor market (Bloomberg NFP / ECST style): unemployment, payrolls by sector, participation, wages, jobless claims
and job openings from FRED (Bureau of Labor Statistics and Department of Labor data). Refreshed each weeknight.
(Named z_labor so its page code loads after the command bar.)"""
import datetime, json, os, time
import requests

NAME = "z_labor"
URL = "https://api.stlouisfed.org/fred/series/observations"
START = "2000-01-01"
SERIES = [
    "UNRATE", "U6RATE", "PAYEMS", "CIVPART", "LNS11300060", "LNS12300060", "CES0500000003", "UNEMPLOY",
    "ICSA", "CCSA", "JTSJOL", "JTSQUR", "JTSHIR", "JTSLDR", "CPIAUCSL",
    # payrolls by supersector (thousands of jobs)
    "USMINE", "USCONS", "MANEMP", "USTPU", "USINFO", "USFIRE", "USPBS", "USEHS", "USLAH", "USSERV", "USGOVT"]


def _one(sid, key):
    for attempt in range(3):
        try:
            j = requests.get(URL, timeout=30, params={"series_id": sid, "api_key": key, "file_type": "json",
                                                      "observation_start": START}).json()
            obs = [(o["date"], float(o["value"])) for o in j["observations"] if o["value"] not in (".", "")]
            if obs: return {"d": [d for d, _ in obs], "v": [round(v, 3) for _, v in obs]}
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
    print(f"Labor: {len(SERIES) - len(miss)} of {len(SERIES)} FRED series" + (f" (failed: {', '.join(miss)})" if miss else ""))
    return {"asof": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"), "s": s}


def ok(data):
    s = data.get("s", {})
    return all(k in s for k in ("UNRATE", "PAYEMS", "ICSA"))


def build(data, meta, out):
    if not data:
        return
    os.makedirs(f"{out}/data", exist_ok=True)
    json.dump(data, open(f"{out}/data/labor.json", "w"), separators=(",", ":"))
    meta["LABOR"] = {"asof": data.get("asof", "")}
