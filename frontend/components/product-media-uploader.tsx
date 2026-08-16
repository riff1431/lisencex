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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

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
      formData.append('mediaType', mediaType);

      // Upload to API
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
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

      const uploadedUrl = json.data?.url || json.url;

      if (mediaType === 'thumbnail') {
        updateMedia({ thumbnailUrl: uploadedUrl });
      } else if (mediaType === 'icon') {
        updateMedia({ iconUrl: uploadedUrl, logoUrl: uploadedUrl });
      } else if (mediaType === 'banner') {
        updateMedia({ bannerUrl: uploadedUrl });
      } else if (mediaType === 'screenshot') {
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
            const type = activeTab === 'screenshots' ? 'screenshot' : activeTab;
            handleFileUpload(file, type);
          }
        }}
      />

      {/* TAB 1: THUMBNAIL */}
      {activeTab === 'thumbnail' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Marketplace listing card thumbnail (Recommended: 800 × 500 px, PNG or WEBP)
            </span>
            <button
              type="button"
              onClick={() => setIsUrlInputMode(!isUrlInputMode)}
              className="font-bold text-indigo-500 hover:underline flex items-center gap-1"
            >
              <Link2 className="h-3 w-3" />
              <span>{isUrlInputMode ? 'Upload from Computer' : 'Paste Image URL'}</span>
            </button>
          </div>

          {isUrlInputMode ? (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://cdn.example.com/thumbnail.png"
                value={directUrlInput}
                onChange={(e) => setDirectUrlInput(e.target.value)}
                className="flex-1 h-9 px-3 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground focus:outline-none"
              />
              <Button size="sm" type="button" onClick={handleDirectUrlSave} className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9">
                Apply URL
              </Button>
            </div>
          ) : media.thumbnailUrl ? (
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
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl text-xs h-8 bg-card/90 text-foreground hover:bg-card border-none"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Replace
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
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-indigo-500/60 rounded-3xl p-8 text-center cursor-pointer transition-colors bg-secondary/20 hover:bg-secondary/30 flex flex-col items-center justify-center gap-2"
            >
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 mb-1">
                <Upload className="h-6 w-6" />
              </div>
              <span className="font-bold text-xs text-foreground">Click to upload product thumbnail</span>
              <span className="text-[11px] text-muted-foreground">PNG, JPG, WEBP, SVG up to 10MB</span>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ICON / LOGO */}
      {activeTab === 'icon' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Square app icon for admin tables, licenses, and downloads (Recommended: 512 × 512 px)
            </span>
            <button
              type="button"
              onClick={() => setIsUrlInputMode(!isUrlInputMode)}
              className="font-bold text-indigo-500 hover:underline flex items-center gap-1"
            >
              <Link2 className="h-3 w-3" />
              <span>{isUrlInputMode ? 'Upload from Computer' : 'Paste Image URL'}</span>
            </button>
          </div>

          {isUrlInputMode ? (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://cdn.example.com/icon.svg"
                value={directUrlInput}
                onChange={(e) => setDirectUrlInput(e.target.value)}
                className="flex-1 h-9 px-3 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground focus:outline-none"
              />
              <Button size="sm" type="button" onClick={handleDirectUrlSave} className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9">
                Apply URL
              </Button>
            </div>
          ) : media.iconUrl ? (
            <div className="flex items-center gap-4">
              <div className="relative rounded-2xl overflow-hidden border border-border bg-secondary/30 w-24 h-24 group shrink-0">
                <img
                  src={media.iconUrl}
                  alt="Product Icon Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <Button
                    size="icon"
                    type="button"
                    variant="ghost"
                    onClick={() => handleRemoveImage('iconUrl')}
                    className="h-7 w-7 rounded-full text-white hover:bg-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl text-xs h-8 border-border"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Replace Icon
                </Button>
                <div className="text-[11px] text-muted-foreground">
                  Displays in dashboard rows, license headers, and API credentials.
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-indigo-500/60 rounded-3xl p-6 text-center cursor-pointer transition-colors bg-secondary/20 hover:bg-secondary/30 flex flex-col items-center justify-center gap-2 max-w-sm"
            >
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500 mb-1">
                <Upload className="h-5 w-5" />
              </div>
              <span className="font-bold text-xs text-foreground">Upload Square Product Icon</span>
              <span className="text-[11px] text-muted-foreground">PNG, SVG, WEBP</span>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BANNER / COVER */}
      {activeTab === 'banner' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Wide header cover on the product detail page (Recommended: 1920 × 800 px)
            </span>
            <button
              type="button"
              onClick={() => setIsUrlInputMode(!isUrlInputMode)}
              className="font-bold text-indigo-500 hover:underline flex items-center gap-1"
            >
              <Link2 className="h-3 w-3" />
              <span>{isUrlInputMode ? 'Upload from Computer' : 'Paste Image URL'}</span>
            </button>
          </div>

          {isUrlInputMode ? (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://cdn.example.com/banner.jpg"
                value={directUrlInput}
                onChange={(e) => setDirectUrlInput(e.target.value)}
                className="flex-1 h-9 px-3 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground focus:outline-none"
              />
              <Button size="sm" type="button" onClick={handleDirectUrlSave} className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9">
                Apply URL
              </Button>
            </div>
          ) : media.bannerUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-border bg-secondary/30 w-full h-44 group">
              <img
                src={media.bannerUrl}
                alt="Product Banner Preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl text-xs h-8 bg-card/90 text-foreground hover:bg-card border-none"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Replace Banner
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant="destructive"
                  onClick={() => handleRemoveImage('bannerUrl')}
                  className="rounded-xl text-xs h-8"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-indigo-500/60 rounded-3xl p-8 text-center cursor-pointer transition-colors bg-secondary/20 hover:bg-secondary/30 flex flex-col items-center justify-center gap-2"
            >
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 mb-1">
                <Upload className="h-6 w-6" />
              </div>
              <span className="font-bold text-xs text-foreground">Upload Full-Width Product Banner</span>
              <span className="text-[11px] text-muted-foreground">PNG, JPG, WEBP up to 10MB</span>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SCREENSHOTS GALLERY */}
      {activeTab === 'screenshots' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Product screenshot previews and gallery carousel slides.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsUrlInputMode(!isUrlInputMode)}
                className="font-bold text-indigo-500 hover:underline flex items-center gap-1"
              >
                <Link2 className="h-3 w-3" />
                <span>{isUrlInputMode ? 'Upload File' : 'Add Image URL'}</span>
              </button>
              <Button
                size="sm"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Screenshot</span>
              </Button>
            </div>
          </div>

          {isUrlInputMode && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://cdn.example.com/screenshot1.png"
                value={directUrlInput}
                onChange={(e) => setDirectUrlInput(e.target.value)}
                className="flex-1 h-9 px-3 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground focus:outline-none"
              />
              <Button size="sm" type="button" onClick={handleDirectUrlSave} className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9">
                Add to Gallery
              </Button>
            </div>
          )}

          {media.screenshots && media.screenshots.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {media.screenshots.map((url, idx) => (
                <div
                  key={idx}
                  className="relative rounded-2xl overflow-hidden border border-border bg-secondary/30 group aspect-video"
                >
                  <img src={url} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover" />

                  {/* Overlay Controls */}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                    <div className="flex items-center justify-between text-white text-[10px] font-bold">
                      <span>#{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveScreenshot(idx)}
                        className="p-1 rounded-md bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveScreenshot(idx, idx - 1)}
                        className="p-1 rounded-md bg-card/80 text-foreground hover:bg-card disabled:opacity-30"
                        title="Move Left"
                      >
                        <MoveLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === media.screenshots!.length - 1}
                        onClick={() => handleMoveScreenshot(idx, idx + 1)}
                        className="p-1 rounded-md bg-card/80 text-foreground hover:bg-card disabled:opacity-30"
                        title="Move Right"
                      >
                        <MoveRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-indigo-500/60 rounded-3xl p-8 text-center cursor-pointer transition-colors bg-secondary/20 hover:bg-secondary/30 flex flex-col items-center justify-center gap-2"
            >
              <ImageIcon className="h-8 w-8 text-muted-foreground/50 mb-1" />
              <span className="font-bold text-xs text-foreground">Zero screenshots added yet</span>
              <span className="text-[11px] text-muted-foreground">Add preview screenshots for customer product tours</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
