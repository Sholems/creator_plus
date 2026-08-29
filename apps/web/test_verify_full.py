"""Full E2E verification for CreatorPlus checklist:
- creator login smart redirect -> /creator, Creator badge in header
- dashboard switcher (buyer <-> creator)
- buyer login -> /dashboard, Start selling CTA in user menu + switcher
- register + 'start selling' auto-applies creator profile -> /creator
- create-product flow -> lands on My Products with the new product listed
- admin console role display (super_admin / creator / buyer)
"""
import re
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
ADMIN = "http://localhost:3002"
API_HEALTH = "http://localhost:3001/api/v1/categories"


def api_ready(timeout: int = 60) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(API_HEALTH, timeout=3) as r:
                if r.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(2)
    return False


if not api_ready():
    print("API NOT READY after 60s - aborting verification (is :3001 up?)")
    sys.exit(2)

results: list[tuple[str, bool]] = []


def check(name: str, cond: bool, extra: str = ""):
    status = "PASS" if cond else "FAIL"
    results.append((name, cond))
    print(f"[{status}] {name} {extra}")


def settle(page, ms: int = 800):
    try:
        page.wait_for_load_state("domcontentloaded")
    except Exception:
        pass
    page.wait_for_timeout(ms)


def wait_for_text(page, selector: str, text: str, timeout: int = 8000) -> bool:
    try:
        page.wait_for_function(
            # Case-insensitive: the header Creator badge is styled `uppercase`,
            # so innerText renders it as "CREATOR" while we match on "Creator".
            "([sel, txt]) => { const el = document.querySelector(sel); return !!el && el.innerText.toLowerCase().includes(txt.toLowerCase()); }",
            arg=[selector, text],
            timeout=timeout,
        )
        return True
    except Exception:
        return False


def login(page, email: str, password: str):
    page.goto(f"{BASE}/auth/login")
    settle(page)
    page.fill('input[type="email"]', email)
    page.fill('input[type="password"]', password)
    page.click('button[type="submit"]')
    settle(page, 1200)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    console_errors: list[str] = []

    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.on("pageerror", lambda e: console_errors.append(f"PAGEERROR: {e}"))
    page.on(
        "console",
        lambda m: console_errors.append(f"CONSOLE: {m.text}") if m.type == "error" else None,
    )

    # ---------------------------------------------------------------
    # 1. Creator login -> smart redirect to /creator + header badge
    # ---------------------------------------------------------------
    login(page, "ada@example.com", "Demo@123456")
    try:
        page.wait_for_url(re.compile(r"^http://localhost:3000/creator($|/)"), timeout=15000)
        creator_redirect = page.url.rstrip("/").endswith("/creator")
    except Exception:
        creator_redirect = False
    check("creator login redirects to /creator", creator_redirect, page.url)
    settle(page, 1800)
    body = page.inner_text("body")
    check("creator dashboard renders (Creator Studio)", "Creator Studio" in body)

    # Marketplace header shows the Creator badge + menu entry
    page.goto(f"{BASE}/products")
    settle(page, 1500)
    check("header shows Creator badge", wait_for_text(page, "header", "Creator"))
    page.locator("header button.rounded-full").click()
    page.wait_for_timeout(500)
    menu_text = page.inner_text("body")
    check("creator user menu shows Creator Studio", "Creator Studio" in menu_text)
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)

    # Back to creator dashboard for switcher checks
    page.goto(f"{BASE}/creator")
    settle(page, 1500)

    # ---------------------------------------------------------------
    # 2. Dashboard switcher: creator -> buyer -> creator
    # ---------------------------------------------------------------
    aside = page.locator("aside").inner_text()
    check("switcher shows Buyer tab on creator", "Buyer" in aside)
    page.locator("aside").get_by_role("link", name=re.compile(r"^Buyer$")).click()
    try:
        page.wait_for_url(re.compile(r"^http://localhost:3000/dashboard($|/)"), timeout=15000)
        to_buyer = True
    except Exception:
        to_buyer = False
    check("switcher navigates to /dashboard", to_buyer, page.url)
    settle(page, 1800)
    body = page.inner_text("body")
    check("buyer dashboard renders (Buyer Dashboard)", "Buyer Dashboard" in body)
    check(
        "buyer sidebar shows creator store card",
        "Ada's AI Studio" in body and "Open Creator Studio" in body,
    )
    page.locator("aside").get_by_role("link", name=re.compile(r"^Creator$")).click()
    try:
        page.wait_for_url(re.compile(r"^http://localhost:3000/creator($|/)"), timeout=15000)
        back_to_creator = True
    except Exception:
        back_to_creator = False
    check("switcher navigates back to /creator", back_to_creator, page.url)

    # ---------------------------------------------------------------
    # 3. Buyer login -> /dashboard + Start selling CTA
    # ---------------------------------------------------------------
    page.evaluate("localStorage.removeItem('token')")
    login(page, "sarah@example.com", "Demo@123456")
    try:
        page.wait_for_url(re.compile(r"^http://localhost:3000/dashboard($|/)"), timeout=15000)
        buyer_redirect = True
    except Exception:
        buyer_redirect = False
    check("buyer login redirects to /dashboard", buyer_redirect, page.url)
    settle(page, 1800)
    aside = page.locator("aside").inner_text()
    check("buyer switcher shows Start selling", "Start selling" in aside)

    # Marketplace header: user menu should offer Start selling (no Creator Studio)
    page.goto(f"{BASE}/products")
    settle(page, 1500)
    page.locator("header button.rounded-full").click()
    page.wait_for_timeout(600)
    menu_text = page.inner_text("body")
    check("buyer user menu shows Start selling", "Start selling" in menu_text)
    check("buyer user menu hides Creator Studio", "Creator Studio" not in menu_text)

    # ---------------------------------------------------------------
    # 4. Register + 'start selling' auto-applies creator -> /creator
    # ---------------------------------------------------------------
    ts = int(time.time())
    new_email = f"e2ecreator{ts}@example.com"
    page.goto(f"{BASE}/auth/register")
    settle(page)
    page.fill("#displayName", "E2E Creator")
    page.fill("#email", new_email)
    page.fill("#password", "Demo@123456")
    page.fill("#confirmPassword", "Demo@123456")
    page.check("#wantToSell")
    page.fill("#storeName", f"E2E Store {ts}")
    page.check("#terms")
    page.click('button[type="submit"]')
    try:
        page.wait_for_url(re.compile(r"^http://localhost:3000/creator($|/)"), timeout=25000)
        reg_creator = True
    except Exception:
        reg_creator = False
    check("register+start selling redirects to /creator", reg_creator, page.url)
    settle(page, 1800)
    body = page.inner_text("body")
    check("new creator lands on Creator Studio", "Creator Studio" in body)
    page.goto(f"{BASE}/products")
    settle(page, 1500)
    check("new creator has Creator badge", wait_for_text(page, "header", "Creator"))

    # ---------------------------------------------------------------
    # 5. Create-product flow (ada)
    # ---------------------------------------------------------------
    page.evaluate("localStorage.removeItem('token')")
    login(page, "ada@example.com", "Demo@123456")
    try:
        page.wait_for_url(re.compile(r"^http://localhost:3000/creator($|/)"), timeout=15000)
    except Exception:
        pass
    page.goto(f"{BASE}/creator/products/new")
    settle(page, 1500)
    title = f"E2E Verify Product {ts}"
    page.fill("#title", title)
    page.select_option("#category", index=1)
    page.fill("#price", "3000")
    page.click('div[contenteditable="true"]')
    page.keyboard.type(
        "This is an end-to-end verification product description written long enough to "
        "satisfy the fifty character minimum requirement of the platform for new listings."
    )
    page.wait_for_timeout(600)
    page.click('button[type="submit"]')
    try:
        page.wait_for_url(re.compile(r"^http://localhost:3000/creator/products$"), timeout=25000)
        on_products = True
    except Exception:
        on_products = False
    check("create product redirects to My Products", on_products, page.url)
    settle(page, 2500)
    body = page.inner_text("body")
    check("new product appears in My Products list", title in body)

    print(f"NEW_EMAIL={new_email}")
    print(f"NEW_PRODUCT_TITLE={title}")

    # ---------------------------------------------------------------
    # 6. Admin console role display
    # ---------------------------------------------------------------
    actx = browser.new_context(viewport={"width": 1440, "height": 900})
    apage = actx.new_page()
    apage.on("pageerror", lambda e: console_errors.append(f"ADMIN PAGEERROR: {e}"))
    admin_logged_in = False
    for attempt in range(2):
        apage.goto(f"{ADMIN}/login")
        settle(apage)
        apage.fill('input[type="email"]', "admin@mycreatorplus.com")
        apage.fill('input[type="password"]', "Admin@123456")
        apage.click('button[type="submit"]')
        settle(apage, 3500)
        if apage.evaluate("localStorage.getItem('admin_token') !== null"):
            admin_logged_in = True
            break
        print(f"    (admin login attempt {attempt + 1} failed - retrying)")
    check("admin login succeeds", admin_logged_in)
    apage.goto(f"{ADMIN}/users")
    settle(apage, 3000)
    body = apage.inner_text("body")
    check("admin users page renders", "Users" in body)
    check("role badges present", "super_admin" in body and "creator" in body and "buyer" in body)

    def row_has(needle: str, role: str) -> bool:
        row = apage.locator("tr", has_text=needle)
        if row.count() == 0:
            return False
        return role in row.first.inner_text()

    check("admin@mycreatorplus.com row shows super_admin", row_has("admin@mycreatorplus.com", "super_admin"))
    check("ada@example.com row shows creator", row_has("ada@example.com", "creator"))
    check("sarah@example.com row shows buyer", row_has("sarah@example.com", "buyer"))

    print("\n=== BROWSER CONSOLE/PAGE ERRORS (info) ===")
    for e in console_errors:
        print("  ", e)

    browser.close()

failed = [name for name, ok in results if not ok]
print("\n=== SUMMARY ===")
print(f"TOTAL: {len(results)}  PASS: {len(results) - len(failed)}  FAIL: {len(failed)}")
for name, ok in results:
    print(f"  {'PASS' if ok else 'FAIL'}  {name}")
if failed:
    print("SOME CHECKS FAILED:", failed)
    raise SystemExit(1)
print("ALL CHECKS PASSED")
