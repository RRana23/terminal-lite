"""Design pass and cleanup: no data. Its z_design.js removes simulated panels; z_design.css restyles the site.
(Named z_design so it loads last.)"""
NAME = "z_design"

def fetch(ctx):
    return {}

def ok(data):
    return True

def build(data, meta, out):
    pass
