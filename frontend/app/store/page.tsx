'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Search,
  Filter,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Package,
  Globe2,
  ExternalLink,
  Laptop2,
  Star,
  Tag as TagIcon,
  Zap,
  SlidersHorizontal,
  Flame,
  Crown,
  Rocket,
  Hash,
  FolderTree,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';
import { ProductImage } from '@/components/product-image';

const PRODUCT_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  wordpress_plugin: { label: 'WordPress Plugin', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
  wordpress_theme:  { label: 'WordPress Theme',  color: 'text-sky-500',  bg: 'bg-sky-500/10 border-sky-500/20' },
  php_script:       { label: 'PHP Script',       color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20' },
  nextjs_app:       { label: 'Next.js App',      color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  nextjs_theme:     { label: 'Next.js Theme',    color: 'text-teal-500', bg: 'bg-teal-500/10 border-teal-500/20' },
  nextjs_plugin:    { label: 'Next.js Plugin',   color: 'text-cyan-500', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  saas:             { label: 'SaaS Platform',    color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
  other:            { label: 'Digital Product',  color: 'text-zinc-500', bg: 'bg-zinc-500/10 border-zinc-500/20' },
};

export default function StoreCatalogPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categoriesTree, setCategoriesTree] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedBadge, setSelectedBadge] = useState('all');
  const [sortBy, setSortBy] = useState('popularity');
  const [priceRange, setPriceRange] = useState('all'); // all | under50 | 50to100 | over100

  const fetchCatalogData = async () => {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedTag !== 'all') params.append('tag', selectedTag);
      if (selectedType !== 'all') params.append('productType', selectedType);
      if (selectedBadge !== 'all') params.append('badge', selectedBadge);
      if (search) params.append('search', search);
      if (sortBy) params.append('sortBy', sortBy);

      if (priceRange === 'under50') params.append('maxPrice', '50');
      else if (priceRange === '50to100') {
        params.append('minPrice', '50');
        params.append('maxPrice', '100');
      } else if (priceRange === 'over100') {
        params.append('minPrice', '100');
      }

      const [catalogRes, catsRes, tagsRes] = await Promise.all([
        apiRequest(`/public/store/catalog?${params.toString()}`),
        apiRequest('/public/categories'),
        apiRequest('/public/tags'),
      ]);

      const items = catalogRes.data?.items || catalogRes.data || [];
      setProducts(Array.isArray(items) ? items : []);
      setCategoriesTree(catsRes.data || []);
      setTags(tagsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch catalog', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCatalogData();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, selectedCategory, selectedTag, selectedType, selectedBadge, sortBy, priceRange]);

  return (
    <div className="flex-1 min-h-screen bg-background">
      {/* Hero Banner */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-indigo-500/5 via-purple-500/5 to-background pt-14 pb-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs font-semibold text-indigo-500 mb-3 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Digital Marketplace & Software Hub</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
            Explore Premium Software & Licenses
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Official production-ready digital products with cryptographic activation tokens, automated release heartbeats, and instant license generation.
          </p>

          {/* Search & Top Action Bar */}
          <div className="mt-8 max-w-3xl mx-auto flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by title, keyword, tag, or technology..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-12 pl-10 pr-4 rounded-2xl border border-border bg-card text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-12 px-4 rounded-2xl border border-border bg-card text-foreground text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer"
              >
                <option value="popularity">🔥 Most Popular</option>
                <option value="newest">🚀 Newest Releases</option>
                <option value="updated">⚡ Recently Updated</option>
                <option value="best_seller">👑 Best Sellers</option>
                <option value="price_asc">💵 Price: Low to High</option>
                <option value="price_desc">💎 Price: High to Low</option>
              </select>

              <Link href="/store/categories">
                <Button variant="outline" className="h-12 rounded-2xl text-xs font-bold gap-1.5 shrink-0">
                  <FolderTree className="h-4 w-4 text-indigo-500" />
                  <span className="hidden sm:inline">Browse Categories</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Facet Filter Toolbar */}
      <div className="border-b border-border/80 bg-card/40 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 space-y-3">
          {/* Categories Selector Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              All Categories
            </button>

            {categoriesTree.map((rootCat) => {
              const isSelected = selectedCategory === rootCat.slug;
              return (
                <button
                  key={rootCat._id}
                  onClick={() => setSelectedCategory(isSelected ? 'all' : rootCat.slug)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <span>{rootCat.name}</span>
                  {rootCat.aggregateProductCount > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-background/80 text-muted-foreground'
                      }`}
                    >
                      {rootCat.aggregateProductCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Secondary Filter Row: Promotional Badges & Tags */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Promotional Badges Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1 hidden sm:inline">
                Highlights:
              </span>
              <button
                onClick={() => setSelectedBadge('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedBadge === 'all' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedBadge('featured')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                  selectedBadge === 'featured'
                    ? 'bg-amber-500 text-white'
                    : 'text-muted-foreground hover:text-amber-500'
                }`}
              >
                <Star className="h-3 w-3" />
                <span>Featured</span>
              </button>
              <button
                onClick={() => setSelectedBadge('popular')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                  selectedBadge === 'popular'
                    ? 'bg-rose-500 text-white'
                    : 'text-muted-foreground hover:text-rose-500'
                }`}
              >
                <Flame className="h-3 w-3" />
                <span>Popular</span>
              </button>
              <button
                onClick={() => setSelectedBadge('new')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                  selectedBadge === 'new'
                    ? 'bg-emerald-500 text-white'
                    : 'text-muted-foreground hover:text-emerald-500'
                }`}
              >
                <Rocket className="h-3 w-3" />
                <span>New</span>
              </button>
              <button
                onClick={() => setSelectedBadge('bestseller')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                  selectedBadge === 'bestseller'
                    ? 'bg-purple-500 text-white'
                    : 'text-muted-foreground hover:text-purple-500'
                }`}
              >
                <Crown className="h-3 w-3" />
                <span>Best Sellers</span>
              </button>
            </div>

            {/* Price Filter Chips */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1 hidden sm:inline">
                Price:
              </span>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-semibold cursor-pointer"
              >
                <option value="all">Any Price</option>
                <option value="under50">Under $50</option>
                <option value="50to100">$50 to $100</option>
                <option value="over100">$100+</option>
              </select>
            </div>
          </div>

          {/* Tags Cloud Filter (if tags exist) */}
          {tags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-border/40">
              <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 shrink-0 mr-1">
                <Hash className="h-3 w-3 text-indigo-500" />
                <span>Tags:</span>
              </span>
              {tags.map((t) => {
                const isSelected = selectedTag === t.slug;
                return (
                  <button
                    key={t._id}
                    onClick={() => setSelectedTag(isSelected ? 'all' : t.slug)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 transition-all border ${
                      isSelected
                        ? 'bg-indigo-500/20 text-indigo-500 border-indigo-500/50'
                        : 'bg-secondary/40 text-muted-foreground border-transparent hover:text-foreground'
                    }`}
                  >
                    #{t.name} {t.productCount > 0 && `(${t.productCount})`}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            <p className="text-sm text-muted-foreground">Filtering marketplace catalog...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-3xl bg-card/30 p-8 max-w-lg mx-auto">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-60" />
            <h3 className="text-lg font-bold text-foreground">No Products Found</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              No products match your active combination of categories, tags, and price range.
            </p>
            <Button
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
                setSelectedTag('all');
                setSelectedBadge('all');
                setPriceRange('all');
              }}
              variant="outline"
              className="mt-5 text-xs font-bold rounded-xl"
            >
              Reset All Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const typeConfig = PRODUCT_TYPE_LABELS[product.productType] || PRODUCT_TYPE_LABELS.other;

              return (
                <div
                  key={product._id || product.id}
                  className="group relative rounded-3xl border border-border bg-card overflow-hidden flex flex-col justify-between hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300"
                >
                  <div>
                    {/* Media Thumbnail Container */}
                    <Link href={`/store/${product.slug}`} className="block relative overflow-hidden aspect-[16/10] bg-secondary/30">
                      <ProductImage
                        src={product.thumbnailUrl || product.logoUrl}
                        alt={product.name}
                        productType={product.productType}
                        variant="thumbnail"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Badges Overlay */}
                      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-xl text-[10px] font-bold border backdrop-blur-md ${typeConfig.bg} ${typeConfig.color}`}>
                          {typeConfig.label}
                        </span>

                        {product.isFeatured && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-xl text-[10px] font-bold bg-amber-500 text-white shadow-xs">
                            ⭐ Featured
                          </span>
                        )}

                        {product.isBestSeller && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-xl text-[10px] font-bold bg-purple-500 text-white shadow-xs">
                            👑 Best Seller
                          </span>
                        )}

                        {product.isPopular && !product.isFeatured && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-xl text-[10px] font-bold bg-rose-500 text-white shadow-xs">
                            🔥 Popular
                          </span>
                        )}

                        {product.isNewRelease && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-xl text-[10px] font-bold bg-emerald-500 text-white shadow-xs">
                            🚀 New
                          </span>
                        )}

                        {product.badgeLabel && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-xl text-[10px] font-bold bg-indigo-600 text-white shadow-xs">
                            {product.badgeLabel}
                          </span>
                        )}
                      </div>

                      <div className="absolute top-3 right-3">
                        <span className="text-[10px] font-bold text-foreground/90 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10">
                          v{product.currentVersion || '1.0.0'}
                        </span>
                      </div>
                    </Link>

                    <div className="p-6">
                      {/* Category and Tags header */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap text-[11px]">
                        {product.primaryCategoryId && (
                          <span className="font-semibold text-indigo-500 hover:underline">
                            📁 {product.primaryCategoryId.name || 'Category'}
                          </span>
                        )}
                        {product.tags && product.tags.slice(0, 3).map((t: string) => (
                          <span key={t} className="text-muted-foreground font-mono">
                            #{t}
                          </span>
                        ))}
                      </div>

                      {/* Product Title */}
                      <Link href={`/store/${product.slug}`}>
                        <h3 className="text-lg font-bold text-foreground group-hover:text-indigo-500 transition-colors line-clamp-1">
                          {product.name}
                        </h3>
                      </Link>

                      {/* Short Description */}
                      <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {product.shortDescription || product.description || 'Enterprise grade digital product with instant license key delivery.'}
                      </p>

                      {/* Feature Highlights */}
                      <div className="mt-4 pt-3.5 border-t border-border/60 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                          Signed JWT
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Zap className="h-3.5 w-3.5 text-amber-500" />
                          Auto Updates
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" />
                          Domain Bound
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Price & Action */}
                  <div className="px-6 pb-6 pt-2 flex items-center justify-between border-t border-border/40">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Starting at</span>
                      <span className="text-2xl font-black text-foreground">
                        ${product.price || 49}
                      </span>
                    </div>

                    <Link href={`/store/${product.slug}`}>
                      <Button className="rounded-xl font-bold gap-1.5 shadow-md shadow-indigo-500/10 bg-indigo-600 hover:bg-indigo-700 text-white">
                        <span>View Plans</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
