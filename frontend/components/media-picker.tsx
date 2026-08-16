'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Image as ImageIcon,
  Upload,
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (media: { url: string; title: string; altText?: string; mediaId: string; fileName: string }[]) => void;
  multiple?: boolean;
  folder?: string;
  title?: string;
}

export function MediaPicker({
  open,
  onClose,
  onSelect,
  multiple = false,
  folder,
  title = 'Select Media',
}: MediaPickerProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState(folder || '');
  const [typeFilter, setTypeFilter] = useState('image');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '36');
      if (search) params.append('search', search);
      if (typeFilter && typeFilter !== 'all') params.append('mediaType', typeFilter);
      if (folderFilter) params.append('folder', folderFilter);
      const res = await apiRequest(`/admin/media?${params.toString()}`);
      if (res.data) {
        const d = res.data?.data || res.data;
        setMediaItems(d.items || []);
      }
    } catch (err) {
      console.error('Failed to load media items', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadMedia();
    }
  }, [open, search, folderFilter, typeFilter]);

  if (!open) return null;

  const handleToggleSelect = (item: any) => {
    if (multiple) {
      if (selectedIds.includes(item.mediaId)) {
        setSelectedIds(selectedIds.filter((id) => id !== item.mediaId));
      } else {
        setSelectedIds([...selectedIds, item.mediaId]);
      }
    } else {
      setSelectedIds([item.mediaId]);
    }
  };

  const handleConfirm = () => {
    const selected = mediaItems
      .filter((item) => selectedIds.includes(item.mediaId))
      .map((item) => ({
        url: item.publicUrl || `/api/v1/public/storage/serve/${item.mediaId}`,
        title: item.title || item.originalName,
        altText: item.altText,
        mediaId: item.mediaId,
        fileName: item.fileName,
      }));

    onSelect(selected);
    onClose();
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadProgress(20);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      if (folderFilter) formData.append('folder', folderFilter);

      const res = await fetch('http://localhost:5001/api/v1/admin/media/batch-upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
        body: formData,
      });

      setUploadProgress(80);
      const data = await res.json();
      if (res.ok) {
        setUploadProgress(100);
        setTimeout(() => {
          setUploading(false);
          setActiveTab('library');
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

  const selectedItem = mediaItems.find((m) => selectedIds[selectedIds.length - 1] === m.mediaId);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-3xl w-full max-w-5xl h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-card/60">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">{title}</h2>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('library')}
                  className={`font-semibold transition-colors ${
                    activeTab === 'library' ? 'text-indigo-500 border-b-2 border-indigo-500 pb-0.5' : 'hover:text-foreground'
                  }`}
                >
                  Media Library
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`font-semibold transition-colors ${
                    activeTab === 'upload' ? 'text-indigo-500 border-b-2 border-indigo-500 pb-0.5' : 'hover:text-foreground'
                  }`}
                >
                  Upload Files
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        {activeTab === 'upload' ? (
          <div className="flex-1 p-8 flex flex-col items-center justify-center bg-secondary/10">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileUpload(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-lg border-2 border-dashed border-border hover:border-indigo-500 rounded-3xl p-10 text-center cursor-pointer transition-all bg-card/50 hover:bg-card flex flex-col items-center space-y-4"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              <div className="h-16 w-16 rounded-3xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shadow-xs">
                <Upload className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Drop files anywhere to upload</h3>
                <p className="text-xs text-muted-foreground mt-1">or click to browse from your device</p>
              </div>
              <div className="text-[11px] text-muted-foreground font-medium">
                Supported formats: PNG, JPG, JPEG, WEBP, SVG, GIF, ZIP (Up to 100MB)
              </div>
            </div>

            {uploading && (
              <div className="w-full max-w-lg mt-6 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground font-semibold">
                  <span>Uploading files to storage...</span>
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
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Main Library Grid */}
            <div className="flex-1 flex flex-col overflow-hidden border-r border-border">
              {/* Filter Bar */}
              <div className="p-3 border-b border-border bg-card/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search media..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-border bg-background font-semibold text-xs"
                  >
                    <option value="image">Images</option>
                    <option value="package">ZIP Packages</option>
                    <option value="document">Documents</option>
                    <option value="all">All Media</option>
                  </select>

                  <select
                    value={folderFilter}
                    onChange={(e) => setFolderFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-border bg-background font-semibold text-xs"
                  >
                    <option value="">All Folders</option>
                    <option value="thumbnails">Thumbnails</option>
                    <option value="icons">Icons</option>
                    <option value="banners">Banners</option>
                    <option value="screenshots">Screenshots</option>
                    <option value="packages">Packages</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div className="text-[11px] font-semibold text-muted-foreground">
                  {selectedIds.length > 0 && <span>{selectedIds.length} item(s) selected</span>}
                </div>
              </div>

              {/* Grid Items */}
              <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    Loading media items...
                  </div>
                ) : mediaItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                    <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                    <p className="text-xs text-muted-foreground">No media items found matching criteria.</p>
                    <Button size="sm" variant="outline" onClick={() => setActiveTab('upload')}>
                      Upload your first file
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {mediaItems.map((item) => {
                      const isSelected = selectedIds.includes(item.mediaId);
                      const isImage = item.mimeType?.startsWith('image/');
                      const isZip = item.mimeType?.includes('zip') || item.extension === 'zip';

                      return (
                        <div
                          key={item.mediaId}
                          onClick={() => handleToggleSelect(item)}
                          className={`group relative aspect-square rounded-2xl border cursor-pointer overflow-hidden transition-all flex flex-col items-center justify-center ${
                            isSelected
                              ? 'border-indigo-500 ring-2 ring-indigo-500/50 bg-indigo-500/5 shadow-md shadow-indigo-500/10'
                              : 'border-border bg-secondary/30 hover:border-border hover:bg-secondary/50'
                          }`}
                        >
                          {isImage ? (
                            <img
                              src={item.publicUrl || `http://localhost:5001/api/v1/public/storage/serve/${item.mediaId}`}
                              alt={item.title || item.originalName}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                const target = e.currentTarget;
                                if (!target.dataset.triedFallback) {
                                  target.dataset.triedFallback = '1';
                                  target.src = `http://localhost:5001/api/v1/public/media/${encodeURIComponent(item.fileName || item.mediaId)}`;
                                }
                              }}
                            />
                          ) : isZip ? (
                            <div className="flex flex-col items-center gap-1 p-2 text-center">
                              <FileArchive className="h-8 w-8 text-amber-500" />
                              <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[100px]">
                                {item.originalName}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1 p-2 text-center">
                              <FileText className="h-8 w-8 text-indigo-500" />
                              <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[100px]">
                                {item.originalName}
                              </span>
                            </div>
                          )}

                          {/* Selected Check Indicator */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-black/20">
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            </div>
                          )}

                          {/* File info overlay on hover */}
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-[10px] font-bold truncate">{item.title || item.originalName}</p>
                            <p className="text-[9px] text-white/70 font-mono">
                              {item.width ? `${item.width}×${item.height} • ` : ''}
                              {formatBytes(item.sizeBytes)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Selection Inspector Side Pane */}
            <div className="w-full lg:w-72 bg-card p-4 flex flex-col justify-between overflow-y-auto text-xs space-y-4">
              {selectedItem ? (
                <div className="space-y-4">
                  <div className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Media Details
                  </div>

                  <div className="aspect-video w-full rounded-xl bg-secondary/50 border border-border overflow-hidden flex items-center justify-center">
                    {selectedItem.mimeType?.startsWith('image/') ? (
                      <img
                        src={selectedItem.publicUrl || `http://localhost:5001/api/v1/public/storage/serve/${selectedItem.mediaId}`}
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.dataset.triedFallback) {
                            target.dataset.triedFallback = '1';
                            target.src = `http://localhost:5001/api/v1/public/media/${encodeURIComponent(selectedItem.fileName || selectedItem.mediaId)}`;
                          }
                        }}
                        alt={selectedItem.title}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <FileCode className="h-10 w-10 text-indigo-500" />
                    )}
                  </div>

                  <div className="space-y-2 font-mono text-[11px]">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Title:</span>
                      <span className="font-bold text-foreground">{selectedItem.title || selectedItem.originalName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">File Name:</span>
                      <span className="text-muted-foreground truncate block">{selectedItem.fileName}</span>
                    </div>
                    {selectedItem.width > 0 && (
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Dimensions:</span>
                        <span className="text-foreground">{selectedItem.width} × {selectedItem.height} px</span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground block text-[10px]">File Size:</span>
                      <span className="text-foreground">{formatBytes(selectedItem.sizeBytes)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Storage Provider:</span>
                      <span className="text-indigo-500 font-bold uppercase">{selectedItem.storageProvider}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground text-xs p-4">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <span>Click an item to preview its details</span>
                </div>
              )}

              {/* Bottom Confirm Button */}
              <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={selectedIds.length === 0}
                  onClick={handleConfirm}
                  className="font-bold"
                >
                  Select Media ({selectedIds.length})
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
