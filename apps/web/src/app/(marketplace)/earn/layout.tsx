import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Earn Money as an Affiliate',
  description:
    'Join the CreatorPlus affiliate program. Promote digital products, earn commissions on every sale, and track your performance in real time.',
  alternates: { canonical: '/earn' },
  openGraph: {
    title: 'Earn Money as an Affiliate — CreatorPlus',
    description:
      'Join the CreatorPlus affiliate program. Promote digital products, earn commissions on every sale.',
    type: 'website',
  },
};

export default function EarnLayout({ children }: { children: React.ReactNode }) {
  return children;
}
