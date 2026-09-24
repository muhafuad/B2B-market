const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hidayab2b.com';

export function OrganizationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Hidaya B2B Market',
    alternateName: 'ህዳያ B2B ገበያ',
    url: siteUrl,
    logo: `${siteUrl}/og-image.png`,
    description:
      'A B2B supplier and distribution marketplace connecting Ethiopian manufacturers, suppliers, and retailers.',
    email: 'contact@hidayab2b.com',
    telephone: '+251 11 552 0203',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Bole Road',
      addressLocality: 'Addis Ababa',
      addressCountry: 'ET',
    },
    areaServed: 'Ethiopia',
    sameAs: [],
  };

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Hidaya B2B Market',
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/products?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
    </>
  );
}
