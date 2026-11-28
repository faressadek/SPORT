"""Playwright UI smoke tests for SPORT Athlete Preview (Courts, Coaches, Gyms, Academies, RTL)."""
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

HTML_URI = (Path(__file__).resolve().parents[2] / "apps" / "athlete-preview" / "index.html").as_uri()


def test_athlete_journeys_and_rtl():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.goto(f"{HTML_URI}#/home")

        # 1. Verify Arabic RTL toggle
        page.click("#lang-toggle")
        assert page.get_attribute("html", "dir") == "rtl"
        page.click("#lang-toggle")
        assert page.get_attribute("html", "dir") == "ltr"

        # 2. Verify Coaches two-page rule & conditional court add-on
        page.goto(f"{HTML_URI}#/coaches/football")
        page.click("text=Omar Adel")
        assert page.is_visible("#venue-options")
        page.check("#add-court")
        assert page.is_visible("#court-field")
        # One pitch inventory: the add-on offers club branches only (no separate pitch list)
        branches = page.locator("#court button strong").all_text_contents()
        assert branches[0] == "Coastal Sports Club · Gleem" and len(branches) == 6, branches
        assert "North Pitch" not in page.content()
        page.locator("#times button").first.click()
        prices = page.locator("#prices").inner_text()
        assert "400 EGP" in prices and "500 EGP" in prices and "900 EGP" in prices, prices

        # The old pitch list route opens the football clubs
        page.goto(f"{HTML_URI}#/courts")
        page.wait_for_function("location.hash === '#/sports/football'")
        assert page.locator("#market .venuecard").count() == 3

        # 3. Verify Gyms comparison
        page.goto(f"{HTML_URI}#/gyms")
        buttons = page.locator("#gym-list button:has-text('+ Compare')")
        buttons.nth(0).click()
        buttons.nth(1).click()
        assert page.is_visible("#gym-compare-bar")
        page.click("#gym-open-compare")
        assert page.is_visible("#compare-dialog[open]")
        page.click("#close-compare")

        # 4. Verify Academies discovery & enquiry modal
        page.goto(f"{HTML_URI}#/academies")
        page.select_option("#acad-sport", "Padel")
        assert page.locator("#acad-list .dir-card").count() >= 1
        page.locator("#acad-list button.cta").first.click()
        assert page.is_visible("#enquiry-dialog[open]")

        browser.close()


if __name__ == "__main__":
    test_athlete_journeys_and_rtl()
    print("All UI checks passed.")


def test_operator_entry_and_workspace_pages():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 390, "height": 844})
        page.goto(HTML_URI)
        assert page.locator("#home").is_visible()
        page.click("#operator-entry")
        assert page.locator("nav a").count() == 4
        for role, landing, detail in [
            ("Coach", "Session roster", "Training availability"),
            ("Court owner", "Court bookings", "Opening hours & closures"),
            ("Academy owner", "Family enquiries", "Academy programs"),
            ("Gym owner", "Membership enquiries", "Gym listings"),
        ]:
            page.locator("nav a").filter(has=page.get_by_text(role, exact=True)).click()
            assert page.get_by_role("heading", name=role + " dashboard").is_visible()
            assert page.locator(".grid section:visible h2").inner_text() == landing
            page.get_by_role("link", name=detail, exact=True).click()
            expect(page.locator(".grid section:visible h2")).to_have_text(detail)
            page.reload()
            expect(page.locator(".grid section:visible h2")).to_have_text(detail)
            assert not page.locator("#token-select").is_visible()
            page.click("#change-workspace")
        page.click("#back")
        assert page.locator("#home").is_visible()
        browser.close()
