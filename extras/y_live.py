"""Phase 6: live prices. Nothing to download at build time: the page streams quotes from Finnhub in the visitor's
browser, using a free key each visitor enters themselves (kept in their browser, never in this public repo).
(Named y_live so its page code loads after the other add-ons.)"""
NAME = "y_live"

def fetch(ctx):
    return {}

def ok(data):
    return True

def build(data, meta, out):
    pass
