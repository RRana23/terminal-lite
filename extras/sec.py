"""Phase 3: annual financial statements and filing lists from SEC EDGAR (free, public domain).
Refreshed each weeknight; SEC asks for at most 10 requests per second and a User-Agent that names you."""
import datetime, json, os, time
import requests

NAME = "sec"
UA = {"User-Agent": os.environ.get("SEC_USER_AGENT", "TerminalLite personal research RRana23@users.noreply.github.com"),
      "Accept-Encoding": "gzip, deflate"}
ERRS = []
# label: list of XBRL tags to try, in order
DUR = {"Revenue": ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "SalesRevenueNet",
                   "RevenueFromContractWithCustomerIncludingAssessedTax", "RevenuesNetOfInterestExpense"],
       "Gross profit": ["GrossProfit"], "Operating income": ["OperatingIncomeLoss"], "Net income": ["NetIncomeLoss"],
       "Diluted EPS": ["EarningsPerShareDiluted"], "Operating cash flow": ["NetCashProvidedByUsedInOperatingActivities"],
       "Capital spending": ["PaymentsToAcquirePropertyPlantAndEquipment"], "Dividends paid": ["PaymentsOfDividends", "PaymentsOfDividendsCommonStock"],
       "Buybacks": ["PaymentsForRepurchaseOfCommonStock"], "Diluted shares": ["WeightedAverageNumberOfDilutedSharesOutstanding"]}
INST = {"Cash": ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"],
        "Total assets": ["Assets"], "Total liabilities": ["Liabilities"], "Shareholders' equity": ["StockholdersEquity"],
        "Long-term debt": ["LongTermDebtNoncurrent", "LongTermDebt"]}
FORMS = {"10-K", "10-Q", "8-K", "DEF 14A", "4", "S-1", "S-3", "SC 13D", "SC 13G", "SC 13D/A", "SC 13G/A", "10-K/A", "10-Q/A", "8-K/A", "11-K", "S-4", "425"}

def _get(url):
    for attempt in range(3):
        try:
            r = requests.get(url, headers=UA, timeout=60)
            time.sleep(0.15)
            if r.status_code == 200: return r.json()
            if r.status_code == 404: return None
            err = f"HTTP {r.status_code}"
        except Exception as e:
            err = str(e)[:120]
        if len(ERRS) < 5: ERRS.append(f"{url} -> {err}")
        time.sleep(2 + 3 * attempt)
    return None

def _series(facts, tags, instant):
    """Annual values from 10-K filings, newest filing wins for each fiscal-year end date."""
    for tag in tags:
        node = facts.get(tag)
        if not node: continue
        units = node["units"].get("USD") or node["units"].get("USD/shares") or node["units"].get("shares")
        if not units: continue
        best = {}
        for u in units:
            if not u.get("form", "").startswith("10-K"): continue
            if not instant:
                if "start" not in u: continue
                days = (datetime.date.fromisoformat(u["end"]) - datetime.date.fromisoformat(u["start"])).days
                if not 350 <= days <= 380: continue
            if u["end"] not in best or u["filed"] > best[u["end"]]["filed"]: best[u["end"]] = u
        if len(best) >= 2:
            return {e: v["val"] for e, v in best.items()}
    return {}

def statements(facts):
    g = facts.get("facts", {}).get("us-gaap", {})
    raw = {k: _series(g, tags, False) for k, tags in DUR.items()}
    raw.update({k: _series(g, tags, True) for k, tags in INST.items()})
    ends = sorted({e for s in raw.values() for e in s})[-5:]
    if not ends: return None
    r2 = lambda v: v if v is None else (round(v, 2) if abs(v) < 1000 else int(v))
    rows = {k: [r2(s.get(e)) for e in ends] for k, s in raw.items() if any(s.get(e) is not None for e in ends)}
    return {"ends": ends, "rows": rows}

def filings(sub, cik):
    r = sub.get("filings", {}).get("recent", {})
    out = []
    for i, form in enumerate(r.get("form", [])):
        if form not in FORMS: continue
        acc = r["accessionNumber"][i]
        out.append({"f": form, "d": r["filingDate"][i], "x": r.get("primaryDocDescription", [""] * (i + 1))[i] or "",
                    "u": f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc.replace('-', '')}/{r['primaryDocument'][i]}"})
        if len(out) >= 60: break
    return out

# ---- fallback when SEC blocks GitHub's servers: the same statements and filing list via Yahoo Finance ----
YROWS = {"Revenue": ("income_stmt", ["Total Revenue", "Operating Revenue"]), "Gross profit": ("income_stmt", ["Gross Profit"]),
         "Operating income": ("income_stmt", ["Operating Income"]), "Net income": ("income_stmt", ["Net Income", "Net Income Common Stockholders"]),
         "Diluted EPS": ("income_stmt", ["Diluted EPS"]), "Diluted shares": ("income_stmt", ["Diluted Average Shares"]),
         "Operating cash flow": ("cashflow", ["Operating Cash Flow"]), "Capital spending": ("cashflow", ["Capital Expenditure"]),
         "Dividends paid": ("cashflow", ["Cash Dividends Paid", "Common Stock Dividend Paid"]), "Buybacks": ("cashflow", ["Repurchase Of Capital Stock", "Common Stock Payments"]),
         "Cash": ("balance_sheet", ["Cash And Cash Equivalents"]), "Total assets": ("balance_sheet", ["Total Assets"]),
         "Total liabilities": ("balance_sheet", ["Total Liabilities Net Minority Interest"]), "Shareholders' equity": ("balance_sheet", ["Stockholders Equity"]),
         "Long-term debt": ("balance_sheet", ["Long Term Debt"])}
OUTFLOWS = {"Capital spending", "Dividends paid", "Buybacks"}

def _yahoo_one(t):
    import yfinance as yf
    for attempt in range(3):
        try:
            tk = yf.Ticker(t)
            dfs = {k: getattr(tk, k) for k in ("income_stmt", "cashflow", "balance_sheet")}
            raw = {}
            for label, (src, names) in YROWS.items():
                df = dfs[src]
                if df is None or df.empty: continue
                for nm in names:
                    if nm in df.index:
                        s = df.loc[nm].dropna()
                        raw[label] = {c.isoformat()[:10]: (abs(float(v)) if label in OUTFLOWS else float(v)) for c, v in s.items()}
                        break
            ends = sorted({e for s in raw.values() for e in s})[-5:]
            r2 = lambda v: v if v is None else (round(v, 2) if abs(v) < 1000 else int(v))
            fa = {"ends": ends, "rows": {k: [r2(s.get(e)) for e in ends] for k, s in raw.items()}} if ends else None
            fil = []
            for x in (tk.sec_filings or [])[:60]:
                d = x.get("date"); d = d.isoformat()[:10] if hasattr(d, "isoformat") else str(d)[:10]
                fil.append({"f": x.get("type", ""), "d": d, "x": x.get("title", ""), "u": x.get("edgarUrl", "")})
            return t, ({"cik": None, "fa": fa, "fil": fil, "src": "yahoo"} if fa or fil else None)
        except Exception:
            time.sleep(2 + 3 * attempt)
    return t, None

def _yahoo(syms, old):
    from concurrent.futures import ThreadPoolExecutor
    out, miss, ok_n = {}, 0, 0
    with ThreadPoolExecutor(4) as pool:
        for i in range(0, len(syms), 40):  # in chunks; stop early if Yahoo refuses most requests
            res = list(pool.map(_yahoo_one, syms[i:i + 40]))
            n = sum(1 for _, r in res if r); ok_n += n
            for t, rec in res:
                if rec: out[t] = rec
                else:
                    miss += 1
                    if t in old: out[t] = old[t]
            print(f"Statements via Yahoo Finance: {min(i + 40, len(syms))}/{len(syms)} ({ok_n} ok)", flush=True)
            if n < 0.25 * len(res) and ok_n < 0.25 * (i + len(res)):
                print("Statements: Yahoo is refusing most requests right now; keeping the previous copy for the rest", flush=True); break
    for t in syms:
        if t not in out and t in old: out[t] = old[t]
    print(f"Statements via Yahoo Finance: {len(out)} companies ({miss} failed)")
    return out

def fetch(ctx):
    prev = ctx.get("prev")
    m = _get("https://www.sec.gov/files/company_tickers.json") or {}
    ciks = {v["ticker"].replace(".", "-"): str(v["cik_str"]).zfill(10) for v in m.values()}
    if not ciks:  # fallback: the Wikipedia S&P 500 table lists each company's CIK
        try:
            import io, pandas as pd
            html = requests.get("https://en.wikipedia.org/wiki/List_of_S%26P_500_companies", headers={"User-Agent": "Mozilla/5.0"}, timeout=60).text
            w = pd.read_html(io.StringIO(html))[0]
            ciks = {s.replace(".", "-"): str(int(c)).zfill(10) for s, c in zip(w.Symbol, w.CIK)}
        except Exception as e:
            print("SEC: CIK lookup failed:", e)
    print(f"SEC: {len(ciks)} CIKs found")
    old, out, miss, got = (prev or {}).get("d", {}), {}, 0, 0
    for t in ctx["syms"]:
        if got == 0 and miss >= 10:
            print("SEC: first 10 companies all failed, stopping early"); break
        cik = ciks.get(t)
        try:
            facts = _get(f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json") if cik else None
            sub = _get(f"https://data.sec.gov/submissions/CIK{cik}.json") if cik else None
            rec = {"cik": cik, "fa": statements(facts) if facts else None, "fil": filings(sub, cik) if sub else []}
            if rec["fa"] or rec["fil"]: out[t] = rec; got += 1; continue
        except Exception as e:
            print("SEC", t, e)
        miss += 1
        if t in old: out[t] = old[t]
    print(f"SEC: {len(out)} companies ({miss} missing; previous copy kept where available)")
    for e in ERRS: print("SEC error:", e)
    if got == 0:
        print("SEC is blocking this server, switching to Yahoo Finance for statements and filings")
        out = _yahoo(ctx["syms"], old)
    return {"_ts": datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None).isoformat(timespec="seconds"), "d": out}

def ok(data):
    return len(data.get("d", {})) >= 400

def build(data, meta, out):
    d = (data or {}).get("d", {})
    os.makedirs(f"{out}/data/sec", exist_ok=True)
    for t, rec in d.items():
        json.dump(rec, open(f"{out}/data/sec/{t.replace('^', '_')}.json", "w"), separators=(",", ":"))
    meta["SEC"] = sorted(d)
