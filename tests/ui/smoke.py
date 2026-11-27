"""Smoke-test every athlete route at phone and desktop sizes (demo mode). Usage: python3 tests/ui/smoke.py apps/athlete-preview/index.html shots [api_base]"""
import sys, pathlib, json
from playwright.sync_api import sync_playwright
html = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
api = sys.argv[3] if len(sys.argv) > 3 else None
url = html.as_uri() + (f"?api={api}" if api else "?api=http://127.0.0.1:9")
routes = ["#/home", "#/sports", "#/sports/football", "#/sports/football/coastal/0", "#/courts", "#/coaches", "#/coaches/football", "#/gyms", "#/academies"]
report = {}
with sync_playwright() as p:
    try:
        b = p.chromium.launch(channel="chrome", args=["--no-sandbox"])
    except Exception:
        b = p.chromium.launch()
    for tag, vp in [("phone", {"width": 390, "height": 844}), ("desktop", {"width": 1280, "height": 860})]:
        ctx = b.new_context(viewport=vp, timezone_id="Africa/Cairo"); page = ctx.new_page()
        errs = []; page.on("pageerror", lambda e: errs.append(str(e)))
        page.goto(url + "#/home"); page.wait_for_timeout(1500)
        report[f"{tag} api badge"] = page.locator("#api-status-text").text_content()
        for r in routes:
            page.evaluate(f"location.hash='{r[1:]}'"); page.wait_for_timeout(300)
            ov = page.evaluate("document.documentElement.scrollWidth - innerWidth")
            vis = page.evaluate("[...document.querySelectorAll('main > section, main > div')].filter(e=>!e.hidden&&e.offsetParent!==null).map(e=>e.id||e.className).join(',')")
            report[f"{tag} {r}"] = {"overflow_px": ov, "visible": vis, "title": page.title()}
            page.screenshot(path=str(out / f"{tag}{r.replace('#','').replace('/','_')}.png"), full_page=True)
        # Arabic toggle
        page.evaluate("location.hash='/home'"); page.wait_for_timeout(200)
        page.click("#lang-toggle"); page.wait_for_timeout(300)
        report[f"{tag} rtl"] = page.evaluate("document.documentElement.dir")
        page.screenshot(path=str(out / f"{tag}_home_ar.png"), full_page=True)
        page.click("#lang-toggle")
        report[f"{tag} js_errors"] = errs[:5]
        ctx.close()
    b.close()
print(json.dumps(report, indent=1, ensure_ascii=False))
