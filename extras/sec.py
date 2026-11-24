"""Phase 3: annual financial statements and filing lists from SEC EDGAR (free, public domain).
Refreshed weekly; SEC asks for at most 10 requests per second and a User-Agent that names you."""
import datetime, json, os, time
import requests

NAME = "sec"
UA = {"User-Agent": os.environ.get("SEC_USER_AGENT", "TerminalLite personal research RRana23@users.noreply.github.com")}
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
        r = requests.get(url, headers=UA, timeout=60)
        time.sleep(0.15)
        if r.status_code == 200: return r.json()
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

def fetch(ctx):
    prev = ctx.get("prev")
    if prev and (datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None) - datetime.datetime.fromisoformat(prev["_ts"])).days < 6:
        print("SEC: using this week's copy"); return prev
    m = _get("https://www.sec.gov/files/company_tickers.json") or {}
    ciks = {v["ticker"].replace(".", "-"): str(v["cik_str"]).zfill(10) for v in m.values()}
    old, out, miss = (prev or {}).get("d", {}), {}, 0
    for t in ctx["syms"]:
        cik = ciks.get(t)
        try:
            facts = _get(f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json") if cik else None
            sub = _get(f"https://data.sec.gov/submissions/CIK{cik}.json") if cik else None
            rec = {"cik": cik, "fa": statements(facts) if facts else None, "fil": filings(sub, cik) if sub else []}
            if rec["fa"] or rec["fil"]: out[t] = rec; continue
        except Exception as e:
            print("SEC", t, e)
        miss += 1
        if t in old: out[t] = old[t]
    print(f"SEC: {len(out)} companies ({miss} missing; previous copy kept where available)")
    return {"_ts": datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None).isoformat(timespec="seconds"), "d": out}

def ok(data):
    return len(data.get("d", {})) >= 400

def build(data, meta, out):
    d = (data or {}).get("d", {})
    os.makedirs(f"{out}/data/sec", exist_ok=True)
    for t, rec in d.items():
        json.dump(rec, open(f"{out}/data/sec/{t.replace('^', '_')}.json", "w"), separators=(",", ":"))
    meta["SEC"] = sorted(d)
