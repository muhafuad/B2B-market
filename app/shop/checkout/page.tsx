'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  CreditCard,
  Smartphone,
  Banknote,
  Wallet,
  ArrowLeft,
  ArrowRight,
  Package,
  Loader2,
  CheckCircle2,
  MapPin,
  User,
} from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { formatCurrency } from '@/app/lib/types/ui';
import type { PaymentMethod } from '@/app/lib/types/database';
import { useCart } from '@/app/hooks/use-cart';
import { useAuth } from '@/app/components/providers/auth-provider';
import { supabase } from '@/app/lib/supabase/client';
import { toast } from 'sonner';

const SHIPPING_RATE = 0.05;
const TAX_RATE = 0.1;

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: typeof CreditCard; description: string }[] = [
  { value: 'bank_transfer', label: 'Bank Transfer', icon: CreditCard, description: 'Transfer funds directly to our bank account' },
  { value: 'mobile_money', label: 'Mobile Money', icon: Smartphone, description: 'Pay via MTN, Airtel, or other mobile money' },
  { value: 'cash', label: 'Cash on Delivery', icon: Banknote, description: 'Pay with cash when your order arrives' },
  { value: 'credit', label: 'Credit', icon: Wallet, description: 'Use your approved credit line' },
];

interface AddressForm {
  full_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  notes: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { items, loaded, subtotal, clearCart } = useCart();
  const [hydrated, setHydrated] = useState(false);
  const [placing, setPlacing] = useState(false);

  const [address, setAddress] = useState<AddressForm>({
    full_name: profile?.full_name || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    notes: '',
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (profile?.full_name) {
      setAddress((prev) => ({ ...prev, full_name: profile.full_name || prev.full_name }));
    }
  }, [profile]);

  const taxAmount = subtotal * TAX_RATE;
  const shippingAmount = subtotal > 0 ? subtotal * SHIPPING_RATE : 0;
  const total = subtotal + taxAmount + shippingAmount;

  const handleAddressChange = (field: keyof AddressForm, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!address.full_name.trim()) {
      toast.error('Full name is required');
      return false;
    }
    if (!address.phone.trim()) {
      toast.error('Phone number is required');
      return false;
    }
    if (!address.address.trim()) {
      toast.error('Street address is required');
      return false;
    }
    if (!address.city.trim()) {
      toast.error('City is required');
      return false;
    }
    if (!profile?.customer_id) {
      toast.error('Customer profile not found. Please contact support.');
      return false;
    }
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return false;
    }
    return true;
  };

  const placeOrder = async () => {
    if (!validateForm()) return;

    setPlacing(true);

    try {
      const customerId = profile!.customer_id!;
      const shippingAddress = [
        address.full_name,
        address.address,
        address.city,
        address.state,
        address.postal_code,
        address.country,
      ].filter(Boolean).join(', ');

      // Generate order number
      const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: customerId,
          status: 'pending',
          subtotal,
          tax_amount: taxAmount,
          discount_amount: 0,
          shipping_amount: shippingAmount,
          total_amount: total,
          payment_status: 'unpaid',
          shipping_address: shippingAddress,
          notes: address.notes || null,
        })
        .select()
        .single();

      if (orderError || !order) {
        toast.error('Failed to create order');
        console.error(orderError);
        setPlacing(false);
        return;
      }

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

      if (itemsError) {
        toast.error('Failed to create order items');
        console.error(itemsError);
        setPlacing(false);
        return;
      }

      // Create payment record
      const paymentReference = `PAY-${Date.now().toString().slice(-10)}`;
      const { error: paymentError } = await supabase.from('payments').insert({
        order_id: order.id,
        amount: total,
        method: paymentMethod,
        status: 'pending',
        reference: paymentReference,
      });

      if (paymentError) {
        console.error(paymentError);
        // Don't fail the whole order for payment record error
      }

      // Clear cart
      clearCart();

      toast.success('Order placed successfully!');
      router.push('/shop/orders');
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong. Please try again.');
      setPlacing(false);
    }
  };

  if (!hydrated || !loaded) {
    return (
      <DashboardShell>
        <PageHeader title="Checkout" description="Complete your purchase" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </DashboardShell>
    );
  }

  if (items.length === 0) {
    return (
      <DashboardShell>
        <PageHeader title="Checkout" description="Complete your purchase" />
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Package className="h-10 w-10 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Your cart is empty</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add items to your cart before checking out.
            </p>
          </div>
          <Link href="/shop">
            <Button className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Browse Products
            </Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <PageHeader title="Checkout" description="Complete your purchase" />

      <div className="mb-4">
        <Link href="/shop/cart">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Cart
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Forms */}
        <div className="space-y-6 lg:col-span-2">
          {/* Shipping Address */}
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={address.full_name}
                    onChange={(e) => handleAddressChange('full_name', e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={address.phone}
                    onChange={(e) => handleAddressChange('phone', e.target.value)}
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Street Address *</Label>
                <Textarea
                  id="address"
                  value={address.address}
                  onChange={(e) => handleAddressChange('address', e.target.value)}
                  placeholder="123 Main Street, Building A, Suite 100"
                  rows={2}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={address.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    placeholder="New York"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">State / Province</Label>
                  <Input
                    id="state"
                    value={address.state}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                    placeholder="NY"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={address.postal_code}
                    onChange={(e) => handleAddressChange('postal_code', e.target.value)}
                    placeholder="10001"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={address.country}
                  onChange={(e) => handleAddressChange('country', e.target.value)}
                  placeholder="Ethiopia"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Order Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={address.notes}
                  onChange={(e) => handleAddressChange('notes', e.target.value)}
                  placeholder="Any special instructions for delivery..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.value}
                    onClick={() => setPaymentMethod(method.value)}
                    className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                      paymentMethod === method.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border/40 hover:border-border hover:bg-muted/30'
                    }`}
                  >
                    <method.icon
                      className={`mt-0.5 h-5 w-5 shrink-0 ${
                        paymentMethod === method.value ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{method.label}</span>
                        {paymentMethod === method.value && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {method.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Order Summary */}
        <div>
          <Card className="sticky top-20 border-border/40">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items */}
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.product_id} className="flex items-center gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border/40 bg-muted">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} × {formatCurrency(item.price)}
                      </p>
                    </div>
                    <span className="text-sm font-medium">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax (10%)</span>
                  <span className="font-medium">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium">{formatCurrency(shippingAmount)}</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-3">
                <Badge variant="secondary" className="capitalize">
                  {paymentMethod.replace('_', ' ')}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Payment will be processed after order confirmation
                </span>
              </div>

              <Button
                onClick={placeOrder}
                disabled={placing}
                className="w-full gap-2"
                size="lg"
              >
                {placing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  <>
                    Place Order
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                By placing this order, you agree to our terms and conditions
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
