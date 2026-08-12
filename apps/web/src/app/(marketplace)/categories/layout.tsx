import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Product Categories',
  description:
    'Explore digital product categories on CreatorPlus — templates, courses, AI prompts, design assets, code, audio, video and more.',
};

export default function CategoriesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
