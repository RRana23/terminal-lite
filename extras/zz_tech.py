"""Intraday prices: 5-minute bars with volume for the last 5 sessions, for every ETF, the crypto list and the 100
largest S&P 500 stocks (Yahoo Finance keeps about 60 days of 5-minute data for free). The page uses them for an
intraday chart with each session's VWAP. Refreshed each weeknight. Page code (zz_tech.js) adds technical studies to every price chart; named zz_tech so
it loads after the moving-average add-on."""
import datetime, json, os, time

NAME = "zz_tech"
ETF_CRYPTO = ("SPY QQQ IWM VOO IVV VTI EEM EFA VEA VWO GLD SLV USO XLF XLE XLK XLV XLI XLY XLP XLU XLB XLRE XLC SMH SOXX "
              "ARKK VNQ VUG VTV IWD IWF IJH IJR QQQM SCHD JEPI DIA TQQQ SQQQ SOXL KRE XBI IBIT IEMG IXUS ITOT SCHB VXUS RSP "
              "TLT HYG LQD AGG "
              "BTC-USD ETH-USD BNB-USD XRP-USD SOL-USD DOGE-USD ADA-USD AVAX-USD LINK-USD TRX-USD").split()


def _top(syms, n=100):
    try:
        f = json.load(open("cache/fundamentals.json")).get("d", {})
        return sorted([t for t in syms if (f.get(t) or {}).get("cap")], key=lambda t: -f[t]["cap"])[:n] or syms[:n]
    except Exception:
        return syms[:n]


def _one(df):
    df = df.dropna(subset=["Close"])
    if df.empty: return None
    ts = [int(i.timestamp() // 60) for i in df.index]  # minutes since 1970, UTC
    r = lambda col: [round(float(v), 4) for v in df[col]]
    return {"t": ts, "o": r("Open"), "h": r("High"), "l": r("Low"), "c": r("Close"), "v": [int(v) for v in df["Volume"].fillna(0)]}


def fetch(ctx):
    import yfinance as yf
    syms = list(dict.fromkeys(ETF_CRYPTO + _top([t for t in ctx["syms"] if not t.startswith("^")])))
    prev, out, ok = (ctx.get("prev") or {}).get("d", {}), {}, 0
    for i in range(0, len(syms), 40):
        part = syms[i:i + 40]
        for attempt in range(2):
            try:
                d = yf.download(part, period="5d", interval="5m", group_by="ticker", auto_adjust=False, threads=True, progress=False)
                break
            except Exception as e:
                d = None; print("  intraday batch failed:", str(e)[:100]); time.sleep(5)
        got = 0
        for t in part:
            try:
                rec = _one(d[t]) if d is not None else None
            except Exception:
                rec = None
            if rec and len(rec["t"]) > 20: out[t] = rec; got += 1
            elif t in prev: out[t] = prev[t]
        ok += got
        print(f"  Intraday 5-minute bars: {min(i + 40, len(syms))}/{len(syms)} ({ok} ok)", flush=True)
    return {"_ts": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"), "d": out}


def ok(data):
    return len(data.get("d", {})) >= 40


def build(data, meta, out):
    d = (data or {}).get("d", {})
    os.makedirs(f"{out}/data/in", exist_ok=True)
    fn = lambda t: "".join(ch if ch.isalnum() or ch == "-" else "_" for ch in t)
    for t, rec in d.items():
        json.dump(rec, open(f"{out}/data/in/{fn(t)}.json", "w"), separators=(",", ":"))
    meta["INTRA"] = {"t": sorted(d), "asof": (data or {}).get("_ts", "")}
