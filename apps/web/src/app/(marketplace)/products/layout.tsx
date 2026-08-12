import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Browse Digital Products',
  description:
    'Browse and buy digital products, templates, courses, fonts, UI kits and AI prompts from African creators. Instant download, pay in naira.',
  alternates: { canonical: '/products' },
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
