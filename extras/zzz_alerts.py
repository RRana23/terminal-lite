"""Nightly alerts for a watchlist: big moves, new 52-week highs and lows, moving-average crosses, RSI extremes,
volume spikes, your own price levels, upcoming earnings, new SEC filings and analyst rating changes, plus market
signals (S&P 500, VIX, 10-year yield, yield curve). The watchlist and rules live in alerts.json at the repo root.
The build writes data/alerts.json for the site's Alerts view; send_alerts.py emails it after the nightly build.
Uses data the other add-ons already downloaded, so it makes no extra requests."""
import datetime, json, os

NAME = "zzz_alerts"
DEFAULT = {"watchlist": ["SPY", "QQQ", "NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "JPM", "TLT", "GLD", "BTC-USD"],
           "price_levels": {},
           "rules": {"move_pct": 3, "crypto_move_pct": 6, "high_low_52w": True, "ma_cross": True, "rsi_low": 30,
                     "rsi_high": 70, "volume_x": 2.0, "earnings_days": 7, "filings": True, "ratings": True,
                     "market_move_pct": 2, "vix_level": 25, "vix_jump_pct": 15, "yield_move_bp": 10}}


def fetch(ctx):
    return {"ok": 1}  # nothing to download: alerts are worked out from the data built tonight


def ok(data):
    return True


def _cfg():
    try:
        c = json.load(open("alerts.json"))
    except Exception:
        c = {}
    out = {"quiet": c.get("email_when_quiet", True) is not False,
           "watchlist": [str(t).upper().strip() for t in (c.get("watchlist") or DEFAULT["watchlist"])][:40],
           "price_levels": {str(k).upper(): v for k, v in (c.get("price_levels") or {}).items() if isinstance(v, dict)},
           "rules": dict(DEFAULT["rules"], **{k: v for k, v in (c.get("rules") or {}).items() if k in DEFAULT["rules"]})}
    return out


def _iso(d):
    d = str(d)
    return d if "-" in d else f"20{d[:2]}-{d[2:4]}-{d[4:6]}"


def _sma(c, n, end=None):
    end = len(c) if end is None else end
    return sum(c[end - n:end]) / n if end >= n else None


def _rsi(c, n=14):
    if len(c) < n * 3: return [None] * len(c)
    out, g, l = [None] * len(c), 0.0, 0.0
    for i in range(1, n + 1):
        d = c[i] - c[i - 1]; g += max(d, 0); l += max(-d, 0)
    g /= n; l /= n
    for i in range(n + 1, len(c)):
        d = c[i] - c[i - 1]
        g = (g * (n - 1) + max(d, 0)) / n; l = (l * (n - 1) + max(-d, 0)) / n
        out[i] = 100 - 100 / (1 + g / l) if l else 100.0
    return out


def _series(t, meta, out):
    fn = "".join(ch if ch.isalnum() or ch == "-" else "_" for ch in t)
    if t in meta.get("S", {}):
        p = f"{out}/data/s/{fn}.json"; kind = "Stock"
    elif t in meta.get("X", {}):
        p = f"{out}/data/x/{fn}.json"; kind = meta["X"][t].get("g", "")
    else:
        return None
    try:
        j = json.load(open(p))
    except Exception:
        return None
    d = [_iso(x) for x in (j.get("d") or meta.get("RD", []))]
    c = j.get("c") or []
    if len(c) < 30 or len(d) != len(c): return None
    return {"d": d, "c": c, "v": j.get("vol"), "kind": kind}


def _pct(a, b):
    return (a / b - 1) * 100 if b else None


def build(data, meta, out):
    try:
        _build(meta, out)
    except Exception as ex:  # alerts must never break the site build
        print("Alerts failed:", type(ex).__name__, ex)


def _build(meta, out):
    cfg = _cfg(); R = cfg["rules"]; items, rows, mkt = [], [], []
    names = {**{t: v.get("n", t) for t, v in meta.get("X", {}).items()}, **{t: v.get("n", t) for t, v in meta.get("S", {}).items()}}
    cal = (meta.get("EV") or {}).get("cal", {})
    asof = lastc = None

    def add(t, sev, kind, msg):
        items.append({"t": t, "s": sev, "k": kind, "m": msg})

    for t in cfg["watchlist"]:
        s = _series(t, meta, out)
        if not s:
            continue
        d, c, v, n = s["d"], s["c"], s["v"], len(s["c"])
        if s["kind"] != "Crypto": asof = max(asof or d[-1], d[-1])  # crypto trades daily, so it doesn't set the market date
        else: lastc = max(lastc or d[-1], d[-1])
        px, prev = c[-1], c[-2]
        ch = _pct(px, prev)
        yr = max(0, n - 253)
        y0 = next((i for i in range(n - 1, 0, -1) if d[i - 1][:4] != d[-1][:4]), None)
        r = _rsi(c)
        s50, s200 = _sma(c, 50), _sma(c, 200)
        nm = names.get(t, t)
        if nm == t:  # funds: use the full name from the weekly profile if there is one
            try: nm = json.load(open(f"{out}/data/fp/{''.join(ch if ch.isalnum() or ch == '-' else '_' for ch in t)}.json")).get("nm") or t
            except Exception: pass
        row = {"t": t, "n": nm, "k": s["kind"], "p": px, "ch": ch, "m1": _pct(px, c[max(0, n - 22)]),
               "ytd": _pct(px, c[y0 - 1]) if y0 else None, "rsi": r[-1], "v200": _pct(px, s200) if s200 else None,
               "hi": _pct(px, max(c[yr:])), "e": (cal.get(t) or {}).get("e")}
        rows.append(row)
        lim = R["crypto_move_pct"] if s["kind"] == "Crypto" else R["move_pct"]
        if ch is not None and abs(ch) >= lim:
            add(t, "up" if ch > 0 else "dn", "Big move", f"{'Up' if ch > 0 else 'Down'} {abs(ch):.1f}% to {px:,.2f}")
        if R["high_low_52w"] and n > 60:
            prior = c[yr:-1]
            if px > max(prior): add(t, "up", "52-week high", f"New 52-week high at {px:,.2f}")
            elif px < min(prior): add(t, "dn", "52-week low", f"New 52-week low at {px:,.2f}")
        if R["ma_cross"] and n > 201:
            p50, p200 = _sma(c, 50, n - 1), _sma(c, 200, n - 1)
            if prev <= p200 and px > s200: add(t, "up", "200-day average", f"Closed above its 200-day average ({s200:,.2f})")
            elif prev >= p200 and px < s200: add(t, "dn", "200-day average", f"Closed below its 200-day average ({s200:,.2f})")
            if p50 <= p200 and s50 > s200: add(t, "up", "Golden cross", "50-day average crossed above the 200-day")
            elif p50 >= p200 and s50 < s200: add(t, "dn", "Death cross", "50-day average crossed below the 200-day")
        if r[-1] is not None and r[-2] is not None:
            if r[-1] >= R["rsi_high"] > r[-2]: add(t, "info", "RSI overbought", f"RSI rose to {r[-1]:.0f} (above {R['rsi_high']})")
            elif r[-1] <= R["rsi_low"] < r[-2]: add(t, "info", "RSI oversold", f"RSI fell to {r[-1]:.0f} (below {R['rsi_low']})")
        if v and len(v) == n and n > 70:
            base = [x for x in v[-64:-1] if x]
            if base and v[-1] and v[-1] >= R["volume_x"] * sum(base) / len(base):
                add(t, "info", "Volume spike", f"Volume {v[-1] / (sum(base) / len(base)):.1f}x its 3-month average")
        lv = cfg["price_levels"].get(t) or {}
        if lv.get("above") is not None and px >= float(lv["above"]) > prev:
            add(t, "up", "Price level", f"Crossed above your level of {float(lv['above']):,.2f}")
        if lv.get("below") is not None and px <= float(lv["below"]) < prev:
            add(t, "dn", "Price level", f"Crossed below your level of {float(lv['below']):,.2f}")
        e = row["e"]
        if e:
            days = (datetime.date.fromisoformat(e) - datetime.date.fromisoformat(d[-1])).days
            if 0 <= days <= R["earnings_days"]:
                add(t, "info", "Earnings soon", f"Reports earnings {'today' if days == 0 else 'in ' + str(days) + ' day' + ('s' if days > 1 else '')} ({e})")
        since = d[-2]  # anything dated after the previous close
        if R["filings"]:
            try:
                for f in json.load(open(f"{out}/data/sx/{t.replace('^', '_')}.json")).get("fil", [])[:30]:
                    if f.get("d", "") > since and f.get("f") != "4":
                        add(t, "info", "SEC filing", f"Filed a {f['f']}" + (f": {f['x']}" if f.get("x") else "") + f" ({f['d']})|{f.get('u', '')}")
            except Exception:
                pass
        if R["ratings"]:
            try:
                for u in json.load(open(f"{out}/data/est/{t}.json")).get("ud", [])[:20]:
                    if u[0] > since and u[4] in ("up", "down", "init"):
                        what = {"up": "upgraded to", "down": "downgraded to", "init": "started coverage at"}[u[4]]
                        tgt = f", target {u[5]:,.0f}" if u[5] else ""
                        add(t, "up" if u[4] == "up" else "dn" if u[4] == "down" else "info", "Analyst rating", f"{u[1]} {what} {u[2]}{tgt}")
            except Exception:
                pass

    def last(t):
        s = _series(t, meta, out)
        return (s["c"][-1], s["c"][-2], s["d"][-1]) if s else None

    for t, label in (("^GSPC", "S&P 500"), ("^IXIC", "Nasdaq"), ("^VIX", "VIX"), ("^TNX", "10-year yield"), ("^IRX", "3-month bill"), ("BTC-USD", "Bitcoin")):
        x = last(t)
        if not x: continue
        p, q, _ = x
        mkt.append({"t": t, "n": label, "p": p, "ch": (p - q) * 100 if t in ("^TNX", "^IRX") else _pct(p, q), "bp": t in ("^TNX", "^IRX")})
    g = last("^GSPC")
    if g and abs(_pct(g[0], g[1])) >= R["market_move_pct"]:
        ch = _pct(g[0], g[1]); add("^GSPC", "up" if ch > 0 else "dn", "Market move", f"S&P 500 {'rose' if ch > 0 else 'fell'} {abs(ch):.1f}%")
    vx = last("^VIX")
    if vx:
        if vx[0] >= R["vix_level"] > vx[1]: add("^VIX", "dn", "Volatility", f"VIX rose above {R['vix_level']} to {vx[0]:.1f}")
        elif vx[1] >= R["vix_level"] > vx[0]: add("^VIX", "up", "Volatility", f"VIX fell back below {R['vix_level']} to {vx[0]:.1f}")
        elif _pct(vx[0], vx[1]) >= R["vix_jump_pct"]: add("^VIX", "dn", "Volatility", f"VIX jumped {_pct(vx[0], vx[1]):.0f}% to {vx[0]:.1f}")
    ty, tb = last("^TNX"), last("^IRX")
    if ty and abs(ty[0] - ty[1]) * 100 >= R["yield_move_bp"]:
        bp = (ty[0] - ty[1]) * 100; add("^TNX", "info", "Rates", f"10-year yield {'rose' if bp > 0 else 'fell'} {abs(bp):.0f} bp to {ty[0]:.2f}%")
    if ty and tb:
        now, before = ty[0] - tb[0], ty[1] - tb[1]
        if now < 0 <= before: add("^TNX", "dn", "Yield curve", f"Curve inverted: 10-year minus 3-month is {now * 100:.0f} bp")
        elif now >= 0 > before: add("^TNX", "up", "Yield curve", f"Curve no longer inverted: 10-year minus 3-month is {now * 100:+.0f} bp")

    asof = asof or lastc
    order, wi = {"dn": 0, "up": 1, "info": 2}, {t: i for i, t in enumerate(cfg["watchlist"])}
    items.sort(key=lambda i: (wi.get(i["t"], 999), order[i["s"]]))  # by watchlist order, market signals last
    res = {"asof": asof, "built": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="minutes"),
           "items": items, "rows": rows, "mkt": mkt, "watch": cfg["watchlist"], "levels": cfg["price_levels"], "rules": R, "quiet": cfg["quiet"]}
    os.makedirs(f"{out}/data", exist_ok=True)
    json.dump(res, open(f"{out}/data/alerts.json", "w"), separators=(",", ":"))
    meta["AL"] = {"asof": asof, "n": len(items)}
    print(f"Alerts: {len(items)} for {len(rows)} watchlist tickers, as of {asof}")
