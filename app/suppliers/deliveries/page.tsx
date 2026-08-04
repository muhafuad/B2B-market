'use client';

import { useEffect, useState } from 'react';
import { Truck, Search, Inbox, Loader2 } from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Skeleton } from '@/app/components/ui/skeleton';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/app/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { useAuth } from '@/app/components/providers/auth-provider';
import { supabase } from '@/app/lib/supabase/client';
import { formatDate, statusColors } from '@/app/lib/types/ui';
import { toast } from 'sonner';

const DELIVERY_STATUSES = ['scheduled', 'in_transit', 'received', 'inspected', 'rejected', 'stored'];

export default function SupplierDeliveries() {
  const { profile } = useAuth();
  const supplierId = profile?.supplier_id;
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [noteDialog, setNoteDialog] = useState<{ open: boolean; delivery: any | null }>({ open: false, delivery: null });
  const [noteText, setNoteText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supplierId) return;
    (async () => {
      const { data } = await supabase
        .from('deliveries')
        .select('*, purchase_order:purchase_orders(po_number), warehouse:warehouses(name, code)')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });
      setDeliveries(data || []);
      setLoading(false);
    })();
  }, [supplierId]);

  const filtered = deliveries.filter(d => {
    const matchesSearch = !search || d.delivery_number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const updateStatus = async (id: string, status: string) => {
    const update: any = { status };
    if (['received', 'inspected', 'stored'].includes(status)) update.received_date = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('deliveries').update(update).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setDeliveries(prev => prev.map(d => d.id === id ? { ...d, ...update } : d));
    toast.success(`Status updated to ${status.replace('_', ' ')}`);
  };

  const saveNote = async () => {
    if (!noteDialog.delivery) return;
    setSubmitting(true);
    const { error } = await supabase.from('deliveries').update({ notes: noteText }).eq('id', noteDialog.delivery.id);
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setDeliveries(prev => prev.map(d => d.id === noteDialog.delivery.id ? { ...d, notes: noteText } : d));
    toast.success('Delivery note saved');
    setNoteDialog({ open: false, delivery: null });
    setNoteText('');
  };

  return (
    <DashboardShell>
      <PageHeader title="Deliveries" description="Track and update your delivery status" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by delivery number..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {DELIVERY_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/40">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Inbox className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-sm text-muted-foreground">No deliveries found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(delivery => (
            <Card key={delivery.id} className="border-border/40">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Truck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-mono text-sm font-medium">{delivery.delivery_number}</p>
                    <p className="text-xs text-muted-foreground">
                      PO: {delivery.purchase_order?.po_number || '—'} | {delivery.warehouse?.name || '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Scheduled: {formatDate(delivery.scheduled_date)}</p>
                    <p className="text-xs text-muted-foreground">Received: {formatDate(delivery.received_date)}</p>
                  </div>
                  <Badge variant={statusColors[delivery.status] || 'secondary'} className="capitalize">{delivery.status.replace('_', ' ')}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm">Update Status</Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {DELIVERY_STATUSES.map(s => (
                        <DropdownMenuItem key={s} onClick={() => updateStatus(delivery.id, s)} className="capitalize">{s.replace('_', ' ')}</DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="ghost" size="sm" onClick={() => { setNoteDialog({ open: true, delivery }); setNoteText(delivery.notes || ''); }}>Notes</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={noteDialog.open} onOpenChange={(open) => setNoteDialog({ open, delivery: open ? noteDialog.delivery : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delivery Notes</DialogTitle>
            <DialogDescription>Add or update notes for this delivery</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} placeholder="Delivery notes, attachments info, etc." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialog({ open: false, delivery: null })}>Cancel</Button>
            <Button onClick={saveNote} disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Note'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
