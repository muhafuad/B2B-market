'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Factory,
  Package,
  ShoppingCart,
  Truck,
  Warehouse,
  BarChart3,
  Settings,
  FileText,
  MessageSquare,
  Bell,
  Menu,
  X,
  Boxes,
  LogOut,
  Moon,
  Sun,
  ClipboardList,
  CreditCard,
  Star,
  Heart,
  PackageCheck,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/app/components/providers/auth-provider';
import { useLanguage } from '@/app/components/providers/language-provider';
import { LanguageSwitcher } from '@/app/components/ui/language-switcher';
import { useTheme } from 'next-themes';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { cn } from '@/app/lib/utils';
import { supabase } from '@/app/lib/supabase/client';
import type { Notification } from '@/app/lib/types/database';
import { toast } from 'sonner';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminNav: NavItem[] = [
  { label: 'nav.admin.dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'nav.admin.suppliers', href: '/admin/suppliers', icon: Factory },
  { label: 'nav.admin.customers', href: '/admin/customers', icon: Users },
  { label: 'nav.admin.products', href: '/admin/products', icon: Package },
  { label: 'nav.admin.inventory', href: '/admin/inventory', icon: Warehouse },
  { label: 'nav.admin.purchaseRequests', href: '/admin/purchase-requests', icon: ClipboardList },
  { label: 'nav.admin.purchaseOrders', href: '/admin/purchase-orders', icon: ShoppingCart },
  { label: 'nav.admin.deliveries', href: '/admin/deliveries', icon: Truck },
  { label: 'nav.admin.orders', href: '/admin/orders', icon: PackageCheck },
  { label: 'nav.admin.payments', href: '/admin/payments', icon: CreditCard },
  { label: 'nav.admin.employees', href: '/admin/employees', icon: Users },
  { label: 'nav.admin.reports', href: '/admin/reports', icon: BarChart3 },
  { label: 'nav.admin.messages', href: '/admin/messages', icon: MessageSquare },
  { label: 'nav.admin.settings', href: '/admin/settings', icon: Settings },
];

const supplierNav: NavItem[] = [
  { label: 'nav.supplier.dashboard', href: '/suppliers', icon: LayoutDashboard },
  { label: 'nav.supplier.catalog', href: '/suppliers/catalog', icon: Package },
  { label: 'nav.supplier.purchaseRequests', href: '/suppliers/purchase-requests', icon: ClipboardList },
  { label: 'nav.supplier.purchaseOrders', href: '/suppliers/purchase-orders', icon: ShoppingCart },
  { label: 'nav.supplier.deliveries', href: '/suppliers/deliveries', icon: Truck },
  { label: 'nav.supplier.payments', href: '/suppliers/payments', icon: CreditCard },
  { label: 'nav.supplier.messages', href: '/suppliers/messages', icon: MessageSquare },
];

const customerNav: NavItem[] = [
  { label: 'nav.customer.browse', href: '/shop', icon: Package },
  { label: 'nav.customer.cart', href: '/shop/cart', icon: ShoppingCart },
  { label: 'nav.customer.orders', href: '/shop/orders', icon: PackageCheck },
  { label: 'nav.customer.wishlist', href: '/shop/wishlist', icon: Heart },
  { label: 'nav.customer.invoices', href: '/shop/invoices', icon: FileText },
  { label: 'nav.customer.reviews', href: '/shop/reviews', icon: Star },
  { label: 'nav.customer.messages', href: '/shop/messages', icon: MessageSquare },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user, signOut, loading } = useAuth();
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Role-based access control: redirect users to their own section
  useEffect(() => {
    if (!loading && user && profile) {
      const role = profile.role;
      const getHome = () => {
        if (role === 'super_admin') return '/admin';
        if (role === 'supplier') return '/suppliers';
        return '/shop';
      };

      if (pathname.startsWith('/admin') && role !== 'super_admin') {
        router.replace(getHome());
      } else if (pathname.startsWith('/suppliers') && role !== 'supplier') {
        router.replace(getHome());
      } else if (pathname.startsWith('/shop') && role !== 'customer') {
        router.replace(getHome());
      }
    }
  }, [user, profile, loading, pathname, router]);

  useEffect(() => {
    if (user) {
      (async () => {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .or(`user_id.eq.${user.id},role_scope.eq.${profile?.role}`)
          .order('created_at', { ascending: false })
          .limit(10);
        setNotifications(data as Notification[] | []);
      })();
    }
  }, [user, profile]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{t('dashboard.loading')}</div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  // Block rendering if the user is in the wrong section (during redirect)
  const role = profile.role;
  if (pathname.startsWith('/admin') && role !== 'super_admin') return null;
  if (pathname.startsWith('/suppliers') && role !== 'supplier') return null;
  if (pathname.startsWith('/shop') && role !== 'customer') return null;

  const nav = profile.role === 'super_admin' ? adminNav : profile.role === 'supplier' ? supplierNav : customerNav;
  const initials = (profile.full_name || profile.email)
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const markNotificationRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success(t('dashboard.signedOut'));
    router.push('/');
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform border-r border-sidebar-border/20 bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border/20 px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-accent text-white">
              <Boxes className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-white">{t('brand.name')}</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-sidebar-foreground hover:bg-sidebar-border/20"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-4rem)] px-3 py-4">
          <nav className="space-y-1">
            {nav.map((item) => {
              const active = pathname === item.href || (item.href !== '/admin' && item.href !== '/suppliers' && item.href !== '/shop' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-sidebar-accent text-white shadow-sm'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-border/20 hover:text-white'
                  )}
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                  {t(item.label)}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/40 bg-background/80 px-4 backdrop-blur-lg sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden sm:block">
              <p className="text-sm text-muted-foreground">
                {t('dashboard.welcome')}, <span className="font-medium text-foreground">{profile.full_name || t('dashboard.user')}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>{t('dashboard.notifications')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">{t('dashboard.noNotifications')}</div>
                ) : (
                  notifications.map((notif) => (
                    <DropdownMenuItem
                      key={notif.id}
                      onClick={() => markNotificationRead(notif.id)}
                      className="flex flex-col items-start gap-1 py-3"
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="text-sm font-medium">{notif.title}</span>
                        {!notif.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <span className="text-xs text-muted-foreground">{notif.message}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{profile.full_name || 'User'}</span>
                    <span className="text-xs font-normal text-muted-foreground">{profile.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-xs">
                  <Badge variant="secondary" className="capitalize">{t(`role.${profile.role.replace('_', '_')}`)}</Badge>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-destructive" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" /> {t('nav.signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
