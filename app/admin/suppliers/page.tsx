'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Star,
  Factory,
  Building2,
  Truck,
  Package,
  Mail,
  Phone,
  Globe,
  MapPin,
  Users,
  Loader2,
  X,
  UserPlus,
  BookOpen,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Card, CardContent } from '@/app/components/ui/card';
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
import { statusColors, formatCurrency } from '@/app/lib/types/ui';
import type { Supplier, SupplierType } from '@/app/lib/types/database';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/app/components/ui/sheet';
import { ScrollArea } from '@/app/components/ui/scroll-area';

interface CatalogItem {
  id: string;
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
}

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const SUPPLIER_TYPES: { value: SupplierType; label: string; icon: typeof Factory }[] = [
  { value: 'manufacturer', label: 'Manufacturer', icon: Factory },
  { value: 'factory', label: 'Factory', icon: Building2 },
  { value: 'supplier', label: 'Supplier', icon: Package },
  { value: 'distributor', label: 'Distributor', icon: Truck },
];

const SUPPLIER_STATUSES = ['active', 'inactive', 'blacklisted'] as const;
type SupplierStatus = (typeof SUPPLIER_STATUSES)[number];

const PAYMENT_METHOD_OPTIONS = [
  'bank_transfer',
  'mobile_money',
  'cash',
  'credit',
  'invoice',
] as const;

const SUPPLIER_TYPE_ICONS: Record<SupplierType, typeof Factory> = {
  manufacturer: Factory,
  factory: Building2,
  supplier: Package,
  distributor: Truck,
};

function emptyForm(): SupplierFormState {
  return {
    name: '',
    company_name: '',
    type: 'supplier',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    tax_id: '',
    rating: 0,
    status: 'active',
    payment_methods: [],
    notes: '',
  };
}

interface SupplierFormState {
  name: string;
  company_name: string;
  type: SupplierType;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  tax_id: string;
  rating: number;
  status: SupplierStatus;
  payment_methods: string[];
  notes: string;
}

type FormErrors = Partial<Record<keyof SupplierFormState, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s\-()]{7,20}$/;

function validate(form: SupplierFormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) {
    errors.name = 'Name is required';
  } else if (form.name.trim().length > 120) {
    errors.name = 'Name must be 120 characters or fewer';
  }

  if (form.email && !EMAIL_RE.test(form.email.trim())) {
    errors.email = 'Enter a valid email address';
  }

  if (form.phone && !PHONE_RE.test(form.phone.trim())) {
    errors.phone = 'Enter a valid phone number';
  }

  if (form.website) {
    try {
      // Allow URLs with or without a protocol.
      const url = form.website.startsWith('http') ? form.website : `https://${form.website}`;
      // eslint-disable-next-line no-new
      new URL(url);
    } catch {
      errors.website = 'Enter a valid website URL';
    }
  }

  if (form.rating === null || form.rating === undefined || Number.isNaN(form.rating)) {
    errors.rating = 'Rating is required';
  } else if (form.rating < 0 || form.rating > 5) {
    errors.rating = 'Rating must be between 0 and 5';
  }

  if (!SUPPLIER_TYPES.some((t) => t.value === form.type)) {
    errors.type = 'Select a supplier type';
  }

  if (!SUPPLIER_STATUSES.includes(form.status)) {
    errors.status = 'Select a status';
  }

  if (form.tax_id && form.tax_id.length > 50) {
    errors.tax_id = 'Tax ID must be 50 characters or fewer';
  }

  return errors;
}

function StarRating({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
  const dimension = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.25 && value - full < 0.75;
  const rounded = value - full >= 0.75 ? full + 1 : full;

  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating: ${value} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const isFull = i < rounded;
        const isHalf = i === full && hasHalf;
        return (
          <span key={i} className="relative inline-flex">
            <Star className={`${dimension} text-muted-foreground/30`} />
            {(isFull || isHalf) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: isHalf ? '50%' : '100%' }}
              >
                <Star className={`${dimension} fill-amber-400 text-amber-400`} />
              </span>
            )}
          </span>
        );
      })}
      <span className="ml-1 text-xs text-muted-foreground">{value.toFixed(1)}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierFormState>(emptyForm());
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [accountTarget, setAccountTarget] = useState<Supplier | null>(null);
  const [accountForm, setAccountForm] = useState({ email: '', password: '', fullName: '' });
  const [accountSubmitting, setAccountSubmitting] = useState(false);

  const [catalogSupplier, setCatalogSupplier] = useState<Supplier | null>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const openCatalog = async (supplier: Supplier) => {
    setCatalogSupplier(supplier);
    setCatalogLoading(true);
    const { data } = await supabase
      .from('supplier_catalog')
      .select('*')
      .eq('supplier_id', supplier.id)
      .order('created_at', { ascending: false });
    setCatalogItems(data || []);
    setCatalogLoading(false);
  };

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load suppliers', { description: error.message });
      setSuppliers([]);
    } else {
      setSuppliers((data as Supplier[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter((s) => {
      const matchesSearch =
        !q ||
        (s.name || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.company_name || '').toLowerCase().includes(q);
      const matchesType = typeFilter === 'all' || s.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [suppliers, search, typeFilter, statusFilter]);

  const openAdd = () => {
    setEditingSupplier(null);
    setForm(emptyForm());
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name || '',
      company_name: supplier.company_name || '',
      type: supplier.type,
      email: supplier.email || '',
      phone: supplier.phone || '',
      website: supplier.website || '',
      address: supplier.address || '',
      city: supplier.city || '',
      state: supplier.state || '',
      country: supplier.country || '',
      postal_code: supplier.postal_code || '',
      tax_id: supplier.tax_id || '',
      rating: supplier.rating ?? 0,
      status: supplier.status,
      payment_methods: supplier.payment_methods || [],
      notes: supplier.notes || '',
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const closeForm = () => {
    if (submitting) return;
    setFormOpen(false);
    setFormErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate(form);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Please fix the highlighted fields');
      return;
    }

    setSubmitting(true);
    const payload = {
      name: form.name.trim(),
      company_name: form.company_name.trim() || null,
      type: form.type,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      website: form.website.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      country: form.country.trim() || null,
      postal_code: form.postal_code.trim() || null,
      tax_id: form.tax_id.trim() || null,
      rating: Number(form.rating),
      status: form.status,
      payment_methods: form.payment_methods,
      notes: form.notes.trim() || null,
    };

    if (editingSupplier) {
      const { error } = await supabase
        .from('suppliers')
        .update(payload)
        .eq('id', editingSupplier.id);
      setSubmitting(false);
      if (error) {
        toast.error('Failed to update supplier', { description: error.message });
        return;
      }
      toast.success('Supplier updated successfully');
      setFormOpen(false);
      await fetchSuppliers();
    } else {
      const { error } = await supabase.from('suppliers').insert(payload);
      setSubmitting(false);
      if (error) {
        toast.error('Failed to create supplier', { description: error.message });
        return;
      }
      toast.success('Supplier created successfully');
      setFormOpen(false);
      await fetchSuppliers();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('suppliers').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast.error('Failed to delete supplier', { description: error.message });
      return;
    }
    toast.success('Supplier deleted successfully');
    setSuppliers((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const openAccountDialog = (supplier: Supplier) => {
    setAccountTarget(supplier);
    setAccountForm({
      email: supplier.email || '',
      password: '',
      fullName: supplier.name || '',
    });
  };

  const closeAccountDialog = () => {
    if (accountSubmitting) return;
    setAccountTarget(null);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountTarget) return;
    if (!accountForm.email.trim() || !accountForm.password || !accountForm.fullName.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    if (accountForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setAccountSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-supplier-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({
            email: accountForm.email.trim(),
            password: accountForm.password,
            fullName: accountForm.fullName.trim(),
            supplierId: accountTarget.id,
          }),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || 'Failed to create supplier account');
      } else {
        toast.success(result.message || 'Supplier account created successfully');
        setAccountTarget(null);
      }
    } catch {
      toast.error('Failed to create supplier account');
    }
    setAccountSubmitting(false);
  };

  const togglePaymentMethod = (method: string, checked: boolean) => {
    setForm((prev) => {
      const set = new Set(prev.payment_methods);
      if (checked) set.add(method);
      else set.delete(method);
      return { ...prev, payment_methods: Array.from(set) };
    });
  };

  const hasActiveFilters = search || typeFilter !== 'all' || statusFilter !== 'all';

  return (
    <DashboardShell>
      <PageHeader
        title="Suppliers"
        description="Manage your supplier and distribution partner network"
        action={
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Supplier
          </Button>
        }
      />

      {/* Filters */}
      <Card className="mb-4 border-border/40">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, company, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {SUPPLIER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {SUPPLIER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSearch('');
                    setTypeFilter('all');
                    setStatusFilter('all');
                  }}
                  aria-label="Clear filters"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table / states */}
      <Card className="border-border/40">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="ml-auto h-8 w-20" />
                  </div>
                ))}
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Factory className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-base font-semibold">
                {hasActiveFilters ? 'No suppliers match your filters' : 'No suppliers yet'}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {hasActiveFilters
                  ? 'Try adjusting your search or filter criteria to find what you are looking for.'
                  : 'Get started by adding your first supplier to the network.'}
              </p>
              {hasActiveFilters ? (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearch('');
                    setTypeFilter('all');
                    setStatusFilter('all');
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button onClick={openAdd} className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Add Supplier
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((supplier) => {
              const TypeIcon = SUPPLIER_TYPE_ICONS[supplier.type] || Package;
              return (
                <TableRow key={supplier.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <TypeIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{supplier.name}</p>
                        {supplier.company_name && (
                          <p className="truncate text-xs text-muted-foreground">
                            {supplier.company_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {supplier.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {supplier.email ? (
                      <a
                        href={`mailto:${supplier.email}`}
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate">{supplier.email}</span>
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {supplier.phone ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        {supplier.phone}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {supplier.city ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {supplier.city}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StarRating value={supplier.rating ?? 0} />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusColors[supplier.status] || 'secondary'}
                      className="capitalize"
                    >
                      {supplier.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openCatalog(supplier)}
                        aria-label={`View catalog for ${supplier.name}`}
                        title="View supplier catalog"
                      >
                        <BookOpen className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openAccountDialog(supplier)}
                        aria-label={`Create login account for ${supplier.name}`}
                        title="Create login account"
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(supplier)}
                        aria-label={`Edit ${supplier.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(supplier)}
                        aria-label={`Delete ${supplier.name}`}
                        className="text-destructive hover:text-destructive"
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

      {!loading && filtered.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Showing {filtered.length} of {suppliers.length} supplier{suppliers.length === 1 ? '' : 's'}
        </p>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
            <DialogDescription>
              {editingSupplier
                ? 'Update the supplier details below. Required fields are marked with *.'
                : 'Fill in the supplier details below. Required fields are marked with *.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic info */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground">Basic Information</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Acme Industries"
                    aria-invalid={!!formErrors.name}
                  />
                  {formErrors.name && (
                    <p className="text-xs text-destructive">{formErrors.name}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    value={form.company_name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, company_name: e.target.value }))
                    }
                    placeholder="Acme Industries Ltd."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="type">
                    Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => setForm((p) => ({ ...p, type: v as SupplierType }))}
                  >
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPLIER_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.type && (
                    <p className="text-xs text-destructive">{formErrors.type}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="status">
                    Status <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, status: v as SupplierStatus }))
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPLIER_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.status && (
                    <p className="text-xs text-destructive">{formErrors.status}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground">Contact</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="contact@company.com"
                    aria-invalid={!!formErrors.email}
                  />
                  {formErrors.email && (
                    <p className="text-xs text-destructive">{formErrors.email}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+251 91 234 5678"
                    aria-invalid={!!formErrors.phone}
                  />
                  {formErrors.phone && (
                    <p className="text-xs text-destructive">{formErrors.phone}</p>
                  )}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={form.website}
                    onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                    placeholder="https://acme.com"
                    aria-invalid={!!formErrors.website}
                  />
                  {formErrors.website && (
                    <p className="text-xs text-destructive">{formErrors.website}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground">Address</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                    placeholder="123 Industrial Park Rd"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                    placeholder="Addis Ababa"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">State / Province</Label>
                  <Input
                    id="state"
                    value={form.state}
                    onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                    placeholder="Addis Ababa"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={form.country}
                    onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                    placeholder="Ethiopia"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={form.postal_code}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, postal_code: e.target.value }))
                    }
                    placeholder="1000"
                  />
                </div>
              </div>
            </div>

            {/* Business */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground">Business Details</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tax_id">Tax ID</Label>
                  <Input
                    id="tax_id"
                    value={form.tax_id}
                    onChange={(e) => setForm((p) => ({ ...p, tax_id: e.target.value }))}
                    placeholder="XX-XXXXXXX"
                    aria-invalid={!!formErrors.tax_id}
                  />
                  {formErrors.tax_id && (
                    <p className="text-xs text-destructive">{formErrors.tax_id}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rating">
                    Rating (0–5) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="rating"
                    type="number"
                    min={0}
                    max={5}
                    step={0.5}
                    value={form.rating}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, rating: parseFloat(e.target.value) || 0 }))
                    }
                    aria-invalid={!!formErrors.rating}
                  />
                  {formErrors.rating && (
                    <p className="text-xs text-destructive">{formErrors.rating}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Methods</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PAYMENT_METHOD_OPTIONS.map((method) => {
                    const checked = form.payment_methods.includes(method);
                    return (
                      <label
                        key={method}
                        htmlFor={`pm-${method}`}
                        className="flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-accent"
                      >
                        <Checkbox
                          id={`pm-${method}`}
                          checked={checked}
                          onCheckedChange={(c) => togglePaymentMethod(method, c === true)}
                        />
                        <span className="capitalize">
                          {method.replace(/_/g, ' ')}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Internal notes about this supplier..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeForm} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingSupplier ? 'Save Changes' : 'Create Supplier'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create supplier account dialog */}
      <Dialog open={!!accountTarget} onOpenChange={(o) => !o && closeAccountDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Supplier Login Account</DialogTitle>
            <DialogDescription>
              Create a login account for <span className="font-medium text-foreground">{accountTarget?.name}</span>. The supplier will use these credentials to sign in and access the supplier portal.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="account-name">Full Name</Label>
              <Input
                id="account-name"
                value={accountForm.fullName}
                onChange={(e) => setAccountForm((p) => ({ ...p, fullName: e.target.value }))}
                placeholder="Supplier contact name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-email">Email</Label>
              <Input
                id="account-email"
                type="email"
                value={accountForm.email}
                onChange={(e) => setAccountForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="contact@company.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-password">Temporary Password</Label>
              <Input
                id="account-password"
                type="password"
                value={accountForm.password}
                onChange={(e) => setAccountForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="At least 6 characters"
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                The supplier can change this password after their first login.
              </p>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeAccountDialog} disabled={accountSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={accountSubmitting}>
                {accountSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Supplier Catalog Sheet */}
      <Sheet open={!!catalogSupplier} onOpenChange={o => !o && setCatalogSupplier(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
          <SheetHeader className="p-6 pb-4 border-b border-border/40">
            <SheetTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {catalogSupplier?.name} — Catalog
            </SheetTitle>
            <SheetDescription>
              Products and materials this supplier can supply
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1">
            <div className="p-6">
              {catalogLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                </div>
              ) : catalogItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Package className="h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 font-medium">No catalog items yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">This supplier hasn't added any products to their catalog.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{catalogItems.length} item{catalogItems.length !== 1 ? 's' : ''} listed</p>
                  {catalogItems.map(item => (
                    <Card key={item.id} className="border-border/40">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {item.image_url && (
                            <img src={item.image_url} alt={item.name} className="h-16 w-16 rounded-lg object-cover shrink-0" />
                          )}
                          {!item.image_url && (
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              <Package className="h-7 w-7 text-primary/40" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold">{item.name}</p>
                                {item.category && <p className="text-xs text-muted-foreground">{item.category}</p>}
                              </div>
                              <Badge variant={item.is_available ? 'success' : 'secondary'} className="shrink-0">
                                {item.is_available ? (
                                  <><CheckCircle2 className="mr-1 h-3 w-3" />Available</>
                                ) : 'Unavailable'}
                              </Badge>
                            </div>
                            {item.description && (
                              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                                {formatCurrency(item.unit_price)} / {item.unit}
                              </span>
                              <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                                Min order: {item.min_order_qty} {item.unit}
                              </span>
                              {item.lead_time_days != null && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />{item.lead_time_days}d lead time
                                </span>
                              )}
                            </div>
                            {item.notes && (
                              <p className="mt-2 text-xs text-muted-foreground border-t border-border/40 pt-2 italic">{item.notes}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <span className="font-medium text-foreground">{deleteTarget?.name}</span>. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
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
