'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Heart,
  ShoppingCart,
  Trash2,
  ArrowLeft,
  Package,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { formatCurrency } from '@/app/lib/types/ui';
import { useWishlist, useCart } from '@/app/hooks/use-cart';
import { toast } from 'sonner';

export default function WishlistPage() {
  const { items, loaded, removeItem } = useWishlist();
  const { addItem } = useCart();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const handleMoveToCart = (item: typeof items[0]) => {
    addItem({
      product_id: item.product_id,
      name: item.name,
      slug: item.slug,
      image_url: item.image_url,
      price: item.price,
      unit: 'piece',
      stock: item.stock,
    });
    removeItem(item.product_id);
    toast.success(`${item.name} moved to cart`);
  };

  if (!hydrated || !loaded) {
    return (
      <DashboardShell>
        <PageHeader title="My Wishlist" description="Products you've saved for later" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="overflow-hidden border-border/40">
              <Skeleton className="aspect-square w-full" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-9 w-full" />
              </div>
            </Card>
          ))}
        </div>
      </DashboardShell>
    );
  }

  if (items.length === 0) {
    return (
      <DashboardShell>
        <PageHeader title="My Wishlist" description="Products you've saved for later" />
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Heart className="h-10 w-10 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Your wishlist is empty</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Save products you're interested in for easy access later.
            </p>
          </div>
          <Link href="/shop">
            <Button className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              Browse Products
            </Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <PageHeader
        title="My Wishlist"
        description={`${items.length} product${items.length === 1 ? '' : 's'} saved`}
      />

      <div className="mb-4">
        <Link href="/shop">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Continue Shopping
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          const outOfStock = item.stock <= 0;
          return (
            <Card key={item.product_id} className="group flex flex-col overflow-hidden border-border/40 transition-shadow hover:shadow-lg">
              <Link href={`/shop/${item.slug}`} className="relative block aspect-square overflow-hidden bg-muted">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Package className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                {outOfStock && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                    <Badge variant="destructive">Out of Stock</Badge>
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    removeItem(item.product_id);
                    toast.success('Removed from wishlist');
                  }}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm transition-colors hover:bg-background"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </Link>

              <div className="flex flex-1 flex-col p-4">
                {item.category_name && (
                  <Badge variant="secondary" className="mb-1 w-fit text-xs">
                    {item.category_name}
                  </Badge>
                )}
                <Link href={`/shop/${item.slug}`}>
                  <h3 className="line-clamp-2 text-sm font-medium leading-snug hover:text-primary">
                    {item.name}
                  </h3>
                </Link>

                <div className="mt-auto pt-3">
                  <div className="mb-2">
                    <span className="text-lg font-bold">{formatCurrency(item.price)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleMoveToCart(item)}
                      disabled={outOfStock}
                      className="flex-1 gap-2"
                      size="sm"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Move to Cart
                    </Button>
                    <Link href={`/shop/${item.slug}`}>
                      <Button variant="outline" size="sm" className="px-3">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </DashboardShell>
  );
}
