"""Phase 4: news headlines, earnings and dividend calendars (Yahoo Finance) and the economic calendar (FRED + Fed)."""
import datetime, json, os, time
from concurrent.futures import ThreadPoolExecutor
import pandas as pd, requests

NAME = "wire"
# FOMC decision days (second day of each meeting), from federalreserve.gov/monetarypolicy/fomccalendars.htm
FOMC = ["2026-01-28", "2026-03-18", "2026-04-29", "2026-06-17", "2026-07-29", "2026-09-16", "2026-10-28", "2026-12-09",
        "2027-01-27", "2027-03-17", "2027-04-28", "2027-06-09", "2027-07-28", "2027-09-15", "2027-10-27", "2027-11-17"]
# series: (label, transform) where transform is yoy (% change vs 12 months ago), chg (monthly change) or lvl
IND = {"UNRATE": ("Unemployment rate, %", "lvl"), "PAYEMS": ("Nonfarm payrolls, monthly change (K)", "chg"),
       "CPIAUCSL": ("CPI inflation, year over year %", "yoy"), "PCEPILFE": ("Core PCE inflation, year over year %", "yoy"),
       "A191RL1Q225SBEA": ("Real GDP growth, annualized %", "lvl"), "FEDFUNDS": ("Fed funds rate, %", "lvl"),
       "RSAFS": ("Retail sales, year over year %", "yoy"), "ICSA": ("Initial jobless claims (K)", "lvl"),
       "UMCSENT": ("Consumer sentiment (U. Michigan)", "lvl"), "INDPRO": ("Industrial production, year over year %", "yoy"),
       "JTSJOL": ("Job openings (K)", "lvl"), "T10Y2Y": ("10-year minus 2-year Treasury, pts", "lvl")}
KEY = ["consumer price index", "employment situation", "gross domestic product", "personal income and outlays",
       "advance monthly sales for retail", "producer price index", "job openings and labor turnover", "industrial production",
       "new residential construction", "new residential sales", "surveys of consumers", "unemployment insurance weekly claims",
       "existing home sales", "advance durable goods", "employment cost index", "productivity and costs", "construction spending"]

def _news(items, n):
    out = []
    for it in items or []:
        c = it.get("content") or it
        url = (c.get("canonicalUrl") or {}).get("url") or (c.get("clickThroughUrl") or {}).get("url") or c.get("link")
        title = c.get("title")
        if not url or not title: continue
        src = (c.get("provider") or {}).get("displayName") or c.get("publisher") or ""
        when = c.get("pubDate") or c.get("displayTime") or ""
        if not when and c.get("providerPublishTime"):
            when = datetime.datetime.fromtimestamp(c["providerPublishTime"], datetime.timezone.utc).isoformat()
        out.append({"t": title, "s": src, "w": str(when)[:16].replace("T", " "), "u": url})
        if len(out) >= n: break
    return out

def _d(v):
    if isinstance(v, (list, tuple)): v = v[0] if v else None
    return v.isoformat()[:10] if hasattr(v, "isoformat") else None

def _num(v):
    try: return float(f"{float(v):.4g}")
    except Exception: return None

def _one(t):
    import yfinance as yf
    for attempt in range(3):
        try:
            tk = yf.Ticker(t)
            cal = tk.calendar or {}
            if not isinstance(cal, dict): cal = {}
            c = {"e": _d(cal.get("Earnings Date")), "eA": _num(cal.get("Earnings Average")), "eL": _num(cal.get("Earnings Low")),
                 "eH": _num(cal.get("Earnings High")), "rA": _num(cal.get("Revenue Average")),
                 "x": _d(cal.get("Ex-Dividend Date")), "p": _d(cal.get("Dividend Date"))}
            return t, {"c": {k: v for k, v in c.items() if v is not None}, "n": _news(tk.news, 10)}
        except Exception:
            time.sleep(1 + 2 * attempt)
    return t, None

def _fred(path, **params):
    params.update(api_key=os.environ.get("FRED_API_KEY", "").strip(), file_type="json")
    return requests.get("https://api.stlouisfed.org/fred/" + path, params=params, timeout=30).json()

def _economy():
    today = datetime.date.today()
    eco = []
    try:
        j = _fred("releases/dates", realtime_start=today.isoformat(), realtime_end=(today + datetime.timedelta(days=60)).isoformat(),
                  include_release_dates_with_no_data="true", sort_order="asc", limit=1000)
        seen = set()
        for r in j.get("release_dates", []):
            name = r.get("release_name", "")
            if r["date"] >= today.isoformat() and any(k in name.lower() for k in KEY) and (r["date"], name) not in seen:
                seen.add((r["date"], name)); eco.append([r["date"], name])
    except Exception as e:
        print("Economic calendar failed:", e)
    ind = {}
    for sid, (label, how) in IND.items():
        try:
            obs = _fred("series/observations", series_id=sid, observation_start=str(today.year - 4) + "-01-01")["observations"]
            s = pd.Series({o["date"][:7]: o["value"] for o in obs}).apply(pd.to_numeric, errors="coerce").dropna()
            s = s.groupby(level=0).mean()
            if how == "yoy": s = (s / s.shift(12) - 1) * 100
            elif how == "chg": s = s.diff()
            if sid in ("ICSA",): s = s / 1000
            s = s.dropna().tail(24)
            ind[sid] = {"n": label, "d": s.index.tolist(), "v": [round(float(x), 2) for x in s]}
        except Exception as e:
            print("Indicator failed:", sid, str(e)[:80])
    return eco, ind

def fetch(ctx):
    import yfinance as yf
    prev = (ctx.get("prev") or {}).get("d", {})
    out, miss = {}, 0
    syms, got = list(ctx["syms"]), {}
    with ThreadPoolExecutor(4) as pool:
        for i in range(0, len(syms), 40):  # in chunks, with progress; stop early if Yahoo refuses most requests
            got.update(dict(pool.map(_one, syms[i:i + 40])))
            n_ok = sum(1 for v in got.values() if v)
            print(f"News and events: {len(got)}/{len(syms)} checked, {n_ok} ok", flush=True)
            if n_ok < 0.25 * len(got):
                print("News and events: Yahoo is refusing most requests right now; stopping early and keeping the previous copy", flush=True)
                break
    for t in syms:
        d = got.get(t)
        if d: out[t] = d
        else:
            miss += 1
            if t in prev: out[t] = prev[t]
    top, seen = [], set()
    for s in ["^GSPC", "SPY", "QQQ", "^DJI"]:
        try:
            for n in _news(yf.Ticker(s).news, 20):
                if n["u"] not in seen: seen.add(n["u"]); top.append(n)
        except Exception: pass
    top.sort(key=lambda n: n["w"], reverse=True)
    eco, ind = _economy()
    print(f"News and events: {len(out)} companies ({miss} failed), {len(top)} market headlines, {len(eco)} economic releases, {len(ind)} indicators")
    return {"d": out, "top": top[:30], "eco": eco, "ind": ind}

def ok(data):
    return len(data.get("d", {})) >= 300

def build(data, meta, out):
    data = data or {}
    d = data.get("d", {})
    os.makedirs(f"{out}/data/news", exist_ok=True)
    for t, rec in d.items():
        json.dump(rec.get("n", []), open(f"{out}/data/news/{t}.json", "w"), separators=(",", ":"))
    meta["EV"] = {"cal": {t: rec["c"] for t, rec in d.items() if rec.get("c")}, "top": data.get("top", []),
                  "eco": data.get("eco", []), "ind": data.get("ind", {}), "fomc": FOMC, "news": sorted(t for t, r in d.items() if r.get("n"))}
