import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import {ThemeProvider} from '@/app/components/providers/theme-provider';
import { AuthProvider } from '@/app/components/providers/auth-provider';
import {LanguageProvider} from '@/app/components/providers/language-provider';
import { Toaster } from '@/app/components/ui/sonner';
import { OrganizationJsonLd } from '@/app/components/seo/organization-jsonid';

const inter = Inter({ subsets: ['latin'] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hidaya-market.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Hidaya B2B Market — Ethiopian Industrial Supply & Distribution Marketplace',
    template: '%s | Hidaya B2B Market',
  },
  description:
    'Hidaya B2B Market connects Ethiopian manufacturers, suppliers, and retailers. Browse 12,000+ industrial products, manage purchase orders, track deliveries, and streamline your supply chain — all in one platform.',
  keywords: [
    'B2B marketplace Ethiopia',
    'industrial supply Ethiopia',
    'Ethiopian manufacturers',
    'wholesale distribution Africa',
    'supply chain management',
    'purchase orders',
    'industrial products Addis Ababa',
    'B2B e-commerce Ethiopia',
    'supplier marketplace',
    'retail distribution',
  ],
  authors: [{ name: 'Hidaya B2B Market' }],
  creator: 'Hidaya B2B Market',
  publisher: 'Hidaya B2B Market',
  alternates: {
    canonical: '/',
    languages: {
      'en': '/',
      'am': '/',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['am_ET'],
    url: siteUrl,
    siteName: 'Hidaya B2B Market',
    title: 'Hidaya B2B Market — Ethiopian Industrial Supply & Distribution Marketplace',
    description:
      'Connect with Ethiopian manufacturers and suppliers. Browse 12,000+ industrial products, manage purchase orders, and track deliveries in one B2B platform.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Hidaya B2B Market — Ethiopian B2B Marketplace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hidaya B2B Market — Ethiopian B2B Marketplace',
    description:
      'Connect with Ethiopian manufacturers and suppliers. Browse 12,000+ industrial products, manage purchase orders, and track deliveries in one B2B platform.',
    images: ['/og-image.png'],
    creator: '@hidayab2b',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  category: 'business',
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <OrganizationJsonLd />
              {children}
              <Toaster />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
