'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  ShoppingCart,
  MoreHorizontal,
  CheckCircle2,
  Upload,
  FileText,
  Paperclip,
} from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { supabase } from '@/app/lib/supabase/client';
import { formatCurrency, formatDate, statusColors } from '@/app/lib/types/ui';
import type { PurchaseOrder, PurchaseOrderStatus, Supplier, PurchaseRequest } from '@/app/lib/types/database';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const PO_STATUSES: PurchaseOrderStatus[] = [
  'pending',
  'approved',
  'in_production',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
];

const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  in_production: 'In Production',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

interface PurchaseOrderWithRelations extends Omit<PurchaseOrder, 'supplier' | 'purchase_request' | 'receipt_urls'> {
  supplier?: Pick<Supplier, 'id' | 'name'>;
  purchase_request?: Pick<PurchaseRequest, 'id' | 'request_number'>;
  receipt_urls?: string[];
}

interface SupplierOption {
  id: string;
  name: string;
}

interface PurchaseRequestOption {
  id: string;
  request_number: string;
}

interface PurchaseOrderFormState {
  po_number: string;
  supplier_id: string;
  purchase_request_id: string;
  status: PurchaseOrderStatus;
  total_amount: string;
  expected_delivery_date: string;
  notes: string;
}

type FormErrors = Partial<Record<keyof PurchaseOrderFormState, string>>;

function emptyForm(): PurchaseOrderFormState {
  return {
    po_number: '',
    supplier_id: '',
    purchase_request_id: 'none',
    status: 'pending',
    total_amount: '',
    expected_delivery_date: '',
    notes: '',
  };
}

function generatePoNumber(existing: { po_number: string | null }[]): string {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  let max = 0;
  for (const po of existing) {
    const match = po.po_number?.match(new RegExp(`^${prefix}(\\d+)$`));
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  }
  const next = max + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

function validate(form: PurchaseOrderFormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.po_number.trim()) {
    errors.po_number = 'PO number is required';
  }

  if (!form.supplier_id) {
    errors.supplier_id = 'Supplier is required';
  }

  if (!PO_STATUSES.includes(form.status)) {
    errors.status = 'Select a status';
  }

  if (form.total_amount === '' || Number.isNaN(parseFloat(form.total_amount))) {
    errors.total_amount = 'Total amount is required';
  } else if (parseFloat(form.total_amount) < 0) {
    errors.total_amount = 'Total amount must be 0 or greater';
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderWithRelations[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequestOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrderWithRelations | null>(null);
  const [form, setForm] = useState<PurchaseOrderFormState>(emptyForm());
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrderWithRelations | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [statusUpdateId, setStatusUpdateId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Receipt upload
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [uploadingReceipts, setUploadingReceipts] = useState(false);
  const [receiptViewTarget, setReceiptViewTarget] = useState<PurchaseOrderWithRelations | null>(null);

  const fetchPurchaseOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(
        'id, po_number, purchase_request_id, supplier_id, status, total_amount, expected_delivery_date, actual_delivery_date, notes, created_by, created_at, updated_at, supplier:suppliers(id, name), purchase_request:purchase_requests(id, request_number)',
      )
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load purchase orders', { description: error.message });
      setPurchaseOrders([]);
    } else {
      setPurchaseOrders((data as unknown as PurchaseOrderWithRelations[]) || []);
    }
    setLoading(false);
  }, []);

  const fetchOptions = useCallback(async () => {
    const [supRes, prRes] = await Promise.all([
      supabase.from('suppliers').select('id, name').order('name', { ascending: true }),
      supabase.from('purchase_requests').select('id, request_number').order('created_at', { ascending: false }),
    ]);

    if (supRes.error) {
      toast.error('Failed to load suppliers', { description: supRes.error.message });
    } else {
      setSuppliers((supRes.data as SupplierOption[]) || []);
    }

    if (prRes.error) {
      toast.error('Failed to load purchase requests', { description: prRes.error.message });
    } else {
      setPurchaseRequests((prRes.data as PurchaseRequestOption[]) || []);
    }
  }, []);

  useEffect(() => {
    fetchPurchaseOrders();
    fetchOptions();
  }, [fetchPurchaseOrders, fetchOptions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return purchaseOrders.filter((po) => {
      const matchesSearch =
        !q || (po.po_number || '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [purchaseOrders, search, statusFilter]);

  const openAdd = () => {
    setEditingOrder(null);
    setForm({
      ...emptyForm(),
      po_number: generatePoNumber(purchaseOrders),
    });
    setFormErrors({});
    setReceiptFiles([]);
    setFormOpen(true);
  };

  const openEdit = (order: PurchaseOrderWithRelations) => {
    setEditingOrder(order);
    setForm({
      po_number: order.po_number || '',
      supplier_id: order.supplier_id || '',
      purchase_request_id: order.purchase_request_id || 'none',
      status: order.status,
      total_amount: order.total_amount != null ? String(order.total_amount) : '',
      expected_delivery_date: order.expected_delivery_date
        ? order.expected_delivery_date.split('T')[0]
        : '',
      notes: order.notes || '',
    });
    setFormErrors({});
    setReceiptFiles([]);
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
      po_number: form.po_number.trim(),
      supplier_id: form.supplier_id,
      purchase_request_id: form.purchase_request_id === 'none' ? null : form.purchase_request_id,
      status: form.status,
      total_amount: parseFloat(form.total_amount),
      expected_delivery_date: form.expected_delivery_date || null,
      notes: form.notes.trim() || null,
    };

    if (editingOrder) {
      // Upload new receipts first
      let updatedReceiptUrls: string[] = (editingOrder.receipt_urls as unknown as string[]) || [];
      if (receiptFiles.length > 0) {
        setUploadingReceipts(true);
        const uploadPromises = receiptFiles.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `receipts/po-${editingOrder.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
          const { error: upErr } = await supabase.storage.from('receipts').upload(fileName, file);
          if (upErr) { console.error(upErr); return null; }
          const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
          return urlData.publicUrl;
        });
        const urls = (await Promise.all(uploadPromises)).filter((u): u is string => u !== null);
        updatedReceiptUrls = [...updatedReceiptUrls, ...urls];
        setUploadingReceipts(false);
      }

      const { error } = await supabase
        .from('purchase_orders')
        .update({ ...payload, receipt_urls: updatedReceiptUrls })
        .eq('id', editingOrder.id);
      setSubmitting(false);
      if (error) {
        toast.error('Failed to update purchase order', { description: error.message });
        return;
      }
      toast.success('Purchase order updated successfully');
      setFormOpen(false);
      await fetchPurchaseOrders();
    } else {
      const { data: newPo, error } = await supabase.from('purchase_orders').insert(payload).select().single();
      setSubmitting(false);
      if (error) {
        toast.error('Failed to create purchase order', { description: error.message });
        return;
      }

      // Upload receipts for new PO
      if (receiptFiles.length > 0 && newPo) {
        setUploadingReceipts(true);
        const uploadPromises = receiptFiles.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `receipts/po-${newPo.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
          const { error: upErr } = await supabase.storage.from('receipts').upload(fileName, file);
          if (upErr) { console.error(upErr); return null; }
          const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
          return urlData.publicUrl;
        });
        const urls = (await Promise.all(uploadPromises)).filter((u): u is string => u !== null);
        if (urls.length > 0) {
          await supabase.from('purchase_orders').update({ receipt_urls: urls }).eq('id', newPo.id);
        }
        setUploadingReceipts(false);
      }

      toast.success('Purchase order created successfully');
      setFormOpen(false);
      await fetchPurchaseOrders();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast.error('Failed to delete purchase order', { description: error.message });
      return;
    }
    toast.success('Purchase order deleted successfully');
    setPurchaseOrders((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const handleQuickStatusChange = async (orderId: string, newStatus: PurchaseOrderStatus) => {
    setStatusUpdateId(orderId);
    setUpdatingStatus(true);
    const updatePayload: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'delivered') {
      updatePayload.actual_delivery_date = new Date().toISOString().split('T')[0];
    }
    const { error } = await supabase
      .from('purchase_orders')
      .update(updatePayload)
      .eq('id', orderId);
    setUpdatingStatus(false);
    setStatusUpdateId(null);
    if (error) {
      toast.error('Failed to update status', { description: error.message });
      return;
    }
    toast.success(`Status updated to ${PO_STATUS_LABELS[newStatus]}`);
    const deliveryDate: string | null = newStatus === 'delivered' ? new Date().toISOString().split('T')[0] : null;
    setPurchaseOrders((prev) =>
      prev.map((p) =>
        p.id === orderId
          ? {
              ...p,
              status: newStatus,
              actual_delivery_date: deliveryDate !== null ? deliveryDate : p.actual_delivery_date,
            }
          : p,
      ),
    );
  };

  const hasActiveFilters = search || statusFilter !== 'all';

  return (
    <DashboardShell>
      <PageHeader
        title="Purchase Orders"
        description="Manage purchase orders placed with suppliers"
        action={
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Purchase Order
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
                placeholder="Search by PO number..."
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
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {PO_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PO_STATUS_LABELS[s]}
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
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="ml-auto h-8 w-20" />
                  </div>
                ))}
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <ShoppingCart className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-base font-semibold">
                {hasActiveFilters ? 'No purchase orders match your filters' : 'No purchase orders yet'}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {hasActiveFilters
                  ? 'Try adjusting your search or filter criteria to find what you are looking for.'
                  : 'Get started by creating your first purchase order.'}
              </p>
              {hasActiveFilters ? (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button onClick={openAdd} className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Create Purchase Order
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                  <TableHead>Actual Delivery</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.po_number}</TableCell>
                    <TableCell>
                      {po.supplier?.name ? (
                        <span className="text-sm">{po.supplier.name}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={statusColors[po.status] || 'secondary'}
                        >
                          {PO_STATUS_LABELS[po.status]}
                        </Badge>
                        {updatingStatus && statusUpdateId === po.id && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(po.total_amount ?? 0)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(po.expected_delivery_date)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(po.actual_delivery_date)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(po.created_at)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {((po as unknown as { receipt_urls?: string[] }).receipt_urls?.length ?? 0) > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setReceiptViewTarget(po)}
                            aria-label="View receipts"
                            title="View receipts"
                          >
                            <Paperclip className="h-4 w-4" />
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5"
                              disabled={updatingStatus && statusUpdateId === po.id}
                            >
                              <span className="text-xs">Status</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Update status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {PO_STATUSES.map((s) => (
                              <DropdownMenuItem
                                key={s}
                                onClick={() => handleQuickStatusChange(po.id, s)}
                                className="flex items-center justify-between gap-2"
                              >
                                <span className="flex items-center gap-2">
                                  {po.status === s && (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                  {po.status !== s && <span className="w-3.5" />}
                                  {PO_STATUS_LABELS[s]}
                                </span>
                                {po.status === s && (
                                  <Badge
                                    variant={statusColors[s] || 'secondary'}
                                    className="text-[10px]"
                                  >
                                    current
                                  </Badge>
                                )}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(po)}
                          aria-label={`Edit ${po.po_number}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(po)}
                          aria-label={`Delete ${po.po_number}`}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {!loading && filtered.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Showing {filtered.length} of {purchaseOrders.length} purchase order
          {purchaseOrders.length === 1 ? '' : 's'}
        </p>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingOrder ? 'Edit Purchase Order' : 'Create Purchase Order'}
            </DialogTitle>
            <DialogDescription>
              {editingOrder
                ? 'Update the purchase order details below. Required fields are marked with *.'
                : 'Fill in the purchase order details below. Required fields are marked with *.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="po_number">
                  PO Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="po_number"
                  value={form.po_number}
                  onChange={(e) => setForm((p) => ({ ...p, po_number: e.target.value }))}
                  placeholder="PO-2026-001"
                  aria-invalid={!!formErrors.po_number}
                />
                {formErrors.po_number && (
                  <p className="text-xs text-destructive">{formErrors.po_number}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">
                  Status <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, status: v as PurchaseOrderStatus }))
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {PO_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {PO_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.status && (
                  <p className="text-xs text-destructive">{formErrors.status}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="supplier_id">
                  Supplier <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.supplier_id}
                  onValueChange={(v) => setForm((p) => ({ ...p, supplier_id: v }))}
                >
                  <SelectTrigger id="supplier_id">
                    <SelectValue placeholder="Select supplier" />
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
                  <p className="text-xs text-destructive">{formErrors.supplier_id}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="purchase_request_id">Purchase Request</Label>
                <Select
                  value={form.purchase_request_id}
                  onValueChange={(v) => setForm((p) => ({ ...p, purchase_request_id: v }))}
                >
                  <SelectTrigger id="purchase_request_id">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {purchaseRequests.map((pr) => (
                      <SelectItem key={pr.id} value={pr.id}>
                        {pr.request_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="total_amount">
                  Total Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="total_amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.total_amount}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, total_amount: e.target.value }))
                  }
                  placeholder="0.00"
                  aria-invalid={!!formErrors.total_amount}
                />
                {formErrors.total_amount && (
                  <p className="text-xs text-destructive">{formErrors.total_amount}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expected_delivery_date">Expected Delivery Date</Label>
                <Input
                  id="expected_delivery_date"
                  type="date"
                  value={form.expected_delivery_date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, expected_delivery_date: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Internal notes about this purchase order..."
                rows={3}
              />
            </div>

            {/* Receipt upload */}
            <div className="space-y-2">
              <Label>Payment Receipts</Label>
              <p className="text-xs text-muted-foreground">
                Upload receipts or proof of payment for this purchase order (e.g. bank transfer confirmation, invoice, etc.).
              </p>

              {editingOrder && ((editingOrder as unknown as { receipt_urls?: string[] }).receipt_urls?.length ?? 0) > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Existing receipts:</p>
                  {((editingOrder as unknown as { receipt_urls: string[] }).receipt_urls).map((url, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md border border-border/40 p-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-sm text-primary hover:underline">
                        Receipt {i + 1}
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {receiptFiles.length > 0 && (
                <div className="space-y-1.5">
                  {receiptFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md bg-muted/40 p-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="flex-1 truncate text-sm">{file.name}</span>
                      <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setReceiptFiles(prev => prev.filter((_, idx) => idx !== i))}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border/60 p-4 transition-colors hover:border-primary hover:bg-primary/5">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm font-medium">Add receipt files</span>
                <span className="text-xs text-muted-foreground">PNG, JPG, or PDF up to 10MB each</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const valid = files.filter(f => f.size <= 10 * 1024 * 1024);
                    if (valid.length < files.length) toast.error('Some files exceed 10MB and were skipped');
                    setReceiptFiles(prev => [...prev, ...valid]);
                  }}
                />
              </label>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeForm} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || uploadingReceipts}>
                {submitting || uploadingReceipts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {uploadingReceipts ? 'Uploading receipts...' : editingOrder ? 'Save Changes' : 'Create Purchase Order'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receipt viewer dialog */}
      <Dialog open={!!receiptViewTarget} onOpenChange={(o) => !o && setReceiptViewTarget(null)}>
        <DialogContent className="max-w-lg">
          {receiptViewTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5 text-primary" />
                  Receipts — {receiptViewTarget.po_number}
                </DialogTitle>
                <DialogDescription>
                  Payment receipts attached to this purchase order
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                {(((receiptViewTarget as unknown as { receipt_urls?: string[] }).receipt_urls) || []).map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-border/40 p-3 transition-colors hover:bg-muted/30"
                  >
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="flex-1 text-sm font-medium">Receipt {i + 1}</span>
                    <span className="text-xs text-primary">View</span>
                  </a>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReceiptViewTarget(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete purchase order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <span className="font-medium text-foreground">{deleteTarget?.po_number}</span>. This
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
