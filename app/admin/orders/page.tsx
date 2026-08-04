'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ShoppingCart,
  Search,
  Eye,
  Filter,
  X,
  PackageOpen,
  Loader2,
  DollarSign,
  Clock,
  CheckCircle2,
  Truck,
  MapPin,
  CreditCard,
  User,
  StickyNote,
} from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { StatCard } from '@/app/components/dashboard/stat-card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { supabase } from '@/app/lib/supabase/client';
import { formatCurrency, formatDate, formatDateTime, statusColors } from '@/app/lib/types/ui';
import type { Order, OrderItem, Customer, Payment, OrderStatus, PaymentStatus } from '@/app/lib/types/database';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderWithRelations extends Omit<Order, 'customer' | 'items'> {
  customer: Pick<Customer, 'id' | 'name' | 'company_name' | 'email' | 'phone' | 'address' | 'city'> | null;
  order_items: OrderItem[];
  payments: Payment[];
}

interface OrderDetail extends OrderWithRelations {}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
  'returned',
];

const PAYMENT_STATUSES: PaymentStatus[] = ['unpaid', 'partial', 'paid', 'refunded'];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  mobile_money: 'Mobile Money',
  cash: 'Cash',
  credit: 'Credit',
  invoice: 'Invoice',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Status update
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(
        '*, customer:customers(id, name, company_name, email, phone, address, city), order_items(*), payments(*)'
      )
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load orders');
      console.error(error);
    } else {
      setOrders((data || []) as unknown as OrderWithRelations[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  const summary = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter((o) => o.payment_status === 'paid')
      .reduce((sum, o) => sum + Number(o.total_amount), 0);
    const pendingOrders = orders.filter(
      (o) => o.status === 'pending' || o.status === 'confirmed' || o.status === 'processing'
    ).length;
    const paidOrders = orders.filter((o) => o.payment_status === 'paid').length;
    return { totalOrders, totalRevenue, pendingOrders, paidOrders };
  }, [orders]);

  // -------------------------------------------------------------------------
  // Filtering
  // -------------------------------------------------------------------------

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesSearch =
        !q ||
        o.order_number.toLowerCase().includes(q) ||
        (o.customer?.name || '').toLowerCase().includes(q) ||
        (o.customer?.company_name || '').toLowerCase().includes(q);
      const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
      const matchesPayment =
        filterPaymentStatus === 'all' || o.payment_status === filterPaymentStatus;
      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [orders, search, filterStatus, filterPaymentStatus]);

  const hasFilters =
    search.trim() !== '' || filterStatus !== 'all' || filterPaymentStatus !== 'all';

  const resetFilters = () => {
    setSearch('');
    setFilterStatus('all');
    setFilterPaymentStatus('all');
  };

  // -------------------------------------------------------------------------
  // Detail dialog
  // -------------------------------------------------------------------------

  const openDetail = async (order: OrderWithRelations) => {
    setDetailOpen(true);
    setDetail(order);
    setDetailLoading(true);
    // Re-fetch full detail to ensure fresh items + payments
    const { data, error } = await supabase
      .from('orders')
      .select(
        '*, customer:customers(id, name, company_name, email, phone, address, city), order_items(*), payments(*)'
      )
      .eq('id', order.id)
      .single();
    setDetailLoading(false);
    if (error) {
      console.error(error);
      return;
    }
    setDetail(data as unknown as OrderDetail);
  };

  // -------------------------------------------------------------------------
  // Status updates
  // -------------------------------------------------------------------------

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    setUpdatingStatusId(orderId);
    const { error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId);
    setUpdatingStatusId(null);
    if (error) {
      toast.error('Failed to update order status');
      console.error(error);
      return;
    }
    toast.success(`Order status updated to "${status}"`);
    // Update local state
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
    if (detail?.id === orderId) {
      setDetail((d) => (d ? { ...d, status } : d));
    }
  };

  const updatePaymentStatus = async (orderId: string, payment_status: PaymentStatus) => {
    setUpdatingStatusId(orderId);
    const { error } = await supabase
      .from('orders')
      .update({ payment_status, updated_at: new Date().toISOString() })
      .eq('id', orderId);
    setUpdatingStatusId(null);
    if (error) {
      toast.error('Failed to update payment status');
      console.error(error);
      return;
    }
    toast.success(`Payment status updated to "${payment_status}"`);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, payment_status } : o))
    );
    if (detail?.id === orderId) {
      setDetail((d) => (d ? { ...d, payment_status } : d));
    }
  };

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const renderStatusBadge = (status: OrderStatus) => (
    <Badge variant={statusColors[status] || 'secondary'} className="capitalize">
      {status}
    </Badge>
  );

  const renderPaymentBadge = (status: PaymentStatus) => (
    <Badge variant={statusColors[status] || 'secondary'} className="capitalize">
      {status}
    </Badge>
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <DashboardShell>
      <PageHeader
        title="Orders"
        description="Manage customer orders, track shipments, and update payment status"
      />

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i} className="border-border/40">
              <CardContent className="p-5">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <Skeleton className="mt-3 h-7 w-20" />
                <Skeleton className="mt-2 h-4 w-24" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              title="Total Orders"
              value={summary.totalOrders}
              icon={ShoppingCart}
              iconColor="hsl(var(--primary))"
            />
            <StatCard
              title="Total Revenue"
              value={formatCurrency(summary.totalRevenue)}
              icon={DollarSign}
              iconColor="hsl(var(--success))"
            />
            <StatCard
              title="Pending Orders"
              value={summary.pendingOrders}
              icon={Clock}
              iconColor="hsl(var(--warning))"
            />
            <StatCard
              title="Paid Orders"
              value={summary.paidOrders}
              icon={CheckCircle2}
              iconColor="hsl(var(--success))"
            />
          </>
        )}
      </div>

      {/* Filters */}
      <div className="mt-6 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by order number or customer name..."
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
          <Button
            variant={showFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters((s) => !s)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasFilters && <span className="flex h-2 w-2 rounded-full bg-primary-foreground" />}
          </Button>
        </div>

        {showFilters && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Order Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Payment Status</Label>
              <Select value={filterPaymentStatus} onValueChange={setFilterPaymentStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All payment statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All payment statuses</SelectItem>
                  {PAYMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {hasFilters && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5 text-xs">
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <Card className="mt-4 overflow-hidden border-border/40">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="min-w-[140px]">Order Number</TableHead>
              <TableHead className="min-w-[160px]">Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead className="min-w-[120px]">Date</TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="mx-auto h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-8 w-16" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                      <PackageOpen className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">No orders found</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {hasFilters
                          ? 'Try adjusting your search or filters.'
                          : 'Orders will appear here once customers start placing them.'}
                      </p>
                    </div>
                    {hasFilters && (
                      <Button onClick={resetFilters} variant="outline" size="sm" className="mt-1 gap-1.5">
                        <X className="h-4 w-4" />
                        Clear filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((order) => {
                const itemCount = order.order_items?.length ?? 0;
                return (
                  <TableRow key={order.id} className="group">
                    <TableCell className="font-mono text-xs font-medium">
                      {order.order_number}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium leading-tight">
                          {order.customer?.name || 'Unknown customer'}
                        </span>
                        {order.customer?.company_name && (
                          <span className="text-xs text-muted-foreground">
                            {order.customer.company_name}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="inline-flex items-center gap-1 outline-none">
                            {renderStatusBadge(order.status)}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-44">
                          <DropdownMenuLabel>Update status</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {ORDER_STATUSES.map((s) => (
                            <DropdownMenuItem
                              key={s}
                              onClick={() => updateOrderStatus(order.id, s)}
                              disabled={updatingStatusId === order.id}
                              className="capitalize"
                            >
                              {s}
                              {order.status === s && (
                                <CheckCircle2 className="ml-auto h-4 w-4 text-success" />
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="inline-flex items-center gap-1 outline-none">
                            {renderPaymentBadge(order.payment_status)}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-44">
                          <DropdownMenuLabel>Update payment</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {PAYMENT_STATUSES.map((s) => (
                            <DropdownMenuItem
                              key={s}
                              onClick={() => updatePaymentStatus(order.id, s)}
                              disabled={updatingStatusId === order.id}
                              className="capitalize"
                            >
                              {s}
                              {order.payment_status === s && (
                                <CheckCircle2 className="ml-auto h-4 w-4 text-success" />
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatCurrency(Number(order.total_amount))}
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {itemCount}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(order.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openDetail(order)}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View order</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {!loading && filtered.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Showing {filtered.length} of {orders.length} order{orders.length === 1 ? '' : 's'}
        </p>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {detailLoading && !detail ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-60" />
              <Separator />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : detail ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono">{detail.order_number}</span>
                  {renderStatusBadge(detail.status)}
                  {renderPaymentBadge(detail.payment_status)}
                </DialogTitle>
                <DialogDescription>
                  Placed on {formatDateTime(detail.created_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                {/* Order info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="border-border/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        Order Info
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Order #</span>
                        <span className="font-mono font-medium">{detail.order_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        {renderStatusBadge(detail.status)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment</span>
                        {renderPaymentBadge(detail.payment_status)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tracking</span>
                        <span className="font-mono text-xs">
                          {detail.tracking_number || '—'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Customer info */}
                  <Card className="border-border/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <User className="h-4 w-4 text-muted-foreground" />
                        Customer
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name</span>
                        <span className="font-medium">{detail.customer?.name || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Company</span>
                        <span>{detail.customer?.company_name || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email</span>
                        <span className="text-xs">{detail.customer?.email || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone</span>
                        <span className="text-xs">{detail.customer?.phone || '—'}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Items list */}
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
                        {detail.order_items && detail.order_items.length > 0 ? (
                          detail.order_items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">
                                {item.product_name}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {item.quantity}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {formatCurrency(Number(item.unit_price))}
                              </TableCell>
                              <TableCell className="text-right text-sm font-medium">
                                {formatCurrency(Number(item.total_price))}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                              No items
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </div>

                {/* Payment breakdown */}
                <div>
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    Payment Summary
                  </h4>
                  <Card className="border-border/40">
                    <CardContent className="space-y-1.5 p-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(Number(detail.subtotal))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax</span>
                        <span>{formatCurrency(Number(detail.tax_amount))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Discount</span>
                        <span className="text-destructive">
                          -{formatCurrency(Number(detail.discount_amount))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span>{formatCurrency(Number(detail.shipping_amount))}</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span>{formatCurrency(Number(detail.total_amount))}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payments list */}
                  {detail.payments && detail.payments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Recorded Payments
                      </p>
                      {detail.payments.map((pmt) => (
                        <div
                          key={pmt.id}
                          className="flex items-center justify-between rounded-md border border-border/40 px-3 py-2 text-sm"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {formatCurrency(Number(pmt.amount))}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {PAYMENT_METHOD_LABELS[pmt.method] || pmt.method}
                              {pmt.reference ? ` · ${pmt.reference}` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {pmt.paid_at ? formatDate(pmt.paid_at) : '—'}
                            </span>
                            <Badge
                              variant={statusColors[pmt.status] || 'secondary'}
                              className="capitalize"
                            >
                              {pmt.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Shipping info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="border-border/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        Shipping Address
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {detail.shipping_address ? (
                        <p className="whitespace-pre-line">{detail.shipping_address}</p>
                      ) : (
                        <p>—</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-border/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        Billing Address
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {detail.billing_address ? (
                        <p className="whitespace-pre-line">{detail.billing_address}</p>
                      ) : (
                        <p>—</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Notes */}
                {detail.notes && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <StickyNote className="h-4 w-4 text-muted-foreground" />
                      Notes
                    </h4>
                    <Card className="border-border/40">
                      <CardContent className="p-4 text-sm text-muted-foreground">
                        <p className="whitespace-pre-line">{detail.notes}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Quick status update */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Update order status</Label>
                    <Select
                      value={detail.status}
                      onValueChange={(v) => updateOrderStatus(detail.id, v as OrderStatus)}
                      disabled={updatingStatusId === detail.id}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Update payment status</Label>
                    <Select
                      value={detail.payment_status}
                      onValueChange={(v) =>
                        updatePaymentStatus(detail.id, v as PaymentStatus)
                      }
                      disabled={updatingStatusId === detail.id}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
