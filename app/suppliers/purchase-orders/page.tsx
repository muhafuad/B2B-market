'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart, Search, Eye, Inbox, Loader2 } from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Skeleton } from '@/app/components/ui/skeleton';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/app/components/ui/dropdown-menu';
import { useAuth } from '@/app/components/providers/auth-provider';
import { supabase } from '@/app/lib/supabase/client';
import { formatCurrency, formatDate, statusColors } from '@/app/lib/types/ui';
import { toast } from 'sonner';

const PO_STATUSES = ['pending', 'approved', 'in_production', 'shipped', 'delivered', 'completed', 'cancelled'];

export default function SupplierPurchaseOrders() {
  const { profile } = useAuth();
  const supplierId = profile?.supplier_id;
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailOrder, setDetailOrder] = useState<any | null>(null);

  useEffect(() => {
    if (!supplierId) return;
    (async () => {
      const { data } = await supabase
        .from('purchase_orders')
        .select('*, purchase_request:purchase_requests(request_number, title)')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });
      setOrders(data || []);
      setLoading(false);
    })();
  }, [supplierId]);

  const filtered = orders.filter(o => {
    const matchesSearch = !search || o.po_number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const updateStatus = async (id: string, status: string) => {
    const update: any = { status };
    if (status === 'delivered') update.actual_delivery_date = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('purchase_orders').update(update).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...update } : o));
    if (detailOrder?.id === id) setDetailOrder({ ...detailOrder, ...update });
    toast.success(`Status updated to ${status.replace('_', ' ')}`);
  };

  return (
    <DashboardShell>
      <PageHeader title="Purchase Orders" description="Manage your purchase orders and production status" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by PO number..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {PO_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/40">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Inbox className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-sm text-muted-foreground">No purchase orders found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => (
            <Card key={order.id} className="border-border/40">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-mono text-sm font-medium">{order.po_number}</p>
                    <p className="text-xs text-muted-foreground">Expected: {formatDate(order.expected_delivery_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{formatCurrency(order.total_amount)}</span>
                  <Badge variant={statusColors[order.status] || 'secondary'} className="capitalize">{order.status.replace('_', ' ')}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">Update Status</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {PO_STATUSES.map(s => (
                        <DropdownMenuItem key={s} onClick={() => updateStatus(order.id, s)} className="capitalize">
                          {s.replace('_', ' ')}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="ghost" size="icon" onClick={() => setDetailOrder(order)}><Eye className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!detailOrder} onOpenChange={(open) => !open && setDetailOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Order {detailOrder?.po_number}</DialogTitle>
            <DialogDescription>Order details and status</DialogDescription>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Status</p><Badge variant={statusColors[detailOrder.status] || 'secondary'} className="mt-1 capitalize">{detailOrder.status.replace('_', ' ')}</Badge></div>
                <div><p className="text-muted-foreground">Total Amount</p><p className="mt-1 font-semibold">{formatCurrency(detailOrder.total_amount)}</p></div>
                <div><p className="text-muted-foreground">Expected Delivery</p><p className="mt-1">{formatDate(detailOrder.expected_delivery_date)}</p></div>
                <div><p className="text-muted-foreground">Actual Delivery</p><p className="mt-1">{formatDate(detailOrder.actual_delivery_date)}</p></div>
                {detailOrder.purchase_request && (
                  <div><p className="text-muted-foreground">From Request</p><p className="mt-1 font-mono">{detailOrder.purchase_request.request_number}</p></div>
                )}
                <div><p className="text-muted-foreground">Created</p><p className="mt-1">{formatDate(detailOrder.created_at)}</p></div>
              </div>
              {detailOrder.notes && <div className="rounded-lg bg-muted/50 p-3 text-sm"><p className="text-muted-foreground">Notes</p><p className="mt-1">{detailOrder.notes}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
