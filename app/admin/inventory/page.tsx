'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
  AlertTriangle,
  PackageX,
  DollarSign,
  Warehouse as WarehouseIcon,
  Loader2,
  Filter,
  X,
} from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { StatCard } from '@/app/components/dashboard/stat-card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { Skeleton } from '@/app/components/ui/skeleton';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { supabase } from '@/app/lib/supabase/client';
import { formatCurrency, formatDate } from '@/app/lib/types/ui';
import { toast } from 'sonner';
import { cn } from '@/app/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StockStatus = 'out_of_stock' | 'low' | 'normal' | 'overstock';

interface InventoryItem {
  id: string;
  product_id: string;
  warehouse_id: string;
  sku: string | null;
  barcode: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  quantity: number;
  min_stock: number;
  max_stock: number;
  purchase_price: number;
  selling_price: number;
  supplier_id: string | null;
  created_at: string;
  updated_at: string;
  product: { id: string; name: string } | null;
  warehouse: { id: string; name: string; code: string } | null;
  supplier: { id: string; name: string } | null;
}

interface Product {
  id: string;
  name: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface InventoryForm {
  product_id: string;
  warehouse_id: string;
  sku: string;
  barcode: string;
  batch_number: string;
  expiry_date: string;
  quantity: string;
  min_stock: string;
  max_stock: string;
  purchase_price: string;
  selling_price: string;
  supplier_id: string;
}

const emptyForm: InventoryForm = {
  product_id: '',
  warehouse_id: '',
  sku: '',
  barcode: '',
  batch_number: '',
  expiry_date: '',
  quantity: '',
  min_stock: '',
  max_stock: '',
  purchase_price: '',
  selling_price: '',
  supplier_id: '',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStockStatus(item: Pick<InventoryItem, 'quantity' | 'min_stock' | 'max_stock'>): StockStatus {
  if (item.quantity <= 0) return 'out_of_stock';
  if (item.quantity < item.min_stock) return 'low';
  if (item.quantity > item.max_stock) return 'overstock';
  return 'normal';
}

const statusConfig: Record<StockStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'; barClass: string }> = {
  out_of_stock: { label: 'Out of Stock', variant: 'destructive', barClass: 'bg-destructive' },
  low: { label: 'Low Stock', variant: 'warning', barClass: 'bg-yellow-500' },
  normal: { label: 'Normal', variant: 'success', barClass: 'bg-green-500' },
  overstock: { label: 'Overstock', variant: 'secondary', barClass: 'bg-blue-500' },
};

function getStockPercentage(item: Pick<InventoryItem, 'quantity' | 'max_stock'>): number {
  if (item.max_stock <= 0) return 0;
  return Math.min(100, Math.round((item.quantity / item.max_stock) * 100));
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<InventoryForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory')
      .select(
        '*, product:products(id, name), warehouse:warehouses(id, name, code), supplier:suppliers(id, name)'
      )
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load inventory');
      console.error(error);
    } else {
      setInventory((data || []) as unknown as InventoryItem[]);
    }
    setLoading(false);
  }, []);

  const fetchOptions = useCallback(async () => {
    const [prodRes, whRes, supRes] = await Promise.all([
      supabase.from('products').select('id, name').order('name'),
      supabase.from('warehouses').select('id, name, code').order('name'),
      supabase.from('suppliers').select('id, name').order('name'),
    ]);

    if (prodRes.data) setProducts(prodRes.data);
    if (whRes.data) setWarehouses(whRes.data as Warehouse[]);
    if (supRes.data) setSuppliers(supRes.data);
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([fetchInventory(), fetchOptions()]);
    })();
  }, [fetchInventory, fetchOptions]);

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  const summary = useMemo(() => {
    const totalItems = inventory.length;
    const totalStockValue = inventory.reduce(
      (sum, i) => sum + Number(i.purchase_price) * i.quantity,
      0
    );
    const lowStockCount = inventory.filter((i) => {
      const s = getStockStatus(i);
      return s === 'low';
    }).length;
    const outOfStockCount = inventory.filter((i) => i.quantity <= 0).length;
    return { totalItems, totalStockValue, lowStockCount, outOfStockCount };
  }, [inventory]);

  // -------------------------------------------------------------------------
  // Filtering
  // -------------------------------------------------------------------------

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inventory.filter((item) => {
      const productName = item.product?.name?.toLowerCase() ?? '';
      const sku = item.sku?.toLowerCase() ?? '';
      const barcode = item.barcode?.toLowerCase() ?? '';
      const matchesSearch =
        !q ||
        productName.includes(q) ||
        sku.includes(q) ||
        barcode.includes(q);

      const matchesWarehouse =
        warehouseFilter === 'all' || item.warehouse_id === warehouseFilter;

      const status = getStockStatus(item);
      const matchesLowStock = !lowStockOnly || status === 'low' || status === 'out_of_stock';

      return matchesSearch && matchesWarehouse && matchesLowStock;
    });
  }, [inventory, search, warehouseFilter, lowStockOnly]);

  // -------------------------------------------------------------------------
  // Dialog helpers
  // -------------------------------------------------------------------------

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setForm({
      product_id: item.product_id,
      warehouse_id: item.warehouse_id,
      sku: item.sku ?? '',
      barcode: item.barcode ?? '',
      batch_number: item.batch_number ?? '',
      expiry_date: item.expiry_date ? item.expiry_date.split('T')[0] : '',
      quantity: String(item.quantity),
      min_stock: String(item.min_stock),
      max_stock: String(item.max_stock),
      purchase_price: String(item.purchase_price),
      selling_price: String(item.selling_price),
      supplier_id: item.supplier_id ?? '',
    });
    setDialogOpen(true);
  };

  const validate = (): string | null => {
    if (!form.product_id) return 'Product is required';
    if (!form.warehouse_id) return 'Warehouse is required';
    if (form.quantity === '' || Number(form.quantity) < 0) return 'Valid quantity is required';
    if (form.min_stock === '' || Number(form.min_stock) < 0) return 'Valid minimum stock is required';
    if (form.max_stock === '' || Number(form.max_stock) < 0) return 'Valid maximum stock is required';
    if (Number(form.min_stock) > Number(form.max_stock)) return 'Min stock cannot exceed max stock';
    if (form.purchase_price === '' || Number(form.purchase_price) < 0) return 'Valid purchase price is required';
    if (form.selling_price === '' || Number(form.selling_price) < 0) return 'Valid selling price is required';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    setSaving(true);

    const payload = {
      product_id: form.product_id,
      warehouse_id: form.warehouse_id,
      sku: form.sku || null,
      barcode: form.barcode || null,
      batch_number: form.batch_number || null,
      expiry_date: form.expiry_date || null,
      quantity: Number(form.quantity),
      min_stock: Number(form.min_stock),
      max_stock: Number(form.max_stock),
      purchase_price: Number(form.purchase_price),
      selling_price: Number(form.selling_price),
      supplier_id: form.supplier_id || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from('inventory')
        .update(payload)
        .eq('id', editingId);
      setSaving(false);
      if (error) {
        toast.error('Failed to update inventory item');
        console.error(error);
        return;
      }
      toast.success('Inventory item updated');
    } else {
      const { error } = await supabase.from('inventory').insert(payload);
      setSaving(false);
      if (error) {
        toast.error('Failed to add inventory item');
        console.error(error);
        return;
      }
      toast.success('Inventory item added');
    }

    setDialogOpen(false);
    await fetchInventory();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from('inventory').delete().eq('id', deleteId);
    setDeleting(false);
    if (error) {
      toast.error('Failed to delete inventory item');
      console.error(error);
      return;
    }
    toast.success('Inventory item deleted');
    setDeleteId(null);
    await fetchInventory();
  };

  const hasFilters = search.trim() !== '' || warehouseFilter !== 'all' || lowStockOnly;

  const clearFilters = () => {
    setSearch('');
    setWarehouseFilter('all');
    setLowStockOnly(false);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <DashboardShell>
      <PageHeader
        title="Inventory Management"
        description="Track and manage stock levels across all warehouses"
        action={
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Inventory
          </Button>
        }
      />

      {/* Summary bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Items"
          value={summary.totalItems}
          icon={Package}
          iconColor="hsl(var(--primary))"
        />
        <StatCard
          title="Total Stock Value"
          value={formatCurrency(summary.totalStockValue)}
          icon={DollarSign}
          iconColor="hsl(var(--success))"
        />
        <StatCard
          title="Low Stock"
          value={summary.lowStockCount}
          icon={AlertTriangle}
          iconColor="hsl(var(--warning))"
        />
        <StatCard
          title="Out of Stock"
          value={summary.outOfStockCount}
          icon={PackageX}
          iconColor="hsl(var(--destructive))"
        />
      </div>

      {/* Filters */}
      <Card className="mt-6 border-border/40">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by product, SKU, or barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="All warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All warehouses</SelectItem>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={lowStockOnly ? 'default' : 'outline'}
              onClick={() => setLowStockOnly((v) => !v)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              {lowStockOnly ? 'Low Stock: On' : 'Low Stock Only'}
            </Button>
            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters} className="gap-2">
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="mt-4 border-border/40">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-6 w-24" />
              </div>
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <WarehouseIcon className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No inventory items found</p>
                <p className="text-sm text-muted-foreground">
                  {hasFilters
                    ? 'Try adjusting your filters or search query.'
                    : 'Get started by adding your first inventory item.'}
                </p>
              </div>
              {hasFilters ? (
                <Button variant="outline" onClick={clearFilters} className="gap-2">
                  <X className="h-4 w-4" />
                  Clear filters
                </Button>
              ) : (
                <Button onClick={openAdd} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Inventory
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Min / Max</TableHead>
                  <TableHead className="text-right">Purchase</TableHead>
                  <TableHead className="text-right">Selling</TableHead>
                  <TableHead>Stock Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const status = getStockStatus(item);
                  const cfg = statusConfig[status];
                  const pct = getStockPercentage(item);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.product?.name ?? 'Unknown product'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.sku ?? '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.barcode ?? '—'}
                      </TableCell>
                      <TableCell>
                        {item.warehouse ? (
                          <span className="text-sm">
                            {item.warehouse.name}
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({item.warehouse.code})
                            </span>
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.batch_number ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(item.expiry_date)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {item.min_stock} / {item.max_stock}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(Number(item.purchase_price))}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(Number(item.selling_price))}
                      </TableCell>
                      <TableCell className="w-[120px]">
                        <div className="flex items-center gap-2">
                          <Progress
                            value={pct}
                            className="h-2"
                          />
                          <span className="w-9 text-right text-xs text-muted-foreground">
                            {pct}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(item)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(item.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Inventory Item' : 'Add Inventory Item'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update the details of this inventory item.'
                : 'Fill in the details below to add a new inventory item.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Product & Warehouse */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Product</Label>
                <Select
                  value={form.product_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, product_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Warehouse</Label>
                <Select
                  value={form.warehouse_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, warehouse_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* SKU & Barcode */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={form.sku}
                  onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                  placeholder="e.g. SKU-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={form.barcode}
                  onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                  placeholder="e.g. 1234567890123"
                />
              </div>
            </div>

            {/* Batch & Expiry */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="batch_number">Batch Number</Label>
                <Input
                  id="batch_number"
                  value={form.batch_number}
                  onChange={(e) => setForm((f) => ({ ...f, batch_number: e.target.value }))}
                  placeholder="e.g. BATCH-2024-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Quantity / Min / Max */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_stock">Min Stock</Label>
                <Input
                  id="min_stock"
                  type="number"
                  min="0"
                  value={form.min_stock}
                  onChange={(e) => setForm((f) => ({ ...f, min_stock: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_stock">Max Stock</Label>
                <Input
                  id="max_stock"
                  type="number"
                  min="0"
                  value={form.max_stock}
                  onChange={(e) => setForm((f) => ({ ...f, max_stock: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Prices */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="purchase_price">Purchase Price</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.purchase_price}
                  onChange={(e) => setForm((f) => ({ ...f, purchase_price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="selling_price">Selling Price</Label>
                <Input
                  id="selling_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.selling_price}
                  onChange={(e) => setForm((f) => ({ ...f, selling_price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Supplier */}
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select
                value={form.supplier_id}
                onValueChange={(v) => setForm((f) => ({ ...f, supplier_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete inventory item?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the inventory item
              and remove it from the records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className={cn('gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90')}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  );
}
