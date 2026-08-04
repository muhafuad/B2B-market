'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Boxes, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/app/components/providers/auth-provider';
import { useLanguage } from '@/app/components/providers/language-provider';
import { LanguageSwitcher } from '@/app/components/ui/language-switcher';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user, profile, loading } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && profile) {
      if (profile.must_change_password) {
        router.replace('/change-password');
      } else {
        redirectByRole(profile.role);
      }
    }
  }, [user, profile, loading, router]);

  const redirectByRole = (role: string) => {
    if (role === 'super_admin') router.push('/admin');
    else if (role === 'supplier') router.push('/suppliers');
    else router.push('/shop');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success(t('login.welcome'));
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
            <CardTitle className="text-2xl">{t('login.welcomeBack')}</CardTitle>
            <CardDescription>{t('login.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('login.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('login.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {t('login.signingIn')}</>
                ) : (
                  <>{t('login.signIn')} <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t('login.noAccount')}{' '}
              <Link href="/register" className="font-medium text-primary hover:underline">
                {t('nav.registerHere')}
              </Link>
            </p>
            <div className="mt-4 rounded-lg bg-muted/50 p-3 text-center text-xs text-muted-foreground">
              {t('login.adminNote')}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
