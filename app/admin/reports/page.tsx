'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  Package,
  ShoppingCart,
  Factory,
  Users,
  DollarSign,
  Wallet,
  Banknote,
  Loader2,
  Star,
  StarHalf,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Boxes,
  Receipt,
  PiggyBank,
  Activity,
  CreditCard,
} from 'lucide-react';
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
  LineChart,
  Line,
} from 'recharts';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { StatCard } from '@/app/components/dashboard/stat-card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Progress } from '@/app/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { supabase } from '@/app/lib/supabase/client';
import { formatCurrency, formatDate, statusColors } from '@/app/lib/types/ui';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderWithCustomer {
  id: string;
  order_number: string;
  customer_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  customer: { name: string; company_name: string | null } | null;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface InventoryRow {
  id: string;
  product_id: string;
  warehouse_id: string | null;
  quantity: number;
  min_stock: number;
  max_stock: number;
  purchase_price: number;
  selling_price: number;
  product: { name: string } | null;
  warehouse: { name: string } | null;
}

interface PurchaseOrderRow {
  id: string;
  po_number: string;
  supplier_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  supplier: { name: string; rating: number; status: string } | null;
}

interface SupplierRow {
  id: string;
  name: string;
  rating: number;
  status: string;
}

interface CustomerRow {
  id: string;
  name: string;
  company_name: string | null;
  credit_limit: number;
  created_at: string;
}

interface TransactionRow {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  category: string | null;
  created_at: string;
}

// Chart data shapes
interface MonthlyPoint {
  month: string;
  revenue: number;
  expenses: number;
  purchases: number;
  income: number;
  profit: number;
  margin: number;
}

interface NameValue {
  name: string;
  value: number;
}

interface SupplierPerf {
  name: string;
  rating: number;
  totalOrders: number;
  fulfilledOrders: number;
  fulfillmentRate: number;
  status: string;
}

interface CustomerGrowthPoint {
  month: string;
  newCustomers: number;
  totalCustomers: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#0ea5e9',
  '#8b5cf6',
  '#f97316',
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return `${MONTH_NAMES[Number(m) - 1]} ${y.slice(2)}`;
}

// Build last 12 months keys from a reference date
function last12Months(ref = new Date()): string[] {
  const keys: string[] = [];
  const d = new Date(ref.getFullYear(), ref.getMonth(), 1);
  for (let i = 11; i >= 0; i--) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
    keys.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function ChartTooltip({ active, payload, label, currency = true }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-border/60 bg-background/95 px-3 py-2 shadow-md backdrop-blur">
      <p className="mb-1 text-xs font-semibold text-foreground">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: entry.color || entry.fill }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">
            {currency ? formatCurrency(Number(entry.value)) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton for chart areas
// ---------------------------------------------------------------------------

function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(rows)].map((_, r) => (
        <div key={r} className="flex gap-4">
          {[...Array(cols)].map((_, c) => (
            <Skeleton key={c} className="h-5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat cards skeleton
// ---------------------------------------------------------------------------

function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <Card key={i} className="border-border/40">
          <CardContent className="p-5">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <Skeleton className="mt-3 h-7 w-24" />
            <Skeleton className="mt-2 h-4 w-20" />
          </CardContent>
        </Card>
      ))}
    </>
  );
}

// ===========================================================================
// MAIN PAGE
// ===========================================================================

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState('sales');

  return (
    <DashboardShell>
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive insights across sales, inventory, purchases, suppliers, customers, and financials"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto pb-1">
          <TabsList className="flex w-max gap-1 h-auto p-1">
            <TabsTrigger value="sales" className="gap-1.5">
              <TrendingUp className="h-4 w-4" /> Sales
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-1.5">
              <Package className="h-4 w-4" /> Inventory
            </TabsTrigger>
            <TabsTrigger value="purchases" className="gap-1.5">
              <ShoppingCart className="h-4 w-4" /> Purchases
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-1.5">
              <Factory className="h-4 w-4" /> Suppliers
            </TabsTrigger>
            <TabsTrigger value="customers" className="gap-1.5">
              <Users className="h-4 w-4" /> Customers
            </TabsTrigger>
            <TabsTrigger value="profit" className="gap-1.5">
              <PiggyBank className="h-4 w-4" /> Profit
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-1.5">
              <Receipt className="h-4 w-4" /> Expenses
            </TabsTrigger>
            <TabsTrigger value="cashflow" className="gap-1.5">
              <Banknote className="h-4 w-4" /> Cash Flow
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="sales">
          <SalesReport />
        </TabsContent>
        <TabsContent value="inventory">
          <InventoryReport />
        </TabsContent>
        <TabsContent value="purchases">
          <PurchaseReport />
        </TabsContent>
        <TabsContent value="suppliers">
          <SupplierReport />
        </TabsContent>
        <TabsContent value="customers">
          <CustomerReport />
        </TabsContent>
        <TabsContent value="profit">
          <ProfitReport />
        </TabsContent>
        <TabsContent value="expenses">
          <ExpenseReport />
        </TabsContent>
        <TabsContent value="cashflow">
          <CashFlowReport />
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}

// ===========================================================================
// SALES REPORT
// ===========================================================================

function SalesReport() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [ordersRes, itemsRes] = await Promise.all([
      supabase
        .from('orders')
        .select('id, order_number, customer_id, status, total_amount, created_at, customer:customers(name, company_name)')
        .order('created_at', { ascending: false }),
      supabase
        .from('order_items')
        .select('id, order_id, product_name, quantity, unit_price, total_price'),
    ]);

    if (ordersRes.error) {
      toast.error('Failed to load sales data');
      console.error(ordersRes.error);
    } else {
      setOrders((ordersRes.data || []) as unknown as OrderWithCustomer[]);
    }
    if (itemsRes.error) {
      console.error(itemsRes.error);
    } else {
      setOrderItems((itemsRes.data || []) as unknown as OrderItemRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Monthly revenue (exclude cancelled/refunded/returned)
  const monthlyRevenue = useMemo<MonthlyPoint[]>(() => {
    const keys = last12Months();
    const map = new Map<string, number>();
    keys.forEach((k) => map.set(k, 0));
    orders.forEach((o) => {
      if (['cancelled', 'refunded', 'returned'].includes(o.status)) return;
      const k = monthKey(o.created_at);
      if (map.has(k)) map.set(k, (map.get(k) || 0) + Number(o.total_amount));
    });
    return keys.map((k) => ({ month: monthLabel(k), revenue: map.get(k) || 0 }) as MonthlyPoint);
  }, [orders]);

  const totalRevenue = useMemo(() => orders
    .filter((o) => !['cancelled', 'refunded', 'returned'].includes(o.status))
    .reduce((s, o) => s + Number(o.total_amount), 0), [orders]);

  const totalOrders = useMemo(() => orders.length, [orders]);
  const avgOrderValue = useMemo(() => (totalOrders > 0 ? totalRevenue / totalOrders : 0), [totalRevenue, totalOrders]);

  // Top products by revenue
  const topProducts = useMemo<NameValue[]>(() => {
    const map = new Map<string, number>();
    orderItems.forEach((item) => {
      map.set(item.product_name, (map.get(item.product_name) || 0) + Number(item.total_price));
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [orderItems]);

  // Top customers by revenue
  const topCustomers = useMemo<NameValue[]>(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      if (['cancelled', 'refunded', 'returned'].includes(o.status)) return;
      const name = o.customer?.name || 'Unknown';
      map.set(name, (map.get(name) || 0) + Number(o.total_amount));
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <StatCardsSkeleton />
        ) : (
          <>
            <StatCard
              title="Total Revenue"
              value={formatCurrency(totalRevenue)}
              icon={DollarSign}
              iconColor="hsl(var(--success))"
            />
            <StatCard
              title="Total Orders"
              value={totalOrders}
              icon={ShoppingCart}
              iconColor="hsl(var(--primary))"
            />
            <StatCard
              title="Avg Order Value"
              value={formatCurrency(avgOrderValue)}
              icon={TrendingUp}
              iconColor="hsl(var(--chart-2))"
            />
            <StatCard
              title="Top Product Revenue"
              value={topProducts[0] ? formatCurrency(topProducts[0].value) : '—'}
              icon={Package}
              iconColor="hsl(var(--chart-4))"
            />
          </>
        )}
      </div>

      {/* Monthly revenue chart */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-lg">Monthly Revenue</CardTitle>
          <CardDescription>Revenue from completed orders over the last 12 months</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <ChartSkeleton />
          ) : monthlyRevenue.every((p) => p.revenue === 0) ? (
            <EmptyChartState icon={TrendingUp} message="No sales recorded in the last 12 months" />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthlyRevenue} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
                <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top products */}
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-lg">Top Products by Revenue</CardTitle>
            <CardDescription>Best-selling products across all orders</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={6} cols={3} />
            ) : topProducts.length === 0 ? (
              <EmptyState icon={Package} message="No product sales yet" />
            ) : (
              <div className="space-y-3">
                {topProducts.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(p.value / (topProducts[0]?.value || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(p.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top customers */}
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-lg">Top Customers by Revenue</CardTitle>
            <CardDescription>Highest spending customers</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={6} cols={3} />
            ) : topCustomers.length === 0 ? (
              <EmptyState icon={Users} message="No customer orders yet" />
            ) : (
              <div className="space-y-3">
                {topCustomers.map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-chart-2/10 text-xs font-bold text-chart-2">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(c.value / (topCustomers[0]?.value || 1)) * 100}%`, backgroundColor: 'hsl(var(--chart-2))' }}
                        />
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(c.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ===========================================================================
// INVENTORY REPORT
// ===========================================================================

function InventoryReport() {
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory')
      .select('id, product_id, warehouse_id, quantity, min_stock, max_stock, purchase_price, selling_price, product:products(name), warehouse:warehouses(name)');

    if (error) {
      toast.error('Failed to load inventory data');
      console.error(error);
    } else {
      setInventory((data || []) as unknown as InventoryRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalInventoryValue = useMemo(() => inventory.reduce((s, i) => s + Number(i.quantity) * Number(i.selling_price), 0), [inventory]);
  const totalInventoryCost = useMemo(() => inventory.reduce((s, i) => s + Number(i.quantity) * Number(i.purchase_price), 0), [inventory]);
  const totalUnits = useMemo(() => inventory.reduce((s, i) => s + Number(i.quantity), 0), [inventory]);
  const lowStockItems = useMemo(() => inventory.filter((i) => i.quantity <= (i.min_stock || 0)).sort((a, b) => a.quantity - b.quantity), [inventory]);

  // Inventory value by warehouse
  const warehouseValue = useMemo<NameValue[]>(() => {
    const map = new Map<string, number>();
    inventory.forEach((i) => {
      const name = i.warehouse?.name || 'Unassigned';
      const val = Number(i.quantity) * Number(i.selling_price);
      map.set(name, (map.get(name) || 0) + val);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [inventory]);

  // Stock distribution by warehouse (by units)
  const stockDistribution = useMemo<NameValue[]>(() => {
    const map = new Map<string, number>();
    inventory.forEach((i) => {
      const name = i.warehouse?.name || 'Unassigned';
      map.set(name, (map.get(name) || 0) + Number(i.quantity));
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [inventory]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <StatCardsSkeleton />
        ) : (
          <>
            <StatCard title="Inventory Value" value={formatCurrency(totalInventoryValue)} icon={DollarSign} iconColor="hsl(var(--success))" />
            <StatCard title="Inventory Cost" value={formatCurrency(totalInventoryCost)} icon={Wallet} iconColor="hsl(var(--primary))" />
            <StatCard title="Total Units" value={totalUnits.toLocaleString()} icon={Boxes} iconColor="hsl(var(--chart-2))" />
            <StatCard title="Low Stock Items" value={lowStockItems.length} icon={AlertTriangle} iconColor="hsl(var(--warning))" />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Inventory value by warehouse */}
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-lg">Inventory Value by Warehouse</CardTitle>
            <CardDescription>Stock value (selling price) across warehouses</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : warehouseValue.length === 0 ? (
              <EmptyChartState icon={Package} message="No inventory data available" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={warehouseValue} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
                  <Bar dataKey="value" name="Value" fill="hsl(var(--chart-3))" radius={[0, 6, 6, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Stock distribution pie */}
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-lg">Stock Distribution by Warehouse</CardTitle>
            <CardDescription>Unit distribution across locations</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : stockDistribution.length === 0 ? (
              <EmptyChartState icon={Boxes} message="No stock data available" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stockDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    paddingAngle={2}
                  >
                    {stockDistribution.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip currency={false} />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low stock items table */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Low Stock Items
          </CardTitle>
          <CardDescription>Items at or below minimum stock threshold</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={5} cols={4} />
          ) : lowStockItems.length === 0 ? (
            <EmptyState icon={Package} message="All inventory items are above minimum stock levels" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Product</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Min Stock</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockItems.slice(0, 15).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product?.name || 'Unknown'}</TableCell>
                    <TableCell className="text-muted-foreground">{item.warehouse?.name || 'Unassigned'}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-destructive">{item.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{item.min_stock || 0}</TableCell>
                    <TableCell>
                      <Badge variant={item.quantity === 0 ? 'destructive' : 'warning'}>
                        {item.quantity === 0 ? 'Out of Stock' : 'Low Stock'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===========================================================================
// PURCHASE REPORT
// ===========================================================================

function PurchaseReport() {
  const [loading, setLoading] = useState(true);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRow[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('id, po_number, supplier_id, status, total_amount, created_at, supplier:suppliers(name, rating, status)')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load purchase data');
      console.error(error);
    } else {
      setPurchaseOrders((data || []) as unknown as PurchaseOrderRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPurchaseSpend = useMemo(() => purchaseOrders
    .filter((p) => p.status !== 'cancelled')
    .reduce((s, p) => s + Number(p.total_amount), 0), [purchaseOrders]);

  const totalPOs = useMemo(() => purchaseOrders.length, [purchaseOrders]);
  const pendingPOs = useMemo(() => purchaseOrders.filter((p) => p.status === 'pending').length, [purchaseOrders]);
  const completedPOs = useMemo(() => purchaseOrders.filter((p) => p.status === 'completed' || p.status === 'delivered').length, [purchaseOrders]);

  // Monthly purchase spending
  const monthlyPurchases = useMemo<MonthlyPoint[]>(() => {
    const keys = last12Months();
    const map = new Map<string, number>();
    keys.forEach((k) => map.set(k, 0));
    purchaseOrders.forEach((p) => {
      if (p.status === 'cancelled') return;
      const k = monthKey(p.created_at);
      if (map.has(k)) map.set(k, (map.get(k) || 0) + Number(p.total_amount));
    });
    return keys.map((k) => ({ month: monthLabel(k), purchases: map.get(k) || 0 } as MonthlyPoint));
  }, [purchaseOrders]);

  // POs by supplier
  const poBySupplier = useMemo<NameValue[]>(() => {
    const map = new Map<string, number>();
    purchaseOrders.forEach((p) => {
      if (p.status === 'cancelled') return;
      const name = p.supplier?.name || 'Unknown';
      map.set(name, (map.get(name) || 0) + Number(p.total_amount));
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [purchaseOrders]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <StatCardsSkeleton />
        ) : (
          <>
            <StatCard title="Total Spend" value={formatCurrency(totalPurchaseSpend)} icon={DollarSign} iconColor="hsl(var(--destructive))" />
            <StatCard title="Total POs" value={totalPOs} icon={ShoppingCart} iconColor="hsl(var(--primary))" />
            <StatCard title="Pending POs" value={pendingPOs} icon={Activity} iconColor="hsl(var(--warning))" />
            <StatCard title="Completed POs" value={completedPOs} icon={Package} iconColor="hsl(var(--success))" />
          </>
        )}
      </div>

      {/* Monthly purchase spending */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-lg">Monthly Purchase Spending</CardTitle>
          <CardDescription>Purchase order spend over the last 12 months</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <ChartSkeleton />
          ) : monthlyPurchases.every((p) => p.purchases === 0) ? (
            <EmptyChartState icon={ShoppingCart} message="No purchase orders in the last 12 months" />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={monthlyPurchases} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="purchaseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="purchases" name="Purchases" stroke="hsl(var(--chart-4))" strokeWidth={2} fill="url(#purchaseGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* POs by supplier */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-lg">Purchase Orders by Supplier</CardTitle>
          <CardDescription>Total spend per supplier (top 10)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={6} cols={3} />
          ) : poBySupplier.length === 0 ? (
            <EmptyState icon={Factory} message="No purchase orders recorded" />
          ) : (
            <div className="space-y-3">
              {poBySupplier.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-chart-4/10 text-xs font-bold" style={{ color: 'hsl(var(--chart-4))' }}>
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(s.value / (poBySupplier[0]?.value || 1)) * 100}%`, backgroundColor: 'hsl(var(--chart-4))' }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(s.value)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===========================================================================
// SUPPLIER PERFORMANCE REPORT
// ===========================================================================

function SupplierReport() {
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRow[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [supRes, poRes] = await Promise.all([
      supabase.from('suppliers').select('id, name, rating, status'),
      supabase.from('purchase_orders').select('id, po_number, supplier_id, status, total_amount, created_at, supplier:suppliers(name, rating, status)'),
    ]);

    if (supRes.error) {
      toast.error('Failed to load supplier data');
      console.error(supRes.error);
    } else {
      setSuppliers((supRes.data || []) as unknown as SupplierRow[]);
    }
    if (poRes.error) {
      console.error(poRes.error);
    } else {
      setPurchaseOrders((poRes.data || []) as unknown as PurchaseOrderRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const avgRating = useMemo(() => {
    if (suppliers.length === 0) return 0;
    return suppliers.reduce((s, sup) => s + Number(sup.rating), 0) / suppliers.length;
  }, [suppliers]);

  const activeSuppliers = useMemo(() => suppliers.filter((s) => s.status === 'active').length, [suppliers]);

  // Supplier performance: fulfillment rate
  const supplierPerf = useMemo<SupplierPerf[]>(() => {
    const map = new Map<string, { total: number; fulfilled: number }>();
    purchaseOrders.forEach((po) => {
      const name = po.supplier?.name || 'Unknown';
      if (!map.has(name)) map.set(name, { total: 0, fulfilled: 0 });
      const entry = map.get(name)!;
      entry.total += 1;
      if (['completed', 'delivered'].includes(po.status)) entry.fulfilled += 1;
    });
    return suppliers
      .map((sup) => {
        const stats = map.get(sup.name) || { total: 0, fulfilled: 0 };
        return {
          name: sup.name,
          rating: Number(sup.rating),
          totalOrders: stats.total,
          fulfilledOrders: stats.fulfilled,
          fulfillmentRate: stats.total > 0 ? (stats.fulfilled / stats.total) * 100 : 0,
          status: sup.status,
        };
      })
      .sort((a, b) => b.fulfillmentRate - a.fulfillmentRate || b.rating - a.rating);
  }, [suppliers, purchaseOrders]);

  // Rating distribution
  const ratingDistribution = useMemo<NameValue[]>(() => {
    const buckets = [
      { name: '4.5 - 5.0', min: 4.5, max: 5.1 },
      { name: '3.5 - 4.4', min: 3.5, max: 4.5 },
      { name: '2.5 - 3.4', min: 2.5, max: 3.5 },
      { name: 'Below 2.5', min: 0, max: 2.5 },
    ];
    return buckets.map((b) => ({
      name: b.name,
      value: suppliers.filter((s) => Number(s.rating) >= b.min && Number(s.rating) < b.max).length,
    })).filter((d) => d.value > 0);
  }, [suppliers]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <StatCardsSkeleton />
        ) : (
          <>
            <StatCard title="Total Suppliers" value={suppliers.length} icon={Factory} iconColor="hsl(var(--primary))" />
            <StatCard title="Active Suppliers" value={activeSuppliers} icon={Activity} iconColor="hsl(var(--success))" />
            <StatCard title="Avg Rating" value={avgRating.toFixed(2)} icon={Star} iconColor="hsl(var(--chart-4))" />
            <StatCard title="Avg Fulfillment" value={`${(supplierPerf.reduce((s, p) => s + p.fulfillmentRate, 0) / (supplierPerf.length || 1)).toFixed(0)}%`} icon={Package} iconColor="hsl(var(--chart-2))" />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Rating distribution */}
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-lg">Rating Distribution</CardTitle>
            <CardDescription>Supplier ratings by range</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton height={260} />
            ) : ratingDistribution.length === 0 ? (
              <EmptyChartState icon={Star} message="No supplier ratings available" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={ratingDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2}>
                    {ratingDistribution.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip currency={false} />} />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Supplier performance table */}
        <Card className="border-border/40 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Supplier Performance</CardTitle>
            <CardDescription>Order fulfillment rates and ratings</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={6} cols={4} />
            ) : supplierPerf.length === 0 ? (
              <EmptyState icon={Factory} message="No supplier data available" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-center">Rating</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead>Fulfillment Rate</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierPerf.slice(0, 12).map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-chart-4 text-chart-4" />
                          <span className="text-sm font-medium tabular-nums">{s.rating.toFixed(1)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{s.totalOrders}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={s.fulfillmentRate} className="h-2 w-20" />
                          <span className="text-xs font-medium tabular-nums text-muted-foreground">{s.fulfillmentRate.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[s.status] || 'secondary'} className="capitalize">{s.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ===========================================================================
// CUSTOMER REPORT
// ===========================================================================

function CustomerReport() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [custRes, ordRes] = await Promise.all([
      supabase.from('customers').select('id, name, company_name, credit_limit, created_at'),
      supabase.from('orders').select('id, order_number, customer_id, status, total_amount, created_at, customer:customers(name, company_name)'),
    ]);

    if (custRes.error) {
      toast.error('Failed to load customer data');
      console.error(custRes.error);
    } else {
      setCustomers((custRes.data || []) as unknown as CustomerRow[]);
    }
    if (ordRes.error) {
      console.error(ordRes.error);
    } else {
      setOrders((ordRes.data || []) as unknown as OrderWithCustomer[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalCustomers = useMemo(() => customers.length, [customers]);
  const totalCreditLimit = useMemo(() => customers.reduce((s, c) => s + Number(c.credit_limit), 0), [customers]);

  // Top customers by revenue
  const topCustomers = useMemo<NameValue[]>(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      if (['cancelled', 'refunded', 'returned'].includes(o.status)) return;
      const name = o.customer?.name || 'Unknown';
      map.set(name, (map.get(name) || 0) + Number(o.total_amount));
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [orders]);

  // Customer growth over last 12 months
  const customerGrowth = useMemo<CustomerGrowthPoint[]>(() => {
    const keys = last12Months();
    const newMap = new Map<string, number>();
    keys.forEach((k) => newMap.set(k, 0));
    customers.forEach((c) => {
      const k = monthKey(c.created_at);
      if (newMap.has(k)) newMap.set(k, (newMap.get(k) || 0) + 1);
    });

    // Calculate cumulative total
    const beforeCount = customers.filter((c) => {
      const k = monthKey(c.created_at);
      return keys.indexOf(k) === -1; // created before our 12-month window
    }).length;

    let running = beforeCount;
    return keys.map((k) => {
      running += newMap.get(k) || 0;
      return { month: monthLabel(k), newCustomers: newMap.get(k) || 0, totalCustomers: running };
    });
  }, [customers]);

  const newThisMonth = useMemo(() => customerGrowth[customerGrowth.length - 1]?.newCustomers || 0, [customerGrowth]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <StatCardsSkeleton />
        ) : (
          <>
            <StatCard title="Total Customers" value={totalCustomers} icon={Users} iconColor="hsl(var(--primary))" />
            <StatCard title="New This Month" value={newThisMonth} icon={TrendingUp} iconColor="hsl(var(--success))" />
            <StatCard title="Total Credit Limit" value={formatCurrency(totalCreditLimit)} icon={CreditCard as any} iconColor="hsl(var(--chart-2))" />
            <StatCard title="Top Customer Spend" value={topCustomers[0] ? formatCurrency(topCustomers[0].value) : '—'} icon={DollarSign} iconColor="hsl(var(--chart-4))" />
          </>
        )}
      </div>

      {/* Customer growth chart */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-lg">Customer Growth</CardTitle>
          <CardDescription>New customers and cumulative total over the last 12 months</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <ChartSkeleton />
          ) : customerGrowth.every((p) => p.newCustomers === 0 && p.totalCustomers === 0) ? (
            <EmptyChartState icon={Users} message="No customer growth data available" />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={customerGrowth} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="totalCustGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip currency={false} />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Area yAxisId="left" type="monotone" dataKey="totalCustomers" name="Total Customers" stroke="hsl(var(--chart-2))" strokeWidth={2} fill="url(#totalCustGrad)" />
                <Bar yAxisId="right" dataKey="newCustomers" name="New Customers" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top customers by revenue */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-lg">Top Customers by Revenue</CardTitle>
          <CardDescription>Highest spending customers (top 10)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={6} cols={3} />
          ) : topCustomers.length === 0 ? (
            <EmptyState icon={Users} message="No customer orders yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead>Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCustomers.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(c.value)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-chart-2"
                            style={{ width: `${(c.value / (topCustomers[0]?.value || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {((c.value / (topCustomers.reduce((s, x) => s + x.value, 0) || 1)) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===========================================================================
// PROFIT REPORT
// ===========================================================================

function ProfitReport() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [ordRes, txRes, invRes] = await Promise.all([
      supabase.from('orders').select('id, order_number, customer_id, status, total_amount, created_at, customer:customers(name, company_name)'),
      supabase.from('transactions').select('id, type, amount, description, category, created_at'),
      supabase.from('inventory').select('id, product_id, warehouse_id, quantity, min_stock, max_stock, purchase_price, selling_price, product:products(name), warehouse:warehouses(name)'),
    ]);

    if (ordRes.error) console.error(ordRes.error);
    else setOrders((ordRes.data || []) as unknown as OrderWithCustomer[]);
    if (txRes.error) console.error(txRes.error);
    else setTransactions((txRes.data || []) as unknown as TransactionRow[]);
    if (invRes.error) console.error(invRes.error);
    else setInventory((invRes.data || []) as unknown as InventoryRow[]);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build cost map from inventory (product_name -> purchase_price)
  // We approximate COGS using inventory purchase_price averages
  const monthlyProfit = useMemo<MonthlyPoint[]>(() => {
    const keys = last12Months();
    const revMap = new Map<string, number>();
    const expMap = new Map<string, number>();
    keys.forEach((k) => { revMap.set(k, 0); expMap.set(k, 0); });

    // Revenue from orders
    orders.forEach((o) => {
      if (['cancelled', 'refunded', 'returned'].includes(o.status)) return;
      const k = monthKey(o.created_at);
      if (revMap.has(k)) revMap.set(k, (revMap.get(k) || 0) + Number(o.total_amount));
    });

    // Expenses from transactions
    transactions.forEach((t) => {
      if (['expense', 'purchase'].includes(t.type)) {
        const k = monthKey(t.created_at);
        if (expMap.has(k)) expMap.set(k, (expMap.get(k) || 0) + Number(t.amount));
      } else if (['income', 'sale'].includes(t.type)) {
        // income transactions also count toward revenue if not already from orders
        // We use orders as primary revenue, so skip to avoid double counting
      }
    });

    return keys.map((k) => {
      const revenue = revMap.get(k) || 0;
      const expenses = expMap.get(k) || 0;
      const profit = revenue - expenses;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      return { month: monthLabel(k), revenue, expenses, profit, margin } as MonthlyPoint;
    });
  }, [orders, transactions]);

  const totalRevenue = useMemo(() => monthlyProfit.reduce((s, p) => s + p.revenue, 0), [monthlyProfit]);
  const totalExpenses = useMemo(() => monthlyProfit.reduce((s, p) => s + p.expenses, 0), [monthlyProfit]);
  const totalProfit = useMemo(() => totalRevenue - totalExpenses, [totalRevenue, totalExpenses]);
  const avgMargin = useMemo(() => (totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0), [totalProfit, totalRevenue]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <StatCardsSkeleton />
        ) : (
          <>
            <StatCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={TrendingUp} iconColor="hsl(var(--success))" />
            <StatCard title="Total Expenses" value={formatCurrency(totalExpenses)} icon={ArrowDownRight} iconColor="hsl(var(--destructive))" />
            <StatCard title="Net Profit" value={formatCurrency(totalProfit)} icon={PiggyBank} iconColor={totalProfit >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} />
            <StatCard title="Avg Margin" value={`${avgMargin.toFixed(1)}%`} icon={Activity} iconColor="hsl(var(--chart-2))" />
          </>
        )}
      </div>

      {/* Revenue vs Expenses */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-lg">Revenue vs Expenses</CardTitle>
          <CardDescription>Monthly comparison over the last 12 months</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <ChartSkeleton />
          ) : monthlyProfit.every((p) => p.revenue === 0 && p.expenses === 0) ? (
            <EmptyChartState icon={BarChart3} message="No financial data available" />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthlyProfit} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} maxBarSize={32} />
                <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Profit margin trend */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-lg">Profit Margin Trend</CardTitle>
          <CardDescription>Monthly profit margin percentage</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <ChartSkeleton />
          ) : monthlyProfit.every((p) => p.margin === 0) ? (
            <EmptyChartState icon={TrendingUp} message="No margin data available" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyProfit} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<ChartTooltip currency={false} />} />
                <Line type="monotone" dataKey="margin" name="Profit Margin" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--chart-2))' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===========================================================================
// EXPENSE REPORT
// ===========================================================================

function ExpenseReport() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('id, type, amount, description, category, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load expense data');
      console.error(error);
    } else {
      setTransactions((data || []) as unknown as TransactionRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const expenses = useMemo(() => transactions.filter((t) => ['expense', 'purchase'].includes(t.type)), [transactions]);

  const totalExpenses = useMemo(() => expenses.reduce((s, t) => s + Number(t.amount), 0), [expenses]);

  // Expenses by category
  const expensesByCategory = useMemo<NameValue[]>(() => {
    const map = new Map<string, number>();
    expenses.forEach((t) => {
      const cat = t.category || 'Uncategorized';
      map.set(cat, (map.get(cat) || 0) + Number(t.amount));
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  // Monthly expenses
  const monthlyExpenses = useMemo<MonthlyPoint[]>(() => {
    const keys = last12Months();
    const map = new Map<string, number>();
    keys.forEach((k) => map.set(k, 0));
    expenses.forEach((t) => {
      const k = monthKey(t.created_at);
      if (map.has(k)) map.set(k, (map.get(k) || 0) + Number(t.amount));
    });
    return keys.map((k) => ({ month: monthLabel(k), expenses: map.get(k) || 0 } as MonthlyPoint));
  }, [expenses]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <StatCardsSkeleton />
        ) : (
          <>
            <StatCard title="Total Expenses" value={formatCurrency(totalExpenses)} icon={Receipt} iconColor="hsl(var(--destructive))" />
            <StatCard title="Transactions" value={expenses.length} icon={Activity} iconColor="hsl(var(--primary))" />
            <StatCard title="Categories" value={expensesByCategory.length} icon={BarChart3} iconColor="hsl(var(--chart-2))" />
            <StatCard title="Avg / Month" value={formatCurrency(totalExpenses / 12)} icon={TrendingUp} iconColor="hsl(var(--chart-4))" />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Expenses by category pie */}
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-lg">Expenses by Category</CardTitle>
            <CardDescription>Distribution of spending across categories</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : expensesByCategory.length === 0 ? (
              <EmptyChartState icon={Receipt} message="No expense data available" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={expensesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={2}>
                    {expensesByCategory.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly expenses bar */}
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-lg">Monthly Expenses</CardTitle>
            <CardDescription>Expense trend over the last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : monthlyExpenses.every((p) => p.expenses === 0) ? (
              <EmptyChartState icon={BarChart3} message="No expense data available" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyExpenses} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
                  <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown table */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-lg">Category Breakdown</CardTitle>
          <CardDescription>Detailed expense breakdown by category</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={5} cols={3} />
          ) : expensesByCategory.length === 0 ? (
            <EmptyState icon={Receipt} message="No expense categories found" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                  <TableHead>Distribution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expensesByCategory.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        {c.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(c.value)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {((c.value / (totalExpenses || 1)) * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(c.value / (expensesByCategory[0]?.value || 1)) * 100}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===========================================================================
// CASH FLOW REPORT
// ===========================================================================

function CashFlowReport() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('id, type, amount, description, category, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load cash flow data');
      console.error(error);
    } else {
      setTransactions((data || []) as unknown as TransactionRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const monthlyCashFlow = useMemo<MonthlyPoint[]>(() => {
    const keys = last12Months();
    const incomeMap = new Map<string, number>();
    const expMap = new Map<string, number>();
    keys.forEach((k) => { incomeMap.set(k, 0); expMap.set(k, 0); });

    transactions.forEach((t) => {
      const k = monthKey(t.created_at);
      if (!incomeMap.has(k)) return;
      if (['income', 'sale'].includes(t.type)) {
        incomeMap.set(k, (incomeMap.get(k) || 0) + Number(t.amount));
      } else if (['expense', 'purchase'].includes(t.type)) {
        expMap.set(k, (expMap.get(k) || 0) + Number(t.amount));
      }
    });

    return keys.map((k) => {
      const income = incomeMap.get(k) || 0;
      const expenses = expMap.get(k) || 0;
      return { month: monthLabel(k), income, expenses, profit: income - expenses } as MonthlyPoint;
    });
  }, [transactions]);

  const totalIncome = useMemo(() => monthlyCashFlow.reduce((s, p) => s + p.income, 0), [monthlyCashFlow]);
  const totalExp = useMemo(() => monthlyCashFlow.reduce((s, p) => s + p.expenses, 0), [monthlyCashFlow]);
  const netCashFlow = useMemo(() => totalIncome - totalExp, [totalIncome, totalExp]);

  // Recent transactions
  const recentTx = useMemo(() => transactions.slice(0, 10), [transactions]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <StatCardsSkeleton />
        ) : (
          <>
            <StatCard title="Total Income" value={formatCurrency(totalIncome)} icon={ArrowUpRight} iconColor="hsl(var(--success))" />
            <StatCard title="Total Expenses" value={formatCurrency(totalExp)} icon={ArrowDownRight} iconColor="hsl(var(--destructive))" />
            <StatCard title="Net Cash Flow" value={formatCurrency(netCashFlow)} icon={Banknote} iconColor={netCashFlow >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} />
            <StatCard title="Transactions" value={transactions.length} icon={Activity} iconColor="hsl(var(--primary))" />
          </>
        )}
      </div>

      {/* Income vs Expenses over time */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-lg">Income vs Expenses Over Time</CardTitle>
          <CardDescription>Cash flow trend over the last 12 months</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <ChartSkeleton />
          ) : monthlyCashFlow.every((p) => p.income === 0 && p.expenses === 0) ? (
            <EmptyChartState icon={Banknote} message="No cash flow data available" />
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={monthlyCashFlow} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="income" name="Income" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#incomeGrad)" />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="hsl(var(--destructive))" strokeWidth={2} fill="url(#expenseGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Net cash flow line */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-lg">Net Cash Flow</CardTitle>
          <CardDescription>Monthly net (income minus expenses)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <ChartSkeleton height={260} />
          ) : monthlyCashFlow.every((p) => p.profit === 0) ? (
            <EmptyChartState icon={Activity} message="No net cash flow data available" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyCashFlow} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="profit" name="Net Cash Flow" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--chart-2))' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Recent transactions */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
          <CardDescription>Latest financial activity</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={6} cols={4} />
          ) : recentTx.length === 0 ? (
            <EmptyState icon={Receipt} message="No transactions recorded" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTx.map((t) => {
                  const isIncome = ['income', 'sale'].includes(t.type);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(t.created_at)}</TableCell>
                      <TableCell className="max-w-[200px] truncate font-medium">{t.description || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{t.category || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={isIncome ? 'success' : 'destructive'} className="capitalize">{t.type}</Badge>
                      </TableCell>
                      <TableCell className={`text-right font-semibold tabular-nums ${isIncome ? 'text-success' : 'text-destructive'}`}>
                        {isIncome ? '+' : '−'}{formatCurrency(Number(t.amount))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===========================================================================
// SHARED UI HELPERS
// ===========================================================================

function EmptyChartState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="flex h-[260px] flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

