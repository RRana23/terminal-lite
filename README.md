# Terminal Lite

Bloomberg-style market terminal. A GitHub Action rebuilds it every weekday evening with fresh data.

- `template.html`: the site, with data placeholders
- `update.py`: fetches data (Yahoo Finance, FRED, Zillow) and builds `public/index.html`
- `data/`: last good data, used as a fallback if a fetch fails
- `.github/workflows/update.yml`: the nightly schedule

Run locally: `pip install yfinance pandas numpy requests lxml`, then `FRED_API_KEY=yourkey python update.py`.
