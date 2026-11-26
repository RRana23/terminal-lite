"""Fetch market + housing data and build the site into public/.
Usage: python update.py          (fetch everything, then build)
       python update.py --build  (build from cached/seed data only)"""
import glob, importlib, io, json, os, re, shutil, sys, datetime
import numpy as np, pandas as pd, requests

H = {"User-Agent": "Mozilla/5.0"}
CACHE = "cache"
os.makedirs(CACHE, exist_ok=True)

# ---------- fetch ----------
def _members(url):
    html = requests.get(url, headers=H, timeout=60).text
    t = next(x for x in pd.read_html(io.StringIO(html)) if "Symbol" in x.columns and "Security" in x.columns)
    return {str(s).replace(".", "-"): n for s, n in zip(t.Symbol, t.Security)}

def fetch_sp500():
    """S&P 500 (large caps) plus the S&P MidCap 400. Mid caps are tagged "x": 4. Cache name stays sp500."""
    import yfinance as yf
    big = _members("https://en.wikipedia.org/wiki/List_of_S%26P_500_companies")
    try:
        mid = {s: n for s, n in _members("https://en.wikipedia.org/wiki/List_of_S%26P_400_companies").items() if s not in big}
    except Exception as e:
        print("S&P 400 list failed, large caps only:", e); mid = {}
    names = {**big, **mid}; syms = list(names)
    d = yf.download(syms, period="10y", group_by="ticker", auto_adjust=True, threads=True, progress=False)
    out = {}
    for s in syms:
        try:
            x = d[s].dropna()
            if len(x) < 250: continue
            out[s] = {"n": names[s], "d": [i.strftime("%y%m%d") for i in x.index],
                      "o": x.Open.round(2).tolist(), "h": x.High.round(2).tolist(),
                      "l": x.Low.round(2).tolist(), "c": x.Close.round(2).tolist(),
                      "vol": [int(v) for v in x.Volume.fillna(0)]}
            if s in mid: out[s]["x"] = 4
        except Exception: pass
    prev = load("sp500") or {}
    for s in syms:  # a ticker Yahoo skipped tonight keeps yesterday's prices rather than vanishing from the site
        if s not in out and s in prev: out[s] = dict(prev[s], **({"x": 4} if s in mid else {}))
    print("Stocks:", sum(1 for v in out.values() if "x" not in v), "S&P 500 and", sum(1 for v in out.values() if "x" in v), "MidCap 400"); return out

G = {"ETFs": "SPY QQQ IWM VOO IVV VTI EEM EFA VEA VWO GLD SLV USO XLF XLE XLK XLV XLI XLY XLP XLU XLB XLRE XLC SMH SOXX ARKK VNQ VUG VTV IWD IWF IJH IJR QQQM SCHD JEPI DIA TQQQ SQQQ SOXL KRE XBI IBIT IEMG IXUS ITOT SCHB VXUS RSP SPYD",
     "Funds": "FXAIX",
     "Indexes": "^GSPC ^DJI ^IXIC ^RUT ^VIX ^FTSE ^N225 ^GDAXI ^HSI ^STOXX50E",
     "Currencies": "EURUSD=X JPY=X GBPUSD=X AUDUSD=X CAD=X CHF=X CNY=X NZDUSD=X INR=X MXN=X",
     "Crypto": "BTC-USD ETH-USD BNB-USD XRP-USD SOL-USD DOGE-USD ADA-USD AVAX-USD LINK-USD TRX-USD",
     "Bonds": "^IRX ^FVX ^TNX ^TYX AGG BND TLT IEF SHY IEI TLH VGSH VGIT VGLT GOVT SCHO SCHR SPTL BIL SGOV SHV LQD VCIT VCSH VCLT IGIB IGSB HYG JNK USHY SHYG ANGL EMB PCY BNDX IAGG MUB VTEB TIP SCHP STIP VTIP IUSB BSV BIV BLV FLOT MBB VMBS BKLN SRLN"}

def fetch_extra():
    import yfinance as yf
    g = {k: v.split() for k, v in G.items()}
    d = yf.download(sorted({t for v in g.values() for t in v}), period="10y", auto_adjust=True, group_by="ticker", threads=True, progress=False)
    out = {}
    for k, ts in g.items():
        out[k] = {}
        for t in ts:
            try:
                y = d[t].dropna(subset=["Close"]); x = y["Close"]
                if len(x) < 100: continue
                r4 = lambda col: [round(float(v), 4) for v in y[col].fillna(y["Close"])]
                out[k][t] = {"d": [i.strftime("%y%m%d") for i in x.index], "c": [round(float(v), 4) for v in x],
                             "h": r4("High"), "l": r4("Low")}
                vol = y["Volume"].fillna(0)
                if vol.tail(250).gt(0).mean() > .5: out[k][t]["vol"] = [int(v) for v in vol]
            except Exception: pass
    # spot currencies trade over the counter with no published volume; CME futures volume is the usual stand-in
    try:
        fx = {t: f for t, f in FUT.items() if t in out.get("Currencies", {})}
        fd = yf.download(sorted(set(fx.values())), period="10y", auto_adjust=True, group_by="ticker", threads=True, progress=False)
        for t, f in fx.items():
            try:
                v = fd[f]["Volume"].dropna(); m = {i.strftime("%y%m%d"): int(x) for i, x in v.items()}
                o = out["Currencies"][t]; o["fvol"] = [m.get(d, 0) for d in o["d"]]; o["fsym"] = f
            except Exception: pass
    except Exception as e:
        print("Currency futures volume skipped:", e)
    print("Other assets:", {k: len(v) for k, v in out.items()}); return out

FUT = {"EURUSD=X": "6E=F", "JPY=X": "6J=F", "GBPUSD=X": "6B=F", "AUDUSD=X": "6A=F", "CAD=X": "6C=F", "CHF=X": "6S=F",
       "NZDUSD=X": "6N=F", "MXN=X": "6M=F"}

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

def path(name):
    """Newest good copy: tonight's cache, else the seed file committed in the repo."""
    c = f"{CACHE}/{name}.json"
    return c if os.path.exists(c) else f"{name}.json"

def save_if_ok(name, fn, ok, required=True):
    """Keep the previous file if today's fetch fails or looks broken."""
    try:
        v = fn()
        if ok(v): json.dump(v, open(f"{CACHE}/{name}.json", "w"), separators=(",", ":")); return
        print(name, "looked incomplete, keeping previous file")
    except Exception as e:
        print(name, "failed:", e)
    if required and not os.path.exists(path(name)): raise SystemExit(f"No data for {name}")

# Add-on modules: each extras/<name>.py has NAME, fetch(ctx), ok(data), build(data, meta, out),
# and an optional extras/<name>.js loaded in the browser after app.js.
EXTRAS = [importlib.import_module("extras." + os.path.basename(p)[:-3]) for p in sorted(glob.glob("extras/*.py"))]

def load(name):
    p = path(name)
    return json.load(open(p)) if os.path.exists(p) else None

# ---------- build ----------
NM = {'^GSPC':'S&P 500','^DJI':'Dow Jones','^IXIC':'Nasdaq Composite','^RUT':'Russell 2000','^VIX':'VIX','^FTSE':'FTSE 100','^N225':'Nikkei 225','^GDAXI':'DAX','^HSI':'Hang Seng','^STOXX50E':'Euro Stoxx 50',
      'EURUSD=X':'EUR/USD','JPY=X':'USD/JPY','GBPUSD=X':'GBP/USD','AUDUSD=X':'AUD/USD','CAD=X':'USD/CAD','CHF=X':'USD/CHF','CNY=X':'USD/CNY','NZDUSD=X':'NZD/USD','INR=X':'USD/INR','MXN=X':'USD/MXN',
      'BTC-USD':'Bitcoin','ETH-USD':'Ethereum','BNB-USD':'BNB','XRP-USD':'XRP','SOL-USD':'Solana','DOGE-USD':'Dogecoin','ADA-USD':'Cardano','AVAX-USD':'Avalanche','LINK-USD':'Chainlink','TRX-USD':'Tron',
      'SPYD':'SPDR Portfolio S&P 500 High Dividend ETF','FXAIX':'Fidelity 500 Index Fund',
      '^IRX':'3-month Treasury yield','^FVX':'5-year Treasury yield','^TNX':'10-year Treasury yield','^TYX':'30-year Treasury yield'}
GL = {'ETFs':'ETF','Funds':'Fund','Indexes':'Index','Currencies':'Currency','Crypto':'Crypto','Bonds':'Bond'}
J = lambda o: json.dumps(o, separators=(",", ":"))

def split_template():
    """Turn template.html into a small page shell plus app.js that loads data on demand."""
    s = open("template.html").read()
    i = s.index("<script>"); j = s.rindex("</script>")
    js, html = s[i + 8:j], s[:i] + "@@BOOT@@" + s[j + 9:]
    def rep(o, n):
        nonlocal js
        if js.count(o) != 1: raise SystemExit("template patch did not match: " + o[:60])
        js = js.replace(o, n)
    rep("const RAW=/*RAW*/{},RD=/*RD*/[],CO={};", "const RAW=META.S,RD=META.RD,CO={};")
    rep("px=x.c[x.c.length-1]", "px=x.p")
    rep("const HS=/*HS*/{},HF=", "const HS=META.HS,HF=")
    rep("const EXT=/*EXT*/{},POOL=/*POOL*/[];", "const EXT=META.X;")
    rep("{d:POOL[EXT[t].i],c:EXT[t].c}", "{d:EXT[t].d,c:EXT[t].c}")
    a = js.index("function STK(){"); b = js.index("\n", a)
    js = js[:a] + "function STK(){return _ST||(_ST=Object.keys(RAW).map(t=>{const m=RAW[t];return{t,nm:CO[t][0],mom:m.mom,y:m.y,dd:m.dd,v:m.v,b:m.b,rsi:m.rsi}}))}" + js[b:]
    rep("const o=RD.map(d=>{", "const o=RD.slice(-W2).map(d=>{")
    rep("const L=RD.length,V=Array(L).fill(0);", "const L=Math.min(W2,RD.length),V=Array(L).fill(0);")
    rep("V=Array(RD.length).fill(0)", "V=Array(Math.min(W2,RD.length)).fill(0)")
    rep("'2Y':730,'5Y':1826}", "'2Y':730,'5Y':1826,'10Y':3653}")
    rep("'2Y','5Y'].map(g=>", "'2Y','5Y','10Y'].map(g=>")
    rep("['1M','3M','6M','1Y','2Y','5Y'],XR)", "['1M','3M','6M','1Y','2Y','5Y','10Y'],XR)")
    rep("{'1D':130,'1W':104,'1M':24}", "{'1D':130,'1W':156,'1M':120}")
    rep("function render(){", """const W2=504,LD={},fnm=t=>t.replace(/[^A-Za-z0-9-]/g,'_');
function load(t){const o=A(t);return LD[t]||(LD[t]=fetch('data/'+(RAW[t]?'s/':'x/')+fnm(t)+'.json?v='+META.v).then(r=>{if(!r.ok)throw Error(t+' '+r.status);return r.json()}).then(j=>{Object.assign(o,j);o._ok=1}).catch(e=>{delete LD[t];throw e}))}
function reqs(){if(tab==0)return[ac,...MON];if(tab==3)return[...SEL,'^VIX'];if(tab==4)return PF.map(h=>h.t);if(tab==2){const n=JOBS[JOB][0];return /^Risk/.test(n)?['^VIX','^TNX','^IRX']:/^Macro/.test(n)?['^IRX','^FVX','^TNX','^TYX',...MON]:/^Wealth/.test(n)?MT:/^Crypto/.test(n)?Object.keys(EXT).filter(t=>EXT[t].g=='Crypto'):/^Corporate/.test(n)?Object.keys(EXT).filter(t=>EXT[t].g=='Currency'):[]}return[]}
function render(){const m=reqs().filter(t=>A(t)&&!A(t)._ok);if(!m.length)return render0();$('#v').innerHTML='<p class="mu m">Loading '+m.length+' series\\u2026</p>';Promise.all(m.map(load)).then(render0,e=>{$('#v').innerHTML='<p class="dn">Could not load data ('+e.message+'). Refresh to try again.</p>'})}
function render0(){""")
    boot = ("<script>\nfetch('data/meta.json?v=/*STAMPV*/').then(r=>r.json()).then(j=>{window.META=j;const L=/*SCRIPTS*/;"
            "(function n(i){if(i>=L.length)return;const s=document.createElement('script');s.src=L[i]+'?v='+j.v;s.onload=()=>n(i+1);document.body.appendChild(s)})(0)})"
            ".catch(e=>{document.getElementById('v').innerHTML='<p>Could not load market data: '+e.message+'</p>'});\n</script>")
    html = html.replace("@@BOOT@@", boot).replace('<main id="v"></main>', '<main id="v"><p class="mu m">Loading market data…</p></main>')
    return html, js

def rsi(c):
    d = np.diff(c[-15:]); g = d[d > 0].sum(); l = -d[d < 0].sum()
    return 100 - 100 / (1 + (g or .01) / (l or .01))

def build():
    D = json.load(open(path("sp500"))); E = json.load(open(path("extra"))); HS = json.load(open(path("housing")))
    out = "public"; os.makedirs(f"{out}/data/s", exist_ok=True); os.makedirs(f"{out}/data/x", exist_ok=True)
    fn = lambda t: re.sub(r"[^A-Za-z0-9-]", "_", t)
    master = max((v["d"] for v in D.values()), key=len)
    C = pd.DataFrame({t: pd.Series(v["c"], index=v["d"]) for t, v in D.items()}).reindex(master)
    ret = C.pct_change(); mkt = ret[[t for t, v in D.items() if "x" not in v]].mean(axis=1)  # the average S&P 500 stock
    S = {}
    for t, v in D.items():
        r = ret[t].dropna().tail(250); m = mkt.loc[r.index]; c = v["c"]; n = len(c)
        S[t] = {"n": v["n"], "p": c[-1], "b": round(float(np.cov(r, m)[0, 1] / np.var(m, ddof=1)), 2),
                "v": round(float(ret[t].dropna().tail(60).std() * np.sqrt(252) * 100), 1),
                "mom": round((c[n-22] / c[n-253] - 1) * 100, 2) if n > 253 else None,
                "y": round((c[-1] / c[-253] - 1) * 100, 2) if n > 252 else None,
                "dd": round((c[-1] / max(c[-252:]) - 1) * 100, 2), "rsi": round(rsi(np.array(c)), 1)}
        if v.get("x"): S[t]["x"] = v["x"]
        f = {k: v[k] for k in ("o", "h", "l", "c", "vol") if k in v}
        if v["d"] != master: f["d"] = v["d"]
        json.dump(f, open(f"{out}/data/s/{fn(t)}.json", "w"), separators=(",", ":"))
    X = {}
    for g, grp in E.items():
        for t, x in grp.items():
            s = pd.Series(x["c"], index=x["d"])
            r = s.reindex(master).dropna().pct_change().dropna().tail(250); m = mkt.reindex(r.index)
            own = s.pct_change().dropna().tail(60)
            c = [round(z, 4 if min(x["c"]) < 5 else 2) for z in x["c"]]
            X[t] = {"g": GL[g], "n": NM.get(t, t), "p": c[-1],
                    "b": round(float(np.cov(r, m)[0, 1] / np.var(m, ddof=1)), 2),
                    "v": round(float(own.std() * np.sqrt(365 if g == "Crypto" else 252) * 100), 1)}
            rec = {"d": x["d"], "c": c}
            for k in ("h", "l"):
                if k in x and len(x[k]) == len(c): rec[k] = [round(z, 4 if min(x["c"]) < 5 else 2) for z in x[k]]
            for k in ("vol", "fvol", "fsym"):
                if k in x: rec[k] = x[k]
            if t in ("^GSPC",) and "vol" not in rec:  # index volume missing: add up the members' volume
                V = pd.DataFrame({u: pd.Series(w["vol"], index=w["d"]) for u, w in D.items() if "vol" in w and "x" not in w})
                if len(V.columns) > 400:
                    tot = V.sum(axis=1); rec["vol"] = [int(tot.get(d, 0)) for d in x["d"]]; rec["vsum"] = 1
            json.dump(rec, open(f"{out}/data/x/{fn(t)}.json", "w"), separators=(",", ":"))
    now = datetime.datetime.now(datetime.timezone.utc); v = now.strftime("%Y%m%d%H%M")
    meta = {"v": v, "RD": master, "S": S, "X": X, "HS": HS}
    scripts = ["app.js"]
    for m in EXTRAS:
        m.build(load(m.NAME), meta, out)
        js_file = f"extras/{m.NAME}.js"
        if os.path.exists(js_file):
            os.makedirs(f"{out}/extras", exist_ok=True); shutil.copy(js_file, f"{out}/{js_file}"); scripts.append(js_file)
    json.dump(meta, open(f"{out}/data/meta.json", "w"), separators=(",", ":"))
    html, js = split_template()
    head = ""
    for c in sorted(glob.glob("extras/*.css")):  # add-on stylesheets load after the base styles
        os.makedirs(f"{out}/extras", exist_ok=True); shutil.copy(c, f"{out}/{c}")
        head += f'<link rel="stylesheet" href="{c}?v={v}">'
    if os.path.exists("extras/head.html"): head = open("extras/head.html").read() + head
    html = html.replace("</head>", head + "</head>", 1)
    html = html.replace("/*STAMP*/", now.strftime("%Y-%m-%d %H:%M UTC")).replace("/*STAMPV*/", v).replace("/*SCRIPTS*/", J(scripts))
    open(f"{out}/index.html", "w").write(html)
    open(f"{out}/app.js", "w").write(js)
    size = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(out) for f in fs)
    print(f"Built {out}/: {len(S)} stocks, {len(X)} other assets, {size/1e6:.1f} MB total, meta {os.path.getsize(out+'/data/meta.json')/1e3:.0f} KB")

if __name__ == "__main__":
    if "--build" not in sys.argv:
        save_if_ok("sp500", fetch_sp500, lambda v: len(v) > 450)
        save_if_ok("extra", fetch_extra, lambda v: sum(len(x) for x in v.values()) > 100)
        save_if_ok("housing", fetch_housing, lambda v: len(v["fred"]) == len(FRED) and len(v["zillow"]) == 3)
        syms = list(load("sp500") or {})
        k = (datetime.date.today().toordinal() * 97) % max(1, len(syms))
        syms = syms[k:] + syms[:k]  # nightly rotation: a module Yahoo cuts off partway misses different names each night
        for m in EXTRAS:
            save_if_ok(m.NAME, lambda m=m: m.fetch({"syms": syms, "prev": load(m.NAME)}), m.ok, required=False)
    build()
