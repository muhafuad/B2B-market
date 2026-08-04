'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Star,
  Plus,
  Search,
  X,
  PackageOpen,
  Loader2,
  MessageSquare,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { supabase } from '@/app/lib/supabase/client';
import { formatDate } from '@/app/lib/types/ui';
import type { Review, Product, Order, OrderItem } from '@/app/lib/types/database';
import { useAuth } from '@/app/components/providers/auth-provider';
import { toast } from 'sonner';

interface ReviewWithProduct extends Review {
  product: Pick<Product, 'id' | 'name' | 'slug' | 'image_url'> | null;
}

interface DeliveredOrder extends Order {
  order_items: OrderItem[];
}

export default function MyReviewsPage() {
  const { profile } = useAuth();
  const [reviews, setReviews] = useState<ReviewWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add review dialog
  const [addReviewOpen, setAddReviewOpen] = useState(false);
  const [deliveredOrders, setDeliveredOrders] = useState<DeliveredOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [reviewedProductIds, setReviewedProductIds] = useState<Set<string>>(new Set());

  // Review form
  const [rating, setRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = useCallback(async () => {
    if (!profile?.customer_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('reviews')
      .select('*, product:products(id, name, slug, image_url)')
      .eq('customer_id', profile.customer_id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load reviews');
      console.error(error);
    } else {
      const reviewsData = (data as unknown as ReviewWithProduct[]) || [];
      setReviews(reviewsData);
      setReviewedProductIds(new Set(reviewsData.map((r) => r.product_id)));
    }
    setLoading(false);
  }, [profile?.customer_id]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const loadDeliveredOrders = useCallback(async () => {
    if (!profile?.customer_id) return;
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('customer_id', profile.customer_id)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDeliveredOrders(data as unknown as DeliveredOrder[]);
    }
  }, [profile?.customer_id]);

  const openAddReview = () => {
    loadDeliveredOrders();
    setAddReviewOpen(true);
  };

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId);
  };

  const getUnreviewedItems = (): OrderItem[] => {
    const order = deliveredOrders.find((o) => o.id === selectedOrderId);
    if (!order) return [];
    return (order.order_items || []).filter((item) => item.product_id && !reviewedProductIds.has(item.product_id));
  };

  const submitReview = async () => {
    if (!profile?.customer_id) {
      toast.error('Customer profile not found');
      return;
    }
    if (!selectedOrderId) {
      toast.error('Please select an order');
      return;
    }

    const unreviewed = getUnreviewedItems();
    if (unreviewed.length === 0) {
      toast.error('No products available to review in this order');
      return;
    }

    if (!reviewComment.trim()) {
      toast.error('Please write a comment');
      return;
    }

    setSubmitting(true);

    // Submit a review for each unreviewed product in the order
    const reviewsToInsert = unreviewed.map((item) => ({
      product_id: item.product_id,
      customer_id: profile.customer_id,
      rating,
      title: reviewTitle.trim() || null,
      comment: reviewComment.trim(),
      is_approved: false,
    }));

    const { error } = await supabase.from('reviews').insert(reviewsToInsert);

    setSubmitting(false);

    if (error) {
      toast.error('Failed to submit review');
      console.error(error);
      return;
    }

    toast.success(`Review${reviewsToInsert.length > 1 ? 's' : ''} submitted! Will appear after approval.`);
    setAddReviewOpen(false);
    setSelectedOrderId('');
    setReviewTitle('');
    setReviewComment('');
    setRating(5);
    fetchReviews();
  };

  const filtered = reviews.filter((r) => {
    const q = search.trim().toLowerCase();
    return !q || (r.product?.name || '').toLowerCase().includes(q) || (r.title || '').toLowerCase().includes(q);
  });

  return (
    <DashboardShell>
      <PageHeader
        title="My Reviews"
        description="Manage your product reviews"
        action={
          <Button onClick={openAddReview} className="gap-2">
            <Plus className="h-4 w-4" />
            Write a Review
          </Button>
        }
      />

      {/* Search */}
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by product name or title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Reviews */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border-border/40 p-4">
              <div className="flex gap-4">
                <Skeleton className="h-16 w-16 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-base font-medium">No reviews yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {search
                ? 'Try a different search.'
                : 'Review products from your delivered orders to help other buyers.'}
            </p>
          </div>
          {!search && (
            <Button onClick={openAddReview} variant="outline" size="sm" className="mt-2 gap-2">
              <Plus className="h-4 w-4" />
              Write Your First Review
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((review) => (
            <Card key={review.id} className="border-border/40">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Product Image */}
                  {review.product && (
                    <Link
                      href={`/shop/${review.product.slug}`}
                      className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border/40 bg-muted"
                    >
                      {review.product.image_url ? (
                        <Image
                          src={review.product.image_url}
                          alt={review.product.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <PackageOpen className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </Link>
                  )}

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {review.product && (
                          <Link
                            href={`/shop/${review.product.slug}`}
                            className="text-sm font-medium hover:text-primary"
                          >
                            {review.product.name}
                          </Link>
                        )}
                        <div className="mt-1 flex items-center gap-2">
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
                          <span className="text-xs text-muted-foreground">
                            {formatDate(review.created_at)}
                          </span>
                          {review.is_approved ? (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Approved
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="gap-1">
                              <Clock className="h-3 w-3" />
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {review.title && (
                      <h4 className="mt-2 text-sm font-semibold">{review.title}</h4>
                    )}
                    {review.comment && (
                      <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Review Dialog */}
      <Dialog open={addReviewOpen} onOpenChange={setAddReviewOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
            <DialogDescription>
              Select a delivered order and share your experience with the products
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Order Selection */}
            <div className="space-y-1.5">
              <Label>Select Order</Label>
              <Select value={selectedOrderId} onValueChange={handleOrderSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a delivered order" />
                </SelectTrigger>
                <SelectContent>
                  {deliveredOrders.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No delivered orders
                    </SelectItem>
                  ) : (
                    deliveredOrders.map((order) => {
                      const unreviewed = (order.order_items || []).filter(
                        (item) => item.product_id && !reviewedProductIds.has(item.product_id)
                      );
                      const allReviewed = unreviewed.length === 0;
                      return (
                        <SelectItem
                          key={order.id}
                          value={order.id}
                          disabled={allReviewed}
                        >
                          {order.order_number} · {formatDate(order.created_at)}
                          {allReviewed ? ' (all reviewed)' : ''}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Products to review */}
            {selectedOrderId && getUnreviewedItems().length > 0 && (
              <div className="rounded-lg border border-border/40 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Products to review ({getUnreviewedItems().length}):
                </p>
                <div className="space-y-1">
                  {getUnreviewedItems().map((item) => (
                    <div key={item.id} className="text-sm">
                      • {item.product_name} ({item.quantity} {item.quantity === 1 ? 'unit' : 'units'})
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedOrderId && getUnreviewedItems().length === 0 && (
              <p className="text-sm text-muted-foreground">
                All products from this order have already been reviewed.
              </p>
            )}

            {/* Rating */}
            <div>
              <Label className="mb-2 block">Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="outline-none"
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        star <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted-foreground hover:text-amber-400'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="review-title">Title (optional)</Label>
              <Input
                id="review-title"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="Summarize your experience"
              />
            </div>

            {/* Comment */}
            <div className="space-y-1.5">
              <Label htmlFor="review-comment">Comment *</Label>
              <Textarea
                id="review-comment"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your thoughts about the products..."
                rows={4}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Your review will be applied to all unreviewed products in the selected order.
              Reviews are subject to approval before appearing publicly.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddReviewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitReview} disabled={submitting || !selectedOrderId || getUnreviewedItems().length === 0} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
