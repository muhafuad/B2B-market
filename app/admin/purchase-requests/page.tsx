'use client';

import React from 'react';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ClipboardList,
  Eye,
  Loader2,
  X,
  Calendar,
  Package,
  FileText,
  ChevronDown,
  ChevronUp,
  Quote,
} from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Separator } from '@/app/components/ui/separator';
import { ScrollArea } from '@/app/components/ui/scroll-area';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { supabase } from '@/app/lib/supabase/client';
import { formatCurrency, formatDate, formatDateTime, statusColors } from '@/app/lib/types/ui';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PurchaseRequest {
  id: string;
  request_number: string;
  title: string;
  description: string | null;
  supplier_id: string | null;
  status:
    | 'draft'
    | 'sent'
    | 'accepted'
    | 'rejected'
    | 'quoted'
    | 'ordered'
    | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  expected_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface PurchaseRequestItem {
  id: string;
  purchase_request_id: string;
  product_name: string;
  description: string | null;
  quantity: number;
  unit: string;
  created_at: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface SupplierQuote {
  id: string;
  purchase_request_id: string;
  supplier_id: string | null;
  status: string | null;
  price: number | null;
  quantity: number | null;
  unit: string | null;
  estimated_delivery_date: string | null;
  comments: string | null;
  created_at: string;
}

interface PurchaseRequestWithSupplier extends PurchaseRequest {
  supplier: Pick<Supplier, 'id' | 'name'> | null;
}

interface ItemFormState {
  product_name: string;
  description: string;
  quantity: string;
  unit: string;
}

interface FormState {
  title: string;
  description: string;
  supplier_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  expected_date: string;
  items: ItemFormState[];
}

type FormErrors = Partial<
  Record<keyof Omit<FormState, 'items'>, string> & { items: string }
>;

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const STATUSES = [
  'draft',
  'sent',
  'accepted',
  'rejected',
  'quoted',
  'ordered',
  'cancelled',
] as const;
type RequestStatus = (typeof STATUSES)[number];

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
type Priority = (typeof PRIORITIES)[number];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const STATUS_OPTIONS: { value: RequestStatus; label: string }[] = STATUSES.map(
  (s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })
);

function emptyItem(): ItemFormState {
  return { product_name: '', description: '', quantity: '', unit: 'pcs' };
}

function emptyForm(): FormState {
  return {
    title: '',
    description: '',
    supplier_id: '',
    priority: 'medium',
    expected_date: '',
    items: [emptyItem()],
  };
}

function generateRequestNumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(1000 + Math.random() * 9000));
  return `PR-${year}-${seq}`;
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.title.trim()) {
    errors.title = 'Title is required';
  } else if (form.title.trim().length > 200) {
    errors.title = 'Title must be 200 characters or fewer';
  }

  if (!form.supplier_id) {
    errors.supplier_id = 'Please select a supplier';
  }

  if (!form.expected_date) {
    errors.expected_date = 'Expected date is required';
  } else {
    const d = new Date(form.expected_date);
    if (Number.isNaN(d.getTime())) {
      errors.expected_date = 'Enter a valid date';
    }
  }

  if (!PRIORITIES.includes(form.priority)) {
    errors.priority = 'Select a priority';
  }

  // Validate items
  const validItems = form.items.filter(
    (it) => it.product_name.trim() || it.quantity.trim()
  );
  if (validItems.length === 0) {
    errors.items = 'Add at least one item';
  } else {
    for (const it of validItems) {
      if (!it.product_name.trim()) {
        errors.items = 'Each item needs a product name';
        break;
      }
      const qty = Number(it.quantity);
      if (!it.quantity.trim() || Number.isNaN(qty) || qty <= 0) {
        errors.items = 'Each item needs a valid quantity';
        break;
      }
      if (!it.unit.trim()) {
        errors.items = 'Each item needs a unit';
        break;
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PurchaseRequestsPage() {
  const [requests, setRequests] = useState<PurchaseRequestWithSupplier[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Create / Edit form
  const [formOpen, setFormOpen] = useState(false);
  const [editingRequest, setEditingRequest] =
    useState<PurchaseRequestWithSupplier | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Detail dialog
  const [detailTarget, setDetailTarget] =
    useState<PurchaseRequestWithSupplier | null>(null);
  const [detailItems, setDetailItems] = useState<PurchaseRequestItem[]>([]);
  const [detailQuotes, setDetailQuotes] = useState<SupplierQuote[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [rowItems, setRowItems] = useState<Record<string, PurchaseRequestItem[]>>(
    {}
  );
  const [rowQuotes, setRowQuotes] = useState<Record<string, SupplierQuote[]>>({});

  // Delete
  const [deleteTarget, setDeleteTarget] =
    useState<PurchaseRequestWithSupplier | null>(null);
  const [deleting, setDeleting] = useState(false);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('purchase_requests')
      .select('*, supplier:suppliers(id, name)')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load purchase requests', { description: error.message });
      setRequests([]);
    } else {
      setRequests((data as PurchaseRequestWithSupplier[]) || []);
    }
    setLoading(false);
  }, []);

  const fetchSuppliers = useCallback(async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      toast.error('Failed to load suppliers', { description: error.message });
      setSuppliers([]);
    } else {
      setSuppliers((data as Supplier[]) || []);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchSuppliers();
  }, [fetchRequests, fetchSuppliers]);

  const fetchRowDetails = useCallback(async (id: string) => {
    const [itemsRes, quotesRes] = await Promise.all([
      supabase
        .from('purchase_request_items')
        .select('*')
        .eq('purchase_request_id', id)
        .order('created_at', { ascending: true }),
      supabase
        .from('supplier_quotes')
        .select('*')
        .eq('purchase_request_id', id)
        .order('created_at', { ascending: false }),
    ]);

    setRowItems((prev) => ({
      ...prev,
      [id]: (itemsRes.data as PurchaseRequestItem[]) || [],
    }));
    setRowQuotes((prev) => ({
      ...prev,
      [id]: (quotesRes.data as SupplierQuote[]) || [],
    }));
  }, []);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (!rowItems[id] && !rowQuotes[id]) {
          fetchRowDetails(id);
        }
      }
      return next;
    });
  };

  // -------------------------------------------------------------------------
  // Filtering
  // -------------------------------------------------------------------------

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      const matchesSearch =
        !q ||
        (r.title || '').toLowerCase().includes(q) ||
        (r.request_number || '').toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'all' || r.status === statusFilter;
      const matchesPriority =
        priorityFilter === 'all' || r.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [requests, search, statusFilter, priorityFilter]);

  const hasActiveFilters =
    search || statusFilter !== 'all' || priorityFilter !== 'all';

  // -------------------------------------------------------------------------
  // Form handlers
  // -------------------------------------------------------------------------

  const openAdd = () => {
    setEditingRequest(null);
    setForm(emptyForm());
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (req: PurchaseRequestWithSupplier) => {
    setEditingRequest(req);
    // Load existing items into the form
    (async () => {
      const { data } = await supabase
        .from('purchase_request_items')
        .select('*')
        .eq('purchase_request_id', req.id)
        .order('created_at', { ascending: true });

      const items: ItemFormState[] =
        (data as PurchaseRequestItem[])?.map((it) => ({
          product_name: it.product_name || '',
          description: it.description || '',
          quantity: String(it.quantity ?? ''),
          unit: it.unit || 'pcs',
        })) || [];

      setForm({
        title: req.title || '',
        description: req.description || '',
        supplier_id: req.supplier_id || '',
        priority: req.priority,
        expected_date: req.expected_date ? req.expected_date.split('T')[0] : '',
        items: items.length > 0 ? items : [emptyItem()],
      });
      setFormErrors({});
      setFormOpen(true);
    })();
  };

  const closeForm = () => {
    if (submitting) return;
    setFormOpen(false);
    setFormErrors({});
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  };

  const removeItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items:
        prev.items.length > 1
          ? prev.items.filter((_, i) => i !== index)
          : prev.items,
    }));
  };

  const updateItem = (
    index: number,
    field: keyof ItemFormState,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it, i) => (i === index ? { ...it, [field]: value } : it)),
    }));
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

    const basePayload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      supplier_id: form.supplier_id,
      priority: form.priority,
      expected_date: form.expected_date
        ? new Date(form.expected_date).toISOString()
        : null,
    };

    if (editingRequest) {
      // Update the purchase request
      const { error: updateError } = await supabase
        .from('purchase_requests')
        .update(basePayload)
        .eq('id', editingRequest.id);

      if (updateError) {
        setSubmitting(false);
        toast.error('Failed to update purchase request', {
          description: updateError.message,
        });
        return;
      }

      // Replace items: delete existing, then insert new
      const { error: deleteItemsError } = await supabase
        .from('purchase_request_items')
        .delete()
        .eq('purchase_request_id', editingRequest.id);

      if (deleteItemsError) {
        setSubmitting(false);
        toast.error('Failed to update items', {
          description: deleteItemsError.message,
        });
        return;
      }

      const itemsToInsert = form.items
        .filter((it) => it.product_name.trim())
        .map((it) => ({
          purchase_request_id: editingRequest.id,
          product_name: it.product_name.trim(),
          description: it.description.trim() || null,
          quantity: Number(it.quantity),
          unit: it.unit.trim() || 'pcs',
        }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('purchase_request_items')
          .insert(itemsToInsert);
        if (itemsError) {
          setSubmitting(false);
          toast.error('Failed to insert items', {
            description: itemsError.message,
          });
          return;
        }
      }

      setSubmitting(false);
      toast.success('Purchase request updated successfully');
      setFormOpen(false);
      await fetchRequests();
      // Refresh expanded row details if open
      if (expandedRows.has(editingRequest.id)) {
        fetchRowDetails(editingRequest.id);
      }
    } else {
      // Create new purchase request
      const requestNumber = generateRequestNumber();
      const insertPayload = {
        ...basePayload,
        request_number: requestNumber,
        status: 'sent' as const,
      };

      const { data: created, error: createError } = await supabase
        .from('purchase_requests')
        .insert(insertPayload)
        .select('id')
        .single();

      if (createError || !created) {
        setSubmitting(false);
        toast.error('Failed to create purchase request', {
          description: createError?.message,
        });
        return;
      }

      const itemsToInsert = form.items
        .filter((it) => it.product_name.trim())
        .map((it) => ({
          purchase_request_id: created.id,
          product_name: it.product_name.trim(),
          description: it.description.trim() || null,
          quantity: Number(it.quantity),
          unit: it.unit.trim() || 'pcs',
        }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('purchase_request_items')
          .insert(itemsToInsert);
        if (itemsError) {
          setSubmitting(false);
          toast.error('Failed to insert items', {
            description: itemsError.message,
          });
          return;
        }
      }

      setSubmitting(false);
      toast.success('Purchase request created successfully', {
        description: `Request ${requestNumber} sent to supplier`,
      });
      setFormOpen(false);
      await fetchRequests();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    // Delete items first (in case of FK constraints)
    await supabase
      .from('purchase_request_items')
      .delete()
      .eq('purchase_request_id', deleteTarget.id);

    // Delete quotes
    await supabase
      .from('supplier_quotes')
      .delete()
      .eq('purchase_request_id', deleteTarget.id);

    const { error } = await supabase
      .from('purchase_requests')
      .delete()
      .eq('id', deleteTarget.id);

    setDeleting(false);
    if (error) {
      toast.error('Failed to delete purchase request', {
        description: error.message,
      });
      return;
    }
    toast.success('Purchase request deleted successfully');
    setRequests((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    setRowItems((prev) => {
      const next = { ...prev };
      delete next[deleteTarget.id];
      return next;
    });
    setRowQuotes((prev) => {
      const next = { ...prev };
      delete next[deleteTarget.id];
      return next;
    });
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.delete(deleteTarget.id);
      return next;
    });
    setDeleteTarget(null);
  };

  const openDetail = async (req: PurchaseRequestWithSupplier) => {
    setDetailTarget(req);
    setDetailItems([]);
    setDetailQuotes([]);
    setDetailLoading(true);
    const [itemsRes, quotesRes] = await Promise.all([
      supabase
        .from('purchase_request_items')
        .select('*')
        .eq('purchase_request_id', req.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('supplier_quotes')
        .select('*')
        .eq('purchase_request_id', req.id)
        .order('created_at', { ascending: false }),
    ]);
    setDetailItems((itemsRes.data as PurchaseRequestItem[]) || []);
    setDetailQuotes((quotesRes.data as SupplierQuote[]) || []);
    setDetailLoading(false);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPriorityFilter('all');
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <DashboardShell>
      <PageHeader
        title="Purchase Requests"
        description="Create and manage purchase requests sent to suppliers"
        action={
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Purchase Request
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
                placeholder="Search by title or request number..."
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="capitalize">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="capitalize">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearFilters}
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
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="ml-auto h-8 w-20" />
                  </div>
                ))}
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <ClipboardList className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-base font-semibold">
                {hasActiveFilters
                  ? 'No purchase requests match your filters'
                  : 'No purchase requests yet'}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {hasActiveFilters
                  ? 'Try adjusting your search or filter criteria to find what you are looking for.'
                  : 'Create your first purchase request to send to a supplier.'}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button onClick={openAdd} className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Create Purchase Request
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]" />
                  <TableHead>Request #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((req) => {
                  const isExpanded = expandedRows.has(req.id);
                  const items = rowItems[req.id];
                  const quotes = rowQuotes[req.id];
                  return (
                    
                      <React.Fragment key={req.id}>
                      <TableRow >
                        <TableCell className="p-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleRow(req.id)}
                            aria-label="Toggle details"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs font-medium">
                            {req.request_number}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{req.title}</p>
                            {req.description && (
                              <p className="truncate text-xs text-muted-foreground">
                                {req.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {req.supplier ? (
                            <span className="text-sm">{req.supplier.name}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusColors[req.priority] || 'secondary'}
                            className="capitalize"
                          >
                            {req.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusColors[req.status] || 'default'}
                            className="capitalize"
                          >
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(req.expected_date)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(req.created_at)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label="Actions"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                className="gap-2"
                                onClick={() => openDetail(req)}
                              >
                                <Eye className="h-4 w-4" />
                                View details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2"
                                onClick={() => openEdit(req)}
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="gap-2 text-destructive"
                                onClick={() => setDeleteTarget(req)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      
                      {isExpanded && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={9} className="p-4">
                            {items === undefined && quotes === undefined ? (
                              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading details...
                              </div>
                            ) : (
                              <div className="grid gap-4 md:grid-cols-2">
                                {/* Items */}
                                <div>
                                  <div className="mb-2 flex items-center gap-2">
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="text-sm font-semibold">
                                      Items
                                      {items && items.length > 0 && (
                                        <span className="ml-1 text-muted-foreground">
                                          ({items.length})
                                        </span>
                                      )}
                                    </h4>
                                  </div>
                                  {items && items.length > 0 ? (
                                    <div className="space-y-2">
                                      {items.map((it) => (
                                        <div
                                          key={it.id}
                                          className="rounded-lg border border-border/40 bg-background p-3"
                                        >
                                          <p className="text-sm font-medium">
                                            {it.product_name}
                                          </p>
                                          {it.description && (
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                              {it.description}
                                            </p>
                                          )}
                                          <p className="mt-1 text-xs text-muted-foreground">
                                            Qty: {it.quantity} {it.unit}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">
                                      No items
                                    </p>
                                  )}
                                </div>

                                {/* Quotes */}
                                <div>
                                  <div className="mb-2 flex items-center gap-2">
                                    <Quote className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="text-sm font-semibold">
                                      Quotes
                                      {quotes && quotes.length > 0 && (
                                        <span className="ml-1 text-muted-foreground">
                                          ({quotes.length})
                                        </span>
                                      )}
                                    </h4>
                                  </div>
                                  {quotes && quotes.length > 0 ? (
                                    <div className="space-y-2">
                                      {quotes.map((q) => (
                                        <div
                                          key={q.id}
                                          className="rounded-lg border border-border/40 bg-background p-3"
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                              {q.price != null
                                                ? formatCurrency(Number(q.price))
                                                : '—'}
                                            </span>
                                            {q.status && (
                                              <Badge
                                                variant={
                                                  statusColors[q.status] ||
                                                  'secondary'
                                                }
                                                className="capitalize"
                                              >
                                                {q.status}
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                                            {q.quantity != null && (
                                              <span>
                                                Qty: {q.quantity} {q.unit || ''}
                                              </span>
                                            )}
                                            {q.estimated_delivery_date && (
                                              <span>
                                                Delivery: {formatDate(q.estimated_delivery_date)}
                                              </span>
                                            )}
                                          </div>
                                          {q.comments && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                              {q.comments}
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">
                                      No quotes yet
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                   </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => (o ? setFormOpen(true) : closeForm())}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRequest
                ? 'Edit Purchase Request'
                : 'Create Purchase Request'}
            </DialogTitle>
            <DialogDescription>
              {editingRequest
                ? 'Update the details of this purchase request.'
                : 'Send a new purchase request to a supplier. It will be sent immediately.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="e.g. Steel rods for Q1 production"
                aria-invalid={!!formErrors.title}
              />
              {formErrors.title && (
                <p className="text-xs text-destructive">{formErrors.title}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Additional context or notes for the supplier..."
                rows={3}
              />
            </div>

            {/* Supplier + Priority */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Supplier <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.supplier_id}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, supplier_id: v }))
                  }
                >
                  <SelectTrigger aria-invalid={!!formErrors.supplier_id}>
                    <SelectValue placeholder="Select a supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        No suppliers available
                      </SelectItem>
                    ) : (
                      suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {formErrors.supplier_id && (
                  <p className="text-xs text-destructive">
                    {formErrors.supplier_id}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  Priority <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      priority: v as Priority,
                    }))
                  }
                >
                  <SelectTrigger aria-invalid={!!formErrors.priority}>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.priority && (
                  <p className="text-xs text-destructive">{formErrors.priority}</p>
                )}
              </div>
            </div>

            {/* Expected date */}
            <div className="space-y-2">
              <Label htmlFor="expected_date">
                Expected Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="expected_date"
                type="date"
                value={form.expected_date}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    expected_date: e.target.value,
                  }))
                }
                aria-invalid={!!formErrors.expected_date}
              />
              {formErrors.expected_date && (
                <p className="text-xs text-destructive">
                  {formErrors.expected_date}
                </p>
              )}
            </div>

            {/* Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>
                  Items <span className="text-destructive">*</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={addItem}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {form.items.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-border/60 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Item {index + 1}
                      </span>
                      {form.items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeItem(index)}
                          aria-label="Remove item"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Product Name</Label>
                        <Input
                          value={item.product_name}
                          onChange={(e) =>
                            updateItem(index, 'product_name', e.target.value)
                          }
                          placeholder="e.g. Stainless steel rod"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            updateItem(index, 'description', e.target.value)
                          }
                          placeholder="Optional notes"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(index, 'quantity', e.target.value)
                          }
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Unit</Label>
                        <Input
                          value={item.unit}
                          onChange={(e) =>
                            updateItem(index, 'unit', e.target.value)
                          }
                          placeholder="pcs, kg, m..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {formErrors.items && (
                <p className="text-xs text-destructive">{formErrors.items}</p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeForm}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingRequest ? 'Save Changes' : 'Create & Send'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={!!detailTarget}
        onOpenChange={(o) => !o && setDetailTarget(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {detailTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">
                    {detailTarget.request_number}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-base text-foreground">
                  {detailTarget.title}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Meta */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Supplier
                    </p>
                    <p className="text-sm">
                      {detailTarget.supplier?.name || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Priority
                    </p>
                    <Badge
                      variant={statusColors[detailTarget.priority] || 'secondary'}
                      className="mt-0.5 capitalize"
                    >
                      {detailTarget.priority}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Status
                    </p>
                    <Badge
                      variant={statusColors[detailTarget.status] || 'default'}
                      className="mt-0.5 capitalize"
                    >
                      {detailTarget.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Expected Date
                    </p>
                    <p className="text-sm">
                      {formatDate(detailTarget.expected_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Created
                    </p>
                    <p className="text-sm">
                      {formatDateTime(detailTarget.created_at)}
                    </p>
                  </div>
                </div>

                {detailTarget.description && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Description
                    </p>
                    <p className="mt-1 text-sm">{detailTarget.description}</p>
                  </div>
                )}

                <Separator />

                {/* Items */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold">
                      Items
                      {detailItems.length > 0 && (
                        <span className="ml-1 text-muted-foreground">
                          ({detailItems.length})
                        </span>
                      )}
                    </h4>
                  </div>
                  {detailLoading ? (
                    <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading items...
                    </div>
                  ) : detailItems.length > 0 ? (
                    <div className="space-y-2">
                      {detailItems.map((it) => (
                        <div
                          key={it.id}
                          className="rounded-lg border border-border/40 p-3"
                        >
                          <p className="text-sm font-medium">
                            {it.product_name}
                          </p>
                          {it.description && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {it.description}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-muted-foreground">
                            Qty: {it.quantity} {it.unit}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No items</p>
                  )}
                </div>

                {/* Quotes */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold">
                      Supplier Quotes
                      {detailQuotes.length > 0 && (
                        <span className="ml-1 text-muted-foreground">
                          ({detailQuotes.length})
                        </span>
                      )}
                    </h4>
                  </div>
                  {detailLoading ? (
                    <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading quotes...
                    </div>
                  ) : detailQuotes.length > 0 ? (
                    <div className="space-y-2">
                      {detailQuotes.map((q) => (
                        <div
                          key={q.id}
                          className="rounded-lg border border-border/40 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {q.price != null
                                ? formatCurrency(Number(q.price))
                                : '—'}
                            </span>
                            {q.status && (
                              <Badge
                                variant={statusColors[q.status] || 'secondary'}
                                className="capitalize"
                              >
                                {q.status}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                            {q.quantity != null && (
                              <span>
                                Qty: {q.quantity} {q.unit || ''}
                              </span>
                            )}
                            {q.estimated_delivery_date && (
                              <span>
                                Delivery:{' '}
                                {formatDate(q.estimated_delivery_date)}
                              </span>
                            )}
                          </div>
                          {q.comments && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {q.comments}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No quotes yet</p>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDetailTarget(null)}
                >
                  Close
                </Button>
                <Button
                  className="gap-2"
                  onClick={() => {
                    setDetailTarget(null);
                    openEdit(detailTarget);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete purchase request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <span className="font-medium">
                {deleteTarget?.request_number}
              </span>{' '}
              ({deleteTarget?.title}) along with all its items and quotes. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
