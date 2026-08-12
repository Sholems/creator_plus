import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Creators',
  description:
    'Discover African digital creators selling templates, courses, prompts and design assets on CreatorPlus. Follow your favourites and shop their stores.',
  alternates: { canonical: '/creators' },
};

export default function CreatorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
