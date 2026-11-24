"""Moving averages on the price chart: 1, 5 and 10-day lines plus any custom period. Page code only, no data.
(Named zz_ma so it loads after the other Markets add-ons.)"""
NAME = "zz_ma"

def fetch(ctx):
    return {}

def ok(data):
    return True

def build(data, meta, out):
    pass
