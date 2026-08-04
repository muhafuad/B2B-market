'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Package,
  Search,
  Filter,
  X,
  ShoppingCart,
  Star,
  Heart,
  PackageOpen,
  Loader2,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Card } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Separator } from '@/app/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { supabase } from '@/app/lib/supabase/client';
import { formatCurrency } from '@/app/lib/types/ui';
import type { Product, Category, Brand } from '@/app/lib/types/database';
import { useCart, useWishlist } from '@/app/hooks/use-cart';
import { toast } from 'sonner';

type ProductWithRelations = Omit<Product, 'category' | 'brand' | 'supplier'> & {
  category: Category | null;
  brand: Brand | null;
};

type SortOption = 'newest' | 'price_asc' | 'price_desc';

const ITEMS_PER_PAGE = 12;

export default function ShopPage() {
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [sort, setSort] = useState<SortOption>('newest');
  const [page, setPage] = useState(1);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  const { addItem } = useCart();
  const { toggleWishlist, isWishlisted } = useWishlist();

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: productsData }, { data: categoriesData }, { data: brandsData }] =
      await Promise.all([
        supabase
          .from('products')
          .select('*, category:categories(*), brand:brands(*)')
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name', { ascending: true }),
        supabase.from('brands').select('*').order('name', { ascending: true }),
      ]);

    setProducts((productsData as unknown as ProductWithRelations[]) || []);
    setCategories((categoriesData as Category[]) || []);
    setBrands((brandsData as Brand[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Featured products
  const featuredProducts = useMemo(
    () => products.filter((p) => p.is_featured).slice(0, 4),
    [products]
  );

  // Apply filters + sort + search
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = products.filter((p) => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q);
      const matchesCategory =
        selectedCategories.length === 0 || (p.category_id && selectedCategories.includes(p.category_id));
      const matchesBrand = selectedBrand === 'all' || p.brand_id === selectedBrand;
      const price = Number(p.wholesale_price);
      const min = priceRange.min ? Number(priceRange.min) : 0;
      const max = priceRange.max ? Number(priceRange.max) : Infinity;
      const matchesPrice = price >= min && price <= max;
      return matchesSearch && matchesCategory && matchesBrand && matchesPrice;
    });

    // Sort
    if (sort === 'price_asc') {
      result = [...result].sort((a, b) => Number(a.wholesale_price) - Number(b.wholesale_price));
    } else if (sort === 'price_desc') {
      result = [...result].sort((a, b) => Number(b.wholesale_price) - Number(a.wholesale_price));
    }
    // newest is already sorted from the query

    return result;
  }, [products, search, selectedCategories, selectedBrand, priceRange, sort]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, selectedCategories, selectedBrand, priceRange, sort]);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleAddToCart = (product: ProductWithRelations) => {
    addItem({
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      image_url: product.image_url,
      price: Number(product.wholesale_price),
      unit: product.unit,
      stock: product.stock,
    });
    toast.success(`${product.name} added to cart`);
  };

  const handleToggleWishlist = (product: ProductWithRelations) => {
    toggleWishlist({
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      image_url: product.image_url,
      price: Number(product.wholesale_price),
      category_name: product.category?.name || null,
      stock: product.stock,
    });
    toast.success(
      isWishlisted(product.id) ? 'Removed from wishlist' : 'Added to wishlist'
    );
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCategories([]);
    setSelectedBrand('all');
    setPriceRange({ min: '', max: '' });
    setSort('newest');
  };

  const hasActiveFilters =
    search !== '' ||
    selectedCategories.length > 0 ||
    selectedBrand !== 'all' ||
    priceRange.min !== '' ||
    priceRange.max !== '';

  const FilterSidebar = (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Categories</h3>
        <div className="space-y-2">
          {categories.length === 0 ? (
            <p className="text-xs text-muted-foreground">No categories</p>
          ) : (
            categories.map((cat) => (
              <div key={cat.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`cat-${cat.id}`}
                  checked={selectedCategories.includes(cat.id)}
                  onCheckedChange={() => toggleCategory(cat.id)}
                />
                <Label
                  htmlFor={`cat-${cat.id}`}
                  className="cursor-pointer text-sm font-normal text-muted-foreground hover:text-foreground"
                >
                  {cat.name}
                </Label>
              </div>
            ))
          )}
        </div>
      </div>

      <Separator />

      {/* Brand */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Brand</h3>
        <Select value={selectedBrand} onValueChange={setSelectedBrand}>
          <SelectTrigger>
            <SelectValue placeholder="All brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Price Range */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Price Range</h3>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={priceRange.min}
            onChange={(e) => setPriceRange((prev) => ({ ...prev, min: e.target.value }))}
            className="text-sm"
          />
          <span className="text-muted-foreground">—</span>
          <Input
            type="number"
            placeholder="Max"
            value={priceRange.max}
            onChange={(e) => setPriceRange((prev) => ({ ...prev, max: e.target.value }))}
            className="text-sm"
          />
        </div>
      </div>

      <Separator />

      {/* Sort */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Sort By</h3>
        <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price_asc">Price: Low to High</SelectItem>
            <SelectItem value="price_desc">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={clearFilters} className="w-full gap-2">
          <X className="h-3.5 w-3.5" />
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <DashboardShell>
      <PageHeader
        title="Browse Products"
        description="Discover products from our B2B marketplace"
      />

      {/* Featured Products */}
      {!loading && featuredProducts.length > 0 && !hasActiveFilters && (
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Featured Products</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <FeaturedProductCard
                key={product.id}
                product={product}
                onAddToCart={() => handleAddToCart(product)}
                onToggleWishlist={() => handleToggleWishlist(product)}
                isWishlisted={isWishlisted(product.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Search + Sort bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products by name..."
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
        <Button
          variant="outline"
          onClick={() => setShowFiltersMobile((s) => !s)}
          className="gap-2 lg:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Desktop Filter Sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <Card className="border-border/40 p-4">{FilterSidebar}</Card>
        </aside>

        {/* Mobile Filter Sidebar */}
        {showFiltersMobile && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowFiltersMobile(false)}
            />
            <div className="absolute left-0 top-0 h-full w-80 max-w-[85%] overflow-y-auto bg-background p-4 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Filters</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowFiltersMobile(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              {FilterSidebar}
            </div>
          </div>
        )}

        {/* Product Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(12)].map((_, i) => (
                <Card key={i} className="overflow-hidden border-border/40">
                  <Skeleton className="aspect-square w-full" />
                  <div className="space-y-2 p-4">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                </Card>
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <PackageOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-base font-medium">No products found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {hasActiveFilters
                    ? 'Try adjusting your search or filters.'
                    : 'Products will appear here once available.'}
                </p>
              </div>
              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="outline" size="sm" className="mt-2 gap-2">
                  <X className="h-4 w-4" />
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {paginated.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={() => handleAddToCart(product)}
                    onToggleWishlist={() => handleToggleWishlist(product)}
                    isWishlisted={isWishlisted(product.id)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, i) => (
                      <Button
                        key={i}
                        variant={page === i + 1 ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setPage(i + 1)}
                      >
                        {i + 1}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}

              <p className="mt-4 text-center text-xs text-muted-foreground">
                Showing {(page - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} products
              </p>
            </>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

// ---------------------------------------------------------------------------
// Product Card
// ---------------------------------------------------------------------------

function ProductCard({
  product,
  onAddToCart,
  onToggleWishlist,
  isWishlisted,
}: {
  product: ProductWithRelations;
  onAddToCart: () => void;
  onToggleWishlist: () => void;
  isWishlisted: boolean;
}) {
  const outOfStock = product.stock <= 0;

  return (
    <Card className="group flex flex-col overflow-hidden border-border/40 transition-shadow hover:shadow-lg">
      <Link href={`/shop/${product.slug}`} className="relative block aspect-square overflow-hidden bg-muted">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        {product.is_featured && (
          <Badge className="absolute left-2 top-2 gap-1">
            <Star className="h-3 w-3 fill-current" />
            Featured
          </Badge>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Badge variant="destructive">Out of Stock</Badge>
          </div>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleWishlist();
          }}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm transition-colors hover:bg-background"
        >
          <Heart
            className={`h-4 w-4 ${
              isWishlisted ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
            }`}
          />
        </button>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex items-center gap-2">
          {product.category && (
            <Badge variant="secondary" className="text-xs">
              {product.category.name}
            </Badge>
          )}
          {product.brand && (
            <span className="text-xs text-muted-foreground">{product.brand.name}</span>
          )}
        </div>

        <Link href={`/shop/${product.slug}`}>
          <h3 className="line-clamp-2 text-sm font-medium leading-snug hover:text-primary">
            {product.name}
          </h3>
        </Link>

        {product.rating > 0 && (
          <div className="mt-1 flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-medium">{product.rating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({product.review_count})</span>
          </div>
        )}

        <div className="mt-auto pt-3">
          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-lg font-bold">{formatCurrency(Number(product.wholesale_price))}</span>
            {Number(product.retail_price) > Number(product.wholesale_price) && (
              <span className="text-xs text-muted-foreground line-through">
                {formatCurrency(Number(product.retail_price))}
              </span>
            )}
          </div>

          <Button
            onClick={onAddToCart}
            disabled={outOfStock}
            className="w-full gap-2"
            size="sm"
          >
            <ShoppingCart className="h-4 w-4" />
            Add to Cart
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Featured Product Card (larger, more prominent)
// ---------------------------------------------------------------------------

function FeaturedProductCard({
  product,
  onAddToCart,
  onToggleWishlist,
  isWishlisted,
}: {
  product: ProductWithRelations;
  onAddToCart: () => void;
  onToggleWishlist: () => void;
  isWishlisted: boolean;
}) {
  const outOfStock = product.stock <= 0;

  return (
    <Card className="group relative flex flex-col overflow-hidden border-primary/20 transition-shadow hover:shadow-xl">
      <Link href={`/shop/${product.slug}`} className="relative block aspect-square overflow-hidden bg-muted">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <Badge className="absolute left-2 top-2 gap-1 bg-primary">
          <Star className="h-3 w-3 fill-current" />
          Featured
        </Badge>
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleWishlist();
          }}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm transition-colors hover:bg-background"
        >
          <Heart
            className={`h-4 w-4 ${
              isWishlisted ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
            }`}
          />
        </button>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {product.category && (
          <Badge variant="secondary" className="mb-2 w-fit text-xs">
            {product.category.name}
          </Badge>
        )}
        <Link href={`/shop/${product.slug}`}>
          <h3 className="line-clamp-2 text-sm font-medium leading-snug hover:text-primary">
            {product.name}
          </h3>
        </Link>

        <div className="mt-auto pt-3">
          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-primary">
              {formatCurrency(Number(product.wholesale_price))}
            </span>
            {Number(product.retail_price) > Number(product.wholesale_price) && (
              <span className="text-xs text-muted-foreground line-through">
                {formatCurrency(Number(product.retail_price))}
              </span>
            )}
          </div>
          <Button
            onClick={onAddToCart}
            disabled={outOfStock}
            className="w-full gap-2"
            size="sm"
          >
            <ShoppingCart className="h-4 w-4" />
            Add to Cart
          </Button>
        </div>
      </div>
    </Card>
  );
}
