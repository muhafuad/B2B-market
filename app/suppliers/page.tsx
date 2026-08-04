'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  ShoppingCart,
  Truck,
  DollarSign,
  Clock,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  PackageCheck,
} from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { StatCard } from '@/app/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { useAuth } from '@/app/components/providers/auth-provider';
import { supabase } from '@/app/lib/supabase/client';
import { formatCurrency, formatDate, statusColors } from '@/app/lib/types/ui';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

export default function SupplierDashboard() {
  const { profile } = useAuth();
  const supplierId = profile?.supplier_id;
  const [stats, setStats] = useState({ totalRequests: 0, accepted: 0, pendingQuotes: 0, activeOrders: 0, revenue: 0, pendingDeliveries: 0 });
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [requestData, setRequestData] = useState<any[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supplierId) return;
    (async () => {
      const [
        { count: totalRequests },
        { count: accepted },
        { count: pendingQuotes },
        { count: activeOrders },
        { count: pendingDeliveries },
        { data: orders },
        { data: recentReqs },
        { data: recentPOs },
      ] = await Promise.all([
        supabase.from('purchase_requests').select('*', { count: 'exact', head: true }).eq('supplier_id', supplierId),
        supabase.from('purchase_requests').select('*', { count: 'exact', head: true }).eq('supplier_id', supplierId).in('status', ['accepted', 'ordered']),
        supabase.from('supplier_quotes').select('*', { count: 'exact', head: true }).eq('supplier_id', supplierId).eq('status', 'pending'),
        supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).eq('supplier_id', supplierId).not('status', 'in', '("completed","cancelled")'),
        supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('supplier_id', supplierId).in('status', ['scheduled', 'in_transit']),
        supabase.from('purchase_orders').select('total_amount, status, created_at').eq('supplier_id', supplierId),
        supabase.from('purchase_requests').select('id, request_number, title, status, priority, expected_date, created_at').eq('supplier_id', supplierId).order('created_at', { ascending: false }).limit(5),
        supabase.from('purchase_orders').select('id, po_number, status, total_amount, expected_delivery_date, created_at').eq('supplier_id', supplierId).order('created_at', { ascending: false }).limit(5),
      ]);

      const revenue = (orders || []).filter(o => o.status === 'completed' || o.status === 'delivered').reduce((sum, o) => sum + Number(o.total_amount), 0);

      setStats({
        totalRequests: totalRequests || 0,
        accepted: accepted || 0,
        pendingQuotes: pendingQuotes || 0,
        activeOrders: activeOrders || 0,
        revenue,
        pendingDeliveries: pendingDeliveries || 0,
      });

      setRecentRequests(recentReqs || []);
      setRecentOrders(recentPOs || []);

      // Chart data
      const months: string[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(d.toLocaleDateString('en-US', { month: 'short' }));
      }
      const reqByMonth = months.map(m => ({ month: m, requests: 0 }));
      (recentReqs || []).forEach(r => {
        const d = new Date(r.created_at);
        const label = d.toLocaleDateString('en-US', { month: 'short' });
        const idx = reqByMonth.findIndex(s => s.month === label);
        if (idx >= 0) reqByMonth[idx].requests += 1;
      });
      setRequestData(reqByMonth);

      const statusCounts: Record<string, number> = {};
      (orders || []).forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
      setOrderStatusData(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));

      setLoading(false);
    })();
  }, [supplierId]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="space-y-6">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}
          </div>
        </div>
      </DashboardShell>
    );
  }

  const pieColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <DashboardShell>
      <PageHeader title="Supplier Dashboard" description="Manage your purchase requests, orders, and deliveries" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Purchase Requests" value={stats.totalRequests} icon={ClipboardList} iconColor="hsl(var(--primary))" />
        <StatCard title="Accepted" value={stats.accepted} icon={CheckCircle2} iconColor="hsl(var(--success))" />
        <StatCard title="Pending Quotes" value={stats.pendingQuotes} icon={Clock} iconColor="hsl(var(--warning))" />
        <StatCard title="Active Orders" value={stats.activeOrders} icon={ShoppingCart} iconColor="hsl(var(--chart-3))" />
        <StatCard title="Revenue (Completed)" value={formatCurrency(stats.revenue)} icon={DollarSign} iconColor="hsl(var(--success))" />
        <StatCard title="Pending Deliveries" value={stats.pendingDeliveries} icon={Truck} iconColor="hsl(var(--info))" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-lg">Purchase Requests Over Time</CardTitle>
            <CardDescription>Requests received per month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={requestData}>
                <defs>
                  <linearGradient id="colorReqs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="requests" stroke="hsl(var(--chart-1))" fill="url(#colorReqs)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-lg">Order Status Distribution</CardTitle>
            <CardDescription>Your purchase orders by status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                  {orderStatusData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="border-border/40">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Purchase Requests</CardTitle>
              <CardDescription>Latest requests assigned to you</CardDescription>
            </div>
            <Link href="/supplier/purchase-requests"><Button variant="ghost" size="sm" className="gap-1">View All <ArrowRight className="h-3.5 w-3.5" /></Button></Link>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No requests yet</div>
            ) : (
              <div className="space-y-3">
                {recentRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                    <div>
                      <p className="text-sm font-medium">{req.request_number}</p>
                      <p className="text-xs text-muted-foreground">{req.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusColors[req.priority] || 'secondary'} className="capitalize">{req.priority}</Badge>
                      <Badge variant={statusColors[req.status] || 'secondary'} className="capitalize">{req.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Purchase Orders</CardTitle>
              <CardDescription>Latest orders from the platform</CardDescription>
            </div>
            <Link href="/supplier/purchase-orders"><Button variant="ghost" size="sm" className="gap-1">View All <ArrowRight className="h-3.5 w-3.5" /></Button></Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No orders yet</div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <PackageCheck className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{order.po_number}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(order.expected_delivery_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{formatCurrency(order.total_amount)}</span>
                      <Badge variant={statusColors[order.status] || 'secondary'} className="capitalize">{order.status.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
