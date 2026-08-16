'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FolderTree,
  Layers,
  ChevronRight,
  Package,
  Sparkles,
  ArrowRight,
  Search,
  Code2,
  Terminal,
  Globe2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

const ICON_MAP: Record<string, any> = {
  Layers,
  Sparkles,
  Terminal,
  Code2,
  Globe2,
};

export default function CategoriesDirectoryPage() {
  const [categoriesTree, setCategoriesTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchCats = async () => {
      try {
        setLoading(true);
        const res = await apiRequest('/public/categories');
        setCategoriesTree(res?.data || []);
      } catch (err) {
        console.error('Failed to load categories', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCats();
  }, []);

  const filteredTree = categoriesTree.filter((root) =>
    root.name.toLowerCase().includes(search.toLowerCase()) ||
    root.description?.toLowerCase().includes(search.toLowerCase()) ||
    root.subcategories?.some((sub: any) => sub.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex-1 min-h-screen bg-background">
      {/* Header */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-indigo-500/5 via-purple-500/5 to-background pt-14 pb-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs font-semibold text-indigo-500 mb-3">
            <FolderTree className="h-3.5 w-3.5" />
            <span>Marketplace Catalog Directory</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
            Browse Products by Category
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Discover specialized WordPress plugins, Next.js application boilerplates, PHP scripts, and SaaS software tiers.
          </p>

          <div className="mt-8 max-w-md mx-auto relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter categories & subcategories..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs"
            />
          </div>
        </div>
      </section>

      {/* Directory Grid */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading directory...</p>
          </div>
        ) : filteredTree.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-3xl bg-card/30 p-8 max-w-md mx-auto">
            <FolderTree className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-60" />
            <h3 className="font-bold text-base text-foreground">No Categories Found</h3>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTree.map((cat) => {
              const IconComponent = ICON_MAP[cat.icon] || Layers;

              return (
                <div
                  key={cat._id}
                  className="rounded-3xl border border-border bg-card p-6 flex flex-col justify-between hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                        <IconComponent className="h-6 w-6" />
                      </div>

                      <span className="px-3 py-1 rounded-xl text-xs font-bold bg-secondary text-foreground flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-indigo-500" />
                        <span>{cat.aggregateProductCount || cat.productCount || 0} Products</span>
                      </span>
                    </div>

                    <div>
                      <Link href={`/store/categories/${cat.slug}`}>
                        <h3 className="text-xl font-bold text-foreground group-hover:text-indigo-500 transition-colors">
                          {cat.name}
                        </h3>
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                        {cat.description || `Explore production-ready verified ${cat.name}.`}
                      </p>
                    </div>

                    {/* Subcategories List */}
                    {cat.subcategories && cat.subcategories.length > 0 && (
                      <div className="pt-3 border-t border-border/60 space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                          Popular Subcategories
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {cat.subcategories.map((sub: any) => (
                            <Link
                              key={sub._id}
                              href={`/store?category=${sub.slug}`}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary/60 hover:bg-indigo-500/10 hover:text-indigo-500 transition-colors flex items-center gap-1"
                            >
                              <span>{sub.name}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">({sub.productCount || 0})</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-6 mt-4 border-t border-border/40 flex items-center justify-between">
                    <Link href={`/store?category=${cat.slug}`}>
                      <Button variant="ghost" className="p-0 text-xs font-bold text-indigo-500 hover:bg-transparent hover:text-indigo-600 gap-1.5">
                        <span>Browse All {cat.name}</span>
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
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
