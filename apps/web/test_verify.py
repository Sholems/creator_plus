from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.on("pageerror", lambda e: print("PAGEERROR:", e))
    page.on("response", lambda r: print("RESP", r.status, r.url) if "/api/v1" in r.url else None)

    # --- Admin panel :3002 ---
    print("=== ADMIN :3002 ===")
    page.goto("http://localhost:3002/login")
    page.wait_for_load_state("networkidle")
    page.fill('input[type="email"]', "admin@mycreatorplus.com")
    page.fill('input[type="password"]', "Admin@123456")
    page.click('button[type="submit"]')
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2500)
    print("ADMIN URL:", page.url)
    body = page.inner_text("body").encode("ascii", "ignore").decode()
    print("ADMIN BODY:", body[:300])

    # --- Web create flow :3000 ---
    print("=== WEB CREATE :3000 ===")
    page.goto("http://localhost:3000/auth/login")
    page.wait_for_load_state("networkidle")
    page.fill('input[type="email"]', "ada@example.com")
    page.fill('input[type="password"]', "Demo@123456")
    page.click('button[type="submit"]')
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)

    page.goto("http://localhost:3000/creator/products/new")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)
    page.fill("#title", "Verify Test Item")
    page.select_option("#category", index=1)
    page.fill("#price", "3000")
    page.click('div[contenteditable="true"]')
    page.keyboard.type("This is a long enough rich text description to pass the fifty character minimum check used by the platform when creating a new product listing.")
    page.click('button[type="submit"]')
    page.wait_for_timeout(4000)
    print("WEB URL:", page.url)
    print("WEB ON_PRODUCTS:", "My Products" in page.inner_text("body"))
    browser.close()
