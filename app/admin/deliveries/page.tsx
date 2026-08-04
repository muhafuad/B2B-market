'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  Truck,
  MoreHorizontal,
  CheckCircle2,
  PackageCheck,
  ClipboardCheck,
  AlertTriangle,
} from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { StatCard } from '@/app/components/dashboard/stat-card';
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
import { formatDate, statusColors } from '@/app/lib/types/ui';
import type {
  Delivery,
  DeliveryStatus,
  Supplier,
  Warehouse,
  PurchaseOrder,
} from '@/app/lib/types/database';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const DELIVERY_STATUSES: DeliveryStatus[] = [
  'scheduled',
  'in_transit',
  'received',
  'inspected',
  'rejected',
  'stored',
];

const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  scheduled: 'Scheduled',
  in_transit: 'In Transit',
  received: 'Received',
  inspected: 'Inspected',
  rejected: 'Rejected',
  stored: 'Stored',
};

interface DeliveryWithRelations extends Omit<Delivery, 'supplier' | 'warehouse' | 'purchase_order'> {
  supplier?: Pick<Supplier, 'id' | 'name'> | null;
  warehouse?: Pick<Warehouse, 'id' | 'name' | 'code'> | null;
  purchase_order?: Pick<PurchaseOrder, 'id' | 'po_number'> | null;
}

interface SupplierOption {
  id: string;
  name: string;
}

interface WarehouseOption {
  id: string;
  name: string;
  code: string | null;
}

interface PurchaseOrderOption {
  id: string;
  po_number: string;
  supplier_id: string;
}

interface DeliveryFormState {
  delivery_number: string;
  purchase_order_id: string;
  supplier_id: string;
  warehouse_id: string;
  status: DeliveryStatus;
  scheduled_date: string;
  received_date: string;
  notes: string;
}

type FormErrors = Partial<Record<keyof DeliveryFormState, string>>;

function emptyForm(): DeliveryFormState {
  return {
    delivery_number: '',
    purchase_order_id: 'none',
    supplier_id: '',
    warehouse_id: 'none',
    status: 'scheduled',
    scheduled_date: '',
    received_date: '',
    notes: '',
  };
}

function generateDeliveryNumber(existing: { delivery_number: string | null }[]): string {
  const year = new Date().getFullYear();
  const prefix = `DEL-${year}-`;
  let max = 0;
  for (const d of existing) {
    const match = d.delivery_number?.match(new RegExp(`^${prefix}(\\d+)$`));
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  }
  const next = max + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

function validate(form: DeliveryFormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.delivery_number.trim()) {
    errors.delivery_number = 'Delivery number is required';
  }

  if (!DELIVERY_STATUSES.includes(form.status)) {
    errors.status = 'Select a status';
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<DeliveryWithRelations[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<DeliveryWithRelations | null>(null);
  const [form, setForm] = useState<DeliveryFormState>(emptyForm());
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DeliveryWithRelations | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [statusUpdateId, setStatusUpdateId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('deliveries')
      .select(
        'id, delivery_number, purchase_order_id, supplier_id, warehouse_id, status, scheduled_date, received_date, notes, attachments, created_at, updated_at, supplier:suppliers(id, name), warehouse:warehouses(id, name, code), purchase_order:purchase_orders(id, po_number)',
      )
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load deliveries', { description: error.message });
      setDeliveries([]);
    } else {
      setDeliveries((data as unknown as DeliveryWithRelations[]) || []);
    }
    setLoading(false);
  }, []);

  const fetchOptions = useCallback(async () => {
    const [supRes, whRes, poRes] = await Promise.all([
      supabase.from('suppliers').select('id, name').order('name', { ascending: true }),
      supabase.from('warehouses').select('id, name, code').order('name', { ascending: true }),
      supabase
        .from('purchase_orders')
        .select('id, po_number, supplier_id')
        .order('created_at', { ascending: false }),
    ]);

    if (supRes.error) {
      toast.error('Failed to load suppliers', { description: supRes.error.message });
    } else {
      setSuppliers((supRes.data as SupplierOption[]) || []);
    }

    if (whRes.error) {
      toast.error('Failed to load warehouses', { description: whRes.error.message });
    } else {
      setWarehouses((whRes.data as WarehouseOption[]) || []);
    }

    if (poRes.error) {
      toast.error('Failed to load purchase orders', { description: poRes.error.message });
    } else {
      setPurchaseOrders((poRes.data as PurchaseOrderOption[]) || []);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries();
    fetchOptions();
  }, [fetchDeliveries, fetchOptions]);

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  const summary = useMemo(() => {
    const total = deliveries.length;
    const inTransit = deliveries.filter((d) => d.status === 'in_transit').length;
    const received = deliveries.filter((d) => d.status === 'received').length;
    const pendingInspection = deliveries.filter((d) => d.status === 'inspected' || d.status === 'received').length;
    return { total, inTransit, received, pendingInspection };
  }, [deliveries]);

  // -------------------------------------------------------------------------
  // Filtering
  // -------------------------------------------------------------------------

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deliveries.filter((d) => {
      const matchesSearch = !q || (d.delivery_number || '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [deliveries, search, statusFilter]);

  const hasActiveFilters = search || statusFilter !== 'all';

  // -------------------------------------------------------------------------
  // Form handlers
  // -------------------------------------------------------------------------

  const openAdd = () => {
    setEditingDelivery(null);
    setForm({
      ...emptyForm(),
      delivery_number: generateDeliveryNumber(deliveries),
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (delivery: DeliveryWithRelations) => {
    setEditingDelivery(delivery);
    setForm({
      delivery_number: delivery.delivery_number || '',
      purchase_order_id: delivery.purchase_order_id || 'none',
      supplier_id: delivery.supplier_id || '',
      warehouse_id: delivery.warehouse_id || 'none',
      status: delivery.status,
      scheduled_date: delivery.scheduled_date ? delivery.scheduled_date.split('T')[0] : '',
      received_date: delivery.received_date ? delivery.received_date.split('T')[0] : '',
      notes: delivery.notes || '',
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
      delivery_number: form.delivery_number.trim(),
      purchase_order_id: form.purchase_order_id === 'none' ? null : form.purchase_order_id,
      supplier_id: form.supplier_id || null,
      warehouse_id: form.warehouse_id === 'none' ? null : form.warehouse_id,
      status: form.status,
      scheduled_date: form.scheduled_date || null,
      received_date: form.received_date || null,
      notes: form.notes.trim() || null,
    };

    if (editingDelivery) {
      const { error } = await supabase
        .from('deliveries')
        .update(payload)
        .eq('id', editingDelivery.id);
      setSubmitting(false);
      if (error) {
        toast.error('Failed to update delivery', { description: error.message });
        return;
      }
      toast.success('Delivery updated successfully');
      setFormOpen(false);
      await fetchDeliveries();
    } else {
      const { error } = await supabase.from('deliveries').insert(payload);
      setSubmitting(false);
      if (error) {
        toast.error('Failed to create delivery', { description: error.message });
        return;
      }
      toast.success('Delivery created successfully');
      setFormOpen(false);
      await fetchDeliveries();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from('deliveries')
      .delete()
      .eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast.error('Failed to delete delivery', { description: error.message });
      return;
    }
    toast.success('Delivery deleted successfully');
    setDeliveries((prev) => prev.filter((d) => d.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const handleQuickStatusChange = async (deliveryId: string, newStatus: DeliveryStatus) => {
    setStatusUpdateId(deliveryId);
    setUpdatingStatus(true);
    const updatePayload: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'received' || newStatus === 'inspected' || newStatus === 'stored') {
      updatePayload.received_date = new Date().toISOString().split('T')[0];
    }
    const { error } = await supabase
      .from('deliveries')
      .update(updatePayload)
      .eq('id', deliveryId);
    setUpdatingStatus(false);
    setStatusUpdateId(null);
    if (error) {
      toast.error('Failed to update status', { description: error.message });
      return;
    }
    toast.success(`Status updated to ${DELIVERY_STATUS_LABELS[newStatus]}`);
    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === deliveryId
          ? {
              ...d,
              status: newStatus,
              received_date:
                newStatus === 'received' || newStatus === 'inspected' || newStatus === 'stored'
                  ? (updatePayload.received_date as string)
                  : d.received_date,
            }
          : d,
      ),
    );
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <DashboardShell>
      <PageHeader
        title="Deliveries"
        description="Track and manage inbound deliveries from suppliers"
        action={
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Delivery
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i} className="border-border/40">
              <CardContent className="p-5">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <Skeleton className="mt-3 h-7 w-20" />
                <Skeleton className="mt-2 h-4 w-28" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              title="Total Deliveries"
              value={summary.total}
              icon={Truck}
              iconColor="hsl(var(--primary))"
            />
            <StatCard
              title="In Transit"
              value={summary.inTransit}
              icon={PackageCheck}
              iconColor="hsl(217 91% 60%)"
            />
            <StatCard
              title="Received"
              value={summary.received}
              icon={CheckCircle2}
              iconColor="hsl(142 71% 45%)"
            />
            <StatCard
              title="Pending Inspection"
              value={summary.pendingInspection}
              icon={ClipboardCheck}
              iconColor="hsl(38 92% 50%)"
            />
          </>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-4 mt-4 border-border/40">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by delivery number..."
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
                  {DELIVERY_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {DELIVERY_STATUS_LABELS[s]}
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
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="ml-auto h-8 w-20" />
                  </div>
                ))}
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Truck className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-base font-semibold">
                {hasActiveFilters ? 'No deliveries match your filters' : 'No deliveries yet'}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {hasActiveFilters
                  ? 'Try adjusting your search or filter criteria to find what you are looking for.'
                  : 'Get started by adding your first delivery.'}
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
                  Add Delivery
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delivery Number</TableHead>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead>Received Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.delivery_number}</TableCell>
                    <TableCell>
                      {d.purchase_order?.po_number ? (
                        <span className="text-sm">{d.purchase_order.po_number}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {d.supplier?.name ? (
                        <span className="text-sm">{d.supplier.name}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {d.warehouse?.name ? (
                        <span className="text-sm">
                          {d.warehouse.name}
                          {d.warehouse.code ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({d.warehouse.code})
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={statusColors[d.status] || 'secondary'}
                        >
                          {DELIVERY_STATUS_LABELS[d.status]}
                        </Badge>
                        {updatingStatus && statusUpdateId === d.id && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(d.scheduled_date)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(d.received_date)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5"
                              disabled={updatingStatus && statusUpdateId === d.id}
                            >
                              <span className="text-xs">Status</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Update status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {DELIVERY_STATUSES.map((s) => (
                              <DropdownMenuItem
                                key={s}
                                onClick={() => handleQuickStatusChange(d.id, s)}
                                className="flex items-center justify-between gap-2"
                              >
                                <span className="flex items-center gap-2">
                                  {d.status === s && (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                  {d.status !== s && <span className="w-3.5" />}
                                  {DELIVERY_STATUS_LABELS[s]}
                                </span>
                                {d.status === s && (
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
                          onClick={() => openEdit(d)}
                          aria-label={`Edit ${d.delivery_number}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(d)}
                          aria-label={`Delete ${d.delivery_number}`}
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
          Showing {filtered.length} of {deliveries.length} deliver
          {deliveries.length === 1 ? 'y' : 'ies'}
        </p>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDelivery ? 'Edit Delivery' : 'Add Delivery'}
            </DialogTitle>
            <DialogDescription>
              {editingDelivery
                ? 'Update the delivery details below. Required fields are marked with *.'
                : 'Fill in the delivery details below. Required fields are marked with *.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="delivery_number">
                  Delivery Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="delivery_number"
                  value={form.delivery_number}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, delivery_number: e.target.value }))
                  }
                  placeholder="DEL-2026-001"
                  aria-invalid={!!formErrors.delivery_number}
                />
                {formErrors.delivery_number && (
                  <p className="text-xs text-destructive">{formErrors.delivery_number}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">
                  Status <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, status: v as DeliveryStatus }))
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {DELIVERY_STATUS_LABELS[s]}
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
                <Label htmlFor="purchase_order_id">Purchase Order</Label>
                <Select
                  value={form.purchase_order_id}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, purchase_order_id: v }))
                  }
                >
                  <SelectTrigger id="purchase_order_id">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {purchaseOrders.length === 0 ? (
                      <SelectItem value="_none_po" disabled>
                        No purchase orders available
                      </SelectItem>
                    ) : (
                      purchaseOrders.map((po) => (
                        <SelectItem key={po.id} value={po.id}>
                          {po.po_number}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="supplier_id">Supplier</Label>
                <Select
                  value={form.supplier_id}
                  onValueChange={(v) => setForm((p) => ({ ...p, supplier_id: v }))}
                >
                  <SelectTrigger id="supplier_id">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {suppliers.length === 0 ? (
                      <SelectItem value="_none_sup" disabled>
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
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="warehouse_id">Warehouse</Label>
                <Select
                  value={form.warehouse_id}
                  onValueChange={(v) => setForm((p) => ({ ...p, warehouse_id: v }))}
                >
                  <SelectTrigger id="warehouse_id">
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {warehouses.length === 0 ? (
                      <SelectItem value="_none_wh" disabled>
                        No warehouses available
                      </SelectItem>
                    ) : (
                      warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                          {w.code ? ` (${w.code})` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="scheduled_date">Scheduled Date</Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  value={form.scheduled_date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, scheduled_date: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="received_date">Received Date</Label>
                <Input
                  id="received_date"
                  type="date"
                  value={form.received_date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, received_date: e.target.value }))
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
                placeholder="Internal notes about this delivery..."
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeForm} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingDelivery ? 'Save Changes' : 'Add Delivery'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete delivery?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.delivery_number}
              </span>
              . This action cannot be undone.
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
