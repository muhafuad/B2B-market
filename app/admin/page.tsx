'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  ShoppingCart,
  Clock,
  Boxes,
  AlertTriangle,
  Factory,
  Users,
  TrendingUp,
  TrendingDown,
  PackageCheck,
  Truck,
  ArrowRight,
} from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { StatCard } from '@/app/components/dashboard/stat-card';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { supabase } from '@/app/lib/supabase/client';
import { formatCurrency, formatDate, statusColors } from '@/app/lib/types/ui';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface DashboardStats {
  revenue: number;
  totalOrders: number;
  pendingOrders: number;
  inventoryValue: number;
  lowStockCount: number;
  supplierCount: number;
  customerCount: number;
  pendingDeliveries: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    revenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    inventoryValue: 0,
    lowStockCount: 0,
    supplierCount: 0,
    customerCount: 0,
    pendingDeliveries: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [purchaseData, setPurchaseData] = useState<any[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [
        { count: totalOrders },
        { count: pendingOrders },
        { count: supplierCount },
        { count: customerCount },
        { count: pendingDeliveries },
        { data: orders },
        { data: products },
        { data: inventory },
        { data: transactions },
        { data: recentOrdersData },
        { data: lowStock },
      ] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['pending', 'confirmed', 'processing']),
        supabase.from('suppliers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('customers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('deliveries').select('*', { count: 'exact', head: true }).in('status', ['scheduled', 'in_transit']),
        supabase.from('orders').select('total_amount, created_at, status'),
        supabase.from('products').select('id, name, stock, min_stock, retail_price, wholesale_price'),
        supabase.from('inventory').select('quantity, purchase_price'),
        supabase.from('transactions').select('type, amount, created_at'),
        supabase
          .from('orders')
          .select('id, order_number, status, total_amount, created_at, customer:customers(name, company_name)')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('products')
          .select('id, name, stock, min_stock, sku')
          .filter('stock', 'lt', 'min_stock')
          .limit(5),
      ]);
      const { data: completedOrders } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('status', 'completed');

      const revenue =
    completedOrders?.reduce(
    (sum, order) => sum + Number(order.total_amount || 0),
    0
  ) ?? 0;
      const inventoryValue = (inventory || []).reduce((sum, i) => sum + Number(i.purchase_price) * i.quantity, 0);
      const lowStockCount = (products || []).filter(
      p => Number(p.stock || 0) < Number(p.min_stock || 0)
       ).length;

      setStats({
        revenue,
        totalOrders: totalOrders || 0,
        pendingOrders: pendingOrders || 0,
        inventoryValue,
        lowStockCount,
        supplierCount: supplierCount || 0,
        customerCount: customerCount || 0,
        pendingDeliveries: pendingDeliveries || 0,
      });

      setRecentOrders(recentOrdersData || []);
      setLowStockProducts(lowStock || []);

      // Sales chart data (last 6 months)
      const months: string[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(d.toLocaleDateString('en-US', { month: 'short' }));
      }
      const salesByMonth = months.map(m => ({ month: m, sales: 0, purchases: 0 }));
      (transactions || []).forEach(t => {
        const d = new Date(t.created_at);
        const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
        const idx = salesByMonth.findIndex(s => s.month === monthLabel);
        if (idx >= 0) {
          if (t.type === 'sale') salesByMonth[idx].sales += Number(t.amount);
          if (t.type === 'purchase') salesByMonth[idx].purchases += Number(t.amount);
        }
      });
      setSalesData(salesByMonth);
      setPurchaseData(salesByMonth);

      // Order status distribution
      const statusCounts: Record<string, number> = {};
      (orders || []).forEach(o => {
        statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
      });
      setOrderStatusData(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <DashboardShell>
        <div className="space-y-6">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-80 animate-pulse rounded-xl bg-muted" />
            <div className="h-80 animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      </DashboardShell>
    );
  }

  const pieColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <DashboardShell>
      <PageHeader
        title="Dashboard"
        description="Overview of your supply chain and distribution operations"
      />

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Revenue" value={formatCurrency(stats.revenue)} icon={DollarSign} change="" changeType="positive" iconColor="hsl(var(--success))" />
        <StatCard title="Total Orders" value={stats.totalOrders} icon={ShoppingCart} change="" changeType="positive" iconColor="hsl(var(--primary))" />
        <StatCard title="Pending Orders" value={stats.pendingOrders} icon={Clock} change="" changeType="positive" iconColor="hsl(var(--warning))" />
        <StatCard title="Inventory Value" value={formatCurrency(stats.inventoryValue)} icon={Boxes} change="" changeType="positive" iconColor="hsl(var(--chart-4))" />
        <StatCard title="Low Stock Alerts" value={stats.lowStockCount} icon={AlertTriangle} change={stats.lowStockCount > 0 ? 'Attention needed' : 'All good'} changeType={stats.lowStockCount > 0 ? 'negative' : 'positive'} iconColor="hsl(var(--destructive))" />
        <StatCard title="Active Suppliers" value={stats.supplierCount} icon={Factory} change={`${stats.supplierCount} active`} changeType="positive" iconColor="hsl(var(--chart-3))" />
        <StatCard title="Active Customers" value={stats.customerCount} icon={Users} change={`${stats.customerCount} active`} changeType="positive" iconColor="hsl(var(--chart-2))" />
        <StatCard title="Pending Deliveries" value={stats.pendingDeliveries} icon={Truck} iconColor="hsl(var(--info))" />
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-lg">Sales vs Purchases</CardTitle>
            <CardDescription>Monthly comparison over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area type="monotone" dataKey="sales" stroke="hsl(var(--chart-1))" fill="url(#colorSales)" strokeWidth={2} name="Sales" />
                <Area type="monotone" dataKey="purchases" stroke="hsl(var(--chart-3))" fill="url(#colorPurchases)" strokeWidth={2} name="Purchases" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-lg">Order Status Distribution</CardTitle>
            <CardDescription>Breakdown of all orders by status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {orderStatusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders + Low Stock */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="border-border/40">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Orders</CardTitle>
              <CardDescription>Latest customer orders</CardDescription>
            </div>
            <Link href="/admin/orders">
              <Button variant="ghost" size="sm" className="gap-1">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No orders yet</div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between rounded-lg border border-border/40 p-3 transition-colors hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <PackageCheck className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">{order.customer?.name || 'Unknown'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{formatCurrency(order.total_amount)}</span>
                      <Badge variant={statusColors[order.status] || 'secondary'} className="capitalize">
                        {order.status}
                      </Badge>
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
              <CardTitle className="text-lg">Low Stock Alerts</CardTitle>
              <CardDescription>Products below minimum stock level</CardDescription>
            </div>
            <Link href="/admin/inventory">
              <Button variant="ghost" size="sm" className="gap-1">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">All products well stocked</div>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">SKU: {product.sku || '—'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-destructive">{product.stock} left</p>
                      <p className="text-xs text-muted-foreground">Min: {product.min_stock}</p>
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
