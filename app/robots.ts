import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hidaya-market.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/supplier/',
          '/shop/cart',
          '/shop/checkout',
          '/shop/orders',
          '/shop/wishlist',
          '/shop/messages',
          '/shop/reviews',
          '/shop/invoices',
          '/manual',
          '/login',
          '/register',
          '/change-password',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/admin/',
          '/supplier/',
          '/shop/cart',
          '/shop/checkout',
          '/shop/orders',
          '/shop/wishlist',
          '/shop/messages',
          '/shop/reviews',
          '/shop/invoices',
          '/manual',
          '/login',
          '/register',
          '/change-password',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
