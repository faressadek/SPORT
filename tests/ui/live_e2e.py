"""Athlete app + provider portal against a running API. Start `npm run start:api`, then: python3 tests/ui/live_e2e.py . http://127.0.0.1:3000"""
import sys, pathlib, json, urllib.request
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); api = sys.argv[2]
athlete = (root / "apps/athlete-preview/index.html").as_uri() + f"?api={api}"
portal = (root / "apps/provider-admin/index.html").as_uri() + f"?api={api}"
res = []
def check(n, c, d=""): res.append((n, bool(c), d))
def api_get(path, token):
    r = urllib.request.Request(api + path, headers={"Authorization": "Bearer " + token})
    return json.load(urllib.request.urlopen(r))
with sync_playwright() as p:
    try:
        b = p.chromium.launch(channel="chrome", args=["--no-sandbox"])
    except Exception:
        b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, timezone_id="Africa/Cairo"); page = ctx.new_page()
    errs = []; page.on("pageerror", lambda e: errs.append(str(e)))
    alerts = []; page.on("dialog", lambda d: (alerts.append(d.message), d.dismiss()))
    page.goto(athlete + "#/home"); page.wait_for_timeout(1800)
    check("badge says API connected", "demo" not in page.text_content("#api-status-text").lower(), page.text_content("#api-status-text"))
    # Facility booking through the grid
    page.evaluate("location.hash='/sports/football/coastal/0'"); page.wait_for_timeout(400)
    cell = page.locator("#market td button:enabled").first; label = cell.get_attribute("aria-label") or cell.text_content()
    cell.click(); page.wait_for_timeout(200)
    check("facility review labelled + focused", page.evaluate("document.activeElement.id") == "market-review-title")
    page.locator("#market dialog[open] .primary").click(); page.wait_for_timeout(600)
    server = api_get("/api/bookings", "demo-athlete-marwan")
    check("facility booking stored by API", len(server) == 1 and server[0]["status"] == "CONFIRMED", server)
    check("API charged the price shown (Coastal Gleem football = 500)", server and server[0]["total"] == 500, server and server[0]["total"])
    # Flexible coach + pitch
    page.evaluate("location.hash='/coaches/football'"); page.wait_for_timeout(400)
    page.get_by_role("button", name="Omar Adel", exact=True).click(); page.wait_for_timeout(200)
    page.check("#add-court"); page.wait_for_timeout(200)
    page.locator("#times button").first.click(); page.wait_for_timeout(100)
    page.click("#next"); page.wait_for_timeout(200); page.click("#confirm"); page.wait_for_timeout(700)
    server = api_get("/api/bookings", "demo-athlete-marwan")
    combo = [x for x in server if x.get("coach") == "omar"]
    check("coach + pitch stored as one booking with both resources", combo and len(combo[0]["resourceIds"]) == 2, combo)
    check("combined total 900", combo and combo[0]["total"] == 900, combo and combo[0]["total"])
    page.keyboard.press("Escape"); page.wait_for_timeout(200)
    # Reload: My bookings keeps readable labels
    page.reload(); page.wait_for_timeout(1800)
    page.click("#history-link"); page.wait_for_timeout(300)
    rows = page.locator("#saved article p").all_text_contents()
    check("My bookings rows readable after reload", len([r for r in rows if r.strip()]) >= 2, rows)
    page.locator("#saved article .back").first.click(); page.wait_for_timeout(500)
    page.click("#close-history"); page.wait_for_timeout(300)
    check("cancel reaches API", len(api_get("/api/bookings", "demo-athlete-marwan")) == 1)
    # Enquiry with hostile name
    page.evaluate("location.hash='/gyms'"); page.wait_for_timeout(400)
    page.locator("#gym-list .cta").first.click(); page.wait_for_timeout(200)
    page.fill("#enq-name", "<img src=x onerror=alert('xss')>"); page.fill("#enq-phone", "+20 100 000 0000")
    page.locator("#enquiry-form [type=submit]").click(); page.wait_for_timeout(600)
    check("no JS errors in athlete app", not errs, errs[:3])
    # Provider portal as admin
    p2 = ctx.new_page(); p2.on("dialog", lambda d: (alerts.append(d.message), d.dismiss()))
    p2.goto(portal); p2.wait_for_timeout(1200)
    check("admin sees the enquiry", "onerror" in p2.text_content("#enquiries-box"))
    check("hostile name shown as text, not run", not any("xss" in a for a in alerts), alerts)
    p2.select_option("#token-select", "coach-fares"); p2.wait_for_timeout(800)
    check("coach does not see other businesses' enquiries", "onerror" not in p2.text_content("#enquiries-box"))
    p2.select_option("#token-select", "gym-apex"); p2.wait_for_timeout(800)
    check("gym owner sees the enquiry for its gym", "onerror" in p2.text_content("#enquiries-box"))
    check("gym owner sees only its own listing", p2.locator("#listings-box tr").count() == 2, p2.text_content("#listings-box")[:160])
    # Admin hides a gym in the portal; the athlete app no longer lists it
    p2.select_option("#token-select", "admin-sport"); p2.wait_for_timeout(800)
    p2.locator("#listings-box button[data-listing='sporting-iron']").click(); p2.wait_for_timeout(800)
    check("admin can hide a gym", "Hidden" in p2.text_content("#listings-box"))
    page.reload(); page.wait_for_timeout(1800); page.evaluate("location.hash='/gyms'"); page.wait_for_timeout(500)
    names = page.locator("#gym-list h2").all_text_contents()
    check("hidden gym gone from athlete app", "Sporting Strength & Conditioning" not in names and len(names) == 3, names)
    p2.select_option("#token-select", "venue-coastal"); p2.wait_for_timeout(800)
    check("venue sees its own facility booking", "BKG-" in p2.text_content("#bookings-box"), p2.text_content("#bookings-box")[:120])
    b.close()
for n, ok, d in res: print(("PASS " if ok else "FAIL ") + n + ("" if ok else f"  [{d}]"))
print(f"{sum(r[1] for r in res)}/{len(res)} passed")
