# Terminal Lite: notes for working on this repo

## How the code is organized
- `template.html` is the core page and app code. `update.py` fetches data and builds `public/`.
- Every feature is an add-on in `extras/`: `NAME.py` (with `NAME`, `fetch(ctx)`, `ok(data)`, `build(data, meta, out)`), plus optional `NAME.js` and `NAME.css`. A `.js` file is only loaded when a `.py` with the same name exists (use a stub `.py` for code-only add-ons).
- Add-on scripts load after the core app code in filename order, so names set the order: `a_chart` first, `zzz_nav` last. A later add-on wraps globals from earlier ones (`company`, `econ`, `events`, `home0`, `render0`, `guide`).
- Commands live in `FN.CODE=[description, needsTicker, fn]`; Guide rows in `GUIDE`; button handlers in `S[action]`. Post-render chart drawing goes in the `Q` array.
- The nightly GitHub Action rebuilds on weeknights at 23:17 UTC and on every push. Add `[skip ci]` to a commit message to wait for the nightly build instead.
- Alerts: `extras/zzz_alerts.py` works out the alerts from tonight's built data (no extra downloads) using `alerts.json`, and writes `data/alerts.json`; `send_alerts.py` emails it in the workflow (not on push builds). Email secrets: `ALERT_EMAIL_TO`, `SMTP_USER`, `SMTP_PASS`; never put an email address or password in the repo.
- Stock universe: S&P 500 plus S&P MidCap 400, both from Wikipedia in `fetch_sp500` (the cache keeps the name `sp500`). Mid caps carry `x: 4` in their data and in `META.S` (`RAW[t].x` in the page). Beta and the ^GSPC volume use S&P 500 members only. Add-on modules get the full list in `ctx["syms"]`, rotated each night so a module Yahoo cuts off partway misses different names. Every module refreshes nightly.
- Yahoo Finance throttles the build server: fetch in chunks with a circuit breaker and keep the previous copy for anything that fails. SEC EDGAR allows 10 requests per second with a User-Agent that names you.

## Charts: every chart must show the date and value on hover
Every chart on the site, now and in future, gets a hover readout (tap on phones) with the date or category in bold and one line per series. Use the shared helpers in `extras/a_chart.js`:
- SVG or canvas charts: after drawing, call `chHover(el, xs, tip, marks, top, bottom)`. `el` is the div holding the `<svg>` or the `<canvas>` itself; `xs` are the x pixel positions of the points; `tip(i)` returns `'<b>'+chDay(date)+'</b>'+chRow(color, name, value)...`; `marks(i)` returns the dots to highlight as `[[x, y, color], ...]`.
- HTML visuals (stacked bars, gauges, range bars): put the tooltip HTML in a `data-tip` attribute (escape it with `esc`).
- Date helpers: `chDay` (Nov 24, 2026), `chDate` (Nov 2026 for monthly data), `chYMD` (core YYMMDD to YYYY-MM-DD). Values: `chPct` for signed percentages.
- Don't use `<title>` tooltips; they look different and appear late.
- The core canvas charts (`line`, `drawG`) get hover from wrappers in `a_chart.js`; a new `line()` chart needs an entry in `LMETA` there with its dates and series names. The Markets price chart (`drawC`, `drawX`) is drawn by `extras/zz_tech.js`, which also adds the technical studies, their panels and the intraday chart.
- The Company tab follows the selected asset (`ac`): stocks get the company pages (`cur`), and ETFs, bond funds, crypto, indexes and currencies get a profile from `extras/zz_xasset.js` (fund and coin facts in `data/fp/`, refreshed nightly). New company views should check `CO[cur]`; new asset-wide views belong in `xProfile`.
- Price data per ticker: stocks have `o h l c vol`; other assets have `c h l` plus `vol` (or `fvol`, CME futures volume, for currencies). `v` in the summary data is volatility, not volume.

## Design
- Use the CSS variables (`--bg --pn --p2 --ln --tx --mu --am --up --dn --r`) and check both themes and a 390px phone width.
- Keep the Grouping and Portfolio tabs working as they are.
