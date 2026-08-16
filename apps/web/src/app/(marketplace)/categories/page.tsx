'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

const categoryIcons: Record<string, string> = {
  ai: '🤖', design: '🎨', development: '💻', business: '📊',
  education: '📚', books: '📖', audio: '🎵', video: '🎬',
  photography: '📷', '3d': '🧊', architecture: '🏛️', marketing: '📣',
  legal: '⚖️', church: '⛪',
  'wordpress-themes': '🎨', 'wordpress-plugins': '🔧',
  'notion-templates': '📋', 'canva-templates': '🖼️',
  'excel-sheets': '📈', powerpoint: '📊',
  'ui-ux': '✨', 'no-code': '🧩',
};

const categoryDescriptions: Record<string, string> = {
  ai: 'AI prompts, agents, and automation templates',
  design: 'Canva templates, Figma UI kits, icons, fonts',
  development: 'Laravel, Next.js, React, Flutter, APIs',
  business: 'Business plans, proposals, contracts, pitch decks',
  education: 'Courses, lesson notes, worksheets, exam prep',
  books: 'eBooks, guides, manuals, whitepapers',
  audio: 'Beats, music, sound effects, podcast assets',
  video: 'Stock videos, motion graphics, LUTs, intros',
  photography: 'Presets, textures, backgrounds, stock photos',
  '3d': 'Blender assets, CAD files, SketchUp models',
  architecture: 'Building plans, interior designs, floor plans',
  marketing: 'Social media kits, funnels, landing pages, ad creatives',
  legal: 'NDAs, contracts, policy templates, terms of service',
  church: 'Sermon packs, Bible study resources, worship slides',
  'wordpress-themes': 'Premium WordPress themes for blogs, business, e-commerce and portfolios',
  'wordpress-plugins': 'WordPress plugins for SEO, forms, e-commerce, security and more',
  'notion-templates': 'Notion dashboards, planners, habit trackers, project boards and wikis',
  'canva-templates': 'Ready-to-use Canva templates for social media, presentations and prints',
  'excel-sheets': 'Spreadsheets, trackers, budgets, dashboards and formulas',
  powerpoint: 'Presentation templates for pitches, reports, education and business',
  'ui-ux': 'Figma, Sketch and Adobe XD design systems, wireframes and UI kits',
  'no-code': 'Webflow, Bubble, Carrd and other no-code templates and starter files',
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const result: any = await api.getCategories();
      const cats = Array.isArray(result) ? result : (result?.data || []);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
        <p className="mt-2 text-gray-600">
          Browse our curated categories to find exactly what you need
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-1/3 rounded bg-gray-200" />
                  <div className="h-4 w-2/3 rounded bg-gray-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category: any) => {
            const slug = category.slug || category.name?.toLowerCase().replace(/\s+/g, '-');
            const icon = categoryIcons[slug] || '📁';
            const desc = categoryDescriptions[slug] || category.description || '';

            return (
              <Link
                key={category.id || slug}
                href={`/categories/${slug}`}
                className="group flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
              >
                <span className="text-4xl">{icon}</span>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                    {category.name}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">{desc}</p>
                  <p className="mt-3 text-sm font-medium text-blue-600">
                    Browse products &rarr;
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
