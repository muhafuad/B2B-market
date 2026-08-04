'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  PackageCheck,
  Search,
  Eye,
  X,
  PackageOpen,
  Clock,
  CheckCircle2,
  Truck,
  MapPin,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Separator } from '@/app/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { supabase } from '@/app/lib/supabase/client';
import { formatCurrency, formatDate, formatDateTime, statusColors } from '@/app/lib/types/ui';
import type { Order, OrderItem, Payment, OrderStatus } from '@/app/lib/types/database';
import { useAuth } from '@/app/components/providers/auth-provider';
import { toast } from 'sonner';

interface OrderWithItems extends Order {
  order_items: OrderItem[];
  payments: Payment[];
}

const ORDER_TRACKING_STEPS: { status: OrderStatus; label: string; icon: typeof Clock }[] = [
  { status: 'pending', label: 'Pending', icon: Clock },
  { status: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { status: 'processing', label: 'Processing', icon: PackageCheck },
  { status: 'shipped', label: 'Shipped', icon: Truck },
  { status: 'delivered', label: 'Delivered', icon: CheckCircle2 },
];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  mobile_money: 'Mobile Money',
  cash: 'Cash',
  credit: 'Credit',
  invoice: 'Invoice',
};

export default function OrdersPage() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!profile?.customer_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), payments(*)')
      .eq('customer_id', profile.customer_id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load orders');
      console.error(error);
    } else {
      setOrders((data as unknown as OrderWithItems[]) || []);
    }
    setLoading(false);
  }, [profile?.customer_id]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filtered = orders.filter((o) => {
    const q = search.trim().toLowerCase();
    return !q || o.order_number.toLowerCase().includes(q);
  });

  const getTrackingStep = (status: OrderStatus): number => {
    const idx = ORDER_TRACKING_STEPS.findIndex((s) => s.status === status);
    if (status === 'cancelled' || status === 'refunded' || status === 'returned') return -1;
    return idx >= 0 ? idx : 0;
  };

  return (
    <DashboardShell>
      <PageHeader
        title="My Orders"
        description="Track and manage your orders"
      />

      {/* Search */}
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by order number..."
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

      {/* Orders */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border/40 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <PackageOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-base font-medium">No orders found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {search ? 'Try a different search.' : 'Your orders will appear here once you place them.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => {
            const itemCount = order.order_items?.length ?? 0;
            const totalQty = order.order_items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
            return (
              <Card
                key={order.id}
                className="cursor-pointer border-border/40 transition-shadow hover:shadow-md"
                onClick={() => {
                  setSelectedOrder(order);
                  setDetailOpen(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <PackageCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-mono text-sm font-medium">{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(order.created_at)} · {itemCount} item{itemCount === 1 ? '' : 's'} ({totalQty} {totalQty === 1 ? 'unit' : 'units'})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold">
                          {formatCurrency(Number(order.total_amount))}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {order.payment_status}
                        </p>
                      </div>
                      <Badge variant={statusColors[order.status] || 'secondary'} className="capitalize">
                        {order.status}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono">{selectedOrder.order_number}</span>
                  <Badge variant={statusColors[selectedOrder.status] || 'secondary'} className="capitalize">
                    {selectedOrder.status}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Placed on {formatDateTime(selectedOrder.created_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                {/* Order Tracking */}
                {selectedOrder.status !== 'cancelled' &&
                  selectedOrder.status !== 'refunded' &&
                  selectedOrder.status !== 'returned' && (
                    <div>
                      <h4 className="mb-3 text-sm font-semibold">Order Tracking</h4>
                      <div className="flex items-center justify-between">
                        {ORDER_TRACKING_STEPS.map((step, idx) => {
                          const currentStep = getTrackingStep(selectedOrder.status);
                          const isCompleted = idx <= currentStep;
                          const isCurrent = idx === currentStep;
                          return (
                            <div key={step.status} className="flex flex-1 flex-col items-center gap-1">
                              <div className="flex w-full items-center">
                                {idx > 0 && (
                                  <div
                                    className={`h-0.5 flex-1 ${
                                      idx <= currentStep ? 'bg-primary' : 'bg-border'
                                    }`}
                                  />
                                )}
                                <div
                                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                    isCompleted
                                      ? 'border-primary bg-primary text-primary-foreground'
                                      : 'border-border bg-background text-muted-foreground'
                                  } ${isCurrent ? 'ring-2 ring-primary/20' : ''}`}
                                >
                                  <step.icon className="h-4 w-4" />
                                </div>
                                {idx < ORDER_TRACKING_STEPS.length - 1 && (
                                  <div
                                    className={`h-0.5 flex-1 ${
                                      idx < currentStep ? 'bg-primary' : 'bg-border'
                                    }`}
                                  />
                                )}
                              </div>
                              <span
                                className={`text-xs ${
                                  isCompleted ? 'font-medium text-foreground' : 'text-muted-foreground'
                                }`}
                              >
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* Items */}
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Order Items</h4>
                  <Card className="border-border/40">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.order_items?.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.product_name}</TableCell>
                            <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                            <TableCell className="text-right text-sm">
                              {formatCurrency(Number(item.unit_price))}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              {formatCurrency(Number(item.total_price))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </div>

                {/* Payment Summary */}
                <div>
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    Payment Summary
                  </h4>
                  <Card className="border-border/40">
                    <CardContent className="space-y-1.5 p-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(Number(selectedOrder.subtotal))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax</span>
                        <span>{formatCurrency(Number(selectedOrder.tax_amount))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span>{formatCurrency(Number(selectedOrder.shipping_amount))}</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span>{formatCurrency(Number(selectedOrder.total_amount))}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Payment Records */}
                {selectedOrder.payments && selectedOrder.payments.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Payment Records</h4>
                    <div className="space-y-2">
                      {selectedOrder.payments.map((pmt) => (
                        <div
                          key={pmt.id}
                          className="flex items-center justify-between rounded-md border border-border/40 px-3 py-2 text-sm"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{formatCurrency(Number(pmt.amount))}</span>
                            <span className="text-xs text-muted-foreground">
                              {PAYMENT_METHOD_LABELS[pmt.method] || pmt.method}
                              {pmt.reference ? ` · ${pmt.reference}` : ''}
                            </span>
                          </div>
                          <Badge
                            variant={statusColors[pmt.status] || 'secondary'}
                            className="capitalize"
                          >
                            {pmt.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Shipping Address */}
                <div>
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Shipping Address
                  </h4>
                  <Card className="border-border/40">
                    <CardContent className="p-4 text-sm text-muted-foreground">
                      {selectedOrder.shipping_address ? (
                        <p className="whitespace-pre-line">{selectedOrder.shipping_address}</p>
                      ) : (
                        <p>—</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Notes */}
                {selectedOrder.notes && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Order Notes</h4>
                    <Card className="border-border/40">
                      <CardContent className="p-4 text-sm text-muted-foreground">
                        <p className="whitespace-pre-line">{selectedOrder.notes}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
