'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  Star,
  Filter,
  X,
  PackageOpen,
  Loader2,
} from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { Switch } from '@/app/components/ui/switch';
import { Card } from '@/app/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
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
import { supabase } from '@/app/lib/supabase/client';
import { formatCurrency, formatDate, statusColors } from '@/app/lib/types/ui';
import type { Product, Category, Brand, Supplier, ProductStatus } from '@/app/lib/types/database';
import { toast } from 'sonner';
import { uploadProductImage } from '@/app/lib/supabase/product-image';

type ProductWithRelations = Omit<Product, 'category' | 'brand' | 'supplier'> & {
  category: Category | null;
  brand: Brand | null;
  supplier: Supplier | null;
};

interface ProductFormState {
  name: string;
  slug: string;
  sku: string;
  barcode: string;
  description: string;
  category_id: string;
  brand_id: string;
  supplier_id: string;
  image_url: string;
  wholesale_price: string;
  retail_price: string;
  discount: string;
  tax_rate: string;
  unit: string;
  min_stock: string;
  max_stock: string;
  stock: string;
  status: ProductStatus;
  is_featured: boolean;
  specifications: string;
}

const emptyForm: ProductFormState = {
  name: '',
  slug: '',
  sku: '',
  barcode: '',
  description: '',
  category_id: '',
  brand_id: '',
  supplier_id: '',
  image_url: '',
  wholesale_price: '0',
  retail_price: '0',
  discount: '0',
  tax_rate: '0',
  unit: 'piece',
  min_stock: '0',
  max_stock: '0',
  stock: '0',
  status: 'draft',
  is_featured: false,
  specifications: '',
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const parseSpecs = (raw: string): Record<string, string> => {
  const out: Record<string, string> = {};
  raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      const idx = line.indexOf(':');
      if (idx > -1) {
        const k = line.slice(0, idx).trim();
        const v = line.slice(idx + 1).trim();
        if (k) out[k] = v;
      }
    });
  return out;
};

const stringifySpecs = (specs: Record<string, string> | null): string =>
  specs ? Object.entries(specs).map(([k, v]) => `${k}: ${v}`).join('\n') : '';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterBrand, setFilterBrand] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<ProductWithRelations | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: productsData }, { data: categoriesData }, { data: brandsData }, { data: suppliersData }] =
      await Promise.all([
        supabase
          .from('products')
          .select('*, category:categories(*), brand:brands(*), supplier:suppliers(*)')
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name', { ascending: true }),
        supabase.from('brands').select('*').order('name', { ascending: true }),
        supabase.from('suppliers').select('*').order('name', { ascending: true }),
      ]);

    setProducts((productsData as unknown as ProductWithRelations[]) || []);
    setCategories((categoriesData as Category[]) || []);
    setBrands((brandsData as Brand[]) || []);
    setSuppliers((suppliersData as Supplier[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q);
      const matchesCategory = filterCategory === 'all' || p.category_id === filterCategory;
      const matchesBrand = filterBrand === 'all' || p.brand_id === filterBrand;
      const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
      return matchesSearch && matchesCategory && matchesBrand && matchesStatus;
    });
  }, [products, search, filterCategory, filterBrand, filterStatus]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview('');
    setSlugTouched(false);
    setDialogOpen(true);
  };

  const openEdit = (p: ProductWithRelations) => {
    setEditingId(p.id);
    setImageFile(null);
    setImagePreview(p.image_url || '');
    setForm({
      name: p.name,
      slug: p.slug,
      sku: p.sku || '',
      barcode: p.barcode || '',
      description: p.description || '',
      category_id: p.category_id || '',
      brand_id: p.brand_id || '',
      supplier_id: p.supplier_id || '',
      image_url: p.image_url || '',
      wholesale_price: String(p.wholesale_price ?? 0),
      retail_price: String(p.retail_price ?? 0),
      discount: String(p.discount ?? 0),
      tax_rate: String(p.tax_rate ?? 0),
      unit: p.unit || 'piece',
      min_stock: String(p.min_stock ?? 0),
      max_stock: String(p.max_stock ?? 0),
      stock: String(p.stock ?? 0),
      status: p.status,
      is_featured: p.is_featured,
      specifications: stringifySpecs(p.specifications),
    });
    setSlugTouched(true);
    setDialogOpen(true);
  };

  const handleNameChange = (name: string) => {
    setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));
  };

  const handleSlugChange = (slug: string) => {
    setSlugTouched(true);
    setForm((f) => ({ ...f, slug: slugify(slug) }));
  };
 const handleImageChange = (file: File | null) => {
  if (imagePreview.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreview);
  }

  setImageFile(file);

  if (!file) {
    setImagePreview(form.image_url || '');
    return;
  }

  setImagePreview(URL.createObjectURL(file));
};

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (!form.sku.trim()) {
      toast.error('SKU is required');
      return;
    }

    setSaving(true);

    // Check SKU uniqueness
    const skuQuery = supabase
      .from('products')
      .select('id')
      .eq('sku', form.sku.trim())
      .maybeSingle();
    const { data: existing } = editingId
      ? await supabase.from('products').select('id').eq('sku', form.sku.trim()).neq('id', editingId).maybeSingle()
      : await skuQuery;

    if (existing) {
      toast.error('A product with this SKU already exists');
      setSaving(false);
      return;
    }
    let imageUrl = form.image_url.trim() || null;

   if (imageFile) {
      try {
         imageUrl = await uploadProductImage(imageFile);
          } catch (error) {
              console.error(error);

              toast.error(
              error instanceof Error
              ? error.message
              : 'Failed to upload product image'
               );

         setSaving(false);
         return;
  }
}

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      sku: form.sku.trim(),
      barcode: form.barcode.trim() || null,
      description: form.description.trim() || null,
      category_id: form.category_id || null,
      brand_id: form.brand_id || null,
      supplier_id: form.supplier_id || null,
      image_url: imageUrl,
      wholesale_price: Number(form.wholesale_price) || 0,
      retail_price: Number(form.retail_price) || 0,
      discount: Number(form.discount) || 0,
      tax_rate: Number(form.tax_rate) || 0,
      unit: form.unit || 'piece',
      min_stock: Number(form.min_stock) || 0,
      max_stock: Number(form.max_stock) || 0,
      stock: Number(form.stock) || 0,
      status: form.status,
      is_featured: form.is_featured,
      specifications: parseSpecs(form.specifications),
    };

    const { error } = editingId
      ? await supabase.from('products').update(payload).eq('id', editingId)
      : await supabase.from('products').insert(payload);

    setSaving(false);

    if (error) {
      toast.error(editingId ? 'Failed to update product' : 'Failed to create product');
      console.error(error);
      return;
    }

    toast.success(editingId ? 'Product updated' : 'Product created');
    setDialogOpen(false);
    await loadData();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('products').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast.error('Failed to delete product');
      console.error(error);
      return;
    }
    toast.success('Product deleted');
    setDeleteTarget(null);
    await loadData();
  };

  const resetFilters = () => {
    setSearch('');
    setFilterCategory('all');
    setFilterBrand('all');
    setFilterStatus('all');
  };

  const activeFilters = filterCategory !== 'all' || filterBrand !== 'all' || filterStatus !== 'all';

  return (
    <DashboardShell>
      <PageHeader
        title="Products"
        description="Manage your product catalog, pricing, and inventory levels"
        action={
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        }
      />

      {/* Filters */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or SKU..."
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
            {activeFilters && <span className="flex h-2 w-2 rounded-full bg-primary-foreground" />}
          </Button>
        </div>

        {showFilters && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Category</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Brand</Label>
              <Select value={filterBrand} onValueChange={setFilterBrand}>
                <SelectTrigger>
                  <SelectValue placeholder="All brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All brands</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {activeFilters && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5 text-xs">
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <Card className="overflow-hidden border-border/40">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[64px]">Image</TableHead>
              <TableHead className="min-w-[180px]">Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead className="text-right">Wholesale</TableHead>
              <TableHead className="text-right">Retail</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Featured</TableHead>
              <TableHead className="w-[90px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-10 rounded-md" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="mx-auto h-5 w-9 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-8 w-16" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11}>
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                      <PackageOpen className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">No products found</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {activeFilters || search
                          ? 'Try adjusting your search or filters.'
                          : 'Get started by adding your first product.'}
                      </p>
                    </div>
                    {!activeFilters && !search && (
                      <Button onClick={openAdd} variant="outline" size="sm" className="mt-1 gap-1.5">
                        <Plus className="h-4 w-4" />
                        Add Product
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id} className="group">
                  <TableCell>
                    <div className="relative h-10 w-10 overflow-hidden rounded-md border border-border/60 bg-muted">
                      {p.image_url ? (
                        <Image
                          src={p.image_url}
                          alt={p.name}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium leading-tight">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.slug}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.sku || '—'}</TableCell>
                  <TableCell className="text-sm">{p.category?.name || '—'}</TableCell>
                  <TableCell className="text-sm">{p.brand?.name || '—'}</TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatCurrency(p.wholesale_price)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatCurrency(p.retail_price)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        p.stock <= p.min_stock
                          ? 'text-sm font-semibold text-destructive'
                          : 'text-sm font-medium'
                      }
                    >
                      {p.stock}
                    </span>
                    <span className="ml-1 text-xs text-muted-foreground">{p.unit}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[p.status] || 'secondary'} className="capitalize">
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {p.is_featured ? (
                      <Star className="mx-auto h-4 w-4 fill-amber-400 text-amber-400" />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {!loading && filtered.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Showing {filtered.length} of {products.length} product{products.length === 1 ? '' : 's'}
        </p>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Product' : 'Add Product'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update the product details below.'
                : 'Fill in the details below to create a new product.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Basic info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Product name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="auto-generated-from-name"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={form.sku}
                  onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                  placeholder="SKU-001"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={form.barcode}
                  onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                  placeholder="89012345..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Product description..."
                rows={3}
              />
            </div>

            {/* Relations */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={form.category_id || '__none__'}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, category_id: v === '__none__' ? '' : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No category</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Brand</Label>
                <Select
                  value={form.brand_id || '__none__'}
                  onValueChange={(v) => setForm((f) => ({ ...f, brand_id: v === '__none__' ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No brand</SelectItem>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Supplier</Label>
                <Select
                  value={form.supplier_id || '__none__'}
                  onValueChange={(v) => setForm((f) => ({ ...f, supplier_id: v === '__none__' ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No supplier</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

           <div className="space-y-3">
  <Label htmlFor="product-image">Product Image</Label>

  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
    <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
      {imagePreview ? (
        <Image
          src={imagePreview}
          alt="Product preview"
          fill
          sizes="128px"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
    </div>

    <div className="flex flex-1 flex-col gap-2">
      <Input
        id="product-image"
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          handleImageChange(file);
        }}
      />

      <p className="text-xs text-muted-foreground">
        JPG, PNG, WEBP or other image formats. Maximum size: 5 MB.
      </p>

      {imageFile && (
        <p className="text-xs font-medium text-primary">
          Selected: {imageFile.name}
        </p>
      )}
    </div>
  </div>
</div>

            {/* Pricing */}
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="wholesale_price">Wholesale Price</Label>
                <Input
                  id="wholesale_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.wholesale_price}
                  onChange={(e) => setForm((f) => ({ ...f, wholesale_price: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="retail_price">Retail Price</Label>
                <Input
                  id="retail_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.retail_price}
                  onChange={(e) => setForm((f) => ({ ...f, retail_price: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="discount">Discount (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount}
                  onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.tax_rate}
                  onChange={(e) => setForm((f) => ({ ...f, tax_rate: e.target.value }))}
                />
              </div>
            </div>

            {/* Inventory */}
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="piece"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="min_stock">Min Stock</Label>
                <Input
                  id="min_stock"
                  type="number"
                  min="0"
                  value={form.min_stock}
                  onChange={(e) => setForm((f) => ({ ...f, min_stock: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max_stock">Max Stock</Label>
                <Input
                  id="max_stock"
                  type="number"
                  min="0"
                  value={form.max_stock}
                  onChange={(e) => setForm((f) => ({ ...f, max_stock: e.target.value }))}
                />
              </div>
            </div>

            {/* Status + Featured */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as ProductStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-3 pb-1">
                <Switch
                  id="is_featured"
                  checked={form.is_featured}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, is_featured: checked }))}
                />
                <Label htmlFor="is_featured" className="cursor-pointer">
                  Featured product
                </Label>
              </div>
            </div>

            {/* Specifications */}
            <div className="space-y-1.5">
              <Label htmlFor="specifications">Specifications</Label>
              <Textarea
                id="specifications"
                value={form.specifications}
                onChange={(e) => setForm((f) => ({ ...f, specifications: e.target.value }))}
                placeholder={'key: value\none per line, e.g.\nMaterial: Steel\nWeight: 1.5kg'}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Enter one specification per line in <code className="rounded bg-muted px-1">key: value</code> format.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? 'Save Changes' : 'Create Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  );
}
