'use client';

import { useEffect, useState } from 'react';
import { DollarSign, Inbox, Loader2 } from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { StatCard } from '@/app/components/dashboard/stat-card';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { useAuth } from '@/app/components/providers/auth-provider';
import { supabase } from '@/app/lib/supabase/client';
import { formatCurrency, formatDate, statusColors } from '@/app/lib/types/ui';

export default function SupplierPayments() {
  const { profile } = useAuth();
  const supplierId = profile?.supplier_id;
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, paid: 0, pending: 0, orderCount: 0 });

  useEffect(() => {
    if (!supplierId) return;
    (async () => {
      const { data } = await supabase
        .from('purchase_orders')
        .select('id, po_number, status, total_amount, created_at, actual_delivery_date')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });
      const orderList = data || [];
      setOrders(orderList);
      const total = orderList.reduce((sum, o) => sum + Number(o.total_amount), 0);
      const paid = orderList.filter(o => o.status === 'completed' || o.status === 'delivered').reduce((sum, o) => sum + Number(o.total_amount), 0);
      const pending = total - paid;
      setStats({ total, paid, pending, orderCount: orderList.length });
      setLoading(false);
    })();
  }, [supplierId]);

  return (
    <DashboardShell>
      <PageHeader title="Payment Status" description="Track payments for your purchase orders" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Orders" value={stats.orderCount} icon={DollarSign} iconColor="hsl(var(--primary))" />
        <StatCard title="Total Value" value={formatCurrency(stats.total)} icon={DollarSign} iconColor="hsl(var(--chart-3))" />
        <StatCard title="Paid" value={formatCurrency(stats.paid)} icon={DollarSign} iconColor="hsl(var(--success))" />
        <StatCard title="Pending" value={formatCurrency(stats.pending)} icon={DollarSign} iconColor="hsl(var(--warning))" />
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : orders.length === 0 ? (
        <Card className="mt-6 border-border/40">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Inbox className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-sm text-muted-foreground">No purchase orders found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map(order => {
            const isPaid = order.status === 'completed' || order.status === 'delivered';
            return (
              <Card key={order.id} className="border-border/40">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-medium">{order.po_number}</p>
                      <p className="text-xs text-muted-foreground">Created: {formatDate(order.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold">{formatCurrency(order.total_amount)}</span>
                    <Badge variant={isPaid ? 'success' : 'warning'}>
                      {isPaid ? 'Paid' : 'Pending'}
                    </Badge>
                    <Badge variant={statusColors[order.status] || 'secondary'} className="capitalize">{order.status.replace('_', ' ')}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
