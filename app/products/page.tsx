'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Boxes, SlidersHorizontal, X, Star, Heart, ShoppingCart, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card,CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { Select, SelectContent,SelectItem,SelectTrigger,SelectValue } from '../components/ui/select';
import { Sheet,SheetContent,SheetTrigger } from '../components/ui/sheet';
import { supabase } from '../lib/supabase/client';
import { formatCurrency } from '../lib/types/ui';
import type { Product, Category, Brand } from '../lib/types/database';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function ProductsPage() {
  const { theme, setTheme } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    (async () => {
      const [{ data: prods }, { data: cats }, { data: brnds }] = await Promise.all([
        supabase.from('products').select('*, category:categories(*), brand:brands(*)').eq('status', 'active').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').eq('is_active', true),
        supabase.from('brands').select('*').eq('is_active', true),
      ]);
      setProducts(prods as Product[] || []);
      setCategories(cats as Category[] || []);
      setBrands(brnds as Brand[] || []);
      setLoading(false);
    })();
  }, []);

  const filtered = products.filter(p => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category_id === categoryFilter;
    const matchesBrand = brandFilter === 'all' || p.brand_id === brandFilter;
    return matchesSearch && matchesCategory && matchesBrand;
  }).sort((a, b) => {
    if (sortBy === 'price_asc') return a.retail_price - b.retail_price;
    if (sortBy === 'price_desc') return b.retail_price - a.retail_price;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const hasFilters = search || categoryFilter !== 'all' || brandFilter !== 'all';

  const clearFilters = () => { setSearch(''); setCategoryFilter('all'); setBrandFilter('all'); setPage(1); };

  const FilterContent = () => (
    <div className="space-y-4">
      <div>
        <Label className="mb-2 block text-sm font-medium">Category</Label>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block text-sm font-medium">Brand</Label>
        <Select value={brandFilter} onValueChange={(v) => { setBrandFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full"><SelectValue placeholder="All brands" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block text-sm font-medium">Sort By</Label>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price_asc">Price: Low to High</SelectItem>
            <SelectItem value="price_desc">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {hasFilters && <Button variant="outline" className="w-full gap-2" onClick={clearFilters}><X className="h-4 w-4" /> Clear Filters</Button>}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Boxes className="h-5 w-5" /></div>
            <span className="text-xl font-bold">Hidaya B2B Market</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/products" className="text-sm font-medium">Products</Link>
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">Sign In</Link>
            <Link href="/register"><Button size="sm">Get Started</Button></Link>
          </nav>
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Product Catalog</h1>
          <p className="mt-2 text-muted-foreground">Browse our full range of industrial supplies</p>
        </div>

        <div className="mb-6 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2 lg:hidden"><SlidersHorizontal className="h-4 w-4" /> Filters</Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-6">
              <h3 className="mb-4 font-semibold">Filters</h3>
              <FilterContent />
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex gap-6">
          <aside className="hidden w-64 shrink-0 lg:block">
            <Card className="border-border/40 p-4 sticky top-24">
              <h3 className="mb-4 font-semibold">Filters</h3>
              <FilterContent />
            </Card>
          </aside>

          <div className="flex-1">
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(9)].map((_, i) => <Skeleton key={i} className="aspect-[3/4] w-full" />)}
              </div>
            ) : paginated.length === 0 ? (
              <Card className="border-border/40">
                <CardContent className="flex flex-col items-center justify-center py-20">
                  <Boxes className="h-12 w-12 text-muted-foreground/40" />
                  <p className="mt-4 text-sm text-muted-foreground">No products found</p>
                  {hasFilters && <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear Filters</Button>}
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {paginated.map(product => (
                    <Link key={product.id} href={`/products/${product.slug}`}>
                      <Card className="group h-full overflow-hidden border-border/40 transition-all hover:shadow-lg">
                        <div className="relative aspect-square overflow-hidden bg-muted">
                          {product.image_url && (
                            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          )}
                          {product.is_featured && <Badge className="absolute left-2 top-2">Featured</Badge>}
                          {product.stock <= 0 && <Badge variant="destructive" className="absolute right-2 top-2">Out of Stock</Badge>}
                        </div>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">{product.category?.name}</p>
                          <h3 className="mt-1 line-clamp-1 font-semibold">{product.name}</h3>
                          <div className="mt-1 flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                            <span className="text-xs text-muted-foreground">{product.rating.toFixed(1)} ({product.review_count})</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div>
                              <span className="text-lg font-bold">{formatCurrency(product.retail_price)}</span>
                              <span className="ml-1 text-xs text-muted-foreground">/ {product.unit}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                    <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
