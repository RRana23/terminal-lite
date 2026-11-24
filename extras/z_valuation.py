"""DCF and WACC view on the Company tab. Uses data the other add-ons already build (statements, price, beta,
fundamentals, 10-year Treasury), so it fetches nothing. (Named z_valuation so its page code loads after the guide.)"""
NAME = "z_valuation"

def fetch(ctx):
    return {}

def ok(data):
    return True

def build(data, meta, out):
    pass
