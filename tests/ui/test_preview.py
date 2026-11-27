"""Drive the SPORT preview in Chrome at phone and desktop sizes.
Usage: python3 test_preview.py <html> <outdir>"""
import sys, pathlib, json
from playwright.sync_api import sync_playwright

html = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
URL = html.as_uri()
results = []

def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))

def run(viewport, tag):
    with sync_playwright() as p:
        try:
            b = p.chromium.launch(channel="chrome", args=["--no-sandbox"])
        except Exception:
            b = p.chromium.launch()
        ctx = b.new_context(viewport=viewport, timezone_id="Africa/Cairo")
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: m.type == "error" and errors.append(m.text))

        def go(h):
            page.goto(URL + h); page.wait_for_timeout(150)
        def shot(n):
            page.screenshot(path=str(out / f"{tag}-{n}.png"), full_page=True)
        def overflow():
            return page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        def focused():
            return page.evaluate("document.activeElement && (document.activeElement.id || document.activeElement.textContent.trim().slice(0,40))")

        # Home
        go("#/home"); shot("01-home")
        check(f"{tag} home visible", page.is_visible("#home"))
        check(f"{tag} home no horizontal overflow", overflow() <= 0, overflow())

        # Sports grid -> football clubs
        go("#/sports"); shot("02-sports")
        check(f"{tag} sports grid has 9 sports", page.locator(".sportgrid a").count() == 9)
        go("#/sports/football"); shot("03-clubs")
        check(f"{tag} clubs listed", page.locator(".venuecard").count() == 3)
        check(f"{tag} clubs no overflow", overflow() <= 0, overflow())
        # Search for a branch
        page.fill(".mtools input", "sidi"); page.wait_for_timeout(50)
        check(f"{tag} search filters clubs", page.locator(".venuecard").count() == 1)
        page.fill(".mtools input", "")
        # Venue grid via a slot link
        first_slot = page.locator(".vslots a").first
        slot_text = first_slot.text_content()
        first_slot.click(); page.wait_for_timeout(150); shot("04-venue")
        check(f"{tag} venue grid shown", page.locator("#market table").count() == 1)
        check(f"{tag} chosen slot hinted", page.locator("#market td .hint").count() >= 1, slot_text)
        check(f"{tag} venue no page overflow", overflow() <= 0, overflow())
        # Book an enabled cell
        cell = page.locator("#market td button:enabled").first
        label = cell.get_attribute("aria-label")
        cell.click(); page.wait_for_timeout(100); shot("05-review")
        check(f"{tag} market review dialog open", page.locator("#market dialog[open]").count() == 1)
        check(f"{tag} market dialog labelled", page.evaluate("!!document.querySelector('#market dialog').getAttribute('aria-labelledby')"))
        page.get_by_role("button", name="Confirm demo booking").click(); page.wait_for_timeout(100)
        page.get_by_role("button", name="Done").click(); page.wait_for_timeout(150)
        check(f"{tag} booked cell now disabled", page.locator(f'#market td button[aria-label="{label}"]').first.is_disabled(), label)
        # Cancel via My bookings and see slot freed
        page.click("#history-link"); page.wait_for_timeout(100); shot("06-history")
        page.get_by_role("button", name="Cancel demo booking").first.click()
        page.click("#close-history"); page.wait_for_timeout(150)
        check(f"{tag} cancelled market slot re-enabled", page.locator(f'#market td button[aria-label="{label}"]').first.is_enabled(), label)

        # Legacy pitch listing #/courts
        go("#/courts"); shot("07-courts")
        n = page.locator("#listings .listing").count()
        check(f"{tag} pitch listings", n == 3, n)
        check(f"{tag} courts no overflow", overflow() <= 0, overflow())
        page.locator("#listings .quick-times button").first.click(); page.wait_for_timeout(150); shot("08-pitch-detail")
        check(f"{tag} pitch detail next enabled", page.is_enabled("#next"))
        page.click("#next"); page.wait_for_timeout(100)
        check(f"{tag} review focus on title", focused() == "checkout-title", focused())
        page.keyboard.press("Escape"); page.wait_for_timeout(100)
        check(f"{tag} focus returns to Review button after Escape", focused() == "next", focused())

        # Coaches: picker -> football coaches
        go("#/coaches"); shot("09-coach-picker")
        check(f"{tag} coach picker grid", page.locator(".sportgrid a").count() == 9)
        go("#/coaches/football"); shot("10-coaches")
        check(f"{tag} two football coaches", page.locator("#listings .listing").count() == 2)
        # Fixed-location coach (Nour)
        page.get_by_role("button", name="Nour Amin", exact=True).click(); page.wait_for_timeout(150); shot("11-nour")
        check(f"{tag} fixed coach hides add-on", page.is_hidden("#venue-options"))
        check(f"{tag} fixed coach shows venue", "Smouha training ground" in page.text_content("#summary-time"))
        # Flexible coach (Omar)
        page.click("#return-results"); page.wait_for_timeout(100)
        page.get_by_role("button", name="Omar Adel", exact=True).click(); page.wait_for_timeout(150)
        check(f"{tag} flexible coach shows add-on", page.is_visible("#venue-options"))
        check(f"{tag} flexible coach court catalog hidden until add", page.is_hidden("#court-field"))
        page.check("#add-court"); page.wait_for_timeout(100); shot("12-omar-court")
        check(f"{tag} add-court shows pitches", page.is_visible("#court-field"))
        rows = page.locator("#prices .price").count()
        check(f"{tag} itemized prices coach+pitch+total", rows == 3, rows)
        total = page.text_content("#prices .total dd")
        check(f"{tag} total = 400 + 500", total.replace(" "," ").startswith("900"), total)
        # empty shared availability: day index 2 with Montaza (hours 9,12) vs Omar (10,11)
        page.get_by_role("button", name="East Ground").click()
        page.wait_for_timeout(100)
        note = page.text_content("#availability-note")
        check(f"{tag} no-shared-times message", "No shared times" in note, note)
        # Other sport coach
        go("#/coaches/padel"); page.wait_for_timeout(100); shot("13-padel-coaches")
        check(f"{tag} padel coach listed", page.locator("#listings .listing").count() == 1)
        page.locator("#listings .quick-times button").first.click(); page.wait_for_timeout(100)
        check(f"{tag} padel coach needs own location", page.is_disabled("#next"))
        page.fill("#own-location", "Kick Smash Academy"); page.wait_for_timeout(50)
        check(f"{tag} own location enables review", page.is_enabled("#next"))
        check(f"{tag} title says padel coach", "padel" in page.title().lower() or "Padel" in page.text_content("#page-title"), page.title())
        check(f"{tag} no JS errors", not errors, errors[:3])
        b.close()

run({"width": 390, "height": 844}, "phone")
run({"width": 1280, "height": 860}, "desktop")
fails = [r for r in results if not r[1]]
for n, ok, d in results:
    print(("PASS " if ok else "FAIL ") + n + (f"  [{d}]" if d not in ("", None) and not ok else ""))
print(f"\n{len(results)-len(fails)}/{len(results)} passed")
json.dump(results, open(out / "results.json", "w"), indent=1)
