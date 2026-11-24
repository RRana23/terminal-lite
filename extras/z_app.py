"""Step 3: command bar, keyboard shortcuts, and install-as-app files (manifest, icons, service worker).
No data to fetch; build() writes the app files into the site root."""
import json, struct, zlib

NAME = "z_app"

def fetch(ctx):
    return {}

def ok(data):
    return True

def _png(size):
    """Icon: graphite square with an amber block, drawn without image libraries."""
    bg, fg, r = (11, 15, 20), (240, 168, 58), size // 4
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            inside = r <= x < size - r and r <= y < size - r
            row += bytes(fg if inside else bg)
        rows.append(bytes(row))
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(b"".join(rows), 9)) + chunk(b"IEND", b""))

SW = """// Network first, so the terminal always shows the newest build; falls back to the last copy when offline.
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open('tl').then(x => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request)));
});
"""

def build(data, meta, out):
    for s in (180, 192, 512):
        open(f"{out}/icon-{s}.png", "wb").write(_png(s))
    json.dump({"name": "Terminal Lite", "short_name": "Terminal", "start_url": "./", "scope": "./", "display": "standalone",
               "background_color": "#0b0f14", "theme_color": "#11171f",
               "description": "A Bloomberg-style market terminal built on public data.",
               "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
                         {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
                         {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]},
              open(f"{out}/manifest.webmanifest", "w"), indent=1)
    open(f"{out}/sw.js", "w").write(SW)
