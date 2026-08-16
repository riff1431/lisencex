'use client';

import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Tag as TagIcon,
  Layers,
  Sparkles,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  ChevronRight,
  FolderPlus,
  Hash,
  Globe,
  Sliders,
  Check,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'categories' | 'tags'>('categories');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Category Modal State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    icon: 'Layers',
    parentId: '',
    displayOrder: 0,
    isActive: true,
    seoTitle: '',
    metaDescription: '',
  });

  // Tag Modal State
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [tagForm, setTagForm] = useState({
    name: '',
    slug: '',
    description: '',
    color: 'indigo',
    isActive: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catsRes, tagsRes] = await Promise.all([
        apiRequest('/admin/categories'),
        apiRequest('/admin/tags'),
      ]);
      setCategories(catsRes?.data || []);
      setTags(tagsRes?.data || []);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to load categories and tags' });
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      setActionLoading(true);
      await apiRequest('/admin/categories/recalculate-counts', { method: 'POST' });
      setNotification({ type: 'success', message: 'Product counts successfully synchronized' });
      await fetchData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to recalculate counts' });
    } finally {
      setActionLoading(false);
    }
  };

  const openCreateCategory = (parentId?: string) => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      slug: '',
      description: '',
      icon: 'Layers',
      parentId: parentId || '',
      displayOrder: categories.length + 1,
      isActive: true,
      seoTitle: '',
      metaDescription: '',
    });
    setCategoryModalOpen(true);
  };

  const openEditCategory = (cat: any) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      icon: cat.icon || 'Layers',
      parentId: cat.parentId?._id || cat.parentId || '',
      displayOrder: cat.displayOrder ?? 0,
      isActive: cat.isActive ?? true,
      seoTitle: cat.seoTitle || '',
      metaDescription: cat.metaDescription || '',
    });
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name) return;

    try {
      setActionLoading(true);
      if (editingCategory) {
        await apiRequest(`/admin/categories/${editingCategory._id}`, {
          method: 'PATCH',
          body: JSON.stringify(categoryForm),
        });
        setNotification({ type: 'success', message: `Category "${categoryForm.name}" updated successfully` });
      } else {
        await apiRequest('/admin/categories', {
          method: 'POST',
          body: JSON.stringify(categoryForm),
        });
        setNotification({ type: 'success', message: `Category "${categoryForm.name}" created successfully` });
      }
      setCategoryModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to save category' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCategory = async (cat: any) => {
    if (!confirm(`Are you sure you want to delete category "${cat.name}"? Subcategories will be moved to root.`)) return;

    try {
      setActionLoading(true);
      await apiRequest(`/admin/categories/${cat._id}`, { method: 'DELETE' });
      setNotification({ type: 'success', message: `Category "${cat.name}" deleted` });
      await fetchData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to delete category' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagForm.name) return;

    try {
      setActionLoading(true);
      await apiRequest('/admin/tags', {
        method: 'POST',
        body: JSON.stringify(tagForm),
      });
      setNotification({ type: 'success', message: `Tag "${tagForm.name}" created successfully` });
      setTagModalOpen(false);
      setTagForm({ name: '', slug: '', description: '', color: 'indigo', isActive: true });
      await fetchData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to create tag' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTag = async (t: any) => {
    if (!confirm(`Are you sure you want to delete tag "${t.name}"?`)) return;

    try {
      setActionLoading(true);
      await apiRequest(`/admin/tags/${t._id}`, { method: 'DELETE' });
      setNotification({ type: 'success', message: `Tag "${t.name}" deleted` });
      await fetchData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to delete tag' });
    } finally {
      setActionLoading(false);
    }
  };

  // Group Categories by Parent
  const rootCategories = categories.filter((c) => !c.parentId);
  const subCategories = categories.filter((c) => !!c.parentId);

  const filteredRoots = rootCategories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase()) ||
    subCategories.some((sub) => sub.parentId?._id === c._id && sub.name.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredTags = tags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase())
  );

  const colorClasses: Record<string, string> = {
    indigo: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    pink: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    rose: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    sky: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
          }`}
        >
          <div className="flex items-center gap-3 text-sm font-medium">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 rounded-lg hover:bg-black/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
              <FolderTree className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">Categories & Tags</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage product hierarchy, nested subcategories, SEO metadata, and reusable tags.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={handleRecalculate}
            disabled={actionLoading}
            variant="outline"
            className="h-10 rounded-xl text-xs font-bold gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
            <span>Sync Product Counts</span>
          </Button>

          {activeTab === 'categories' ? (
            <Button
              onClick={() => openCreateCategory()}
              className="h-10 rounded-xl text-xs font-bold gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
            >
              <Plus className="h-4 w-4" />
              <span>Add Root Category</span>
            </Button>
          ) : (
            <Button
              onClick={() => setTagModalOpen(true)}
              className="h-10 rounded-xl text-xs font-bold gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Tag</span>
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'categories'
                ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            }`}
          >
            <FolderTree className="h-3.5 w-3.5" />
            <span>Categories Hierarchy ({categories.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tags')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'tags'
                ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            }`}
          >
            <TagIcon className="h-3.5 w-3.5" />
            <span>Marketplace Tags ({tags.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-card text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* TAB 1: CATEGORIES HIERARCHY TREE */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
              Loading category hierarchy...
            </div>
          ) : filteredRoots.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-border bg-card">
              <FolderTree className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <h3 className="font-bold text-base text-foreground">No Categories Found</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {search ? 'Try adjusting your search query' : 'Create your first product category'}
              </p>
              <Button onClick={() => openCreateCategory()} className="mt-4 text-xs font-bold">
                Add Category
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRoots.map((root) => {
                const children = subCategories.filter((sub) => sub.parentId?._id === root._id || sub.parentId === root._id);

                return (
                  <div
                    key={root._id}
                    className="rounded-3xl border border-border bg-card overflow-hidden shadow-xs hover:border-indigo-500/30 transition-all"
                  >
                    {/* Root Category Header */}
                    <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 bg-secondary/10">
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
                          <Layers className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-base text-foreground">{root.name}</h3>
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-secondary text-muted-foreground">
                              /{root.slug}
                            </span>
                            {!root.isActive && (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                Inactive
                              </span>
                            )}
                          </div>
                          {root.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{root.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span className="px-3 py-1 rounded-xl text-xs font-bold bg-secondary text-foreground flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5 text-indigo-500" />
                          <span>{root.productCount || 0} products</span>
                        </span>

                        <Button
                          onClick={() => openCreateCategory(root._id)}
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 rounded-xl text-xs font-bold text-indigo-500 hover:bg-indigo-500/10 gap-1.5"
                        >
                          <FolderPlus className="h-3.5 w-3.5" />
                          <span>Add Subcategory</span>
                        </Button>

                        <Button
                          onClick={() => openEditCategory(root)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-xl"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>

                        <Button
                          onClick={() => handleDeleteCategory(root)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-xl hover:text-rose-500 hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Subcategories List */}
                    {children.length > 0 ? (
                      <div className="p-4 sm:p-5 bg-background/50 divide-y divide-border/40">
                        {children.map((child) => (
                          <div
                            key={child._id}
                            className="py-3 px-3 rounded-2xl flex items-center justify-between gap-3 hover:bg-secondary/30 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <ChevronRight className="h-4 w-4 text-indigo-500/70 shrink-0" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm text-foreground">{child.name}</span>
                                  <span className="text-[11px] font-mono text-muted-foreground">/{child.slug}</span>
                                </div>
                                {child.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{child.description}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-lg text-xs font-medium text-muted-foreground bg-secondary/80">
                                {child.productCount || 0} products
                              </span>

                              <Button
                                onClick={() => openEditCategory(child)}
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 rounded-lg"
                              >
                                <Edit2 className="h-3 w-3 text-muted-foreground" />
                              </Button>

                              <Button
                                onClick={() => handleDeleteCategory(child)}
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 rounded-lg hover:text-rose-500 hover:bg-rose-500/10"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-6 py-3 text-xs text-muted-foreground bg-background/30 italic">
                        No subcategories. Click "Add Subcategory" to nest child categories.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REUSABLE PRODUCT TAGS */}
      {activeTab === 'tags' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-xs">
            <h3 className="font-bold text-base text-foreground mb-1">Reusable Product Tags Cloud</h3>
            <p className="text-xs text-muted-foreground mb-6">
              Tags are multi-assigned across products to power marketplace search, filtering, and feature discovery.
            </p>

            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
                Loading tags...
              </div>
            ) : filteredTags.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs italic">
                No tags found matching query.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {filteredTags.map((t) => {
                  const badgeStyle = colorClasses[t.color] || colorClasses.indigo;

                  return (
                    <div
                      key={t._id}
                      className="p-3.5 rounded-2xl border border-border bg-secondary/20 hover:border-indigo-500/30 flex items-center justify-between gap-3 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${badgeStyle} shrink-0 flex items-center gap-1`}>
                          <Hash className="h-3 w-3" />
                          <span>{t.name}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-bold text-muted-foreground">
                          {t.productCount || 0}
                        </span>

                        <Button
                          onClick={() => handleDeleteTag(t)}
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 rounded-lg hover:text-rose-500 hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CATEGORY CREATE/EDIT MODAL */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <FolderTree className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">
                    {editingCategory ? 'Edit Category' : 'Create Category'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Define category metadata, hierarchy parent, and SEO details.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCategoryModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-foreground block mb-1">Category Name *</label>
                  <input
                    type="text"
                    required
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    placeholder="e.g. WordPress Plugins"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background"
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Slug (URL)</label>
                  <input
                    type="text"
                    value={categoryForm.slug}
                    onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                    placeholder="e.g. wordpress-plugins"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-foreground block mb-1">Parent Category (For Subcategories)</label>
                  <select
                    value={categoryForm.parentId}
                    onChange={(e) => setCategoryForm({ ...categoryForm, parentId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background"
                  >
                    <option value="">None (Top-Level Root Category)</option>
                    {rootCategories
                      .filter((c) => !editingCategory || c._id !== editingCategory._id)
                      .map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Display Order</label>
                  <input
                    type="number"
                    value={categoryForm.displayOrder}
                    onChange={(e) => setCategoryForm({ ...categoryForm, displayOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Short description for product marketplace cards & category pages..."
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background"
                />
              </div>

              <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-3">
                <h4 className="font-bold text-foreground flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-indigo-500" />
                  <span>SEO & Marketplace Landing Settings</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-muted-foreground block mb-1">SEO Meta Title</label>
                    <input
                      type="text"
                      value={categoryForm.seoTitle}
                      onChange={(e) => setCategoryForm({ ...categoryForm, seoTitle: e.target.value })}
                      placeholder="e.g. Best WordPress Plugins 2026"
                      className="w-full px-3 py-1.5 rounded-xl border border-border bg-background"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-muted-foreground block mb-1">SEO Meta Description</label>
                    <input
                      type="text"
                      value={categoryForm.metaDescription}
                      onChange={(e) => setCategoryForm({ ...categoryForm, metaDescription: e.target.value })}
                      placeholder="e.g. Download premium verified WordPress plugins..."
                      className="w-full px-3 py-1.5 rounded-xl border border-border bg-background"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveCat"
                  checked={categoryForm.isActive}
                  onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                  className="h-4 w-4 rounded-md border-border text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isActiveCat" className="font-bold text-foreground cursor-pointer">
                  Active (Visible on public marketplace)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCategoryModalOpen(false)}
                  className="h-10 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="h-10 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
                >
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAG CREATE MODAL */}
      {tagModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <TagIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Create Product Tag</h3>
                  <p className="text-xs text-muted-foreground">Add reusable tag for product search & filters.</p>
                </div>
              </div>
              <button onClick={() => setTagModalOpen(false)} className="p-1 rounded-lg text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTag} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-foreground block mb-1">Tag Name *</label>
                <input
                  type="text"
                  required
                  value={tagForm.name}
                  onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                  placeholder="e.g. Ecommerce, AI, Booking"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background"
                />
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">Badge Color</label>
                <select
                  value={tagForm.color}
                  onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background"
                >
                  <option value="indigo">Indigo (Default)</option>
                  <option value="purple">Purple (AI / Creative)</option>
                  <option value="emerald">Emerald (Commerce / Success)</option>
                  <option value="blue">Blue (Tech / Cloud)</option>
                  <option value="amber">Amber (Booking / Feature)</option>
                  <option value="pink">Pink (Social / Media)</option>
                  <option value="rose">Rose (Streaming / Live)</option>
                  <option value="sky">Sky (Utility / Tools)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={tagForm.description}
                  onChange={(e) => setTagForm({ ...tagForm, description: e.target.value })}
                  placeholder="e.g. Tools related to checkout and online shopping"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTagModalOpen(false)}
                  className="h-10 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="h-10 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
                >
                  Create Tag
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
