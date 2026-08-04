'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  FileText,
  Search,
  X,
  Download,
  Eye,
  PackageOpen,
  Loader2,
  Calendar,
  DollarSign,
  CheckCircle2,
  MapPin,
  CreditCard,
} from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Separator } from '@/app/components/ui/separator';
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
import { supabase } from '@/app/lib/supabase/client';
import { formatCurrency, formatDate, formatDateTime, statusColors } from '@/app/lib/types/ui';
import type { Order, OrderItem, Payment } from '@/app/lib/types/database';
import { useAuth } from '@/app/components/providers/auth-provider';
import { toast } from 'sonner';

interface InvoiceOrder extends Order {
  order_items: OrderItem[];
  payments: Payment[];
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  mobile_money: 'Mobile Money',
  cash: 'Cash',
  credit: 'Credit',
  invoice: 'Invoice',
};

export default function InvoicesPage() {
  const { profile } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceOrder | null>(null);

  const fetchInvoices = useCallback(async () => {
    if (!profile?.customer_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), payments(*)')
      .eq('customer_id', profile.customer_id)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load invoices');
      console.error(error);
    } else {
      setInvoices((data as unknown as InvoiceOrder[]) || []);
    }
    setLoading(false);
  }, [profile?.customer_id]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleDownload = (invoice: InvoiceOrder) => {
    toast.success(`Invoice ${invoice.order_number} downloaded`);
  };

  const filtered = invoices.filter((inv) => {
    const q = search.trim().toLowerCase();
    return !q || inv.order_number.toLowerCase().includes(q);
  });

  return (
    <DashboardShell>
      <PageHeader
        title="Invoices"
        description="Download and view your paid order invoices"
      />

      {/* Search */}
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by invoice number..."
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

      {/* Invoices */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border/40 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-9 w-32" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <PackageOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-base font-medium">No invoices found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {search
                ? 'Try a different search.'
                : 'Invoices for paid orders will appear here.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((invoice) => {
            const itemCount = invoice.order_items?.length ?? 0;
            const invoiceNumber = `INV-${invoice.order_number.replace('ORD-', '')}`;
            return (
              <Card key={invoice.id} className="border-border/40">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                        <FileText className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <p className="font-mono text-sm font-medium">{invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(invoice.created_at)} · {itemCount} item{itemCount === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold">
                          {formatCurrency(Number(invoice.total_amount))}
                        </p>
                        <div className="flex items-center gap-1 justify-end">
                          <CheckCircle2 className="h-3 w-3 text-success" />
                          <span className="text-xs text-success">Paid</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setDetailOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleDownload(invoice)}
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Invoice Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {selectedInvoice && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  Invoice {`INV-${selectedInvoice.order_number.replace('ORD-', '')}`}
                </DialogTitle>
                <DialogDescription>
                  Order {selectedInvoice.order_number} · {formatDateTime(selectedInvoice.created_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                {/* Invoice Info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="border-border/40">
                    <CardContent className="space-y-2 p-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Invoice Date
                      </div>
                      <p className="font-medium">{formatDate(selectedInvoice.created_at)}</p>
                      <Separator className="my-2" />
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        Amount
                      </div>
                      <p className="text-lg font-bold">
                        {formatCurrency(Number(selectedInvoice.total_amount))}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-border/40">
                    <CardContent className="space-y-2 p-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        Payment Status
                      </div>
                      <Badge variant="success">Paid</Badge>
                      <Separator className="my-2" />
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CreditCard className="h-4 w-4" />
                        Payment Method
                      </div>
                      <p className="font-medium capitalize">
                        {selectedInvoice.payments?.[0]
                          ? PAYMENT_METHOD_LABELS[selectedInvoice.payments[0].method] ||
                            selectedInvoice.payments[0].method
                          : '—'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Items */}
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Invoice Items</h4>
                  <Card className="border-border/40">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedInvoice.order_items?.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.product_name}</TableCell>
                            <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                            <TableCell className="text-right text-sm">
                              {formatCurrency(Number(item.unit_price))}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              {formatCurrency(Number(item.total_price))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </div>

                {/* Totals */}
                <Card className="border-border/40">
                  <CardContent className="space-y-1.5 p-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(Number(selectedInvoice.subtotal))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{formatCurrency(Number(selectedInvoice.tax_amount))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>{formatCurrency(Number(selectedInvoice.shipping_amount))}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between text-base font-bold">
                      <span>Total Paid</span>
                      <span>{formatCurrency(Number(selectedInvoice.total_amount))}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Shipping Address */}
                {selectedInvoice.shipping_address && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Shipping Address
                    </h4>
                    <Card className="border-border/40">
                      <CardContent className="p-4 text-sm text-muted-foreground">
                        <p className="whitespace-pre-line">{selectedInvoice.shipping_address}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => handleDownload(selectedInvoice)}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Invoice
                </Button>
                <Button onClick={() => setDetailOpen(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
