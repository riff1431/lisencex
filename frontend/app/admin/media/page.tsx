'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Image as ImageIcon,
  UploadCloud,
  LayoutGrid,
  List as ListIcon,
  Search,
  Check,
  X,
  FileCode,
  FileArchive,
  FileText,
  Lock,
  Globe,
  SlidersHorizontal,
  Folder,
  Layers,
  Sparkles,
  Download,
  Trash2,
  ExternalLink,
  Copy,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Edit3,
  HardDrive,
  Cloud,
  Zap,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function AdminMediaLibraryPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [folderStats, setFolderStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [folderFilter, setFolderFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Selected Items for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkTargetFolder, setBulkTargetFolder] = useState('general');

  // Add New Dropzone State
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFolder, setUploadFolder] = useState('general');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Media Details Inspector Drawer
  const [inspectingMedia, setInspectingMedia] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [savingMetadata, setSavingMetadata] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  // Safe Delete Confirmation Modal
  const [deleteWarning, setDeleteWarning] = useState<{ open: boolean; media: any; references: any[] } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadMedia = async () => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: viewMode === 'grid' ? '24' : '15',
        search,
        mediaType: typeFilter,
        folder: folderFilter,
        storageProvider: providerFilter,
        visibility: visibilityFilter,
        sort: sortBy,
      });

      const res = await apiRequest(`/admin/media?${params.toString()}`);
      if (res.data) {
        const d = res.data?.data || res.data;
        setMediaItems(d.items || []);
        setTotal(d.total || 0);
        setTotalPages(d.totalPages || 1);
        if (d.folderStats) setFolderStats(d.folderStats);
      }
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || 'Failed to load media library' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, [page, search, typeFilter, folderFilter, providerFilter, visibilityFilter, sortBy, viewMode]);

  const handleInspect = async (item: any) => {
    try {
      // Fetch full details with live usage references
      const res = await apiRequest(`/admin/media/${item.mediaId}`);
      const freshData = res.data?.data || res.data || item;
      setInspectingMedia(freshData);
      setEditForm({
        title: freshData.title || '',
        altText: freshData.altText || '',
        caption: freshData.caption || '',
        description: freshData.description || '',
        folder: freshData.folder || 'general',
        visibility: freshData.visibility || 'public',
      });
    } catch {
      setInspectingMedia(item);
      setEditForm({
        title: item.title || '',
        altText: item.altText || '',
        caption: item.caption || '',
        description: item.description || '',
        folder: item.folder || 'general',
        visibility: item.visibility || 'public',
      });
    }
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingMedia) return;
    setSavingMetadata(true);

    try {
      const res = await apiRequest(`/admin/media/${inspectingMedia.mediaId}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });

      if (res.success) {
        setFeedback({ type: 'success', message: 'Media metadata updated successfully!' });
        setInspectingMedia((prev: any) => ({ ...prev, ...editForm }));
        loadMedia();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save metadata' });
    } finally {
      setSavingMetadata(false);
    }
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadProgress(25);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      formData.append('folder', uploadFolder);

      const res = await fetch('http://localhost:5001/api/v1/admin/media/batch-upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
        body: formData,
      });

      setUploadProgress(85);
      const data = await res.json();
      if (res.ok) {
        setUploadProgress(100);
        setTimeout(() => {
          setUploading(false);
          setUploadOpen(false);
          setFeedback({
            type: 'success',
            message: `Successfully uploaded ${data.data?.count || files.length} file(s) to Media Library!`,
          });
          loadMedia();
        }, 500);
      } else {
        alert(data.message || 'Upload failed');
        setUploading(false);
      }
    } catch (err: any) {
      alert(err.message || 'Upload error');
      setUploading(false);
    }
  };

  const handleReplaceFile = async (files: FileList | null) => {
    if (!files || files.length === 0 || !inspectingMedia) return;

    try {
      const formData = new FormData();
      formData.append('file', files[0]);

      const res = await fetch(`http://localhost:5001/api/v1/admin/media/${inspectingMedia.mediaId}/replace`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Media binary file replaced successfully!' });
        handleInspect(inspectingMedia);
        loadMedia();
      } else {
        alert(data.message || 'Replace failed');
      }
    } catch (err: any) {
      alert(err.message || 'Replace error');
    }
  };

  const handleDeleteItem = async (media: any, force = false) => {
    try {
      const res = await apiRequest(`/admin/media/${media.mediaId}?force=${force}`, {
        method: 'DELETE',
      });

      if (res.success) {
        setFeedback({ type: 'success', message: `Media item "${media.title || media.originalName}" deleted` });
        setInspectingMedia(null);
        setDeleteWarning(null);
        loadMedia();
      }
    } catch (err: any) {
      if (err.message?.includes('Safe Delete') || err.message?.includes('referenced')) {
        // Fetch live references to present warning dialog
        const details = await apiRequest(`/admin/media/${media.mediaId}`);
        const refs = details.data?.data?.usedIn || details.data?.usedIn || [];
        setDeleteWarning({
          open: true,
          media,
          references: refs,
        });
      } else {
        setFeedback({ type: 'error', message: err.message || 'Failed to delete' });
      }
    }
  };

  const handleBulkExecute = async () => {
    if (selectedIds.length === 0) return;

    if (bulkAction === 'delete') {
      if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected media items?`)) {
        return;
      }
      try {
        const res = await apiRequest('/admin/media/bulk-delete', {
          method: 'POST',
          body: JSON.stringify({ mediaIds: selectedIds, force: false }),
        });
        const result = res.data?.data || res.data;
        if (result.blockedCount > 0) {
          alert(`Deleted ${result.deletedCount} items. ${result.blockedCount} item(s) were blocked by Safe Delete Protection because they are actively in use.`);
        } else {
          setFeedback({ type: 'success', message: `Deleted ${result.deletedCount} items successfully` });
        }
        setSelectedIds([]);
        loadMedia();
      } catch (err: any) {
        setFeedback({ type: 'error', message: err.message || 'Bulk delete failed' });
      }
    } else if (bulkAction === 'folder') {
      try {
        const res = await apiRequest('/admin/media/bulk-folder', {
          method: 'POST',
          body: JSON.stringify({ mediaIds: selectedIds, folder: bulkTargetFolder }),
        });
        setFeedback({ type: 'success', message: `Moved ${selectedIds.length} items to folder "${bulkTargetFolder}"` });
        setSelectedIds([]);
        loadMedia();
      } catch (err: any) {
        setFeedback({ type: 'error', message: err.message || 'Bulk move failed' });
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            <span>Administration</span>
            <span>/</span>
            <span className="text-foreground">Media</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <ImageIcon className="h-7 w-7 text-indigo-500" />
            Media Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Centralized WordPress-style media management for product graphics, packages, documentation, and customer assets
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setUploadOpen(true)}
            className="gap-2 font-bold shadow-md shadow-primary/20"
          >
            <UploadCloud className="h-4 w-4" />
            Add New Media
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadMedia}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Upload Drawer / Modal */}
      {uploadOpen && (
        <div className="p-6 rounded-3xl border-2 border-dashed border-indigo-500/50 bg-indigo-500/5 transition-all space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-indigo-500 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">Upload Media to Library</h3>
                <p className="text-xs text-muted-foreground">
                  Files are stored on your active default storage provider and tracked in the central index
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={uploadFolder}
                onChange={(e) => setUploadFolder(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-border bg-background text-xs font-semibold"
              >
                <option value="general">Folder: General</option>
                <option value="thumbnails">Folder: Thumbnails</option>
                <option value="icons">Folder: Icons</option>
                <option value="banners">Folder: Banners</option>
                <option value="screenshots">Folder: Screenshots</option>
                <option value="packages">Folder: Packages</option>
                <option value="documentation">Folder: Documentation</option>
              </select>

              <button
                type="button"
                onClick={() => setUploadOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleUploadFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className="p-8 border border-border bg-card/60 hover:bg-card rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleUploadFiles(e.target.files)}
            />
            <ImageIcon className="h-8 w-8 text-indigo-500 mb-1" />
            <span className="font-bold text-xs text-foreground">Drag & drop files here, or browse</span>
            <span className="text-[11px] text-muted-foreground font-medium">
              Maximum file size: 100 MB per file (PNG, JPG, WEBP, SVG, ZIP, PDF)
            </span>
          </div>

          {uploading && (
            <div className="space-y-1 pt-2">
              <div className="flex justify-between text-xs text-muted-foreground font-semibold">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Filter & Action Toolbar */}
      <div className="p-4 rounded-3xl border border-border bg-card shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left Controls: Search & Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="relative min-w-[200px] flex-1 sm:flex-none">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search media by title/filename..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-60 pl-8 pr-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold"
            >
              <option value="all">All Types</option>
              <option value="image">Images</option>
              <option value="package">ZIP Packages</option>
              <option value="document">Documents</option>
              <option value="audio">Audio</option>
              <option value="video">Video</option>
            </select>

            <select
              value={folderFilter}
              onChange={(e) => {
                setFolderFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold"
            >
              <option value="">All Folders ({folderStats.all || total})</option>
              <option value="thumbnails">Thumbnails ({folderStats.thumbnail || 0})</option>
              <option value="icons">Icons ({folderStats.icon || 0})</option>
              <option value="banners">Banners ({folderStats.banner || 0})</option>
              <option value="screenshots">Screenshots ({folderStats.screenshot || 0})</option>
              <option value="packages">Packages ({folderStats.package || 0})</option>
              <option value="documentation">Documentation ({folderStats.document || 0})</option>
              <option value="support">Support ({folderStats.support || 0})</option>
              <option value="general">General ({folderStats.general || 0})</option>
            </select>

            <select
              value={providerFilter}
              onChange={(e) => {
                setProviderFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold"
            >
              <option value="">All Providers</option>
              <option value="local">Local Disk</option>
              <option value="s3">Amazon S3</option>
              <option value="r2">Cloudflare R2</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="name_asc">Name: A → Z</option>
              <option value="name_desc">Name: Z → A</option>
              <option value="size_desc">Size: Largest</option>
              <option value="size_asc">Size: Smallest</option>
            </select>
          </div>

          {/* Right Controls: View Switcher */}
          <div className="flex items-center gap-2 self-end lg:self-auto">
            <div className="p-1 rounded-xl bg-secondary border border-border flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-card text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Grid View (WordPress Style)"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-card text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="List / Table View"
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Action Sub-bar */}
        {selectedIds.length > 0 && (
          <div className="p-3 rounded-2xl bg-secondary/60 border border-border/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              <span>{selectedIds.length} item(s) selected</span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-border bg-background font-semibold text-xs"
              >
                <option value="">-- Bulk Actions --</option>
                <option value="delete">Delete Selected</option>
                <option value="folder">Move to Folder</option>
              </select>

              {bulkAction === 'folder' && (
                <select
                  value={bulkTargetFolder}
                  onChange={(e) => setBulkTargetFolder(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-border bg-background font-semibold text-xs"
                >
                  <option value="general">General</option>
                  <option value="thumbnails">Thumbnails</option>
                  <option value="icons">Icons</option>
                  <option value="banners">Banners</option>
                  <option value="screenshots">Screenshots</option>
                  <option value="packages">Packages</option>
                  <option value="documentation">Documentation</option>
                </select>
              )}

              <Button
                size="sm"
                disabled={!bulkAction}
                onClick={handleBulkExecute}
                className="text-xs font-semibold"
              >
                Apply
              </Button>

              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-xs text-muted-foreground hover:text-foreground underline ml-2"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content: Grid or List */}
      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading media library...</div>
      ) : mediaItems.length === 0 ? (
        <div className="p-16 rounded-3xl border border-border bg-card text-center space-y-4">
          <div className="h-16 w-16 rounded-3xl bg-secondary text-muted-foreground flex items-center justify-center mx-auto">
            <ImageIcon className="h-8 w-8" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">No media items found</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your search filters, or click "Add New Media" to upload files.
            </p>
          </div>
          <Button onClick={() => setUploadOpen(true)} className="gap-2">
            <UploadCloud className="h-4 w-4" />
            Upload Media
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        /* WordPress-Style Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {mediaItems.map((item) => {
            const isSelected = selectedIds.includes(item.mediaId);
            const isImage = item.mimeType?.startsWith('image/');
            const isZip = item.mimeType?.includes('zip') || item.extension === 'zip';
            const isDoc = item.mimeType?.includes('pdf') || item.extension === 'pdf';
            const usageCount = item.usedIn?.length || 0;

            return (
              <div
                key={item.mediaId}
                className={`group relative aspect-square rounded-2xl border cursor-pointer overflow-hidden transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500/60 bg-indigo-500/5 shadow-lg shadow-indigo-500/10'
                    : 'border-border bg-card hover:border-indigo-500/40 hover:shadow-md'
                }`}
                onClick={() => handleInspect(item)}
              >
                {/* Checkbox Trigger */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isSelected) {
                      setSelectedIds(selectedIds.filter((id) => id !== item.mediaId));
                    } else {
                      setSelectedIds([...selectedIds, item.mediaId]);
                    }
                  }}
                  className={`absolute top-2 left-2 z-10 h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-indigo-500 border-indigo-500 text-white shadow-xs'
                      : 'bg-background/80 border-border backdrop-blur-xs opacity-0 group-hover:opacity-100 hover:bg-background'
                  }`}
                >
                  {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                </div>

                {/* Usage Badge */}
                {usageCount > 0 && (
                  <span
                    className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/90 text-white shadow-xs backdrop-blur-xs"
                    title={`Referenced in ${usageCount} place(s)`}
                  >
                    🔗 {usageCount}
                  </span>
                )}

                {/* Thumbnail Display */}
                <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                  {isImage ? (
                    <img
                      src={item.publicUrl || `http://localhost:5001/api/v1/public/storage/serve/${item.mediaId}`}
                      alt={item.title || item.originalName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : isZip ? (
                    <div className="flex flex-col items-center gap-1 p-2 text-center">
                      <FileArchive className="h-10 w-10 text-amber-500" />
                      <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[90px]">
                        {item.originalName}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 p-2 text-center">
                      <FileText className="h-10 w-10 text-indigo-500" />
                      <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[90px]">
                        {item.originalName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Overlay on Hover */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-2.5 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[11px] font-bold truncate">{item.title || item.originalName}</p>
                  <div className="flex items-center justify-between text-[9px] text-white/70 font-mono mt-0.5">
                    <span>{item.width ? `${item.width}×${item.height}` : item.extension.toUpperCase()}</span>
                    <span>{formatBytes(item.sizeBytes)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List / Table View */
        <div className="border border-border rounded-3xl overflow-hidden bg-card shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/50 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === mediaItems.length && mediaItems.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(mediaItems.map((m) => m.mediaId));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    className="rounded text-indigo-600"
                  />
                </th>
                <th className="p-3.5">Media</th>
                <th className="p-3.5">Folder</th>
                <th className="p-3.5">Provider</th>
                <th className="p-3.5">Size & Dimensions</th>
                <th className="p-3.5">Used In</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-medium">
              {mediaItems.map((item) => {
                const isSelected = selectedIds.includes(item.mediaId);
                const isImage = item.mimeType?.startsWith('image/');
                const usageCount = item.usedIn?.length || 0;

                return (
                  <tr
                    key={item.mediaId}
                    className={`hover:bg-secondary/30 transition-colors cursor-pointer ${
                      isSelected ? 'bg-indigo-500/5' : ''
                    }`}
                    onClick={() => handleInspect(item)}
                  >
                    <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds([...selectedIds, item.mediaId]);
                          } else {
                            setSelectedIds(selectedIds.filter((id) => id !== item.mediaId));
                          }
                        }}
                        className="rounded text-indigo-600"
                      />
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-secondary border border-border overflow-hidden shrink-0 flex items-center justify-center">
                          {isImage ? (
                            <img
                              src={item.publicUrl || `http://localhost:5001/api/v1/public/storage/serve/${item.mediaId}`}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FileCode className="h-5 w-5 text-indigo-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-foreground truncate max-w-xs">{item.title || item.originalName}</div>
                          <div className="text-[10px] font-mono text-muted-foreground truncate max-w-xs">{item.fileName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-secondary text-foreground uppercase">
                        {item.folder}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          item.storageProvider === 's3'
                            ? 'bg-amber-500/10 text-amber-500'
                            : item.storageProvider === 'r2'
                            ? 'bg-purple-500/10 text-purple-500'
                            : 'bg-indigo-500/10 text-indigo-500'
                        }`}
                      >
                        {item.storageProvider}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[11px]">
                      <div>{formatBytes(item.sizeBytes)}</div>
                      {item.width > 0 && <div className="text-[10px] text-muted-foreground">{item.width}×{item.height}px</div>}
                    </td>
                    <td className="p-3.5">
                      {usageCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                          {usageCount} product(s)
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Unused</span>
                      )}
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleInspect(item)}
                          className="p-1.5 rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-foreground"
                          title="Edit Metadata"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item)}
                          className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-500"
                          title="Delete Media"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            Showing page {page} of {totalPages} ({total} items in library)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Media Details Drawer / Inspector Modal */}
      {inspectingMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
            {/* Drawer Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-card/70">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Media Item Details</h3>
                  <p className="text-xs text-muted-foreground font-mono truncate max-w-sm">
                    {inspectingMedia.originalName} ({inspectingMedia.mediaId})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectingMedia(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
              {/* Left Preview Column (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="aspect-video w-full rounded-2xl bg-secondary/40 border border-border overflow-hidden flex items-center justify-center shadow-xs">
                  {inspectingMedia.mimeType?.startsWith('image/') ? (
                    <img
                      src={inspectingMedia.publicUrl || `http://localhost:5001/api/v1/public/storage/serve/${inspectingMedia.mediaId}`}
                      alt={inspectingMedia.title}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <FileCode className="h-16 w-16 text-indigo-500" />
                  )}
                </div>

                {/* Storage & Metadata Technical Box */}
                <div className="p-4 rounded-2xl bg-secondary/40 border border-border space-y-2 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Provider:</span>
                    <span className="font-bold uppercase text-indigo-500">{inspectingMedia.storageProvider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File Size:</span>
                    <span className="text-foreground">{formatBytes(inspectingMedia.sizeBytes)}</span>
                  </div>
                  {inspectingMedia.width > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dimensions:</span>
                      <span className="text-foreground">{inspectingMedia.width} × {inspectingMedia.height} px</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">MIME Type:</span>
                    <span className="text-foreground">{inspectingMedia.mimeType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Checksum:</span>
                    <span className="text-foreground truncate max-w-[120px]" title={inspectingMedia.checksum}>
                      {inspectingMedia.checksum ? inspectingMedia.checksum.slice(0, 10) + '...' : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uploaded By:</span>
                    <span className="text-foreground truncate max-w-[120px]">{inspectingMedia.uploadedBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uploaded Date:</span>
                    <span className="text-foreground">{new Date(inspectingMedia.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Replace File Button */}
                <div>
                  <input
                    ref={replaceFileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => handleReplaceFile(e.target.files)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-semibold"
                    onClick={() => replaceFileInputRef.current?.click()}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Replace Binary File
                  </Button>
                </div>
              </div>

              {/* Right Form & "Used In" Column (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                {/* "Used In" References Banner */}
                <div className="p-4 rounded-2xl bg-secondary/50 border border-border space-y-2">
                  <div className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                    <Info className="h-4 w-4 text-indigo-500" />
                    <span>Used In Platform Relationships</span>
                  </div>

                  {inspectingMedia.usedIn && inspectingMedia.usedIn.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      {inspectingMedia.usedIn.map((ref: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-background border border-border/80 text-[11px]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-500 uppercase">
                              {ref.entityType}
                            </span>
                            <span className="font-semibold text-foreground">{ref.entityName}</span>
                          </div>
                          <span className="font-mono text-muted-foreground text-[10px]">({ref.field})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      This media file is currently not referenced by any product or category. Safe to delete.
                    </p>
                  )}
                </div>

                {/* Metadata Edit Form */}
                <form onSubmit={handleSaveMetadata} className="space-y-3">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Title</label>
                    <input
                      type="text"
                      value={editForm.title || ''}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-foreground block mb-1">Alternative Text (Alt Text)</label>
                    <input
                      type="text"
                      placeholder="Describe the purpose of the image for accessibility"
                      value={editForm.altText || ''}
                      onChange={(e) => setEditForm({ ...editForm, altText: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-foreground block mb-1">Folder / Category</label>
                      <select
                        value={editForm.folder}
                        onChange={(e) => setEditForm({ ...editForm, folder: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold"
                      >
                        <option value="general">General</option>
                        <option value="thumbnails">Thumbnails</option>
                        <option value="icons">Icons</option>
                        <option value="banners">Banners</option>
                        <option value="screenshots">Screenshots</option>
                        <option value="packages">Packages</option>
                        <option value="documentation">Documentation</option>
                        <option value="support">Support</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-foreground block mb-1">Access Visibility</label>
                      <select
                        value={editForm.visibility}
                        onChange={(e) => setEditForm({ ...editForm, visibility: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold"
                      >
                        <option value="public">Public (Media & Images)</option>
                        <option value="private">Private (Protected Downloads)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-foreground block mb-1">Caption</label>
                    <textarea
                      rows={2}
                      placeholder="Optional caption displayed under the media"
                      value={editForm.caption || ''}
                      onChange={(e) => setEditForm({ ...editForm, caption: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-border bg-background text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-foreground block mb-1">Description</label>
                    <textarea
                      rows={2}
                      placeholder="Detailed notes or internal description"
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-border bg-background text-xs font-medium"
                    />
                  </div>

                  {/* Public URL Copy Field */}
                  <div>
                    <label className="font-semibold text-foreground block mb-1">File URL</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={inspectingMedia.publicUrl || `http://localhost:5001/api/v1/public/storage/serve/${inspectingMedia.mediaId}`}
                        className="flex-1 px-3 py-2 rounded-xl border border-border bg-secondary/50 font-mono text-[11px]"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(
                            inspectingMedia.publicUrl ||
                              `http://localhost:5001/api/v1/public/storage/serve/${inspectingMedia.mediaId}`,
                          )
                        }
                      >
                        {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>

                  {/* Drawer Footer Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(inspectingMedia)}
                      className="text-xs text-red-500 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Permanently
                    </button>

                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setInspectingMedia(null)}>
                        Close
                      </Button>
                      <Button type="submit" size="sm" disabled={savingMetadata} className="font-bold">
                        {savingMetadata ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Safe Delete Protection Warning Dialog */}
      {deleteWarning?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-destructive/30 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl space-y-5 relative">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Safe Delete Protection Guard</h3>
                <p className="text-xs text-muted-foreground">This media item is actively in use</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/20 text-xs text-foreground space-y-2">
              <p className="font-semibold">
                You are attempting to delete <span className="underline font-bold">{deleteWarning.media.title}</span>, but it is currently used in {deleteWarning.references.length} place(s):
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {deleteWarning.references.map((r, i) => (
                  <div key={i} className="flex justify-between text-[11px] font-mono text-muted-foreground">
                    <span>• {r.entityName}</span>
                    <span className="font-bold text-destructive">[{r.field}]</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">
                Deleting this file may result in broken images or missing downloads on your storefront.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteWarning(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteItem(deleteWarning.media, true)}
                className="font-bold"
              >
                Delete Anyway (Override Guard)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
