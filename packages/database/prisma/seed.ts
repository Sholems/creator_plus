import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Demo@123456';

async function main() {
  console.log('Seeding demo data...');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // ROLES & SUPER ADMIN
  const roleNames = ['super_admin', 'admin', 'moderator', 'finance', 'support', 'creator', 'buyer'];
  const roles = await Promise.all(
    roleNames.map((name) => prisma.role.create({ data: { name, description: `${name} role` } })),
  );
  const superAdminRole = roles.find((r) => r.name === 'super_admin')!;
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@creatormarket.ng',
      passwordHash: await bcrypt.hash('Admin@123456', 12),
      displayName: 'Platform Admin',
      emailVerified: true,
      status: 'ACTIVE',
      roles: { create: { roleId: superAdminRole.id } },
    },
  });
  console.log('Created roles and super admin:', superAdmin.email);

  // CREATORS
  const creatorUsers = await Promise.all([
    prisma.user.create({ data: { email: 'ada@example.com', passwordHash, displayName: 'Ada Lovelace', emailVerified: true, status: 'ACTIVE' } }),
    prisma.user.create({ data: { email: 'linus@example.com', passwordHash, displayName: 'Linus Torvalds', emailVerified: true, status: 'ACTIVE' } }),
    prisma.user.create({ data: { email: 'grace@example.com', passwordHash, displayName: 'Grace Hopper', emailVerified: true, status: 'ACTIVE' } }),
    prisma.user.create({ data: { email: 'margaret@example.com', passwordHash, displayName: 'Margaret Hamilton', emailVerified: true, status: 'ACTIVE' } }),
    prisma.user.create({ data: { email: 'alan@example.com', passwordHash, displayName: 'Alan Turing', emailVerified: true, status: 'ACTIVE' } }),
  ]);

  const creatorProfiles = await Promise.all([
    prisma.creatorProfile.create({ data: { userId: creatorUsers[0].id, storeName: "Ada's AI Studio", slug: 'adas-ai-studio', bio: 'Building the future with AI prompts, automation templates, and intelligent tools.', verified: true, verificationStatus: 'APPROVED', verifiedAt: new Date('2024-06-01') } }),
    prisma.creatorProfile.create({ data: { userId: creatorUsers[1].id, storeName: 'Kernel Crafts', slug: 'kernel-crafts', bio: 'Premium development tools, boilerplates, and code templates.', verified: true, verificationStatus: 'APPROVED', verifiedAt: new Date('2024-05-15') } }),
    prisma.creatorProfile.create({ data: { userId: creatorUsers[2].id, storeName: 'Grace Design Co', slug: 'grace-design-co', bio: 'Beautiful UI kits, Canva templates, and design systems.', verified: true, verificationStatus: 'APPROVED', verifiedAt: new Date('2024-07-01') } }),
    prisma.creatorProfile.create({ data: { userId: creatorUsers[3].id, storeName: 'Hamilton Academy', slug: 'hamilton-academy', bio: 'Educational resources, courses, and worksheets for STEM subjects.', verified: true, verificationStatus: 'APPROVED', verifiedAt: new Date('2024-04-20') } }),
    prisma.creatorProfile.create({ data: { userId: creatorUsers[4].id, storeName: 'Turing Templates', slug: 'turing-templates', bio: 'Business templates, legal documents, and marketing materials.', verified: true, verificationStatus: 'APPROVED', verifiedAt: new Date('2024-08-01') } }),
  ]);
  console.log('Created 5 creators with profiles');

  // BUYERS
  const buyerUsers = await Promise.all([
    prisma.user.create({ data: { email: 'sarah@example.com', passwordHash, displayName: 'Sarah Chen', emailVerified: true, status: 'ACTIVE' } }),
    prisma.user.create({ data: { email: 'marcus@example.com', passwordHash, displayName: 'Marcus Johnson', emailVerified: true, status: 'ACTIVE' } }),
    prisma.user.create({ data: { email: 'priya@example.com', passwordHash, displayName: 'Priya Patel', emailVerified: true, status: 'ACTIVE' } }),
    prisma.user.create({ data: { email: 'james@example.com', passwordHash, displayName: 'James Wilson', emailVerified: true, status: 'ACTIVE' } }),
    prisma.user.create({ data: { email: 'emma@example.com', passwordHash, displayName: 'Emma Rodriguez', emailVerified: true, status: 'ACTIVE' } }),
  ]);

  await Promise.all(buyerUsers.map((user) =>
    prisma.userProfile.create({ data: { userId: user.id, bio: 'Digital product enthusiast', country: 'US' } })
  ));
  console.log('Created 5 buyers');

  // TAGS
  const tags = await Promise.all([
    prisma.tag.create({ data: { name: 'React', slug: 'react' } }),
    prisma.tag.create({ data: { name: 'Next.js', slug: 'nextjs' } }),
    prisma.tag.create({ data: { name: 'Tailwind CSS', slug: 'tailwind-css' } }),
    prisma.tag.create({ data: { name: 'ChatGPT', slug: 'chatgpt' } }),
    prisma.tag.create({ data: { name: 'Figma', slug: 'figma' } }),
    prisma.tag.create({ data: { name: 'Canva', slug: 'canva' } }),
    prisma.tag.create({ data: { name: 'TypeScript', slug: 'typescript' } }),
    prisma.tag.create({ data: { name: 'Python', slug: 'python' } }),
    prisma.tag.create({ data: { name: 'WordPress', slug: 'wordpress' } }),
    prisma.tag.create({ data: { name: 'Laravel', slug: 'laravel' } }),
    prisma.tag.create({ data: { name: 'Flutter', slug: 'flutter' } }),
    prisma.tag.create({ data: { name: 'UI Kit', slug: 'ui-kit' } }),
    prisma.tag.create({ data: { name: 'Template', slug: 'template' } }),
    prisma.tag.create({ data: { name: 'eBook', slug: 'ebook' } }),
    prisma.tag.create({ data: { name: 'Notion', slug: 'notion' } }),
    prisma.tag.create({ data: { name: 'AI Prompt', slug: 'ai-prompt' } }),
    prisma.tag.create({ data: { name: 'Stock Music', slug: 'stock-music' } }),
    prisma.tag.create({ data: { name: 'LUT', slug: 'lut' } }),
    prisma.tag.create({ data: { name: 'Blender', slug: 'blender' } }),
    prisma.tag.create({ data: { name: 'Legal Template', slug: 'legal-template' } }),
  ]);
  console.log('Created', tags.length, 'tags');

  // CATEGORIES
  const categoryData = [
    { name: 'AI & Agents', slug: 'ai', description: 'Prompts, bots, agents and AI workflows', icon: '🤖' },
    { name: 'Design', slug: 'design', description: 'Templates, UI kits, icons and fonts', icon: '🎨' },
    { name: 'Development', slug: 'development', description: 'Code templates, boilerplates and dev tools', icon: '💻' },
    { name: 'Business', slug: 'business', description: 'Business plans, contracts and strategy tools', icon: '📊' },
    { name: 'Education', slug: 'education', description: 'Courses, worksheets and exam prep', icon: '📚' },
    { name: 'Books', slug: 'books', description: 'eBooks, guides and publications', icon: '📖' },
    { name: 'Audio', slug: 'audio', description: 'Beats, music, sound effects and audio assets', icon: '🎵' },
    { name: 'Video', slug: 'video', description: 'Video templates, LUTs and motion graphics', icon: '🎬' },
    { name: 'Photography', slug: 'photography', description: 'Presets, textures and photography tools', icon: '📷' },
    { name: '3D & Modeling', slug: '3d', description: '3D models, CAD files and rendering assets', icon: '🧊' },
    { name: 'Architecture', slug: 'architecture', description: 'Architectural plans and design resources', icon: '🏛️' },
    { name: 'Marketing', slug: 'marketing', description: 'SMM kits, funnels, landing pages and ads', icon: '📣' },
    { name: 'Legal', slug: 'legal', description: 'NDAs, contracts and policy templates', icon: '⚖️' },
    { name: 'Church & Ministry', slug: 'church', description: 'Sermon packs, Bible studies and worship slides', icon: '⛪' },
    { name: 'WordPress Themes', slug: 'wordpress-themes', description: 'Premium WordPress themes for blogs, business, e-commerce and portfolios', icon: '🎨' },
    { name: 'WordPress Plugins', slug: 'wordpress-plugins', description: 'WordPress plugins for SEO, forms, e-commerce, security and more', icon: '🔧' },
    { name: 'Notion Templates', slug: 'notion-templates', description: 'Notion dashboards, planners, habit trackers, project boards and wikis', icon: '📋' },
    { name: 'Canva Templates', slug: 'canva-templates', description: 'Ready-to-use Canva templates for social media, presentations and prints', icon: '🖼️' },
    { name: 'Excel & Sheets', slug: 'excel-sheets', description: 'Spreadsheets, trackers, budgets, dashboards and formulas', icon: '📈' },
    { name: 'PowerPoint Templates', slug: 'powerpoint', description: 'Presentation templates for pitches, reports, education and business', icon: '📊' },
    { name: 'UI/UX Kits', slug: 'ui-ux', description: 'Figma, Sketch and Adobe XD design systems, wireframes and UI kits', icon: '✨' },
    { name: 'No-Code Tools', slug: 'no-code', description: 'Webflow, Bubble, Carrd and other no-code templates and starter files', icon: '🧩' },
  ];
  const createdCategories = await Promise.all(
    categoryData.map(c => prisma.category.create({ data: c }))
  );
  const catBySlug: Record<string, string> = {};
  for (const c of createdCategories) catBySlug[c.slug] = c.id;
  console.log('Created', createdCategories.length, 'categories');

  // PRODUCTS - using connect for required relations
  const ci = creatorProfiles.map(p => p.id);
  const cs = catBySlug;

  const products = await Promise.all([
    prisma.product.create({ data: { creator: { connect: { id: ci[0] } }, category: { connect: { id: cs['ai'] } }, title: 'Ultimate ChatGPT Prompt Bundle', slug: 'ultimate-chatgpt-prompt-bundle', description: 'Over 500 carefully crafted prompts for ChatGPT, organized by category: marketing, coding, writing, business, education, and more. Each prompt includes examples and tips for getting the best results.', shortDescription: '500+ ChatGPT prompts for every use case', status: 'PUBLISHED', price: 6500, licenseType: 'PERSONAL', averageRating: 4.8, reviewCount: 127, downloadCount: 892, viewCount: 4521, isFeatured: true, publishedAt: new Date('2024-09-15') } }),
    prisma.product.create({ data: { creator: { connect: { id: ci[0] } }, category: { connect: { id: cs['ai'] } }, title: 'AI Content Automation Workflow', slug: 'ai-content-automation-workflow', description: 'A complete Notion + Make.com workflow for automating your content creation pipeline.', shortDescription: 'Automate your content pipeline with AI', status: 'PUBLISHED', price: 12000, licenseType: 'COMMERCIAL', averageRating: 4.6, reviewCount: 89, downloadCount: 567, viewCount: 3200, isFeatured: true, publishedAt: new Date('2024-10-01') } }),
    prisma.product.create({ data: { creator: { connect: { id: ci[0] } }, category: { connect: { id: cs['marketing'] } }, title: 'AI-Powered Social Media Toolkit', slug: 'ai-powered-social-media-toolkit', description: 'Complete toolkit for managing social media with AI assistance.', shortDescription: 'Manage social media with AI assistance', status: 'PUBLISHED', price: 9500, licenseType: 'COMMERCIAL', averageRating: 4.5, reviewCount: 64, downloadCount: 445, viewCount: 2800, publishedAt: new Date('2024-11-01') } }),
    prisma.product.create({ data: { creator: { connect: { id: ci[1] } }, category: { connect: { id: cs['development'] } }, title: 'Next.js SaaS Starter Kit', slug: 'nextjs-saas-starter-kit', description: 'Production-ready SaaS boilerplate built with Next.js 14, TypeScript, Prisma, Stripe, and Tailwind CSS.', shortDescription: 'Production-ready SaaS boilerplate with Next.js', status: 'PUBLISHED', price: 45000, licenseType: 'COMMERCIAL', averageRating: 4.9, reviewCount: 203, downloadCount: 1456, viewCount: 8900, isFeatured: true, publishedAt: new Date('2024-08-01') } }),
    prisma.product.create({ data: { creator: { connect: { id: ci[1] } }, category: { connect: { id: cs['development'] } }, title: 'Laravel API Starter Kit', slug: 'laravel-api-starter-kit', description: 'A comprehensive Laravel 11 REST API starter with JWT auth, role-based access control, and Docker setup.', shortDescription: 'Laravel 11 API starter with auth & RBAC', status: 'PUBLISHED', price: 32000, licenseType: 'COMMERCIAL', averageRating: 4.7, reviewCount: 156, downloadCount: 1200, viewCount: 6500, publishedAt: new Date('2024-09-15') } }),
    prisma.product.create({ data: { creator: { connect: { id: ci[1] } }, category: { connect: { id: cs['development'] } }, title: 'React Component Library', slug: 'react-component-library', description: '60+ production-ready React components built with TypeScript and Tailwind CSS.', shortDescription: '60+ React components with TypeScript & Tailwind', status: 'PUBLISHED', price: 18000, licenseType: 'COMMERCIAL', averageRating: 4.6, reviewCount: 112, downloadCount: 890, viewCount: 5200, publishedAt: new Date('2024-10-15') } }),
    prisma.product.create({ data: { creator: { connect: { id: ci[2] } }, category: { connect: { id: cs['design'] } }, title: 'Ultimate UI Kit for Figma', slug: 'ultimate-ui-kit-figma', description: '500+ beautifully designed UI components for Figma.', shortDescription: '500+ Figma UI components', status: 'PUBLISHED', price: 22000, licenseType: 'COMMERCIAL', averageRating: 4.8, reviewCount: 178, downloadCount: 1123, viewCount: 7600, isFeatured: true, publishedAt: new Date('2024-07-15') } }),
    prisma.product.create({ data: { creator: { connect: { id: ci[2] } }, category: { connect: { id: cs['design'] } }, title: 'Instagram Template Bundle', slug: 'instagram-template-bundle', description: '100 Canva templates for Instagram posts and stories.', shortDescription: '100 Canva Instagram templates', status: 'PUBLISHED', price: 5000, licenseType: 'PERSONAL', averageRating: 4.4, reviewCount: 245, downloadCount: 1890, viewCount: 12000, publishedAt: new Date('2024-08-20') } }),
    prisma.product.create({ data: { creator: { connect: { id: ci[2] } }, category: { connect: { id: cs['design'] } }, title: 'Brand Identity Template Pack', slug: 'brand-identity-template-pack', description: 'Complete brand identity package: logo templates, business cards, letterheads.', shortDescription: 'Complete brand identity templates', status: 'PUBLISHED', price: 15000, licenseType: 'COMMERCIAL', averageRating: 4.7, reviewCount: 98, downloadCount: 678, viewCount: 4100, publishedAt: new Date('2024-10-01') } }),
    prisma.product.create({ data: { creator: { connect: { id: ci[3] } }, category: { connect: { id: cs['education'] } }, title: 'Python Programming Masterclass', slug: 'python-programming-masterclass', description: 'Complete Python course from beginner to advanced. 200+ exercises, 50 projects.', shortDescription: 'Complete Python course with 200+ exercises', status: 'PUBLISHED', price: 28000, licenseType: 'PERSONAL', averageRating: 4.9, reviewCount: 312, downloadCount: 2340, viewCount: 15000, isFeatured: true, publishedAt: new Date('2024-06-01') } }),
    prisma.product.create({ data: { creator: { connect: { id: ci[3] } }, category: { connect: { id: cs['education'] } }, title: 'Mathematics Worksheet Bundle', slug: 'mathematics-worksheet-bundle', description: '500 printable math worksheets for grades 1-12.', shortDescription: '500 math worksheets with answer keys', status: 'PUBLISHED', price: 4500, licenseType: 'PERSONAL', averageRating: 4.6, reviewCount: 187, downloadCount: 1560, viewCount: 8900, publishedAt: new Date('2024-09-01') } }),
    prisma.product.create({ data: { creator: { connect: { id: ci[3] } }, category: { connect: { id: cs['books'] } }, title: 'The Complete Guide to Self-Learning', slug: 'complete-guide-self-learning', description: 'A comprehensive eBook on effective self-learning strategies.', shortDescription: 'Master the art of self-learning (eBook)', status: 'PUBLISHED', price: 3500, licenseType: 'PERSONAL', averageRating: 4.3, reviewCount: 89, downloadCount: 723, viewCount: 4500, publishedAt: new Date('2024-11-15') } }),
    prisma.product.create({ data: { creator: { connect: { id: ci[4] } }, category: { connect: { id: cs['business'] } }, title: 'Startup Business Plan Template', slug: 'startup-business-plan-template', description: 'Professional business plan template used by 1000+ startups.', shortDescription: 'Professional business plan template', status: 'PUBLISHED', price: 9000, licenseType: 'COMMERCIAL', averageRating: 4.5, reviewCount: 134, downloadCount: 987, viewCount: 6200, publishedAt: new Date('2024-08-15') } }),
    prisma.product.create({ data: { creator: { connect: { id: ci[4] } }, category: { connect: { id: cs['legal'] } }, title: 'Essential Legal Document Bundle', slug: 'essential-legal-document-bundle', description: '15 essential legal templates for freelancers and small businesses.', shortDescription: '15 essential legal templates', status: 'PUBLISHED', price: 14000, licenseType: 'COMMERCIAL', averageRating: 4.7, reviewCount: 167, downloadCount: 1234, viewCount: 7800, isFeatured: true, publishedAt: new Date('2024-07-01') } }),
    prisma.product.create({ data: { creator: { connect: { id: ci[4] } }, category: { connect: { id: cs['marketing'] } }, title: 'Landing Page Template Pack', slug: 'landing-page-template-pack', description: '10 high-converting landing page templates built with HTML/CSS and Tailwind CSS.', shortDescription: '10 high-converting landing pages', status: 'PUBLISHED', price: 16000, licenseType: 'COMMERCIAL', averageRating: 4.6, reviewCount: 92, downloadCount: 654, viewCount: 3900, publishedAt: new Date('2024-10-20') } }),
    prisma.product.create({ data: { creator: { connect: { id: ci[2] } }, category: { connect: { id: cs['audio'] } }, title: 'Podcast Intro Music Pack', slug: 'podcast-intro-music-pack', description: '20 royalty-free podcast intro/outro music tracks.', shortDescription: '20 royalty-free podcast music tracks', status: 'PUBLISHED', price: 7500, licenseType: 'COMMERCIAL', averageRating: 4.4, reviewCount: 56, downloadCount: 345, viewCount: 2100, publishedAt: new Date('2024-11-01') } }),
    prisma.product.create({ data: { creator: { connect: { id: ci[2] } }, category: { connect: { id: cs['video'] } }, title: 'Cinematic LUT Pack', slug: 'cinematic-lut-pack', description: '50 cinematic color grading LUTs for DaVinci Resolve, Premiere Pro, and Final Cut Pro.', shortDescription: '50 cinematic LUTs for video editing', status: 'PUBLISHED', price: 11000, licenseType: 'COMMERCIAL', averageRating: 4.8, reviewCount: 145, downloadCount: 987, viewCount: 5600, isFeatured: true, publishedAt: new Date('2024-09-01') } }),
    prisma.product.create({ data: { creator: { connect: { id: ci[1] } }, category: { connect: { id: cs['3d'] } }, title: 'Blender Product Visualization Kit', slug: 'blender-product-viz-kit', description: 'Complete Blender kit for product photography and visualization.', shortDescription: 'Blender kit for product visualization', status: 'PUBLISHED', price: 25000, licenseType: 'COMMERCIAL', averageRating: 4.7, reviewCount: 78, downloadCount: 456, viewCount: 3200, publishedAt: new Date('2024-10-15') } }),
    prisma.product.create({ data: { creator: { connect: { id: ci[2] } }, category: { connect: { id: cs['photography'] } }, title: 'Premium Texture Pack', slug: 'premium-texture-pack', description: '200 high-resolution seamless textures.', shortDescription: '200 seamless 4K textures', status: 'PUBLISHED', price: 8500, licenseType: 'COMMERCIAL', averageRating: 4.5, reviewCount: 89, downloadCount: 567, viewCount: 3800, publishedAt: new Date('2024-11-10') } }),
    prisma.product.create({ data: { creator: { connect: { id: ci[3] } }, category: { connect: { id: cs['church'] } }, title: 'Church Media Bundle', slug: 'church-media-bundle', description: 'Complete media package for church services.', shortDescription: 'Complete church media package', status: 'PUBLISHED', price: 12000, licenseType: 'PERSONAL', averageRating: 4.6, reviewCount: 67, downloadCount: 432, viewCount: 2800, publishedAt: new Date('2024-10-01') } }),
    prisma.product.create({ data: { creator: { connect: { id: ci[1] } }, category: { connect: { id: cs['development'] } }, title: 'WordPress Theme Builder Pack', slug: 'wordpress-theme-builder-pack', description: '15 Elementor Pro website templates for different niches.', shortDescription: '15 Elementor website templates', status: 'PUBLISHED', price: 13500, licenseType: 'COMMERCIAL', averageRating: 4.3, reviewCount: 134, downloadCount: 890, viewCount: 5100, publishedAt: new Date('2024-09-20') } }),
    prisma.product.create({ data: { creator: { connect: { id: ci[2] } }, category: { connect: { id: cs['architecture'] } }, title: 'Interior Design Mood Board Kit', slug: 'interior-design-mood-board-kit', description: '50 customizable mood board templates for interior designers.', shortDescription: '50 mood board templates for designers', status: 'PUBLISHED', price: 7000, licenseType: 'COMMERCIAL', averageRating: 4.4, reviewCount: 45, downloadCount: 289, viewCount: 1900, publishedAt: new Date('2024-11-20') } }),
    prisma.product.create({ data: { creator: { connect: { id: ci[0] } }, category: { connect: { id: cs['ai'] } }, title: 'AI Image Generation Guide', slug: 'ai-image-generation-guide', description: 'Comprehensive guide to creating stunning images with Midjourney, DALL-E, and Stable Diffusion.', status: 'DRAFT', price: 5500, licenseType: 'PERSONAL' } }),
    prisma.product.create({ data: { creator: { connect: { id: ci[1] } }, category: { connect: { id: cs['development'] } }, title: 'Flutter Mobile App Template', slug: 'flutter-mobile-app-template', description: 'A complete Flutter app template with authentication, API integration, and state management.', status: 'PENDING', price: 38000, licenseType: 'COMMERCIAL' } }),
  ]);

  console.log('Created', products.length, 'products');

  // PRODUCT IMAGES
  // Assign deterministic placeholder imagery (seeded by slug so each product
  // gets a stable, distinct image) for thumbnail, cover, and preview gallery.
  for (const product of products) {
    await prisma.product.update({
      where: { id: product.id },
      data: {
        thumbnail: `https://picsum.photos/seed/${product.slug}/600/450`,
        coverImage: `https://picsum.photos/seed/${product.slug}-cover/1200/675`,
        previewImages: [
          `https://picsum.photos/seed/${product.slug}-1/1200/675`,
          `https://picsum.photos/seed/${product.slug}-2/1200/675`,
          `https://picsum.photos/seed/${product.slug}-3/1200/675`,
        ],
      },
    });
  }
  console.log('Assigned product images');

  // AFFILIATE PROGRAM - approve a spread of published products for the affiliate
  // program with varied creator-set reward rates (demo data for the marketplace).
  const affiliateDemo = [
    { slug: 'ultimate-chatgpt-prompt-bundle', rate: 25 },
    { slug: 'nextjs-saas-starter-kit', rate: 30 },
    { slug: 'ultimate-ui-kit-figma', rate: 20 },
    { slug: 'python-programming-masterclass', rate: 20 },
    { slug: 'cinematic-lut-pack', rate: 35 },
    { slug: 'essential-legal-document-bundle', rate: 40 },
    { slug: 'instagram-template-bundle', rate: 50 },
  ];
  for (const demo of affiliateDemo) {
    const product = products.find((p) => p.slug === demo.slug);
    if (!product) continue;
    await prisma.product.update({
      where: { id: product.id },
      data: {
        affiliateEnabled: true,
        affiliateStatus: 'APPROVED',
        affiliateCommissionRate: demo.rate,
        affiliateApprovedAt: new Date(),
        affiliateApprovedBy: superAdmin.id,
      },
    });
  }
  console.log(`Enabled affiliate program for ${affiliateDemo.length} demo products`);

  // PRODUCT TAGS
  const tagBySlug: Record<string, string> = {};
  for (const t of tags) tagBySlug[t.slug] = t.id;

  const productTagLinks = [
    { productSlug: 'ultimate-chatgpt-prompt-bundle', tagSlugs: ['chatgpt', 'ai-prompt'] },
    { productSlug: 'ai-content-automation-workflow', tagSlugs: ['ai-prompt', 'notion'] },
    { productSlug: 'ai-powered-social-media-toolkit', tagSlugs: ['ai-prompt', 'template'] },
    { productSlug: 'nextjs-saas-starter-kit', tagSlugs: ['nextjs', 'react', 'typescript', 'tailwind-css'] },
    { productSlug: 'laravel-api-starter-kit', tagSlugs: ['laravel', 'typescript'] },
    { productSlug: 'react-component-library', tagSlugs: ['react', 'typescript', 'tailwind-css', 'ui-kit'] },
    { productSlug: 'ultimate-ui-kit-figma', tagSlugs: ['figma', 'ui-kit'] },
    { productSlug: 'instagram-template-bundle', tagSlugs: ['canva', 'template'] },
    { productSlug: 'brand-identity-template-pack', tagSlugs: ['figma', 'canva', 'template'] },
    { productSlug: 'python-programming-masterclass', tagSlugs: ['python'] },
    { productSlug: 'startup-business-plan-template', tagSlugs: ['template'] },
    { productSlug: 'essential-legal-document-bundle', tagSlugs: ['legal-template'] },
    { productSlug: 'landing-page-template-pack', tagSlugs: ['tailwind-css', 'template'] },
    { productSlug: 'wordpress-theme-builder-pack', tagSlugs: ['wordpress'] },
    { productSlug: 'blender-product-viz-kit', tagSlugs: ['blender'] },
    { productSlug: 'cinematic-lut-pack', tagSlugs: ['lut'] },
    { productSlug: 'podcast-intro-music-pack', tagSlugs: ['stock-music'] },
  ];

  for (const link of productTagLinks) {
    const product = products.find((p) => p.slug === link.productSlug);
    if (!product) continue;
    for (const tagSlug of link.tagSlugs) {
      const tagId = tagBySlug[tagSlug];
      if (!tagId) continue;
      await prisma.productTag.create({ data: { productId: product.id, tagId } });
    }
  }
  console.log('Created product tags');

  // ORDERS & PAYMENTS
  const publishedProducts = products.filter((p) => p.status === 'PUBLISHED');

  const orders = await Promise.all([
    prisma.order.create({
      data: {
        buyer: { connect: { id: buyerUsers[0].id } },
        status: 'PAID', totalAmount: 79.99, currency: 'USD', invoiceNumber: 'INV-2024-001',
        items: { create: [{ productId: publishedProducts[3].id, productName: publishedProducts[3].title, unitPrice: 79.99, price: 79.99, quantity: 1, totalPrice: 79.99, licenseType: 'COMMERCIAL' }] },
      },
      include: { items: true },
    }),
    prisma.order.create({
      data: {
        buyer: { connect: { id: buyerUsers[0].id } },
        status: 'PAID', totalAmount: 64.98, currency: 'USD', invoiceNumber: 'INV-2024-002',
        items: { create: [
          { productId: publishedProducts[0].id, productName: publishedProducts[0].title, unitPrice: 19.99, price: 19.99, quantity: 1, totalPrice: 19.99, licenseType: 'PERSONAL' },
          { productId: publishedProducts[6].id, productName: publishedProducts[6].title, unitPrice: 44.99, price: 44.99, quantity: 1, totalPrice: 44.99, licenseType: 'PERSONAL' },
        ] },
      },
      include: { items: true },
    }),
    prisma.order.create({
      data: {
        buyer: { connect: { id: buyerUsers[1].id } },
        status: 'PAID', totalAmount: 49.99, currency: 'USD', invoiceNumber: 'INV-2024-003',
        items: { create: [{ productId: publishedProducts[4].id, productName: publishedProducts[4].title, unitPrice: 49.99, price: 49.99, quantity: 1, totalPrice: 49.99, licenseType: 'COMMERCIAL' }] },
      },
      include: { items: true },
    }),
    prisma.order.create({
      data: {
        buyer: { connect: { id: buyerUsers[2].id } },
        status: 'PAID', totalAmount: 84.98, currency: 'USD', invoiceNumber: 'INV-2024-004',
        items: { create: [
          { productId: publishedProducts[12].id, productName: publishedProducts[12].title, unitPrice: 39.99, price: 39.99, quantity: 1, totalPrice: 39.99, licenseType: 'COMMERCIAL' },
          { productId: publishedProducts[15].id, productName: publishedProducts[15].title, unitPrice: 44.99, price: 44.99, quantity: 1, totalPrice: 44.99, licenseType: 'COMMERCIAL' },
        ] },
      },
      include: { items: true },
    }),
    prisma.order.create({
      data: {
        buyer: { connect: { id: buyerUsers[3].id } },
        status: 'PAID', totalAmount: 29.99, currency: 'USD', invoiceNumber: 'INV-2024-005',
        items: { create: [{ productId: publishedProducts[14].id, productName: publishedProducts[14].title, unitPrice: 29.99, price: 29.99, quantity: 1, totalPrice: 29.99, licenseType: 'COMMERCIAL' }] },
      },
      include: { items: true },
    }),
    prisma.order.create({
      data: {
        buyer: { connect: { id: buyerUsers[4].id } },
        status: 'PAID', totalAmount: 59.98, currency: 'USD', invoiceNumber: 'INV-2024-006',
        items: { create: [
          { productId: publishedProducts[7].id, productName: publishedProducts[7].title, unitPrice: 14.99, price: 14.99, quantity: 1, totalPrice: 14.99, licenseType: 'PERSONAL' },
          { productId: publishedProducts[9].id, productName: publishedProducts[9].title, unitPrice: 44.99, price: 44.99, quantity: 1, totalPrice: 44.99, licenseType: 'PERSONAL' },
        ] },
      },
      include: { items: true },
    }),
  ]);

  console.log('Created', orders.length, 'orders');

  for (const order of orders) {
    await prisma.payment.create({
      data: { orderId: order.id, amount: order.totalAmount, currency: order.currency, status: 'SUCCEEDED', provider: 'stripe' },
    });
  }

  // DOWNLOADS
  for (const order of orders) {
    for (const item of order.items) {
      await prisma.download.create({
        data: {
          orderItemId: item.id,
          productId: item.productId,
          userId: order.buyerId,
          token: uuidv4(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          downloadCount: Math.floor(Math.random() * 3),
        },
      });
    }
  }
  console.log('Created download records');

  // REVIEWS
  const reviewData = [
    { productIndex: 0, buyerIndex: 0, rating: 5, title: 'Incredible value!', comment: 'Over 500 prompts and every single one is well-crafted. Saved me hours of work.' },
    { productIndex: 0, buyerIndex: 2, rating: 5, title: 'Must-have for AI users', comment: "Best prompt bundle I've bought. The marketing section alone is worth the price." },
    { productIndex: 3, buyerIndex: 0, rating: 5, title: 'Worth every penny', comment: 'Launched my SaaS in 2 weeks instead of 3 months. The code quality is excellent.' },
    { productIndex: 3, buyerIndex: 1, rating: 5, title: 'Production ready', comment: 'Used this for a client project. Clean code, great documentation.' },
    { productIndex: 6, buyerIndex: 2, rating: 5, title: 'Beautiful components', comment: 'The design quality is outstanding. Every component is pixel-perfect.' },
    { productIndex: 7, buyerIndex: 4, rating: 4, title: 'Great templates', comment: 'Love the variety. Would like more food/restaurant templates.' },
    { productIndex: 9, buyerIndex: 0, rating: 5, title: 'Best Python course', comment: 'The exercises are brilliant. Went from zero to building real projects.' },
    { productIndex: 9, buyerIndex: 3, rating: 5, title: 'Highly recommended', comment: 'Structured perfectly for self-paced learning.' },
    { productIndex: 12, buyerIndex: 2, rating: 5, title: 'Legal peace of mind', comment: 'Essential for any freelancer. The NDA template saved me once already.' },
    { productIndex: 14, buyerIndex: 3, rating: 4, title: 'Great LUTs', comment: 'The cinematic looks are beautiful. Some could use more variety.' },
    { productIndex: 11, buyerIndex: 4, rating: 5, title: 'Fantastic workbook', comment: 'My kids love these worksheets. Well-structured and clear.' },
    { productIndex: 15, buyerIndex: 4, rating: 5, title: 'Perfect for podcasts', comment: 'Professional quality music. My listeners always comment on the intro.' },
  ];

  for (const r of reviewData) {
    const product = publishedProducts[r.productIndex];
    const buyer = buyerUsers[r.buyerIndex];
    if (!product || !buyer) continue;
    await prisma.review.create({
      data: { productId: product.id, buyerId: buyer.id, rating: r.rating, title: r.title, comment: r.comment },
    });
  }
  console.log('Created', reviewData.length, 'reviews');

  // WISHLISTS
  const wishlist1 = await prisma.wishlist.create({ data: { userId: buyerUsers[0].id, name: 'My Wishlist' } });
  await prisma.wishlistItem.create({ data: { wishlistId: wishlist1.id, productId: publishedProducts[6].id } });
  await prisma.wishlistItem.create({ data: { wishlistId: wishlist1.id, productId: publishedProducts[14].id } });

  const wishlist2 = await prisma.wishlist.create({ data: { userId: buyerUsers[1].id, name: 'My Wishlist' } });
  await prisma.wishlistItem.create({ data: { wishlistId: wishlist2.id, productId: publishedProducts[1].id } });
  console.log('Created wishlists');

  // WALLET BALANCES FOR CREATORS
  for (const profile of creatorProfiles) {
    const wallet = await prisma.wallet.create({
      data: { userId: profile.userId, pendingBalance: Math.random() * 500 + 100, availableBalance: Math.random() * 1000 + 200, lifetimeEarnings: Math.random() * 5000 + 1000 },
    });
    await prisma.walletTransaction.create({
      data: { walletId: wallet.id, type: 'SALE', amount: 79.99, balanceBefore: 0, balanceAfter: 79.99, description: 'Product sale' },
    });
  }
  console.log('Created wallet balances');

  // SUBSCRIPTIONS
  await prisma.subscription.create({
    data: { userId: buyerUsers[0].id, tier: 'PRO', status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  });
  await prisma.subscription.create({
    data: { userId: buyerUsers[1].id, tier: 'STARTER', status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000) },
  });
  console.log('Created subscriptions');

  console.log('\n✅ Demo data seeded successfully!');
  console.log('\n📧 Login credentials (all passwords: Demo@123456):');
  console.log('  Creators:');
  console.log("    ada@example.com      — Ada's AI Studio");
  console.log('    linus@example.com    — Kernel Crafts');
  console.log('    grace@example.com    — Grace Design Co');
  console.log('    margaret@example.com — Hamilton Academy');
  console.log('    alan@example.com     — Turing Templates');
  console.log('  Buyers:');
  console.log('    sarah@example.com    — Sarah Chen (Pro subscription)');
  console.log('    marcus@example.com   — Marcus Johnson (Starter subscription)');
  console.log('    priya@example.com    — Priya Patel');
  console.log('    james@example.com    — James Wilson');
  console.log('    emma@example.com     — Emma Rodriguez');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
