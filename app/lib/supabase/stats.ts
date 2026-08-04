import { supabase } from "./client";

export async function getMarketplaceStats() {
  const [products, suppliers, businesses, orders, regions] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),

    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "supplier"),

    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "customer"),

    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed"),

    supabase.from("profiles").select("region"),
  ]);

  const uniqueRegions = new Set(
    regions.data?.map((r) => r.region).filter(Boolean),
  );

  return {
    products: products.count || 0,
    suppliers: suppliers.count || 0,
    businesses: businesses.count || 0,
    orders: orders.count || 0,
    regions: uniqueRegions.size || 0,
  };
}
