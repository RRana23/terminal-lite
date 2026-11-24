"""Earnings calls and M&A from SEC EDGAR (free, public domain).
- Per company: every earnings release (8-K Item 2.02) with a direct link to the press release exhibit, and every
  merger and acquisition filing (merger proxies, S-4/F-4 stock deals, tender offers, going-private, 425 deal
  communications, activist 13D stakes, completed deals under 8-K Item 2.01).
- Market-wide: every M&A filing on EDGAR over the last 45 days, from the SEC's daily form index.
Refreshed each weeknight. If SEC blocks the build server, the per-company part falls back to Yahoo Finance's
copy of the SEC filing list. SEC asks for at most 10 requests per second and a User-Agent that names you."""
import datetime, json, os, re, threading, time
from concurrent.futures import ThreadPoolExecutor
import requests

NAME = "zz_sec_events"
UA = {"User-Agent": os.environ.get("SEC_USER_AGENT", "TerminalLite personal research RRana23@users.noreply.github.com"),
      "Accept-Encoding": "gzip, deflate"}
# M&A form types: what each one means is explained on the page
MA = ["DEFM14A", "PREM14A", "DEFM14C", "PREM14C", "S-4", "F-4", "SC TO-T", "SC 14D9", "SC 13E3", "425",
      "SC 13D", "SCHEDULE 13D"]
MA_SET = set(MA)
_lock, _last = threading.Lock(), [0.0]
ERRS = []


def _get(url, text=False):
    for attempt in range(3):
        with _lock:  # stay under SEC's 10 requests per second
            wait = _last[0] + 0.12 - time.time()
            if wait > 0: time.sleep(wait)
            _last[0] = time.time()
        try:
            r = requests.get(url, headers=UA, timeout=60)
            if r.status_code == 200: return r.text if text else r.json()
            if r.status_code == 404: return None
            err = f"HTTP {r.status_code}"
        except Exception as e:
            err = str(e)[:120]
        if len(ERRS) < 5: ERRS.append(f"{url} -> {err}")
        time.sleep(1 + 2 * attempt)
    return None


def _now():
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


def _idx_url(cik, acc):
    return f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc.replace('-', '')}/{acc}-index.htm"


def _press_release(cik, acc):
    """URL of the press release exhibit (EX-99.1, else the first EX-99) from a filing's index page."""
    html = _get(_idx_url(cik, acc), text=True)
    if not html: return None
    best = None
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.S | re.I):
        href = re.search(r'href="(/Archives/edgar/data/[^"]+)"', row)
        typ = re.search(r"<td[^>]*>\s*(EX-99[.\d]*)\s*</td>", row)
        if href and typ:
            u = "https://www.sec.gov" + href.group(1).replace("/ix?doc=", "")
            if typ.group(1) in ("EX-99.1", "EX-99.01", "EX-99"): return u
            best = best or u
    return best


def _company(t, cik, old):
    sub = _get(f"https://data.sec.gov/submissions/CIK{cik}.json")
    if not sub: return t, None
    r = sub.get("filings", {}).get("recent", {})
    cut = (datetime.date.today() - datetime.timedelta(days=3 * 365)).isoformat()
    er, ma = [], []
    for i, form in enumerate(r.get("form", [])):
        d = r["filingDate"][i]
        if d < cut: break
        acc, items = r["accessionNumber"][i], (r.get("items") or [""] * (i + 1))[i] or ""
        u = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc.replace('-', '')}/{r['primaryDocument'][i]}"
        base = form.replace("/A", "")
        if form == "8-K" and "2.02" in items and len(er) < 12:
            er.append({"d": d, "a": acc, "u": u, "i": _idx_url(cik, acc)})
        if base in MA_SET or (form == "8-K" and "2.01" in items):
            if len(ma) < 150:
                ma.append({"d": d, "f": form if base in MA_SET else "8-K 2.01", "u": u, "i": _idx_url(cik, acc)})
    # press release link for the latest two releases; reuse last night's lookup when the filing is the same
    known = {x["a"]: x.get("pr") for x in (old or {}).get("er", []) if x.get("a")}
    for x in er[:2]:
        x["pr"] = known[x["a"]] if known.get(x["a"]) else _press_release(cik, x["a"])
    for x in er[2:]:
        if known.get(x["a"]): x["pr"] = known[x["a"]]
    return t, {"cik": cik, "er": er, "ma": ma, "src": "sec"}


def _feed(prev_days):
    """M&A filings from EDGAR's daily form index, last 45 days. Past days never change, so they are reused."""
    days, today = {}, datetime.date.today()
    forms = sorted(MA, key=len, reverse=True)
    got = miss = 0
    for k in range(1, 46):
        d = today - datetime.timedelta(days=k)
        key = d.isoformat()
        if d.weekday() >= 5: continue
        if key in prev_days and k > 2:
            days[key] = prev_days[key]; continue
        q = (d.month - 1) // 3 + 1
        txt = _get(f"https://www.sec.gov/Archives/edgar/daily-index/{d.year}/QTR{q}/form.{d:%Y%m%d}.idx", text=True)
        if txt is None:
            if key in prev_days: days[key] = prev_days[key]
            miss += 1
            if got == 0 and miss >= 6: break  # blocked or no files: stop asking
            continue
        got += 1
        by = {}
        for line in txt.splitlines():
            # the form column is 12 characters wide; longer names like "SCHEDULE 13D/A" run into the next column
            ft = next((f for f in forms if line.startswith(f) and (len(f) >= 12 or line[len(f):len(f) + 1] in (" ", "/"))), None)
            if not ft: continue
            tail = line[len(ft):]
            amend = tail.startswith("/A")
            if tail.startswith("/") and not amend: continue
            if amend and ft not in ("SC 13D", "SCHEDULE 13D", "SC TO-T", "SC 14D9"): continue  # skip amendments of long docs
            rest = tail[2:].strip() if amend else tail.strip()
            m = re.match(r"(.+?)\s+(\d+)\s+(\d{8}|\d{4}-\d{2}-\d{2})\s+(edgar/\S+)$", rest)
            if not m: continue
            name, cik, fn = m.group(1).strip(), m.group(2), m.group(4)
            acc, dirc = os.path.basename(fn).replace(".txt", ""), fn.split("/")[2]
            e = by.setdefault(acc, {"d": key, "f": ft + ("/A" if amend else ""), "n": [], "c": [], "u": _idx_url(dirc, acc)})
            if cik not in e["c"]: e["c"].append(cik); e["n"].append(name)
        days[key] = list(by.values())
    print(f"M&A feed: {got} daily index files downloaded, {sum(len(v) for v in days.values())} filings over {len(days)} days")
    return days


def _yahoo(syms, old):
    """Fallback when SEC blocks the server: Yahoo Finance's copy of each company's recent SEC filings."""
    import yfinance as yf

    def one(t):
        for attempt in range(2):
            try:
                er, ma = [], []
                for x in (yf.Ticker(t).sec_filings or [])[:120]:
                    d = x.get("date"); d = d.isoformat()[:10] if hasattr(d, "isoformat") else str(d)[:10]
                    typ, title, ex = x.get("type", ""), x.get("title", "") or "", x.get("exhibits") or {}
                    if typ == "8-K" and re.search(r"results of operations", title, re.I):
                        pr = ex.get("EX-99.1") or next((v for k, v in ex.items() if k.startswith("EX-99")), None)
                        er.append({"d": d, "u": x.get("edgarUrl", ""), "pr": pr})
                    if typ.replace("/A", "") in MA_SET or (typ == "8-K" and re.search(r"completion of acquisition", title, re.I)):
                        ma.append({"d": d, "f": typ if typ.replace("/A", "") in MA_SET else "8-K 2.01", "u": x.get("edgarUrl", "")})
                return t, {"er": er[:12], "ma": ma, "src": "yahoo"}
            except Exception:
                time.sleep(2 + 2 * attempt)
        return t, None

    out, ok = {}, 0
    with ThreadPoolExecutor(4) as pool:
        for i in range(0, len(syms), 40):
            res = list(pool.map(one, syms[i:i + 40]))
            n = sum(1 for _, r in res if r)
            for t, r in res:
                if r: out[t] = r
                elif t in old: out[t] = old[t]
            ok += n
            print(f"  Yahoo filings: {i + len(res)}/{len(syms)} ({ok} ok)", flush=True)
            if n < len(res) * 0.25: print("  Yahoo is throttling, keeping last copy for the rest"); break
    for t in syms:
        if t not in out and t in old: out[t] = old[t]
    return out


def fetch(ctx):
    prev = ctx.get("prev") or {}
    old = prev.get("d", {})
    syms = [t for t in ctx["syms"] if not t.startswith("^")]
    m = _get("https://www.sec.gov/files/company_tickers.json") or {}
    ciks = {v["ticker"].replace(".", "-"): str(v["cik_str"]).zfill(10) for v in m.values()} or prev.get("ciks", {})
    out, got, miss = {}, 0, 0
    if ciks:
        with ThreadPoolExecutor(4) as pool:
            for i in range(0, len(syms), 40):
                part = [t for t in syms[i:i + 40] if ciks.get(t)]
                res = list(pool.map(lambda t: _company(t, ciks[t], old.get(t)), part))
                for t, r in res:
                    if r: out[t] = r; got += 1
                    else:
                        miss += 1
                        if t in old: out[t] = old[t]
                print(f"  SEC earnings and M&A filings: {min(i + 40, len(syms))}/{len(syms)} ({got} ok)", flush=True)
                if got == 0 and miss >= 15: break
    src = "sec"
    if got == 0:
        age = (_now() - datetime.datetime.fromisoformat(prev["_ts"])).days if prev.get("_ts") else 99
        if prev.get("src") == "yahoo" and age < 3:
            print("SEC unreachable; using the recent Yahoo copy of filings"); out, src = old, "yahoo"
        else:
            print("SEC unreachable from this server; using Yahoo Finance's copy of SEC filings")
            out, src = _yahoo(syms, old), "yahoo"
    for t in syms:
        if t not in out and t in old: out[t] = old[t]
    for e in ERRS: print("SEC error:", e)
    days = _feed(prev.get("days", {}))
    print(f"Earnings releases and M&A filings: {len(out)} companies (source: {'SEC EDGAR' if src == 'sec' else 'Yahoo Finance'})")
    return {"_ts": _now().isoformat(timespec="seconds"), "src": src, "ciks": {t: ciks[t] for t in syms if t in ciks},
            "d": out, "days": days}


def ok(data):
    return len(data.get("d", {})) >= 300


def build(data, meta, out):
    if not data: return
    d, cik2t = data.get("d", {}), {}
    for t, c in (data.get("ciks") or {}).items(): cik2t.setdefault(str(int(c)), t)
    os.makedirs(f"{out}/data/sx", exist_ok=True)
    for t, rec in d.items():
        json.dump(rec, open(f"{out}/data/sx/{t.replace('^', '_')}.json", "w"), separators=(",", ":"))
    feed = [dict(e, t=[cik2t.get(str(int(c)), "") for c in e["c"]]) for day in sorted(data.get("days", {}), reverse=True) for e in data["days"][day]]
    if not feed:  # SEC blocked: build the S&P 500 part of the feed from each company's list
        cut = (datetime.date.today() - datetime.timedelta(days=45)).isoformat()
        seen = {}
        for t, rec in d.items():
            for x in rec.get("ma", []):
                if x["d"] >= cut:
                    k = x.get("i") or x["u"]
                    e = seen.setdefault(k, {"d": x["d"], "f": x["f"], "n": [], "c": [], "t": [], "u": x.get("i") or x["u"]})
                    e["t"].append(t); e["n"].append("")
        feed = sorted(seen.values(), key=lambda e: e["d"], reverse=True)
    for e in feed: e.pop("c", None)
    json.dump({"asof": data.get("_ts", "")[:10], "src": data.get("src", "sec"), "f": feed[:4000]},
              open(f"{out}/data/deals.json", "w"), separators=(",", ":"))
    meta["SX"] = {"t": sorted(d), "asof": data.get("_ts", "")[:10], "src": data.get("src", "sec")}
