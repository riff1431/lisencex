'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FolderTree,
  Layers,
  ChevronRight,
  Package,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';
import { ProductImage } from '@/components/product-image';

export default function CategoryDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [category, setCategory] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    const fetchCategoryAndProducts = async () => {
      try {
        setLoading(true);
        const [catRes, prodRes] = await Promise.all([
          apiRequest(`/public/categories/${slug}`),
          apiRequest(`/public/store/catalog?category=${slug}`),
        ]);

        setCategory(catRes?.data || null);
        const items = prodRes?.data?.items || prodRes?.data || [];
        setProducts(Array.isArray(items) ? items : []);
      } catch (err) {
        console.error('Failed to load category details', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryAndProducts();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading category products...</p>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <FolderTree className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
        <h2 className="text-2xl font-bold text-foreground">Category Not Found</h2>
        <p className="text-muted-foreground mt-1 max-w-md">
          The requested category slug does not exist or has been deactivated.
        </p>
        <Link href="/store/categories" className="mt-6">
          <Button variant="outline">Browse All Categories</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-background">
      {/* Breadcrumb Header */}
      <div className="border-b border-border/60 bg-card/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/store" className="hover:text-foreground transition-colors">Store</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/store/categories" className="hover:text-foreground transition-colors">Categories</Link>
          {category.parent && (
            <>
              <ChevronRight className="h-3 w-3" />
              <Link href={`/store/categories/${category.parent.slug}`} className="hover:text-foreground transition-colors">
                {category.parent.name}
              </Link>
            </>
          )}
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-semibold truncate">{category.name}</span>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-indigo-500/5 via-purple-500/5 to-background py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 uppercase tracking-wide">
                  Category Hub
                </span>
                <span className="text-xs font-bold text-muted-foreground">
                  {products.length} Products Available
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                {category.name}
              </h1>

              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                {category.description || `Browse verified software products, licenses, and plugins in ${category.name}.`}
              </p>
            </div>

            <Link href="/store">
              <Button variant="outline" className="rounded-xl text-xs font-bold gap-2 shrink-0">
                <Filter className="h-3.5 w-3.5" />
                <span>Open Full Catalog</span>
              </Button>
            </Link>
          </div>

          {/* Subcategories (if any) */}
          {category.subcategories && category.subcategories.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border/60 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-muted-foreground mr-2">Subcategories:</span>
              {category.subcategories.map((sub: any) => (
                <Link
                  key={sub._id}
                  href={`/store/categories/${sub.slug}`}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-secondary hover:bg-indigo-500/10 hover:text-indigo-500 transition-colors"
                >
                  {sub.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Products Grid */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {products.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-3xl bg-card/30 p-8 max-w-md mx-auto">
            <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-60" />
            <h3 className="font-bold text-base text-foreground">No Products Yet</h3>
            <p className="text-xs text-muted-foreground mt-1">
              There are currently no published products under this category.
            </p>
            <Link href="/store" className="mt-4 inline-block">
              <Button size="sm" variant="outline">Browse All Products</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product._id || product.id}
                className="group relative rounded-3xl border border-border bg-card overflow-hidden flex flex-col justify-between hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300"
              >
                <div>
                  <Link href={`/store/${product.slug}`} className="block relative overflow-hidden aspect-[16/10] bg-secondary/30">
                    <ProductImage
                      src={product.thumbnailUrl || product.logoUrl}
                      alt={product.name}
                      productType={product.productType}
                      variant="thumbnail"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3">
                      <span className="text-[10px] font-bold text-foreground/90 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10">
                        v{product.currentVersion || '1.0.0'}
                      </span>
                    </div>
                  </Link>

                  <div className="p-6">
                    <Link href={`/store/${product.slug}`}>
                      <h3 className="text-lg font-bold text-foreground group-hover:text-indigo-500 transition-colors line-clamp-1">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {product.shortDescription || product.description}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-2 flex items-center justify-between border-t border-border/40">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Starting at</span>
                    <span className="text-2xl font-black text-foreground">
                      ${product.price || 49}
                    </span>
                  </div>

                  <Link href={`/store/${product.slug}`}>
                    <Button className="rounded-xl font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
                      <span>View Plans</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
