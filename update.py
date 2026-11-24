"""Fetch market + housing data and build index.html from template.html.
Usage: python update.py          (fetch everything, then build)
       python update.py --build  (build from existing data/*.json only)"""
import io, json, os, sys, datetime
import numpy as np, pandas as pd, requests

H = {"User-Agent": "Mozilla/5.0"}
os.makedirs("data", exist_ok=True)

# ---------- fetch ----------
def fetch_sp500():
    import yfinance as yf
    html = requests.get("https://en.wikipedia.org/wiki/List_of_S%26P_500_companies", headers=H, timeout=60).text
    t = pd.read_html(io.StringIO(html))[0]
    names = t.set_index("Symbol").Security
    syms = t.Symbol.str.replace(".", "-", regex=False).tolist()
    d = yf.download(syms, period="2y", group_by="ticker", auto_adjust=True, threads=True, progress=False)
    out = {}
    for s in syms:
        try:
            x = d[s].dropna()
            if len(x) < 250: continue
            out[s] = {"n": names[s.replace("-", ".")], "d": [i.strftime("%y%m%d") for i in x.index],
                      "o": x.Open.round(2).tolist(), "h": x.High.round(2).tolist(),
                      "l": x.Low.round(2).tolist(), "c": x.Close.round(2).tolist()}
        except Exception: pass
    print("S&P 500:", len(out)); return out

G = {"ETFs": "SPY QQQ IWM VOO IVV VTI EEM EFA VEA VWO GLD SLV USO XLF XLE XLK XLV XLI XLY XLP XLU XLB XLRE XLC SMH SOXX ARKK VNQ VUG VTV IWD IWF IJH IJR QQQM SCHD JEPI DIA TQQQ SQQQ SOXL KRE XBI IBIT IEMG IXUS ITOT SCHB VXUS RSP",
     "Indexes": "^GSPC ^DJI ^IXIC ^RUT ^VIX ^FTSE ^N225 ^GDAXI ^HSI ^STOXX50E",
     "Currencies": "EURUSD=X JPY=X GBPUSD=X AUDUSD=X CAD=X CHF=X CNY=X NZDUSD=X INR=X MXN=X",
     "Crypto": "BTC-USD ETH-USD BNB-USD XRP-USD SOL-USD DOGE-USD ADA-USD AVAX-USD LINK-USD TRX-USD",
     "Bonds": "^IRX ^FVX ^TNX ^TYX AGG BND TLT IEF SHY IEI TLH VGSH VGIT VGLT GOVT SCHO SCHR SPTL BIL SGOV SHV LQD VCIT VCSH VCLT IGIB IGSB HYG JNK USHY SHYG ANGL EMB PCY BNDX IAGG MUB VTEB TIP SCHP STIP VTIP IUSB BSV BIV BLV FLOT MBB VMBS BKLN SRLN"}

def fetch_extra():
    import yfinance as yf
    g = {k: v.split() for k, v in G.items()}
    d = yf.download(sorted({t for v in g.values() for t in v}), period="5y", auto_adjust=True, group_by="ticker", threads=True, progress=False)
    out = {}
    for k, ts in g.items():
        out[k] = {}
        for t in ts:
            try:
                x = d[t]["Close"].dropna()
                if len(x) < 100: continue
                out[k][t] = {"d": [i.strftime("%y%m%d") for i in x.index], "c": [round(float(v), 4) for v in x]}
            except Exception: pass
    print("Other assets:", {k: len(v) for k, v in out.items()}); return out

FRED = {"CPIAUCSL": "CPI", "CPILFESL": "Core CPI", "MSPUS": "Median sale price", "ASPUS": "Average sale price",
        "MSACSR": "Months supply (new homes)", "ACTLISCOUUS": "Active listings", "PENLISCOUUS": "Pending listings",
        "MEDLISPRIUS": "Median listing price", "MEDDAYONMARUS": "Median days on market",
        "MORTGAGE30US": "30-year mortgage rate", "HOUST": "Housing starts", "CSUSHPINSA": "Case-Shiller home price index"}

def fetch_housing():
    key = os.environ.get("FRED_API_KEY", "").strip()
    out = {"fred": {}, "zillow": {}}
    for c, t in {"Low": "0.0_0.33", "Working": "0.33_0.67", "High": "0.67_1.0"}.items():
        r = requests.get("https://files.zillowstatic.com/research/public_csvs/zhvi/"
                         f"Metro_zhvi_uc_sfrcondo_tier_{t}_sm_sa_month.csv", headers=H, timeout=60)
        z = pd.read_csv(io.StringIO(r.text))
        dc = [x for x in z.columns if x[:2] in ("19", "20") and x >= "2010"]
        us = z[z.RegionName == "United States"][dc].iloc[0]
        out["zillow"][c] = {"d": [x[:7] for x in dc], "v": us.round(0).tolist(),
                            "metros": z[z.RegionType == "msa"][dc[-1]].dropna().round(-3).astype(int).tolist()}
    for k, n in FRED.items():
        j = requests.get("https://api.stlouisfed.org/fred/series/observations", timeout=30,
                         params={"series_id": k, "api_key": key, "file_type": "json", "observation_start": "2010-01-01"}).json()
        if "observations" not in j: raise SystemExit("FRED error: " + str(j.get("error_message", j)))
        d = pd.DataFrame(j["observations"])[["date", "value"]]
        d["value"] = pd.to_numeric(d.value, errors="coerce")
        d = d.dropna().groupby(d.date.str[:7]).value.mean()
        out["fred"][k] = {"n": n, "d": d.index.tolist(), "v": d.round(2).tolist()}
    print("Housing: FRED", len(out["fred"]), "Zillow", list(out["zillow"])); return out

def save_if_ok(name, fn, ok):
    """Keep yesterday's file if today's fetch fails or looks broken."""
    try:
        v = fn()
        if ok(v): json.dump(v, open(f"data/{name}.json", "w"), separators=(",", ":")); return
        print(name, "looked incomplete, keeping previous file")
    except Exception as e:
        print(name, "failed:", e)
    if not os.path.exists(f"data/{name}.json"): raise SystemExit(f"No data for {name}")

# ---------- build ----------
NM = {'^GSPC':'S&P 500','^DJI':'Dow Jones','^IXIC':'Nasdaq Composite','^RUT':'Russell 2000','^VIX':'VIX','^FTSE':'FTSE 100','^N225':'Nikkei 225','^GDAXI':'DAX','^HSI':'Hang Seng','^STOXX50E':'Euro Stoxx 50',
      'EURUSD=X':'EUR/USD','JPY=X':'USD/JPY','GBPUSD=X':'GBP/USD','AUDUSD=X':'AUD/USD','CAD=X':'USD/CAD','CHF=X':'USD/CHF','CNY=X':'USD/CNY','NZDUSD=X':'NZD/USD','INR=X':'USD/INR','MXN=X':'USD/MXN',
      'BTC-USD':'Bitcoin','ETH-USD':'Ethereum','BNB-USD':'BNB','XRP-USD':'XRP','SOL-USD':'Solana','DOGE-USD':'Dogecoin','ADA-USD':'Cardano','AVAX-USD':'Avalanche','LINK-USD':'Chainlink','TRX-USD':'Tron',
      '^IRX':'3-month Treasury yield','^FVX':'5-year Treasury yield','^TNX':'10-year Treasury yield','^TYX':'30-year Treasury yield'}
GL = {'ETFs':'ETF','Indexes':'Index','Currencies':'Currency','Crypto':'Crypto','Bonds':'Bond'}
J = lambda o: json.dumps(o, separators=(",", ":"))

def build():
    D = json.load(open("data/sp500.json")); E = json.load(open("data/extra.json")); HS = json.load(open("data/housing.json"))
    master = max((v["d"] for v in D.values()), key=len)
    C = pd.DataFrame({t: pd.Series(v["c"], index=v["d"]) for t, v in D.items()}).reindex(master)
    ret = C.pct_change(); mkt = ret.mean(axis=1)
    for t, v in D.items():
        r = ret[t].dropna().tail(250); m = mkt.loc[r.index]
        v["b"] = round(float(np.cov(r, m)[0, 1] / np.var(m, ddof=1)), 2)
        v["v"] = round(float(ret[t].dropna().tail(60).std() * np.sqrt(252) * 100), 1)
        if v["d"] == master: del v["d"]
    pool, pidx, X = [], {}, {}
    for g, grp in E.items():
        for t, x in grp.items():
            k = tuple(x["d"])
            if k not in pidx: pidx[k] = len(pool); pool.append(x["d"])
            s = pd.Series(x["c"], index=x["d"])
            r = s.reindex(master).dropna().pct_change().dropna().tail(250); m = mkt.reindex(r.index)
            own = s.pct_change().dropna().tail(60)
            X[t] = {"g": GL[g], "n": NM.get(t, t), "i": pidx[k],
                    "c": [round(z, 4 if min(x["c"]) < 5 else 2) for z in x["c"]],
                    "b": round(float(np.cov(r, m)[0, 1] / np.var(m, ddof=1)), 2),
                    "v": round(float(own.std() * np.sqrt(365 if g == "Crypto" else 252) * 100), 1)}
    s = open("template.html").read()
    for tok, val in [("/*RAW*/{}", J(D)), ("/*RD*/[]", J(master)), ("/*HS*/{}", J(HS)), ("/*EXT*/{}", J(X)), ("/*POOL*/[]", J(pool)),
                     ("/*STAMP*/", datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"))]:
        assert tok in s, tok; s = s.replace(tok, val)
    os.makedirs("public", exist_ok=True)
    open("public/index.html", "w").write(s)
    print("Built public/index.html", round(len(s) / 1e6, 1), "MB")

if __name__ == "__main__":
    if "--build" not in sys.argv:
        save_if_ok("sp500", fetch_sp500, lambda v: len(v) > 450)
        save_if_ok("extra", fetch_extra, lambda v: sum(len(x) for x in v.values()) > 100)
        save_if_ok("housing", fetch_housing, lambda v: len(v["fred"]) == len(FRED) and len(v["zillow"]) == 3)
    build()
