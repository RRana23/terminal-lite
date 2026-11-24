"""Credit and dividends (Bloomberg FA leverage, CRPR-style profile, DVD history): five years of debt, cash, EBITDA,
interest, liquidity and payout lines from Yahoo Finance statements, plus each company's full dividend history.
Refreshed weekly, since annual statements and dividend histories change slowly. (Named zz_leverage so its page code
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
        time.sleep(2 + 3 * attempt)
    return t, None


def fetch(ctx):
    prev = ctx.get("prev") or {}
    now = datetime.datetime.now(datetime.timezone.utc)
    if prev.get("_ts") and len(prev.get("d", {})) >= 400 and (now - datetime.datetime.fromisoformat(prev["_ts"])).days < 6:
        print("Credit and dividends: using this week's copy"); return prev
    old, out, miss = prev.get("d", {}), {}, []
    with ThreadPoolExecutor(4) as pool:
        for t, d in pool.map(_one, ctx["syms"]):
            if d: out[t] = d
            else: miss.append(t)
    retry = []
    for t in miss:  # second, slower pass for names Yahoo throttled
        time.sleep(1.5)
        _, d = _one(t)
        if d: out[t] = d
        else:
            retry.append(t)
            if t in old: out[t] = old[t]
    print(f"Credit and dividends: {len(out)} tickers ({len(miss)} retried, {len(retry)} still failed; previous copy kept where available)")
    return {"_ts": now.isoformat(), "d": out}


def ok(data):
    return len(data.get("d", {})) >= 350


def _last(a):
    """Latest fiscal year only, so every ratio uses the same year."""
    return a[-1] if a else None


def summary(rec, px, cap):
    """Latest-year figures for the S&P 500 lists. Same formulas as the page."""
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
    meta["CR"] = {"t": sorted(d), "asof": (data or {}).get("_ts", "")[:10], "s": sm}
