import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/app/lib/supabase/server";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://hidaya-market.vercel.app";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/products`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
  ];

  const { data: products } = await supabaseAdmin
    .from("products")
    .select("slug, updated_at, is_featured")
    .eq("status", "active");

  const productPages: MetadataRoute.Sitemap = (products || []).map((p) => ({
    url: `${siteUrl}/products/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : now,
    changeFrequency: "weekly",
    priority: p.is_featured ? 0.8 : 0.6,
  }));

  const { data: categories } = await supabaseAdmin
    .from("categories")
    .select("slug, updated_at")
    .eq("is_active", true);

  const categoryPages: MetadataRoute.Sitemap = (categories || []).map((c) => ({
    url: `${siteUrl}/products?category=${c.slug}`,
    lastModified: c.updated_at ? new Date(c.updated_at) : now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticPages, ...productPages, ...categoryPages];
}
