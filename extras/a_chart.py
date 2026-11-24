"""Hover readouts for every chart on the site (date and value under the pointer). No data.
(Named a_chart so its page code loads first, right after the core app code, and every add-on can use it.)"""
NAME = "a_chart"

def fetch(ctx):
    return {}

def ok(data):
    return True

def build(data, meta, out):
    pass
