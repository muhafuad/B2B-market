import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/app/components/providers/theme-provider';
import { AuthProvider } from '@/app/components/providers/auth-provider';
import { LanguageProvider } from '@/app/components/providers/language-provider';
import { Toaster } from '@/app/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://hidaya-market.vercel.app'),



  title: {
    default: 'Hidaya B2B Market — Ethiopian Distribution Marketplace',
    template: '%s | Hidaya B2B Market',
  },

  description:
    'A B2B supplier and distribution marketplace connecting Ethiopian manufacturers, suppliers, and retailers.',

    verification: {
  google: 'Abq67SD7V-UZWKkIxdOvJPFGv7Xxw7hNnAxU4gcfoc8',
},

  keywords: [
    'Hidaya Market',
    'Hidaya B2B Market',
    'Ethiopian marketplace',
    'B2B marketplace Ethiopia',
    'Ethiopian suppliers',
    'Ethiopian manufacturers',
    'wholesale marketplace Ethiopia',
    'Ethiopian distribution marketplace',
  ],

  authors: [
    {
      name: 'Hidaya B2B Market',
    },
  ],

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },

  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://hidaya-market.vercel.app',
    siteName: 'Hidaya B2B Market',
    title: 'Hidaya B2B Market — Ethiopian Distribution Marketplace',
    description:
      'A B2B supplier and distribution marketplace connecting Ethiopian manufacturers, suppliers, and retailers.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Hidaya B2B Market — Ethiopian Distribution Marketplace',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Hidaya B2B Market — Ethiopian Distribution Marketplace',
    description:
      'A B2B supplier and distribution marketplace connecting Ethiopian manufacturers, suppliers, and retailers.',
    images: ['/og-image.png'],
  },

  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
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
              {children}
              <Toaster />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}