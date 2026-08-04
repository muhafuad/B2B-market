'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Boxes, ArrowRight, Loader2, User, Building2 }
 from 'lucide-react';

import { LanguageSwitcher } from '../components/ui/language-switcher'; 
import { useAuth } from '../components/providers/auth-provider';
import { useLanguage } from '../components/providers/language-provider';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent,CardHeader,CardTitle,CardDescription } from '../components/ui/card';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, user, profile, loading } = useAuth();
  const { t } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && profile) {
      redirectByRole(profile.role);
    }
  }, [user, profile, loading]);

  const redirectByRole = (role: string) => {
    if (role === 'super_admin') router.push('/admin');
    else if (role === 'supplier') router.push('/supplier');
    else router.push('/shop');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) return;
    setSubmitting(true);
    const { error } = await signUp(email, password, fullName, 'customer');
    setSubmitting(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success(t('register.success'));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/40 to-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Boxes className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold">{t('brand.name')}</span>
          </Link>
          <LanguageSwitcher showLabel />
        </div>
        <Card className="border-border/40 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t('register.title')}</CardTitle>
            <CardDescription>{t('register.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t('register.fullName')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Smith"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company Name <span className="text-muted-foreground">(optional)</span></Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="company"
                    type="text"
                    placeholder="Your Business LLC"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('register.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('register.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {t('register.creating')}</>
                ) : (
                  <>{t('register.createAccount')} <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t('register.haveAccount')}{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                {t('register.signInHere')}
              </Link>
            </p>
            <div className="mt-4 rounded-lg bg-muted/50 p-3 text-center text-xs text-muted-foreground">
              Supplier accounts are created by the platform owner. Contact us to become a supplier.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
