"""Phase 2: company fundamentals for the S&P 500 from Yahoo Finance (yfinance Ticker.info)."""
import time
from concurrent.futures import ThreadPoolExecutor

NAME = "fundamentals"
FIELDS = {"sec": "sector", "ind": "industry", "cap": "marketCap", "ev": "enterpriseValue",
          "pe": "trailingPE", "fpe": "forwardPE", "eps": "trailingEps", "feps": "forwardEps",
          "pm": "profitMargins", "om": "operatingMargins", "rg": "revenueGrowth", "eg": "earningsGrowth",
          "evE": "enterpriseToEbitda", "evR": "enterpriseToRevenue", "pb": "priceToBook",
          "roe": "returnOnEquity", "de": "debtToEquity", "rev": "totalRevenue", "ebitda": "ebitda",
          "fcf": "freeCashflow", "sh": "shortPercentOfFloat", "tgt": "targetMeanPrice",
          "rec": "recommendationKey", "na": "numberOfAnalystOpinions", "div": "dividendRate", "px": "currentPrice"}

def _clean(v):
    if isinstance(v, float):
        if v != v or v in (float("inf"), float("-inf")): return None
        return float(f"{v:.4g}")
    return v

def _one(t):
    import yfinance as yf
    for attempt in range(3):
        try:
            info = yf.Ticker(t).info or {}
            if info.get("marketCap"):
                d = {k: _clean(info.get(src)) for k, src in FIELDS.items()}
                if d["div"] and d["px"]: d["dy"] = round(d["div"] / d["px"], 4)
                return t, {k: v for k, v in d.items() if v not in (None, "")}
        except Exception:
            pass
        time.sleep(2 + 3 * attempt)
    return t, None

def fetch(ctx):
    out, prev, fails = {}, ctx.get("prev") or {}, 0
    with ThreadPoolExecutor(6) as pool:
        for t, d in pool.map(_one, ctx["syms"]):
            if d: out[t] = d
            elif t in prev: out[t] = prev[t]; fails += 1
            else: fails += 1
    print(f"Fundamentals: {len(out)} tickers ({fails} fetch failures, previous values kept where available)")
    return out

def ok(data):
    return len(data) >= 400

def build(data, meta, out):
    meta["F"] = data or {}
