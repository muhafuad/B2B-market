'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Boxes,
  Building2,
  CheckCircle2,
  Factory,
  PackageCheck,
  ShieldCheck,
  Truck,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { supabase } from '@/app/lib/supabase/client';
import type { Product, Category } from '@/app/lib/types/database';
import { useLanguage } from '@/app/components/providers/language-provider';
import { LanguageSwitcher } from '@/app/components/ui/language-switcher';

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  

  useEffect(() => {
  setMounted(true);

  (async () => {
    const [
      { data: products },
      { data: cats },
      { count: productCount },
      { count: supplierCount },
      { count: orderCount },
    ] = await Promise.all([
      supabase
        .from('products')
        .select('*, category:categories(*), brand:brands(*)')
        .eq('status', 'active')
        .eq('is_featured', true)
        .limit(4),

      supabase
        .from('categories')
        .select('*')
        .eq('is_active', true),

      supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),

      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'supplier')
        .eq('is_active', true),

      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed'),
    ]);

    setFeaturedProducts((products as Product[]) || []);
    setCategories((cats as Category[]) || []);
    

    setStats({
      products: productCount || 0,
      suppliers: supplierCount || 0,
      orders: orderCount || 0,
      regions: 0,
    });
  })();
}, []);

  const [stats, setStats] = useState({
  products: 0,
  suppliers: 0,
  orders: 0,
  regions: 0,
 });
 const statisticCards = [
  {
    label: t('hero.stats.products'),
    value: `${stats.products.toLocaleString()}+`,
    icon: Boxes,
  },
  {
    label: t('hero.stats.suppliers'),
    value: `${stats.suppliers.toLocaleString()}+`,
    icon: Factory,
  },
  {
    label: t('hero.stats.ordersFulfilled'),
    value: `${stats.orders.toLocaleString()}+`,
    icon: PackageCheck,
  },
  {
    label: t('hero.stats.countries'),
    value: `${stats.regions}+`,
    icon: Truck,
  },
];

  const features = [
    { icon: Factory, title: t('features.supplierManagement.title'), desc: t('features.supplierManagement.desc') },
    { icon: PackageCheck, title: t('features.purchaseRequests.title'), desc: t('features.purchaseRequests.desc') },
    { icon: Boxes, title: t('features.smartInventory.title'), desc: t('features.smartInventory.desc') },
    { icon: Truck, title: t('features.deliveryTracking.title'), desc: t('features.deliveryTracking.desc') },
    { icon: TrendingUp, title: t('features.analytics.title'), desc: t('features.analytics.desc') },
    { icon: ShieldCheck, title: t('features.secure.title'), desc: t('features.secure.desc') },
  ];

  const steps = [
    { icon: Users, step: '01', title: t('howItWorks.step1.title'), desc: t('howItWorks.step1.desc') },
    { icon: Building2, step: '02', title: t('howItWorks.step2.title'), desc: t('howItWorks.step2.desc') },
    { icon: CheckCircle2, step: '03', title: t('howItWorks.step3.title'), desc: t('howItWorks.step3.desc') },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Boxes className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="max-w-30 truncate text-lg font-bold tracking-tight sm:max-w-none sm:text-xl"> {t('brand.name')}</span>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t('nav.features')}
            </a>
            <a href="#categories" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t('nav.categories')}
            </a>
            <a href="#products" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t('nav.products')}
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t('nav.howItWorks')}
            </a>
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            )}
            <LanguageSwitcher />
           <div className="hidden sm:flex items-center gap-2">
            <Link href="/login">
            <Button variant="ghost" size="sm">
              {t('nav.signIn')}
           </Button>
          </Link>

         <Link href="/register">
           <Button size="sm" className="gap-1">
             {t('nav.getStarted')}
          <ArrowRight className="h-4 w-4" />
           </Button>
          </Link>
           </div>

            <Link href="/register" className="sm:hidden">
             <Button size="sm">
              {t('nav.getStarted')}
            </Button>
           </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="absolute -top-24 right-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 left-0 h-96 w-96 rounded-full bg-chart-2/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4 gap-1.5 py-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              {t('hero.badge')}
            </Badge>
           <h1 className="text-2xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {t('hero.title1')}{' '}
              <span className="bg-gradient-to-r from-primary to-chart-4 bg-clip-text text-transparent">
                {t('hero.titleHighlight')}
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
              {t('hero.subtitle')}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/register">
                <Button size="lg" className="w-full gap-2 sm:w-auto">
                  {t('hero.startOrdering')} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/products">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  {t('nav.browseCatalog')}
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statisticCards.map((stat) => (
              <Card key={stat.label} className="border-border/40 bg-card/50 backdrop-blur-sm">
                <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-border/40 py-12 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t('features.title')}
            </h2>
            <p className="mt-4 text-muted-foreground">
              {t('features.subtitle')}
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="group border-border/40 transition-shadow hover:shadow-lg">
                <CardContent className="p-5 sm:p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold sm:text-lg">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="border-b border-border/40 bg-muted/30 py-12 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('categories.title')}</h2>
            <p className="mt-4 text-muted-foreground">
              {t('categories.subtitle')}
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {categories.map((cat) => (
              <Link key={cat.id} href={`/products?category=${cat.slug}`}>
                <Card className="group h-full border-border/40 transition-all hover:border-primary/40 hover:shadow-md">
                  <CardContent className="flex flex-col items-center p-4 text-center sm:p-6">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/5 transition-colors group-hover:bg-primary/10">
                      <Boxes className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-semibold">{cat.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{cat.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section id="products" className="border-b border-border/40 py-12 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('featured.title')}</h2>
              <p className="mt-4 text-muted-foreground">{t('featured.subtitle')}</p>
            </div>
            <Link href="/products" className="mt-4 sm:mt-0">
              <Button variant="outline" className="gap-2">
                {t('featured.viewAll')} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <Link key={product.id} href={`/products/${product.slug}`}>
                <Card className="group h-full overflow-hidden border-border/40 transition-all hover:shadow-lg">
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    {product.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                    {product.is_featured && (
                      <Badge className="absolute left-2 top-2" variant="default">{t('featured.badge')}</Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{product.category?.name}</p>
                    <h3 className="mt-1 line-clamp-1 font-semibold">{product.name}</h3>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-lg font-bold">${product.retail_price.toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground">{t('featured.per')} {product.unit}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-b border-border/40 bg-muted/30 py-12 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('howItWorks.title')}</h2>
            <p className="mt-4 text-muted-foreground">{t('howItWorks.subtitle')}</p>
          </div>
          <div className="mt-8 grid gap-8 sm:mt-12 md:grid-cols-3">
            {steps.map((item) => (
              <div key={item.step} className="relative">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <item.icon className="h-7 w-7" />
                </div>
                <span className="absolute right-0 top-0 text-4xl font-bold text-primary/10">{item.step}</span>
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary to-chart-4">
            <CardContent className="relative p-6 text-center sm:p-12">
              <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {t('cta.title')}
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-white/80">
                  {t('cta.subtitle')}
                </p>
                <Link href="/register" className="mt-8 inline-block">
                  <Button size="lg" variant="secondary" className="gap-2">
                    {t('cta.button')} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Boxes className="h-5 w-5" />
                </div>
                <span className="text-lg font-bold">{t('brand.name')}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {t('brand.tagline')}
              </p>
            </div>
            <div>
              <h4 className="font-semibold">{t('nav.platform')}</h4>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li><Link href="/products" className="hover:text-foreground">{t('nav.browseProducts')}</Link></li>
                <li><a href="#features" className="hover:text-foreground">{t('nav.features')}</a></li>
                <li><a href="#how-it-works" className="hover:text-foreground">{t('nav.howItWorks')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">{t('nav.account')}</h4>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li><Link href="/login" className="hover:text-foreground">{t('nav.signIn')}</Link></li>
                <li><Link href="/register" className="hover:text-foreground">{t('nav.register')}</Link></li>
                <li><Link href="/admin" className="hover:text-foreground">{t('nav.adminPortal')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">{t('nav.contact')}</h4>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>eredwan968@gmail.com</li>
                <li>+251985908973</li>
                <li>Addis Ababa, Ethiopia</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-border/40 pt-8 text-center text-sm text-muted-foreground">
            {t('footer.copyright')}
          </div>
        </div>
      </footer>
    </div>
  );
}
