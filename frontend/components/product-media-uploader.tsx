'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  MoveLeft,
  MoveRight,
  Plus,
  Link2,
  Check,
  AlertCircle,
  FileImage,
  Sparkles,
  Eye,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MediaPicker } from '@/components/media-picker';

export interface ProductMediaState {
  thumbnailUrl?: string;
  iconUrl?: string;
  logoUrl?: string;
  bannerUrl?: string;
  screenshots?: string[];
}

interface ProductMediaUploaderProps {
  initialMedia?: ProductMediaState;
  onChange: (media: ProductMediaState) => void;
  className?: string;
}

export function ProductMediaUploader({
  initialMedia = {},
  onChange,
  className = '',
}: ProductMediaUploaderProps) {
  const [activeTab, setActiveTab] = useState<'thumbnail' | 'icon' | 'banner' | 'screenshots'>('thumbnail');

  const [media, setMedia] = useState<ProductMediaState>({
    thumbnailUrl: initialMedia.thumbnailUrl || '',
    iconUrl: initialMedia.iconUrl || '',
    logoUrl: initialMedia.logoUrl || '',
    bannerUrl: initialMedia.bannerUrl || '',
    screenshots: initialMedia.screenshots || [],
  });

  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [directUrlInput, setDirectUrlInput] = useState('');
  const [isUrlInputMode, setIsUrlInputMode] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateMedia = (updates: Partial<ProductMediaState>) => {
    const updated = { ...media, ...updates };
    setMedia(updated);
    onChange(updated);
  };

  const handleFileUpload = async (file: File, mediaType: string) => {
    if (!file) return;

    setErrorMsg(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', mediaType);

      // Upload to API
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') || localStorage.getItem('token') : null;
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

      const res = await fetch(`${baseUrl}/admin/media/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Upload failed');
      }

      const uploadedUrl = json.data?.publicUrl || json.data?.url || json.url;

      if (mediaType === 'thumbnail' || mediaType === 'thumbnails') {
        updateMedia({ thumbnailUrl: uploadedUrl });
      } else if (mediaType === 'icon' || mediaType === 'icons') {
        updateMedia({ iconUrl: uploadedUrl, logoUrl: uploadedUrl });
      } else if (mediaType === 'banner' || mediaType === 'banners') {
        updateMedia({ bannerUrl: uploadedUrl });
      } else if (mediaType === 'screenshot' || mediaType === 'screenshots') {
        const currentScreenshots = [...(media.screenshots || [])];
        updateMedia({ screenshots: [...currentScreenshots, uploadedUrl] });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload image file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleMediaPickerSelect = (selected: { url: string; title: string }[]) => {
    if (!selected || selected.length === 0) return;

    if (activeTab === 'thumbnail') {
      updateMedia({ thumbnailUrl: selected[0].url });
    } else if (activeTab === 'icon') {
      updateMedia({ iconUrl: selected[0].url, logoUrl: selected[0].url });
    } else if (activeTab === 'banner') {
      updateMedia({ bannerUrl: selected[0].url });
    } else if (activeTab === 'screenshots') {
      const current = [...(media.screenshots || [])];
      const newUrls = selected.map((s) => s.url);
      updateMedia({ screenshots: [...current, ...newUrls] });
    }
  };

  const handleDirectUrlSave = () => {
    if (!directUrlInput.trim()) return;
    const url = directUrlInput.trim();

    if (activeTab === 'thumbnail') {
      updateMedia({ thumbnailUrl: url });
    } else if (activeTab === 'icon') {
      updateMedia({ iconUrl: url, logoUrl: url });
    } else if (activeTab === 'banner') {
      updateMedia({ bannerUrl: url });
    } else if (activeTab === 'screenshots') {
      const current = [...(media.screenshots || [])];
      updateMedia({ screenshots: [...current, url] });
    }

    setDirectUrlInput('');
    setIsUrlInputMode(false);
  };

  const handleRemoveImage = (field: 'thumbnailUrl' | 'iconUrl' | 'bannerUrl') => {
    updateMedia({ [field]: '' });
  };

  const handleRemoveScreenshot = (index: number) => {
    const list = [...(media.screenshots || [])];
    list.splice(index, 1);
    updateMedia({ screenshots: list });
  };

  const handleMoveScreenshot = (fromIdx: number, toIdx: number) => {
    const list = [...(media.screenshots || [])];
    if (toIdx < 0 || toIdx >= list.length) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    updateMedia({ screenshots: list });
  };

  return (
    <div className={`p-5 rounded-3xl border border-border bg-card space-y-4 shadow-xs ${className}`}>
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <FileImage className="h-4 w-4 text-indigo-500" />
            <span>Product Media & Artwork Assets</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload high-resolution thumbnail, app icon, hero banner, and screenshot gallery.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => {
              setActiveTab('thumbnail');
              setIsUrlInputMode(false);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'thumbnail'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Thumbnail
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('icon');
              setIsUrlInputMode(false);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'icon'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Icon
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('banner');
              setIsUrlInputMode(false);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'banner'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Banner
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('screenshots');
              setIsUrlInputMode(false);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              activeTab === 'screenshots'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Gallery</span>
            {media.screenshots && media.screenshots.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-500">
                {media.screenshots.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".png,.jpg,.jpeg,.webp,.svg,.gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const type = activeTab === 'screenshots' ? 'screenshots' : activeTab;
            handleFileUpload(file, type);
          }
        }}
      />

      {/* Reusable Media Library Picker Modal */}
      <MediaPicker
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleMediaPickerSelect}
        multiple={activeTab === 'screenshots'}
        folder={activeTab === 'screenshots' ? 'screenshots' : activeTab}
        title={`Select ${activeTab.toUpperCase()} from Media Library`}
      />

      {/* Action Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMediaPickerOpen(true)}
            className="gap-1.5 text-xs font-semibold"
          >
            <FolderOpen className="h-3.5 w-3.5 text-indigo-500" />
            <span>Select from Media Library</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-1.5 text-xs font-semibold"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>{uploading ? 'Uploading...' : 'Upload New File'}</span>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setIsUrlInputMode(!isUrlInputMode)}
          className="font-bold text-indigo-500 hover:underline flex items-center gap-1"
        >
          <Link2 className="h-3 w-3" />
          <span>{isUrlInputMode ? 'Hide URL Input' : 'Paste Direct Image URL'}</span>
        </button>
      </div>

      {isUrlInputMode && (
        <div className="flex gap-2 pt-1">
          <input
            type="text"
            placeholder="https://cdn.example.com/asset.png"
            value={directUrlInput}
            onChange={(e) => setDirectUrlInput(e.target.value)}
            className="flex-1 h-9 px-3 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground focus:outline-none"
          />
          <Button
            size="sm"
            type="button"
            onClick={handleDirectUrlSave}
            className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9"
          >
            Apply URL
          </Button>
        </div>
      )}

      {/* TAB 1: THUMBNAIL */}
      {activeTab === 'thumbnail' && (
        <div className="space-y-3">
          {media.thumbnailUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-border bg-secondary/30 max-w-md group">
              <img
                src={media.thumbnailUrl}
                alt="Product Thumbnail Preview"
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => setMediaPickerOpen(true)}
                  className="rounded-xl text-xs h-8 bg-card/90 text-foreground hover:bg-card border-none"
                >
                  <FolderOpen className="h-3.5 w-3.5 mr-1" />
                  Choose from Library
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant="destructive"
                  onClick={() => handleRemoveImage('thumbnailUrl')}
                  className="rounded-xl text-xs h-8"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setMediaPickerOpen(true)}
              className="border-2 border-dashed border-border hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-secondary/20 hover:bg-secondary/40 flex flex-col items-center justify-center space-y-1"
            >
              <ImageIcon className="h-8 w-8 text-muted-foreground/60 mb-1" />
              <span className="font-bold text-xs text-foreground">No Thumbnail Selected</span>
              <span className="text-[11px] text-muted-foreground">Click to choose from Media Library or upload new</span>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ICON */}
      {activeTab === 'icon' && (
        <div className="space-y-3">
          {media.iconUrl ? (
            <div className="relative h-24 w-24 rounded-2xl overflow-hidden border border-border bg-secondary/30 group">
              <img
                src={media.iconUrl}
                alt="App Icon Preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={() => handleRemoveImage('iconUrl')}
                  className="p-1.5 rounded-lg bg-destructive text-white"
                  title="Remove Icon"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setMediaPickerOpen(true)}
              className="h-24 w-24 border-2 border-dashed border-border hover:border-indigo-500 rounded-2xl p-2 text-center cursor-pointer transition-all bg-secondary/20 hover:bg-secondary/40 flex flex-col items-center justify-center space-y-1"
            >
              <ImageIcon className="h-5 w-5 text-muted-foreground/60" />
              <span className="text-[10px] font-bold text-foreground">Add Icon</span>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BANNER */}
      {activeTab === 'banner' && (
        <div className="space-y-3">
          {media.bannerUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-border bg-secondary/30 w-full group">
              <img
                src={media.bannerUrl}
                alt="Hero Banner Preview"
                className="w-full h-36 object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  type="button"
                  variant="destructive"
                  onClick={() => handleRemoveImage('bannerUrl')}
                  className="rounded-xl text-xs h-8"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Remove Banner
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setMediaPickerOpen(true)}
              className="border-2 border-dashed border-border hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-secondary/20 hover:bg-secondary/40 flex flex-col items-center justify-center space-y-1"
            >
              <ImageIcon className="h-8 w-8 text-muted-foreground/60 mb-1" />
              <span className="font-bold text-xs text-foreground">No Banner Selected</span>
              <span className="text-[11px] text-muted-foreground">Click to select 1920 × 800 px banner</span>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SCREENSHOTS */}
      {activeTab === 'screenshots' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {media.screenshots?.map((url, idx) => (
              <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-border bg-secondary/40 group">
                <img src={url} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => handleMoveScreenshot(idx, idx - 1)}
                      className="p-1 rounded bg-secondary text-foreground hover:bg-card"
                      title="Move Left"
                    >
                      <MoveLeft className="h-3 w-3" />
                    </button>
                  )}
                  {idx < (media.screenshots?.length || 0) - 1 && (
                    <button
                      type="button"
                      onClick={() => handleMoveScreenshot(idx, idx + 1)}
                      className="p-1 rounded bg-secondary text-foreground hover:bg-card"
                      title="Move Right"
                    >
                      <MoveRight className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveScreenshot(idx)}
                    className="p-1 rounded bg-destructive text-white hover:bg-destructive/80"
                    title="Remove"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}

            <div
              onClick={() => setMediaPickerOpen(true)}
              className="aspect-video border-2 border-dashed border-border hover:border-indigo-500 rounded-xl p-2 text-center cursor-pointer transition-all bg-secondary/20 hover:bg-secondary/40 flex flex-col items-center justify-center space-y-1"
            >
              <Plus className="h-5 w-5 text-indigo-500" />
              <span className="text-[10px] font-bold text-foreground">Add Screenshot</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
