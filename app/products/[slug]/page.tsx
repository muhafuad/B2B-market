'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Boxes, Star, ShoppingCart, ArrowLeft, Heart, Check, Truck, Shield, Minus, Plus } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Separator } from '@/app/components/ui/separator';
import { supabase } from '@/app/lib/supabase/client';
import { formatCurrency } from '@/app/lib/types/ui';
import type { Product, Review } from '@/app/lib/types/database';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { theme, setTheme } = useTheme();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: prod } = await supabase
        .from('products')
        .select('*, category:categories(*), brand:brands(*), supplier:suppliers(name)')
        .eq('slug', slug)
        .maybeSingle();
      if (prod) {
        setProduct(prod as Product);
        const { data: revs } = await supabase
          .from('reviews')
          .select('*, customer:customers(name)')
          .eq('product_id', prod.id)
          .eq('is_approved', true)
          .order('created_at', { ascending: false });
        setReviews(revs as Review[] || []);
        if (prod.category_id) {
          const { data: rel } = await supabase
            .from('products')
            .select('*, category:categories(name), brand:brands(name)')
            .eq('category_id', prod.category_id)
            .neq('id', prod.id)
            .eq('status', 'active')
            .limit(4);
          setRelated(rel as Product[] || []);
        }
      }
      setLoading(false);
    })();
  }, [slug]);

  const addToCart = () => {
    toast.success(`Added ${quantity} × ${product?.name} to cart`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <Skeleton className="mb-6 h-6 w-32" />
          <div className="grid gap-8 lg:grid-cols-2">
            <Skeleton className="aspect-square w-full" />
            <div className="space-y-4"><Skeleton className="h-10 w-3/4" /><Skeleton className="h-6 w-1/2" /><Skeleton className="h-24 w-full" /><Skeleton className="h-12 w-full" /></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Boxes className="h-16 w-16 text-muted-foreground/40" />
        <h1 className="mt-4 text-2xl font-bold">Product Not Found</h1>
        <Link href="/products"><Button className="mt-4 gap-2"><ArrowLeft className="h-4 w-4" /> Back to Products</Button></Link>
      </div>
    );
  }

  const stockStatus = product.stock <= 0 ? 'out' : product.stock < product.min_stock ? 'low' : 'in';
  const specs = product.specifications || {};

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Boxes className="h-5 w-5" /></div>
            <span className="text-xl font-bold">Hidaya B2B Market</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/products" className="text-sm font-medium">Products</Link>
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">Sign In</Link>
            <Link href="/register"><Button size="sm">Get Started</Button></Link>
          </nav>
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/products" className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </Link>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-xl border border-border/40 bg-muted">
            {product.image_url && <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />}
            {product.is_featured && <Badge className="absolute left-4 top-4">Featured</Badge>}
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2">
                {product.category && <Badge variant="secondary">{product.category.name}</Badge>}
                {product.brand && <Badge variant="outline">{product.brand.name}</Badge>}
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight">{product.name}</h1>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} className={`h-4 w-4 ${i <= Math.round(product.rating) ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`} />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">{product.rating.toFixed(1)} ({product.review_count} reviews)</span>
              </div>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold">{formatCurrency(product.retail_price)}</span>
              <span className="text-sm text-muted-foreground">per {product.unit}</span>
              {product.wholesale_price > 0 && (
                <span className="text-sm text-muted-foreground">Wholesale: {formatCurrency(product.wholesale_price)}</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {stockStatus === 'in' && <Badge variant="success" className="gap-1"><Check className="h-3.5 w-3.5" /> In Stock ({product.stock} available)</Badge>}
              {stockStatus === 'low' && <Badge variant="warning">Low Stock ({product.stock} left)</Badge>}
              {stockStatus === 'out' && <Badge variant="destructive">Out of Stock</Badge>}
            </div>

            <p className="text-muted-foreground">{product.description}</p>

            {Object.keys(specs).length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Specifications</h3>
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/40 p-4">
                  {Object.entries(specs).map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}: </span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-4">
              <div className="flex items-center rounded-lg border border-border">
                <Button variant="ghost" size="icon" onClick={() => setQuantity(q => Math.max(1, q - 1))}><Minus className="h-4 w-4" /></Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button variant="ghost" size="icon" onClick={() => setQuantity(q => q + 1)}><Plus className="h-4 w-4" /></Button>
              </div>
              <Button className="flex-1 gap-2" size="lg" onClick={addToCart} disabled={stockStatus === 'out'}>
                <ShoppingCart className="h-5 w-5" /> Add to Cart
              </Button>
              <Button variant="outline" size="icon" onClick={() => toast.success('Added to wishlist')}><Heart className="h-5 w-5" /></Button>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Truck className="h-5 w-5 text-primary" /> Fast nationwide shipping</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Shield className="h-5 w-5 text-primary" /> Quality guaranteed</div>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">Customer Reviews</h2>
          <Separator className="my-4" />
          {reviews.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No reviews yet. Be the first to review this product!</p>
          ) : (
            <div className="space-y-4">
              {reviews.map(review => (
                <Card key={review.id} className="border-border/40">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex">{[1, 2, 3, 4, 5].map(i => <Star key={i} className={`h-4 w-4 ${i <= review.rating ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`} />)}</div>
                        <span className="text-sm font-medium">{review.customer?.name || 'Anonymous'}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                    {review.title && <h3 className="mt-2 font-medium">{review.title}</h3>}
                    {review.comment && <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold tracking-tight">Related Products</h2>
            <Separator className="my-4" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map(p => (
                <Link key={p.id} href={`/products/${p.slug}`}>
                  <Card className="group h-full overflow-hidden border-border/40 transition-all hover:shadow-lg">
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />}
                    </div>
                    <CardContent className="p-3">
                      <h3 className="line-clamp-1 text-sm font-semibold">{p.name}</h3>
                      <p className="mt-1 font-bold">{formatCurrency(p.retail_price)}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
