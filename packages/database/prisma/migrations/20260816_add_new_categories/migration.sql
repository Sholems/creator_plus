-- AddNewCategories
INSERT INTO "categories" ("id", "name", "slug", "description", "icon", "sort_order", "is_active", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'WordPress Themes', 'wordpress-themes', 'Premium WordPress themes for blogs, business, e-commerce and portfolios', '🎨', 15, true, NOW(), NOW()),
  (gen_random_uuid(), 'WordPress Plugins', 'wordpress-plugins', 'WordPress plugins for SEO, forms, e-commerce, security and more', '🔧', 16, true, NOW(), NOW()),
  (gen_random_uuid(), 'Notion Templates', 'notion-templates', 'Notion dashboards, planners, habit trackers, project boards and wikis', '📋', 17, true, NOW(), NOW()),
  (gen_random_uuid(), 'Canva Templates', 'canva-templates', 'Ready-to-use Canva templates for social media, presentations and prints', '🖼️', 18, true, NOW(), NOW()),
  (gen_random_uuid(), 'Excel & Sheets', 'excel-sheets', 'Spreadsheets, trackers, budgets, dashboards and formulas', '📈', 19, true, NOW(), NOW()),
  (gen_random_uuid(), 'PowerPoint Templates', 'powerpoint', 'Presentation templates for pitches, reports, education and business', '📊', 20, true, NOW(), NOW()),
  (gen_random_uuid(), 'UI/UX Kits', 'ui-ux', 'Figma, Sketch and Adobe XD design systems, wireframes and UI kits', '✨', 21, true, NOW(), NOW()),
  (gen_random_uuid(), 'No-Code Tools', 'no-code', 'Webflow, Bubble, Carrd and other no-code templates and starter files', '🧩', 22, true, NOW(), NOW())
ON CONFLICT ("slug") DO NOTHING;
