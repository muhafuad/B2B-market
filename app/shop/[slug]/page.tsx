'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Package,
  ShoppingCart,
  Heart,
  Star,
  Minus,
  Plus,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Truck,
  Shield,
  Boxes,
} from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Separator } from '@/app/components/ui/separator';
import { Textarea } from '@/app/components/ui/textarea';
import { supabase } from '@/app/lib/supabase/client';
import { formatCurrency, formatDate } from '@/app/lib/types/ui';
import type { Product, Category, Brand, Review, Customer } from '@/app/lib/types/database';
import { useCart, useWishlist } from '@/app/hooks/use-cart';
import { useAuth } from '@/app/components/providers/auth-provider';
import { toast } from 'sonner';

type ProductWithRelations = Omit<Product, 'category' | 'brand' | 'supplier'> & {
  category: Category | null;
  brand: Brand | null;
};

type ReviewWithCustomer = Review & {
  customer: Pick<Customer, 'id' | 'name'> | null;
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { profile } = useAuth();
  const { addItem } = useCart();
  const { toggleWishlist, isWishlisted } = useWishlist();

  const [product, setProduct] = useState<ProductWithRelations | null>(null);
  const [related, setRelated] = useState<ProductWithRelations[]>([]);
  const [reviews, setReviews] = useState<ReviewWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  // Review form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const loadProduct = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*), brand:brands(*)')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle();

    if (error || !data) {
      setProduct(null);
      setLoading(false);
      return;
    }

    const productData = data as unknown as ProductWithRelations;
    setProduct(productData);

    // Load related products (same category)
    if (productData.category_id) {
      const { data: relatedData } = await supabase
        .from('products')
        .select('*, category:categories(*), brand:brands(*)')
        .eq('category_id', productData.category_id)
        .neq('id', productData.id)
        .eq('status', 'active')
        .limit(4);
      setRelated((relatedData as unknown as ProductWithRelations[]) || []);
    }

    // Load reviews
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('*, customer:customers(id, name)')
      .eq('product_id', productData.id)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });
    setReviews((reviewsData as unknown as ReviewWithCustomer[]) || []);

    setLoading(false);
  }, [slug]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem(
      {
        product_id: product.id,
        name: product.name,
        slug: product.slug,
        image_url: product.image_url,
        price: Number(product.wholesale_price),
        unit: product.unit,
        stock: product.stock,
      },
      quantity
    );
    toast.success(`${quantity} × ${product.name} added to cart`);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/shop/cart');
  };

  const handleToggleWishlist = () => {
    if (!product) return;
    toggleWishlist({
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      image_url: product.image_url,
      price: Number(product.wholesale_price),
      category_name: product.category?.name || null,
      stock: product.stock,
    });
    toast.success(
      isWishlisted(product.id) ? 'Removed from wishlist' : 'Added to wishlist'
    );
  };

  const submitReview = async () => {
    if (!product || !profile?.customer_id) {
      toast.error('You must be a customer to leave a review');
      return;
    }
    if (!reviewComment.trim()) {
      toast.error('Please write a comment');
      return;
    }

    setSubmittingReview(true);
    const { error } = await supabase.from('reviews').insert({
      product_id: product.id,
      customer_id: profile.customer_id,
      rating: reviewRating,
      title: reviewTitle.trim() || null,
      comment: reviewComment.trim(),
      is_approved: false,
    });

    setSubmittingReview(false);

    if (error) {
      toast.error('Failed to submit review');
      console.error(error);
      return;
    }

    toast.success('Review submitted! It will appear after approval.');
    setReviewTitle('');
    setReviewComment('');
    setReviewRating(5);
    setShowReviewForm(false);
    loadProduct();
  };

  const stockStatus = () => {
    if (!product) return null;
    if (product.stock <= 0)
      return { label: 'Out of Stock', variant: 'destructive' as const, icon: XCircle };
    if (product.stock <= product.min_stock)
      return { label: 'Low Stock', variant: 'warning' as const, icon: AlertCircle };
    return { label: 'In Stock', variant: 'success' as const, icon: CheckCircle2 };
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="space-y-6">
          <Skeleton className="h-9 w-32" />
          <div className="grid gap-8 lg:grid-cols-2">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (!product) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <Package className="h-16 w-16 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-semibold">Product not found</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              This product may have been removed or is no longer available.
            </p>
          </div>
          <Link href="/shop">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Shop
            </Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const status = stockStatus()!;
  const specs = product.specifications || {};
  const wishlisted = isWishlisted(product.id);

  return (
    <DashboardShell>
      <div className="mb-4">
        <Link href="/shop">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Shop
          </Button>
        </Link>
      </div>

      {/* Product Main Section */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-xl border border-border/40 bg-muted">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-24 w-24 text-muted-foreground" />
            </div>
          )}
          {product.is_featured && (
            <Badge className="absolute left-4 top-4 gap-1">
              <Star className="h-3 w-3 fill-current" />
              Featured
            </Badge>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {product.category && (
              <Link href={`/shop?category=${product.category.slug}`}>
                <Badge variant="secondary">{product.category.name}</Badge>
              </Link>
            )}
            {product.brand && (
              <span className="text-sm text-muted-foreground">by {product.brand.name}</span>
            )}
          </div>

          <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>

          {/* Rating */}
          {product.rating > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= Math.round(product.rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium">{product.rating.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">
                ({product.review_count} review{product.review_count === 1 ? '' : 's'})
              </span>
            </div>
          )}

          {/* Stock status */}
          <div className="mt-4 flex items-center gap-2">
            <status.icon className={`h-4 w-4 ${status.variant === 'destructive' ? 'text-destructive' : status.variant === 'warning' ? 'text-amber-500' : 'text-green-500'}`} />
            <Badge variant={status.variant}>{status.label}</Badge>
            {product.stock > 0 && (
              <span className="text-sm text-muted-foreground">
                {product.stock} {product.unit} available
              </span>
            )}
          </div>

          {/* Pricing */}
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-bold">
              {formatCurrency(Number(product.wholesale_price))}
            </span>
            {Number(product.retail_price) > Number(product.wholesale_price) && (
              <span className="text-lg text-muted-foreground line-through">
                {formatCurrency(Number(product.retail_price))}
              </span>
            )}
            {Number(product.discount) > 0 && (
              <Badge variant="success">Save {product.discount}%</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Wholesale price per {product.unit}</p>

          {/* Description */}
          {product.description && (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          {/* Quantity + Actions */}
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Quantity:</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <input
                  type="number"
                  min={1}
                  max={product.stock}
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setQuantity(Math.max(1, Math.min(product.stock || val, val)));
                  }}
                  className="h-9 w-16 rounded-md border border-input bg-transparent text-center text-sm outline-none focus:border-primary"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setQuantity((q) => Math.min(product.stock || q + 1, q + 1))}
                  disabled={product.stock > 0 && quantity >= product.stock}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-sm text-muted-foreground">
                = {formatCurrency(Number(product.wholesale_price) * quantity)}
              </span>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className="flex-1 gap-2"
                size="lg"
              >
                <ShoppingCart className="h-5 w-5" />
                Add to Cart
              </Button>
              <Button
                onClick={handleBuyNow}
                disabled={product.stock <= 0}
                variant="secondary"
                className="flex-1"
                size="lg"
              >
                Buy Now
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="px-3"
                onClick={handleToggleWishlist}
              >
                <Heart className={`h-5 w-5 ${wishlisted ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Trust badges */}
          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border/40 pt-4">
            <div className="flex flex-col items-center gap-1 text-center">
              <Truck className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Fast Delivery</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Secure Payment</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <Boxes className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Bulk Orders</span>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications */}
      {Object.keys(specs).length > 0 && (
        <Card className="mt-8 border-border/40">
          <CardHeader>
            <CardTitle>Specifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(specs).map(([key, value]) => (
                <div key={key} className="flex flex-col rounded-lg border border-border/40 p-3">
                  <span className="text-xs font-medium text-muted-foreground">{key}</span>
                  <span className="mt-1 text-sm font-medium">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews */}
      <Card className="mt-8 border-border/40">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Reviews</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {reviews.length} review{reviews.length === 1 ? '' : 's'}
            </p>
          </div>
          {profile?.customer_id && (
            <Button
              variant={showReviewForm ? 'outline' : 'default'}
              onClick={() => setShowReviewForm((s) => !s)}
            >
              {showReviewForm ? 'Cancel' : 'Write a Review'}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Review Form */}
          {showReviewForm && (
            <div className="space-y-4 rounded-lg border border-border/40 p-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="outline-none"
                    >
                      <Star
                        className={`h-6 w-6 transition-colors ${
                          star <= reviewRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-muted-foreground hover:text-amber-400'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Title (optional)</label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="Summarize your experience"
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Comment</label>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your thoughts about this product..."
                  rows={4}
                />
              </div>
              <Button onClick={submitReview} disabled={submittingReview} className="gap-2">
                {submittingReview && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Review
              </Button>
            </div>
          )}

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No reviews yet. Be the first to review this product!
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-lg border border-border/40 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {(review.customer?.name || 'A').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {review.customer?.name || 'Anonymous'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(review.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= review.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.title && (
                    <h4 className="mt-3 text-sm font-semibold">{review.title}</h4>
                  )}
                  {review.comment && (
                    <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Related Products */}
      {related.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">Related Products</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((rp) => (
              <Link key={rp.id} href={`/shop/${rp.slug}`}>
                <Card className="group flex h-full flex-col overflow-hidden border-border/40 transition-shadow hover:shadow-lg">
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    {rp.image_url ? (
                      <Image
                        src={rp.image_url}
                        alt={rp.name}
                        fill
                        sizes="(max-width: 640px) 100vw, 25vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    <h3 className="line-clamp-2 text-xs font-medium leading-snug">
                      {rp.name}
                    </h3>
                    <span className="mt-auto pt-2 text-sm font-bold">
                      {formatCurrency(Number(rp.wholesale_price))}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
