"""Profiles for ETFs, bond funds and crypto, so the Company tab follows any asset you select: fund facts (category,
family, assets, expense ratio, yield), top holdings, sector and asset-class mix, and coin facts (market cap,
supply, 24-hour volume). From Yahoo Finance, refreshed weekly. Indexes and currencies use the price data the
site already has. (Named zz_xasset so its page code wraps the Company tab after every other add-on.)"""
import datetime, json, os, time
from concurrent.futures import ThreadPoolExecutor

NAME = "zz_xasset"
ETFS = ("SPY QQQ IWM VOO IVV VTI EEM EFA VEA VWO GLD SLV USO XLF XLE XLK XLV XLI XLY XLP XLU XLB XLRE XLC SMH SOXX ARKK "
        "VNQ VUG VTV IWD IWF IJH IJR QQQM SCHD JEPI DIA TQQQ SQQQ SOXL KRE XBI IBIT IEMG IXUS ITOT SCHB VXUS RSP "
        "AGG BND TLT IEF SHY IEI TLH VGSH VGIT VGLT GOVT SCHO SCHR SPTL BIL SGOV SHV LQD VCIT VCSH VCLT IGIB IGSB HYG JNK "
        "USHY SHYG ANGL EMB PCY BNDX IAGG MUB VTEB TIP SCHP STIP VTIP IUSB BSV BIV BLV FLOT MBB VMBS BKLN SRLN").split()
COINS = "BTC-USD ETH-USD BNB-USD XRP-USD SOL-USD DOGE-USD ADA-USD AVAX-USD LINK-USD TRX-USD".split()


def _num(v):
    try:
        v = float(v)
        return None if v != v else round(v, 6)
    except Exception:
        return None


def _one(t):
    import yfinance as yf
    for attempt in range(2):
        try:
            tk = yf.Ticker(t); info = tk.info or {}
            if not info: raise RuntimeError("empty")
            rec = {"desc": (info.get("longBusinessSummary") or info.get("description") or "")[:1200],
                   "nm": info.get("longName") or info.get("shortName")}
            if t in COINS or t.endswith("-USD"):
                for k, src in {"cap": "marketCap", "circ": "circulatingSupply", "max": "maxSupply", "v24": "volume24Hr",
                               "start": "startDate"}.items():
                    rec[k] = _num(info.get(src))
                return t, rec
            for k, src in {"aum": "totalAssets", "er": "netExpenseRatio", "yld": "yield", "nav": "navPrice",
                           "beta3": "beta3Year", "r3": "threeYearAverageReturn", "r5": "fiveYearAverageReturn",
                           "inc": "fundInceptionDate"}.items():
                rec[k] = _num(info.get(src))
            rec["cat"] = info.get("category"); rec["fam"] = info.get("fundFamily")
            try:
                fd = tk.funds_data
                rec["desc"] = rec["desc"] or (fd.description or "")[:1200]
                ov = fd.fund_overview or {}
                rec["cat"] = rec["cat"] or ov.get("categoryName"); rec["fam"] = rec["fam"] or ov.get("family")
                th = fd.top_holdings
                if th is not None and not th.empty:
                    rec["top"] = [[s, n, _num(p)] for s, (n, p) in zip(th.index, th[["Name", "Holding Percent"]].values)][:10]
                rec["sec"] = {k: _num(v) for k, v in (fd.sector_weightings or {}).items() if _num(v)}
                rec["cls"] = {k: _num(v) for k, v in (fd.asset_classes or {}).items() if _num(v)}
                if rec["er"] is None:
                    try: rec["er"] = _num(fd.fund_operations.iloc[0, 0])
                    except Exception: pass
            except Exception:
                pass
            return t, rec
        except Exception:
            time.sleep(2 + 3 * attempt)
    return t, None


def fetch(ctx):
    prev = ctx.get("prev") or {}
    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    if prev.get("_ts") and len(prev.get("d", {})) >= 60 and (now - datetime.datetime.fromisoformat(prev["_ts"])).days < 6:
        print("Fund and crypto profiles: using this week's copy"); return prev
    old, out, ok, syms = prev.get("d", {}), {}, 0, ETFS + COINS
    import sys  # also pick up any fund or coin added to the site's lists later
    G = getattr(sys.modules.get("__main__"), "G", None) or getattr(sys.modules.get("update"), "G", None) or {}
    for g in ("ETFs", "Bonds", "Crypto"):
        lst = G.get(g, "")
        for t in (lst.split() if isinstance(lst, str) else lst):
            if not t.startswith("^") and t not in syms: syms.append(t)
    with ThreadPoolExecutor(4) as pool:
        for i in range(0, len(syms), 30):
            res = list(pool.map(_one, syms[i:i + 30]))
            n = sum(1 for _, r in res if r)
            for t, r in res:
                if r: out[t] = r
                elif t in old: out[t] = old[t]
            ok += n
            print(f"  Fund and crypto profiles: {min(i + 30, len(syms))}/{len(syms)} ({ok} ok)", flush=True)
            if n < len(res) * 0.25:
                print("  Yahoo is throttling, keeping last copy for the rest"); break
    for t in syms:
        if t not in out and t in old: out[t] = old[t]
    return {"_ts": now.isoformat(timespec="seconds"), "d": out}


def ok(data):
    return len(data.get("d", {})) >= 30


def build(data, meta, out):
    d = (data or {}).get("d", {})
    os.makedirs(f"{out}/data/fp", exist_ok=True)
    fn = lambda t: "".join(ch if ch.isalnum() or ch == "-" else "_" for ch in t)
    for t, rec in d.items():
        json.dump(rec, open(f"{out}/data/fp/{fn(t)}.json", "w"), separators=(",", ":"))
    meta["FP"] = sorted(d)
