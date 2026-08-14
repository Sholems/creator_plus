import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from '@/lib/brand';
import { API_BASE } from '@/lib/env';

const API = API_BASE;

function titleCase(slug: string) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

async function getCategory(slug: string): Promise<any | null> {
  try {
    const res = await fetch(`${API}/categories/${encodeURIComponent(slug)}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  const name = category?.name || titleCase(slug);
  const title = `${name} — Digital Products, Templates & Courses`;
  const description =
    category?.description ||
    `Browse ${name} digital products, templates, courses and AI prompts on ${SITE_NAME}. Buy and download instantly, pay in naira.`;

  return {
    title,
    description,
    alternates: { canonical: `/categories/${slug}` },
    openGraph: {
      title: `${name} · ${SITE_NAME}`,
      description,
      url: `${SITE_URL}/categories/${slug}`,
      type: 'website',
    },
  };
}

export default function CategoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
