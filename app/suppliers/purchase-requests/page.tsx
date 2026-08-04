'use client';

import { useEffect, useState } from 'react';
import {
  ClipboardList, Search, CheckCircle2, XCircle, Send, Eye, ChevronDown, ChevronUp, Loader2, Inbox,
} from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { Skeleton } from '@/app/components/ui/skeleton';
import { useAuth } from '@/app/components/providers/auth-provider';
import { supabase } from '@/app/lib/supabase/client';
import { formatDate, statusColors } from '@/app/lib/types/ui';
import { toast } from 'sonner';

export default function SupplierPurchaseRequests() {
  const { profile } = useAuth();
  const supplierId = profile?.supplier_id;
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quoteDialog, setQuoteDialog] = useState<{ open: boolean; requestId: string | null }>({ open: false, requestId: null });
  const [quoteForm, setQuoteForm] = useState({ price: '', quantity: '', estimated_delivery_date: '', comments: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supplierId) return;
    (async () => {
      const { data } = await supabase
        .from('purchase_requests')
        .select('*, items:purchase_request_items(*), quotes:supplier_quotes(*)')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });
      setRequests(data || []);
      setLoading(false);
    })();
  }, [supplierId]);

  const filtered = requests.filter(r => {
    const matchesSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.request_number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('purchase_requests').update({ status }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    toast.success(`Request ${status}`);
  };

  const submitQuote = async () => {
    if (!quoteForm.price || !quoteForm.quantity || !supplierId || !quoteDialog.requestId) return;
    setSubmitting(true);
    const { error } = await supabase.from('supplier_quotes').insert({
      purchase_request_id: quoteDialog.requestId,
      supplier_id: supplierId,
      status: 'pending',
      price: parseFloat(quoteForm.price),
      quantity: parseFloat(quoteForm.quantity),
      estimated_delivery_date: quoteForm.estimated_delivery_date || null,
      comments: quoteForm.comments,
    });
    if (error) { toast.error(error.message); setSubmitting(false); return; }
    await supabase.from('purchase_requests').update({ status: 'quoted' }).eq('id', quoteDialog.requestId);
    setRequests(prev => prev.map(r => r.id === quoteDialog.requestId ? { ...r, status: 'quoted' } : r));
    toast.success('Quotation sent successfully');
    setQuoteDialog({ open: false, requestId: null });
    setQuoteForm({ price: '', quantity: '', estimated_delivery_date: '', comments: '' });
    setSubmitting(false);
  };

  return (
    <DashboardShell>
      <PageHeader title="Purchase Requests" description="Review and respond to purchase requests from the platform" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search requests..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="quoted">Quoted</SelectItem>
            <SelectItem value="ordered">Ordered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/40">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Inbox className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-sm text-muted-foreground">No purchase requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <Card key={req.id} className="border-border/40">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{req.request_number}</span>
                      <Badge variant={statusColors[req.priority] || 'secondary'} className="capitalize">{req.priority}</Badge>
                      <Badge variant={statusColors[req.status] || 'secondary'} className="capitalize">{req.status}</Badge>
                    </div>
                    <h3 className="mt-1 font-semibold">{req.title}</h3>
                    {req.description && <p className="mt-1 text-sm text-muted-foreground">{req.description}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">Expected: {formatDate(req.expected_date)} | Created: {formatDate(req.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {req.status === 'sent' && (
                      <>
                        <Button size="sm" className="gap-1 bg-success text-success-foreground hover:bg-success/90" onClick={() => updateStatus(req.id, 'accepted')}><CheckCircle2 className="h-4 w-4" /> Accept</Button>
                        <Button size="sm" variant="destructive" className="gap-1" onClick={() => updateStatus(req.id, 'rejected')}><XCircle className="h-4 w-4" /> Reject</Button>
                      </>
                    )}
                    {(req.status === 'sent' || req.status === 'accepted') && (
                      <Button size="sm" className="gap-1" onClick={() => setQuoteDialog({ open: true, requestId: req.id })}><Send className="h-4 w-4" /> Send Quote</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}>
                      {expandedId === req.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {expandedId === req.id && req.items && (
                  <div className="mt-4 rounded-lg border border-border/40 p-3">
                    <p className="mb-2 text-sm font-medium">Requested Items</p>
                    <div className="space-y-2">
                      {req.items.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <div>
                            <span className="font-medium">{item.product_name}</span>
                            {item.description && <span className="ml-2 text-muted-foreground">— {item.description}</span>}
                          </div>
                          <span className="text-muted-foreground">{item.quantity} {item.unit}</span>
                        </div>
                      ))}
                    </div>
                    {req.quotes && req.quotes.length > 0 && (
                      <div className="mt-3 border-t border-border/40 pt-3">
                        <p className="mb-2 text-sm font-medium">Your Quotes</p>
                        {req.quotes.map((q: any) => (
                          <div key={q.id} className="flex items-center justify-between text-sm">
                            <span>${q.price} × {q.quantity} {q.unit}</span>
                            <Badge variant={statusColors[q.status] || 'secondary'} className="capitalize">{q.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={quoteDialog.open} onOpenChange={(open) => setQuoteDialog({ open, requestId: quoteDialog.requestId })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Quotation</DialogTitle>
            <DialogDescription>Provide your quote for this purchase request</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unit Price ($)</Label>
                <Input type="number" step="0.01" value={quoteForm.price} onChange={e => setQuoteForm({ ...quoteForm, price: e.target.value })} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" value={quoteForm.quantity} onChange={e => setQuoteForm({ ...quoteForm, quantity: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estimated Delivery Date</Label>
              <Input type="date" value={quoteForm.estimated_delivery_date} onChange={e => setQuoteForm({ ...quoteForm, estimated_delivery_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Comments</Label>
              <Textarea value={quoteForm.comments} onChange={e => setQuoteForm({ ...quoteForm, comments: e.target.value })} placeholder="Additional notes about your quote..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteDialog({ open: false, requestId: null })}>Cancel</Button>
            <Button onClick={submitQuote} disabled={submitting || !quoteForm.price || !quoteForm.quantity}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : 'Send Quotation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
