"""Emails tonight's alerts (public/data/alerts.json, written by extras/zzz_alerts.py) after the nightly build.

Needs three repository secrets (Settings > Secrets and variables > Actions):
  ALERT_EMAIL_TO  where to send, e.g. you@gmail.com (several: comma-separated)
  SMTP_USER       the Gmail address that sends it
  SMTP_PASS       a Gmail app password for that address (Google Account > Security > App passwords)
Optional: SMTP_HOST (default smtp.gmail.com) and SMTP_PORT (default 465).
Without them the step does nothing. Scheduled runs skip market holidays; a manual run always sends."""
import datetime, html, json, os, smtplib, ssl, sys
from email.message import EmailMessage
from zoneinfo import ZoneInfo

SITE = "https://rrana23.github.io/terminal-lite/"
EDIT = "https://github.com/RRana23/terminal-lite/edit/main/alerts.json"
AM, UP, DN, MU, LN, TX = "#b26a00", "#0f7a4a", "#c0392b", "#6b6f76", "#e4e1d9", "#16181d"
MONO = "'IBM Plex Mono',SFMono-Regular,Menlo,Consolas,monospace"
SANS = "'IBM Plex Sans',-apple-system,'Segoe UI',Roboto,Arial,sans-serif"
TAG = {"up": (UP, "#e6f4ec"), "dn": (DN, "#fbeaea"), "info": (AM, "#fbf1e1")}


def e(s):
    return html.escape(str(s))


def pc(v, d=1, bp=False):
    if v is None: return f'<span style="color:{MU}">&ndash;</span>'
    col = UP if v > 0 else DN if v < 0 else MU
    return f'<span style="color:{col}">{v:+.{0 if bp else d}f}{" bp" if bp else "%"}</span>'


def yv(m):
    return "%.2f%%" % m["p"] if m["bp"] else px(m["p"])


def px(v):
    return f"{v:,.4f}" if v < 10 else f"{v:,.2f}"


def th(label, right=True, cls=""):
    return (f'<th class="{cls}" style="text-align:{"right" if right else "left"};font:600 11px {SANS};color:{MU};text-transform:uppercase;'
            f'letter-spacing:.04em;padding:6px 8px;border-bottom:1px solid {LN}">{label}</th>')


def td(v, right=True, mono=True, extra="", cls=""):
    return (f'<td class="{cls}" style="text-align:{"right" if right else "left"};font:13px {MONO if mono else SANS};color:{TX};padding:7px 8px;'
            f'border-bottom:1px solid {LN};{extra}">{v}</td>')


def h2(t):
    return f'<h2 style="font:600 13px {SANS};color:{AM};text-transform:uppercase;letter-spacing:.06em;margin:28px 0 8px">{t}</h2>'


def render(a):
    day = datetime.date.fromisoformat(a["asof"]).strftime("%a, %b %-d, %Y")
    items, rows = a["items"], a["rows"]
    n = len(items)
    # market strip
    cells = [
        f'<td width="33%" style="padding:10px 12px;border:1px solid {LN};background:#fff;vertical-align:top">'
        f'<div style="font:11px {SANS};color:{MU}">{e(m["n"])}</div>'
        f'<div style="font:600 15px {MONO};color:{TX};margin-top:2px">{yv(m)}</div>'
        f'<div style="font:12px {MONO};margin-top:2px">{pc(m["ch"], 2, m["bp"])}</div></td>' for m in a["mkt"]]
    strip = "</tr><tr>".join("".join(cells[i:i + 3]) for i in range(0, len(cells), 3))
    # alerts
    if items:
        al = "".join(
            '<tr>' + td(f'<b>{e(i["t"])}</b>', right=False, extra="white-space:nowrap;width:70px")
            + td(f'<span style="display:inline-block;font:600 11px {SANS};color:{TAG[i["s"]][0]};background:{TAG[i["s"]][1]};'
                 f'border-radius:3px;padding:2px 7px;white-space:nowrap">{e(i["k"])}</span>', right=False, mono=False, extra="width:120px")
            + td(_msg(i["m"]), right=False, mono=False) + '</tr>' for i in items)
        alerts = f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">{al}</table>'
    else:
        alerts = f'<p style="font:14px {SANS};color:{MU};margin:0">Nothing crossed your alert rules today.</p>'
    # watchlist
    wl = "".join(
        '<tr>' + td(f'<b>{e(r["t"])}</b>', right=False, extra="white-space:nowrap") + td(e(r["n"][:26]) if r["n"] != r["t"] else "", right=False, mono=False, extra=f"color:{MU}", cls="hm")
        + td(px(r["p"])) + td(pc(r["ch"], 2)) + td(pc(r["m1"]), cls="hm") + td(pc(r["ytd"]))
        + td("&ndash;" if r["rsi"] is None else f'{r["rsi"]:.0f}') + td(pc(r["v200"])) + '</tr>' for r in rows)
    watch = (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">'
             f'<tr>{th("Ticker", False)}{th("Name", False, "hm")}{th("Close")}{th("Day")}{th("1 mo", True, "hm")}{th("YTD")}{th("RSI")}{th("vs 200d")}</tr>{wl}</table>')
    # upcoming earnings
    end = (datetime.date.fromisoformat(a["asof"]) + datetime.timedelta(days=21)).isoformat()
    up = sorted((r["e"], r["t"]) for r in rows if r.get("e") and a["asof"] <= r["e"] <= end)
    earn = (h2("Earnings in the next 3 weeks") + f'<p style="font:13px {SANS};color:{TX};margin:0;line-height:1.7">'
            + " &middot; ".join(f'<b style="font-family:{MONO}">{e(t)}</b> {datetime.date.fromisoformat(d).strftime("%a %b %-d")}' for d, t in up)
            + '</p>') if up else ""
    body = f"""<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>@media (max-width:600px){{.hm{{display:none!important}}.wrap{{padding-left:12px!important;padding-right:12px!important}}.wrap td,.wrap th{{padding-left:4px!important;padding-right:4px!important}}.outer{{padding:10px 4px!important}}}}</style></head><body style="margin:0;padding:0;background:#f1efe9">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1efe9"><tr><td class="outer" align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;background:#fbfaf7;border:1px solid {LN};border-radius:6px">
<tr><td style="padding:22px 24px 8px">
<div style="font:600 12px {MONO};letter-spacing:.12em;color:{TX}"><span style="display:inline-block;width:9px;height:9px;background:{AM};margin-right:7px"></span>TERMINAL LITE</div>
<h1 style="font:600 22px {SANS};color:{TX};margin:14px 0 4px">Nightly alerts &middot; {day}</h1>
<p style="font:14px {SANS};color:{MU};margin:0">{n} alert{"s" if n != 1 else ""} on your {len(a["watch"])}-ticker watchlist, using the closing prices.</p>
</td></tr>
<tr><td class="wrap" style="padding:12px 24px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>{strip}</tr></table></td></tr>
<tr><td class="wrap" style="padding:0 24px">{h2("Alerts")}{alerts}{h2("Watchlist")}{watch}{earn}</td></tr>
<tr><td style="padding:28px 24px 24px">
<a href="{SITE}" style="display:inline-block;background:{AM};color:#fff;font:600 13px {SANS};text-decoration:none;padding:10px 16px;border-radius:4px">Open the terminal</a>
<a href="{EDIT}" style="display:inline-block;color:{AM};font:600 13px {SANS};text-decoration:none;padding:10px 12px">Edit watchlist and rules</a>
<p style="font:12px {SANS};color:{MU};margin:18px 0 0;line-height:1.5">Prices from Yahoo Finance, filings from SEC EDGAR. On the site: News &amp; Events &gt; Alerts, or type ALRT. Not investment advice.</p>
</td></tr></table></td></tr></table></body></html>"""
    # plain-text version
    txt = [f"Terminal Lite nightly alerts, {day}", ""]
    txt += [f'{i["t"]:<8} {i["k"]}: {i["m"].split("|")[0]}' for i in items] or ["Nothing crossed your alert rules today."]
    txt += ["", "Watchlist:"] + [f'{r["t"]:<8} {px(r["p"]):>12}  {r["ch"]:+.2f}%' for r in rows if r["ch"] is not None]
    txt += ["", SITE]
    top = [f'{i["t"]} {i["k"] if i["k"][:3].isupper() else i["k"].lower()}' for i in items[:3]]
    subj = f"Terminal Lite {datetime.date.fromisoformat(a['asof']).strftime('%b %-d')}: " + (
        f"{n} alert{'s' if n != 1 else ''} ({', '.join(top)}{', ...' if n > 3 else ''})" if n else "no alerts, watchlist recap")
    return subj, "\n".join(txt), body


def _msg(m):
    text, _, url = m.partition("|")
    return e(text) + (f' &middot; <a href="{e(url)}" style="color:{AM}">Open</a>' if url else "")


def main():
    to, user, pw = (os.environ.get(k, "").strip() for k in ("ALERT_EMAIL_TO", "SMTP_USER", "SMTP_PASS"))
    try:
        a = json.load(open("public/data/alerts.json"))
    except Exception as ex:
        print("Alert email: no alerts file,", ex); return
    if not a.get("asof"):
        print("Alert email: no watchlist data tonight"); return
    subj, txt, body = render(a)
    if "--preview" in sys.argv:
        open("alert_preview.html", "w").write(body); print(subj); return
    if not (to and user and pw):
        print("Alert email is off: add the ALERT_EMAIL_TO, SMTP_USER and SMTP_PASS repository secrets to turn it on."); return
    today = datetime.datetime.now(ZoneInfo("America/New_York")).date().isoformat()
    if os.environ.get("GITHUB_EVENT_NAME") == "schedule" and a["asof"] < today:
        print(f"Alert email: markets closed today (last close {a['asof']}), not sending"); return
    if not a["items"] and not a.get("quiet", True):
        print("Alert email: no alerts tonight and email_when_quiet is off"); return
    msg = EmailMessage()
    msg["Subject"], msg["From"], msg["To"] = subj, f"Terminal Lite <{user}>", to
    msg.set_content(txt); msg.add_alternative(body, subtype="html")
    host, port = os.environ.get("SMTP_HOST") or "smtp.gmail.com", int(os.environ.get("SMTP_PORT") or 465)
    try:
        if port == 465:
            with smtplib.SMTP_SSL(host, port, context=ssl.create_default_context(), timeout=30) as s:
                s.login(user, pw); s.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=30) as s:
                s.starttls(context=ssl.create_default_context()); s.login(user, pw); s.send_message(msg)
        print(f"Alert email sent: {subj}")
    except Exception as ex:  # never fail the site build over email
        print("Alert email failed:", type(ex).__name__, str(ex)[:200])


if __name__ == "__main__":
    main()
