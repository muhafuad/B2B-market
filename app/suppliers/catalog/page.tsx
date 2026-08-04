'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Package, Plus, Pencil, Trash2, Search, Inbox, Loader2, X, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/app/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';
import { useAuth } from '@/app/components/providers/auth-provider';
import { supabase } from '@/app/lib/supabase/client';
import { formatCurrency } from '@/app/lib/types/ui';
import { toast } from 'sonner';

const CATEGORIES = [
  'Raw Materials', 'Electronics', 'Packaging', 'Chemicals', 'Food & Beverage',
  'Textiles & Fabric', 'Machinery & Parts', 'Office Supplies', 'Safety Equipment', 'Other',
];

const UNITS = ['piece', 'kg', 'g', 'ton', 'liter', 'ml', 'box', 'carton', 'roll', 'meter', 'set'];

interface CatalogItem {
  id: string;
  supplier_id: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  unit_price: number;
  min_order_qty: number;
  lead_time_days: number | null;
  image_url: string | null;
  is_available: boolean;
  notes: string | null;
  created_at: string;
}

function emptyForm() {
  return {
    name: '',
    description: '',
    category: '',
    unit: 'piece',
    unit_price: '',
    min_order_qty: '1',
    lead_time_days: '',
    image_url: '',
    is_available: true,
    notes: '',
  };
}

type FormState = ReturnType<typeof emptyForm>;

export default function SupplierCatalog() {
  const { profile } = useAuth();
  const supplierId = profile?.supplier_id;

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CatalogItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const fetchItems = useCallback(async () => {
    if (!supplierId) return;
    const { data, error } = await supabase
      .from('supplier_catalog')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });
    if (error) { toast.error('Failed to load catalog'); return; }
    setItems(data || []);
    setLoading(false);
  }, [supplierId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filtered = items.filter(item => {
    const q = search.toLowerCase();
    const matchSearch = !q || item.name.toLowerCase().includes(q) || (item.category || '').toLowerCase().includes(q);
    const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const openAdd = () => {
    setEditing(null);
    setImageFile(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (item: CatalogItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description || '',
      category: item.category || '',
      unit: item.unit,
      unit_price: String(item.unit_price),
      min_order_qty: String(item.min_order_qty),
      lead_time_days: item.lead_time_days != null ? String(item.lead_time_days) : '',
      image_url: item.image_url || '',
      is_available: item.is_available,
      notes: item.notes || '',
    });
    setImageFile(null);
    setFormOpen(true);
  };
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) return;
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.unit_price || isNaN(Number(form.unit_price))) { toast.error('Enter a valid unit price'); return; }
const { data: authData } = await supabase.auth.getUser();

console.log("Logged user:", authData.user);
    setSubmitting(true);
    let imageUrl = editing?.image_url || null;

if (imageFile) {
  const fileExt = imageFile.name.split(".").pop();
  const fileName = `${supplierId}/${Date.now()}.${fileExt}`;
  const { data: sessionData } = await supabase.auth.getSession();
  console.log("SESSION USER:", sessionData.session?.user);
console.log("HAS TOKEN:", !!sessionData.session?.access_token);


  const { error: uploadError } = await supabase.storage
    .from("catalog-images")
    .upload(fileName, imageFile, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    console.log("UPLOAD ERROR:", uploadError);
  toast.error(JSON.stringify(uploadError));
    setSubmitting(false);
    toast.error(uploadError.message);
    return;
  }

  const { data } = supabase.storage
    .from("catalog-images")
    .getPublicUrl(fileName);

  imageUrl = data.publicUrl;
}
    const payload = {
      supplier_id: supplierId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category || null,
      unit: form.unit,
      unit_price: Number(form.unit_price),
      min_order_qty: Number(form.min_order_qty) || 1,
      lead_time_days: form.lead_time_days ? Number(form.lead_time_days) : null,
      is_available: form.is_available,
      image_url: imageUrl,
      notes: form.notes.trim() || null,
    };

    if (editing) {
      const { error } = await supabase.from('supplier_catalog').update(payload).eq('id', editing.id);
      setSubmitting(false);
      if (error) { toast.error(error.message); return; }
      toast.success('Item updated');
    } else {
      const { error } = await supabase.from('supplier_catalog').insert(payload);
      setSubmitting(false);
      if (error) { toast.error(error.message); return; }
      toast.success('Item added to your catalog');
    }
    setImageFile(null);
    setFormOpen(false);
    fetchItems();
  };

  const toggleAvailability = async (item: CatalogItem) => {
    const { error } = await supabase
      .from('supplier_catalog')
      .update({ is_available: !item.is_available })
      .eq('id', item.id);
    if (error) { toast.error(error.message); return; }
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: !i.is_available } : i));
    toast.success(item.is_available ? 'Marked as unavailable' : 'Marked as available');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('supplier_catalog').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Item removed from catalog');
    setItems(prev => prev.filter(i => i.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <DashboardShell>
      <PageHeader
        title="My Catalog"
        description="Showcase the products and materials you can supply to the platform"
        action={
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        }
      />

      {/* Info banner */}
      <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground/80">
        <p className="font-medium text-foreground">How this works</p>
        <p className="mt-1">
          Add the products or materials you can supply below. The admin will browse your catalog when creating
          purchase requests. Keep your prices, lead times, and availability up to date so the admin can make
          informed decisions.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/40">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Inbox className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-base font-medium">
              {search || categoryFilter !== 'all' ? 'No items match your filters' : 'Your catalog is empty'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {search || categoryFilter !== 'all'
                ? 'Try adjusting your search or filter.'
                : 'Add your first item so the admin can see what you offer.'}
            </p>
            {!search && categoryFilter === 'all' && (
              <Button onClick={openAdd} className="mt-4 gap-2"><Plus className="h-4 w-4" /> Add First Item</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(item => (
            <Card key={item.id} className="border-border/40 flex flex-col overflow-hidden">
              {item.image_url && (
                <div className="h-40 w-full overflow-hidden bg-muted">
                  <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                </div>
              )}
              {!item.image_url && (
                <div className="flex h-24 items-center justify-center bg-primary/5">
                  <Package className="h-10 w-10 text-primary/30" />
                </div>
              )}
              <CardContent className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{item.name}</p>
                    {item.category && <p className="text-xs text-muted-foreground">{item.category}</p>}
                  </div>
                  <Badge variant={item.is_available ? 'success' : 'secondary'} className="shrink-0">
                    {item.is_available ? 'Available' : 'Unavailable'}
                  </Badge>
                </div>

                {item.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                )}

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground">Unit Price</p>
                    <p className="font-semibold text-primary">{formatCurrency(item.unit_price)} / {item.unit}</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground">Min Order</p>
                    <p className="font-semibold">{item.min_order_qty} {item.unit}</p>
                  </div>
                  {item.lead_time_days != null && (
                    <div className="col-span-2 rounded-md bg-muted/50 p-2">
                      <p className="text-xs text-muted-foreground">Lead Time</p>
                      <p className="font-semibold">{item.lead_time_days} day{item.lead_time_days !== 1 ? 's' : ''}</p>
                    </div>
                  )}
                </div>

                {item.notes && (
                  <p className="text-xs text-muted-foreground border-t border-border/40 pt-2">{item.notes}</p>
                )}

                <div className="mt-auto flex items-center justify-between pt-2 border-t border-border/40">
                  <button
                    onClick={() => toggleAvailability(item)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.is_available
                      ? <ToggleRight className="h-4 w-4 text-success" />
                      : <ToggleLeft className="h-4 w-4" />}
                    {item.is_available ? 'Mark unavailable' : 'Mark available'}
                  </button>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)} aria-label="Edit item">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(item)} aria-label="Delete item" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Showing {filtered.length} of {items.length} item{items.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={open => { if (!submitting) setFormOpen(open); }}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Catalog Item' : 'Add Catalog Item'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the details for this item.' : 'Add a product or material you can supply.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cat-name">Name <span className="text-destructive">*</span></Label>
                <Input id="cat-name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Corrugated Cardboard Box" required />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={v => setForm(p => ({ ...p, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-price">Unit Price <span className="text-destructive">*</span></Label>
                <Input id="cat-price" type="number" min={0} step={0.01} value={form.unit_price} onChange={e => setForm(p => ({ ...p, unit_price: e.target.value }))} placeholder="0.00" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-moq">Min. Order Qty</Label>
                <Input id="cat-moq" type="number" min={1} step={1} value={form.min_order_qty} onChange={e => setForm(p => ({ ...p, min_order_qty: e.target.value }))} placeholder="1" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-lead">Lead Time (days)</Label>
                <Input id="cat-lead" type="number" min={0} step={1} value={form.lead_time_days} onChange={e => setForm(p => ({ ...p, lead_time_days: e.target.value }))} placeholder="e.g. 7" />
              </div>
              <div className="space-y-1.5">
               <div className="space-y-2">
                <Label htmlFor="cat-img">Product Image</Label>

                 <Input
                  id="cat-img"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImageFile(file);
                   }}
                  />
               </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cat-desc">Description</Label>
                <Textarea id="cat-desc" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the product, material, quality specs..." />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cat-notes">Notes for Admin</Label>
                <Textarea id="cat-notes" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any special terms, certifications, packaging details..." />
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <Switch id="cat-avail" checked={form.is_available} onCheckedChange={v => setForm(p => ({ ...p, is_available: v }))} />
                <Label htmlFor="cat-avail" className="cursor-pointer">
                  Currently available
                  <span className="ml-1 text-xs text-muted-foreground">(admin can see and order this item)</span>
                </Label>
              </div>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Add to Catalog'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <span className="font-medium text-foreground">{deleteTarget?.name}</span> from your catalog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={e => { e.preventDefault(); handleDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  );
}
