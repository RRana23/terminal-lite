"""Credit and dividends (Bloomberg FA leverage, CRPR-style profile, DVD history): five years of debt, cash, EBITDA,
interest, liquidity and payout lines from Yahoo Finance statements, plus each company's full dividend history.
Refreshed each weeknight. (Named zz_leverage so its page code
loads after the Estimates view.)"""
import datetime, json, math, os, time
from concurrent.futures import ThreadPoolExecutor

NAME = "zz_leverage"
# our key: Yahoo statement line(s), first one found wins
IS = {"rev": ["TotalRevenue"], "ebitda": ["EBITDA", "NormalizedEBITDA"], "ebit": ["EBIT", "OperatingIncome"],
      "int": ["InterestExpense", "InterestExpenseNonOperating"], "ni": ["NetIncomeCommonStockholders", "NetIncome"],
      "dep": ["ReconciledDepreciation", "DepreciationAndAmortizationInIncomeStatement"]}
BS = {"debt": ["TotalDebt"], "cash": ["CashCashEquivalentsAndShortTermInvestments", "CashAndCashEquivalents"],
      "ca": ["CurrentAssets"], "cl": ["CurrentLiabilities"], "inv": ["Inventory"], "wc": ["WorkingCapital"],
      "re": ["RetainedEarnings"], "ta": ["TotalAssets"], "tl": ["TotalLiabilitiesNetMinorityInterest"], "eq": ["StockholdersEquity"]}
CF = {"ocf": ["OperatingCashFlow"], "capex": ["CapitalExpenditure"], "fcf": ["FreeCashFlow"],
      "div": ["CashDividendsPaid", "CommonStockDividendPaid"], "buy": ["RepurchaseOfCapitalStock", "CommonStockPayments"]}
ABS = {"int", "capex", "div", "buy"}  # reported as negatives in cash flow; stored as positive amounts


def _n(v):
    try:
        v = float(v)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(v) or math.isinf(v) else v


def _lines(df, spec, rows, years):
    if df is None or df.empty: return
    for k, names in spec.items():
        for nm in names:
            if nm in df.index:
                vals = [_n(df.at[nm, c]) if c in df.columns else None for c in years]
                if any(v is not None for v in vals):
                    rows[k] = [None if v is None else (abs(v) if k in ABS else v) for v in vals]
                    break


def _one(t):
    import yfinance as yf
    for attempt in range(3):
        try:
            tk = yf.Ticker(t)
            inc = tk.get_income_stmt(pretty=False)
            bal = tk.get_balance_sheet(pretty=False)
            cfl = tk.get_cash_flow(pretty=False)
            cols = sorted(set(inc.columns if inc is not None else []) | set(bal.columns if bal is not None else []))[-5:]
            rows = {}
            for df, spec in ((inc, IS), (bal, BS), (cfl, CF)):
                _lines(df, spec, rows, cols)
            rec = {"y": [c.strftime("%Y-%m-%d") for c in cols], "r": rows}
            try:
                dv = tk.get_dividends(period="max")
                if dv is not None and len(dv):
                    dv = dv[dv > 0]
                    idx = [d.tz_localize(None) if getattr(d, "tzinfo", None) else d for d in dv.index]
                    pays = [[d.strftime("%Y-%m-%d"), round(float(v), 4)] for d, v in zip(idx, dv.values)]
                    this_year = datetime.date.today().year
                    by = {}
                    for d, v in pays:
                        y = int(d[:4])
                        if y < this_year: by[y] = by.get(y, 0) + v
                    yrs = sorted(by)[-16:]
                    cut = (datetime.date.today() - datetime.timedelta(days=365)).isoformat()
                    rec["dv"] = [[y, round(by[y], 4)] for y in yrs]
                    rec["dp"] = pays[-12:]
                    rec["ttm"] = round(sum(v for d, v in pays if d > cut), 4)
                    rec["first"] = pays[0][0][:4]
            except Exception:
                pass
            if rows or rec.get("dv"):
                return t, rec
        except Exception:
            pass
        time.sleep(1 + 2 * attempt)
    return t, None


def _run(syms, one, label, workers=4, chunk=40, retry_cap=80, retry_secs=240):
    """Fetch in chunks with progress in the log. Stops early if Yahoo refuses most requests (keeps the
    previous copy), then gives a short, time-limited second pass to names that failed."""
    got = {}
    with ThreadPoolExecutor(workers) as pool:
        for i in range(0, len(syms), chunk):
            part = syms[i:i + chunk]
            res = dict(pool.map(one, part))
            got.update(res)
            ok_part, ok_all = sum(1 for v in res.values() if v), sum(1 for v in got.values() if v)
            print(f"{label}: {len(got)}/{len(syms)} checked, {ok_all} ok", flush=True)
            if ok_part < 0.25 * len(part) and ok_all < 0.25 * len(got):
                print(f"{label}: Yahoo is refusing most requests right now; stopping early and keeping the previous copy", flush=True)
                return got, True
    miss = [t for t in syms if not got.get(t)]
    if 0 < len(miss) <= retry_cap:
        t0 = time.time()
        for t in miss:
            if time.time() - t0 > retry_secs: break
            time.sleep(1.5)
            got[t] = one(t)[1]
    return got, False


def fetch(ctx):
    prev = ctx.get("prev") or {}
    now = datetime.datetime.now(datetime.timezone.utc)
    old, out, fails = prev.get("d", {}), {}, 0
    got, stopped = _run(list(ctx["syms"]), _one, "Credit and dividends")
    for t in ctx["syms"]:
        if got.get(t): out[t] = got[t]
        else:
            fails += 1
            if t in old: out[t] = old[t]
    print(f"Credit and dividends: {len(out)} tickers ({fails} failed; previous copy kept where available)")
    return {"_ts": now.isoformat(), "d": out}


def ok(data):
    return len(data.get("d", {})) >= 350


def _last(a):
    """Latest fiscal year only, so every ratio uses the same year."""
    return a[-1] if a else None


def summary(rec, px, cap):
    """Latest-year figures for the S&P 900 lists. Same formulas as the page."""
    r = rec.get("r", {})
    g = lambda k: _last(r.get(k))
    ebitda = g("ebitda") or ((g("ebit") or 0) + (g("dep") or 0) or None)
    debt, cash, ebit, it, ni, fcf, div = g("debt"), g("cash"), g("ebit"), g("int"), g("ni"), g("fcf"), g("div")
    nd = None if debt is None else debt - (cash or 0)
    s = {"nde": round(nd / ebitda, 2) if nd is not None and ebitda and ebitda > 0 else None,
         "cov": round(ebit / it, 1) if ebit is not None and it else None,
         "pay": round(div / ni, 3) if div is not None and ni and ni > 0 else None}
    dv = rec.get("dv") or []
    st = 0
    for i in range(len(dv) - 1, 0, -1):
        if dv[i][1] > dv[i - 1][1] * 1.0001: st += 1
        else: break
    s["st"] = st
    if len(dv) >= 6 and dv[-6][1] > 0: s["g5"] = round(((dv[-1][1] / dv[-6][1]) ** 0.2 - 1) * 100, 1)
    if rec.get("ttm") and px: s["y"] = round(rec["ttm"] / px * 100, 2)
    ta, tl = g("ta"), g("tl")
    if ta and tl and cap and None not in (g("wc"), g("re"), ebit, g("rev")):
        s["z"] = round(1.2 * g("wc") / ta + 1.4 * g("re") / ta + 3.3 * ebit / ta + 0.6 * cap / tl + 1.0 * g("rev") / ta, 2)
    return {k: v for k, v in s.items() if v is not None}


def build(data, meta, out):
    d = (data or {}).get("d", {})
    os.makedirs(f"{out}/data/cr", exist_ok=True)
    S, F, sm = meta.get("S", {}), meta.get("F", {}), {}
    for t, rec in d.items():
        json.dump(rec, open(f"{out}/data/cr/{t}.json", "w"), separators=(",", ":"))
        sm[t] = summary(rec, (S.get(t) or {}).get("p"), (F.get(t) or {}).get("cap"))
    # S&P 900 medians among dividend payers: yield, and year-over-year growth of the annual dividend
    med = lambda a: sorted(a)[len(a) // 2] if a else None
    gy = {}
    for rec in d.values():
        dv = dict((y, v) for y, v in rec.get("dv") or [])
        for y, v in dv.items():
            if dv.get(y - 1): gy.setdefault(y, []).append((v / dv[y - 1] - 1) * 100)
    mg = {y: round(med(a), 1) for y, a in sorted(gy.items())[-6:] if len(a) >= 30}
    meta["CR"] = {"t": sorted(d), "asof": (data or {}).get("_ts", "")[:10], "s": sm,
                  "my": med([x["y"] for x in sm.values() if x.get("y")]), "mg": mg}
