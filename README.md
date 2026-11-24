# Terminal Lite

Bloomberg-style market terminal. A GitHub Action rebuilds it every weekday evening, and whenever the code changes.

- `template.html`: the site's design and code
- `update.py`: fetches data (Yahoo Finance, FRED, Zillow), then builds `public/`: a small `index.html`, `app.js`, `data/meta.json`, and one data file per ticker that loads only when needed
- `sp500.json`, `extra.json`, `housing.json`: seed data, used only if a fetch fails and no cached copy exists
- `.github/workflows/update.yml`: the schedule. Fresh data is cached between runs, not committed.

Run locally: `pip install yfinance pandas numpy requests lxml`, then `FRED_API_KEY=yourkey python update.py`, then `python -m http.server -d public`.
