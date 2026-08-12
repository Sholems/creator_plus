import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from 'next/font/google';
import '@/styles/globals.css';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/lib/toast';
import { AdminShell } from '@/components/admin-shell';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-bricolage',
});

const sans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title: 'CreatorPlus Admin',
  description: 'Admin dashboard for CreatorPlus',
};

export const viewport: Viewport = {
  themeColor: '#0a2e22',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <AuthProvider>
          <ToastProvider>
            <AdminShell>{children}</AdminShell>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
