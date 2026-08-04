'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Package,
  Loader2,
  ShoppingBag,
} from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';
import { Skeleton } from '@/app/components/ui/skeleton';
import { formatCurrency } from '@/app/lib/types/ui';
import { useCart } from '@/app/hooks/use-cart';
import { toast } from 'sonner';

const SHIPPING_RATE = 0.05; // 5% of subtotal
const TAX_RATE = 0.1; // 10% (fallback if product doesn't have tax_rate)

export default function CartPage() {
  const router = useRouter();
  const { items, loaded, updateQuantity, removeItem, clearCart, subtotal } = useCart();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const taxAmount = subtotal * TAX_RATE;
  const shippingAmount = subtotal > 0 ? subtotal * SHIPPING_RATE : 0;
  const total = subtotal + taxAmount + shippingAmount;

  if (!hydrated || !loaded) {
    return (
      <DashboardShell>
        <PageHeader title="Shopping Cart" description="Review your items before checkout" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="border-border/40 p-4">
                <div className="flex gap-4">
                  <Skeleton className="h-24 w-24 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-8 w-32" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </DashboardShell>
    );
  }

  if (items.length === 0) {
    return (
      <DashboardShell>
        <PageHeader title="Shopping Cart" description="Review your items before checkout" />
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Your cart is empty</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse our marketplace and add products to your cart.
            </p>
          </div>
          <Link href="/shop">
            <Button className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Start Shopping
            </Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <PageHeader
        title="Shopping Cart"
        description={`${items.length} item${items.length === 1 ? '' : 's'} in your cart`}
        action={
          <Button variant="ghost" size="sm" onClick={() => clearCart()} className="gap-2 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
            Clear Cart
          </Button>
        }
      />

      <div className="mb-4">
        <Link href="/shop">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Continue Shopping
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="space-y-4 lg:col-span-2">
          {items.map((item) => (
            <Card key={item.product_id} className="border-border/40">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Image */}
                  <Link
                    href={`/shop/${item.slug}`}
                    className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border/40 bg-muted"
                  >
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </Link>

                  {/* Details */}
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/shop/${item.slug}`}
                        className="text-sm font-medium hover:text-primary"
                      >
                        {item.name}
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          removeItem(item.product_id);
                          toast.success('Item removed from cart');
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatCurrency(item.price)} / {item.unit}</span>
                      {item.stock <= 5 && (
                        <span className="text-amber-500">Only {item.stock} left</span>
                      )}
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-3">
                      {/* Quantity */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <input
                          type="number"
                          min={1}
                          max={item.stock}
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            updateQuantity(item.product_id, val);
                          }}
                          className="h-8 w-14 rounded-md border border-input bg-transparent text-center text-sm outline-none focus:border-primary"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Line total */}
                      <span className="text-lg font-bold">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-20 border-border/40">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax (10%)</span>
                  <span className="font-medium">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium">{formatCurrency(shippingAmount)}</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>

              <Button
                onClick={() => router.push('/shop/checkout')}
                className="w-full gap-2"
                size="lg"
              >
                Proceed to Checkout
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Link href="/shop">
                <Button variant="outline" className="w-full gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Continue Shopping
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
