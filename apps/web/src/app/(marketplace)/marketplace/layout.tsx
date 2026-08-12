import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Marketplace — Buy & Sell Digital Products',
  description:
    'The CreatorPlus marketplace to buy and sell digital products, templates, online courses and AI prompts. Instant download, pay in naira with Paystack.',
  alternates: { canonical: '/marketplace' },
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
