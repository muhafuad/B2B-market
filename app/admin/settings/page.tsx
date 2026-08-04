'use client';

import { useEffect, useState } from 'react';
import { Save, Loader2, Building2, Palette, SlidersHorizontal } from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { supabase } from '@/app/lib/supabase/client';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SettingsFormState {
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
  currency: string;
  currency_symbol: string;
  tax_rate: string;
  low_stock_threshold: string;
  logo_url: string;
  primary_color: string;
}

type FormErrors = Partial<Record<keyof SettingsFormState, string>>;

const SETTINGS_ID = 1;

const CURRENCY_OPTIONS = [
  {value:'ETB', label:'Ethiopian Birr (ETB)', symbol:'ETB'},
  { value: 'USD', label: 'US Dollar (USD)', symbol: '$' },
  { value: 'EUR', label: 'Euro (EUR)', symbol: '€' },
  { value: 'GBP', label: 'British Pound (GBP)', symbol: '£' },
  { value: 'GHS', label: 'Ghanaian Cedi (GHS)', symbol: '₵' },
  { value: 'NGN', label: 'Nigerian Naira (NGN)', symbol: '₦' },
  { value: 'KES', label: 'Kenyan Shilling (KES)', symbol: 'KSh' },
  { value: 'ZAR', label: 'South African Rand (ZAR)', symbol: 'R' },
  { value: 'INR', label: 'Indian Rupee (INR)', symbol: '₹' },
  { value: 'JPY', label: 'Japanese Yen (JPY)', symbol: '¥' },
  { value: 'CNY', label: 'Chinese Yuan (CNY)', symbol: '¥' },
];

const DEFAULT_FORM: SettingsFormState = {
  company_name: '',
  company_email: '',
  company_phone: '',
  company_address: '',
  currency: 'ETB',
  currency_symbol: 'ETB',
  tax_rate: '0',
  low_stock_threshold: '10',
  logo_url: '',
  primary_color: '#0f172a',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form: SettingsFormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.company_name.trim()) {
    errors.company_name = 'Company name is required';
  } else if (form.company_name.trim().length > 120) {
    errors.company_name = 'Company name must be 120 characters or fewer';
  }

  if (!form.company_email.trim()) {
    errors.company_email = 'Company email is required';
  } else if (!EMAIL_RE.test(form.company_email.trim())) {
    errors.company_email = 'Enter a valid email address';
  }

  if (form.company_phone && form.company_phone.trim().length > 30) {
    errors.company_phone = 'Phone must be 30 characters or fewer';
  }

  if (form.company_address && form.company_address.trim().length > 255) {
    errors.company_address = 'Address must be 255 characters or fewer';
  }

  if (form.tax_rate === '' || Number.isNaN(parseFloat(form.tax_rate))) {
    errors.tax_rate = 'Tax rate must be a number';
  } else if (parseFloat(form.tax_rate) < 0 || parseFloat(form.tax_rate) > 100) {
    errors.tax_rate = 'Tax rate must be between 0 and 100';
  }

  if (
    form.low_stock_threshold === '' ||
    Number.isNaN(parseInt(form.low_stock_threshold, 10))
  ) {
    errors.low_stock_threshold = 'Low stock threshold must be a number';
  } else if (parseInt(form.low_stock_threshold, 10) < 0) {
    errors.low_stock_threshold = 'Low stock threshold cannot be negative';
  }

  if (form.logo_url) {
    try {
      // eslint-disable-next-line no-new
      new URL(form.logo_url);
    } catch {
      errors.logo_url = 'Enter a valid URL';
    }
  }

  if (form.primary_color && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(form.primary_color)) {
    errors.primary_color = 'Enter a valid hex color (e.g. #0f172a)';
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsFormState>(DEFAULT_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', SETTINGS_ID)
      .maybeSingle();

    if (error) {
      toast.error('Failed to load settings', { description: error.message });
    } else if (data) {
      setForm({
        company_name: data.company_name ?? '',
        company_email: data.company_email ?? '',
        company_phone: data.company_phone ?? '',
        company_address: data.company_address ?? '',
        currency: data.currency ?? 'USD',
        currency_symbol: data.currency_symbol ?? '$',
        tax_rate: data.tax_rate != null ? String(data.tax_rate) : '0',
        low_stock_threshold:
          data.low_stock_threshold != null ? String(data.low_stock_threshold) : '10',
        logo_url: data.logo_url ?? '',
        primary_color: data.primary_color ?? '#0f172a',
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (field: keyof SettingsFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleCurrencyChange = (value: string) => {
    const option = CURRENCY_OPTIONS.find((o) => o.value === value);
    setForm((prev) => ({
      ...prev,
      currency: value,
      currency_symbol: option?.symbol ?? prev.currency_symbol,
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

    setSaving(true);
    const payload = {
      id: SETTINGS_ID,
      company_name: form.company_name.trim(),
      company_email: form.company_email.trim(),
      company_phone: form.company_phone.trim() || null,
      company_address: form.company_address.trim() || null,
      currency: form.currency,
      currency_symbol: form.currency_symbol,
      tax_rate: parseFloat(form.tax_rate),
      low_stock_threshold: parseInt(form.low_stock_threshold, 10),
      logo_url: form.logo_url.trim() || null,
      primary_color: form.primary_color.trim(),
      updated_at: new Date().toISOString(),
    };

    // Upsert handles both the singleton row existing and not-yet-existing cases.
    const { error } = await supabase.from('settings').upsert(payload, { onConflict: 'id' });
    setSaving(false);

    if (error) {
      toast.error('Failed to save settings', { description: error.message });
      return;
    }
    toast.success('Settings saved successfully');
  };

  return (
    <DashboardShell>
      <PageHeader
        title="Settings"
        description="Manage your company profile, branding, and inventory defaults"
      />

      {loading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border-border/40">
              <CardHeader>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-72" />
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-9 w-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company profile */}
          <Card className="border-border/40">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Company Profile</CardTitle>
              </div>
              <CardDescription>
                Basic information about your organization used across invoices and documents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="company_name">
                    Company Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="company_name"
                    value={form.company_name}
                    onChange={(e) => handleChange('company_name', e.target.value)}
                    placeholder="Hidaya B2B Market"
                    aria-invalid={!!formErrors.company_name}
                  />
                  {formErrors.company_name && (
                    <p className="text-xs text-destructive">{formErrors.company_name}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company_email">
                    Company Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="company_email"
                    type="email"
                    value={form.company_email}
                    onChange={(e) => handleChange('company_email', e.target.value)}
                    placeholder="info@hidayab2b.com"
                    aria-invalid={!!formErrors.company_email}
                  />
                  {formErrors.company_email && (
                    <p className="text-xs text-destructive">{formErrors.company_email}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company_phone">Company Phone</Label>
                  <Input
                    id="company_phone"
                    value={form.company_phone}
                    onChange={(e) => handleChange('company_phone', e.target.value)}
                    placeholder="+251 11 552 0203"
                    aria-invalid={!!formErrors.company_phone}
                  />
                  {formErrors.company_phone && (
                    <p className="text-xs text-destructive">{formErrors.company_phone}</p>
                  )}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="company_address">Company Address</Label>
                  <Textarea
                    id="company_address"
                    value={form.company_address}
                    onChange={(e) => handleChange('company_address', e.target.value)}
                    placeholder="Bole Road, Addis Ababa, Ethiopia"
                    rows={2}
                    aria-invalid={!!formErrors.company_address}
                  />
                  {formErrors.company_address && (
                    <p className="text-xs text-destructive">{formErrors.company_address}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Branding */}
          <Card className="border-border/40">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Branding</CardTitle>
              </div>
              <CardDescription>
                Customize how your marketplace looks. The logo and primary color appear on
                invoices, receipts, and customer-facing pages.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="logo_url">Logo URL</Label>
                  <Input
                    id="logo_url"
                    value={form.logo_url}
                    onChange={(e) => handleChange('logo_url', e.target.value)}
                    placeholder="https://example.com/logo.png"
                    aria-invalid={!!formErrors.logo_url}
                  />
                  {formErrors.logo_url && (
                    <p className="text-xs text-destructive">{formErrors.logo_url}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="primary_color">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="primary_color_picker"
                      value={form.primary_color}
                      onChange={(e) => handleChange('primary_color', e.target.value)}
                      className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1"
                      aria-label="Pick primary color"
                    />
                    <Input
                      id="primary_color"
                      value={form.primary_color}
                      onChange={(e) => handleChange('primary_color', e.target.value)}
                      placeholder="#0f172a"
                      aria-invalid={!!formErrors.primary_color}
                    />
                  </div>
                  {formErrors.primary_color && (
                    <p className="text-xs text-destructive">{formErrors.primary_color}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inventory & finance defaults */}
          <Card className="border-border/40">
            <CardHeader>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Inventory & Finance Defaults</CardTitle>
              </div>
              <CardDescription>
                Default currency and thresholds applied to new products, orders, and stock
                alerts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={form.currency} onValueChange={handleCurrencyChange}>
                    <SelectTrigger id="currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="currency_symbol">Currency Symbol</Label>
                  <Input
                    id="currency_symbol"
                    value={form.currency_symbol}
                    onChange={(e) => handleChange('currency_symbol', e.target.value)}
                    placeholder="ETB"
                    maxLength={5}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tax_rate">Default Tax Rate (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={form.tax_rate}
                    onChange={(e) => handleChange('tax_rate', e.target.value)}
                    placeholder="0"
                    aria-invalid={!!formErrors.tax_rate}
                  />
                  {formErrors.tax_rate && (
                    <p className="text-xs text-destructive">{formErrors.tax_rate}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="low_stock_threshold">Low Stock Threshold</Label>
                  <Input
                    id="low_stock_threshold"
                    type="number"
                    min={0}
                    step={1}
                    value={form.low_stock_threshold}
                    onChange={(e) => handleChange('low_stock_threshold', e.target.value)}
                    placeholder="10"
                    aria-invalid={!!formErrors.low_stock_threshold}
                  />
                  {formErrors.low_stock_threshold && (
                    <p className="text-xs text-destructive">{formErrors.low_stock_threshold}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save bar */}
          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      )}
    </DashboardShell>
  );
}
