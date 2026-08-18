'use client';

import React, { useState, useEffect } from 'react';
import {
  Download, Package, Code2, Layers, FileCode2, Globe, Check,
  Copy, X, Sparkles, ShieldCheck, RefreshCw, FileText, CheckCircle2,
  ExternalLink, Eye, ChevronRight, Folder, FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export type IntegrationFramework =
  | 'wordpress_plugin'
  | 'wordpress_theme'
  | 'php_script'
  | 'nextjs_app'
  | 'nextjs_plugin';

interface PackageFilePreview {
  path: string;
  description: string;
  sizeBytes: number;
  preview: string;
}

interface IntegrationPackageData {
  productId: string;
  productName: string;
  productSlug: string;
  framework: IntegrationFramework;
  packageVersion: string;
  compatibility: string;
  fileCount: number;
  files: PackageFilePreview[];
  history: Array<{
    packageVersion: string;
    framework: string;
    generatedAt: string;
    generatedBy: string;
  }>;
}

interface IntegrationPackageModalProps {
  productId: string;
  productName?: string;
  initialFramework?: IntegrationFramework;
  isOpen: boolean;
  onClose: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export function IntegrationPackageModal({
  productId,
  productName,
  initialFramework = 'wordpress_plugin',
  isOpen,
  onClose,
}: IntegrationPackageModalProps) {
  const [framework, setFramework] = useState<IntegrationFramework>(initialFramework);
  const [packageData, setPackageData] = useState<IntegrationPackageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<PackageFilePreview | null>(null);
  const [copied, setCopied] = useState(false);
  const [versionBump, setVersionBump] = useState('');
  const [generatingVersion, setGeneratingVersion] = useState(false);

  useEffect(() => {
    if (isOpen && productId) {
      loadPackageData(framework);
    }
  }, [isOpen, productId, framework]);

  const loadPackageData = async (fw: IntegrationFramework) => {
    setLoading(true);
    try {
      const res = await apiRequest(`/admin/products/${productId}/integration-package?framework=${fw}`);
      const data = res.data || res;
      setPackageData(data);
      if (data.files && data.files.length > 0) {
        setSelectedFile(data.files[0]);
      }
    } catch (e) {
      console.error('Failed to load integration package', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!packageData) return;
    setDownloading(true);
    try {
      // The auth layer persists the access token as 'auth_token' (lib/api.ts, lib/auth-context.tsx)
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const downloadUrl = `${API_BASE}/admin/products/${productId}/integration-package/download?framework=${framework}&version=${packageData.packageVersion}`;

      const res = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to download ZIP');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${packageData.productSlug}-licensenest-sdk-v${packageData.packageVersion}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      alert(e.message || 'Could not download integration package ZIP');
    } finally {
      setDownloading(false);
    }
  };

  const handleGenerateNewVersion = async () => {
    if (!versionBump.trim()) return;
    setGeneratingVersion(true);
    try {
      await apiRequest(`/admin/products/${productId}/integration-package/generate`, {
        method: 'POST',
        body: JSON.stringify({
          framework,
          packageVersion: versionBump.trim(),
        }),
      });
      setVersionBump('');
      loadPackageData(framework);
    } catch (e: any) {
      alert(e.message || 'Could not generate new package version');
    } finally {
      setGeneratingVersion(false);
    }
  };

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const frameworkList = [
    { key: 'wordpress_plugin', label: 'WordPress Plugin', icon: Code2 },
    { key: 'wordpress_theme', label: 'WordPress Theme', icon: Layers },
    { key: 'php_script', label: 'PHP Script / App', icon: FileCode2 },
    { key: 'nextjs_app', label: 'Next.js App', icon: Globe },
    { key: 'nextjs_plugin', label: 'Next.js Plugin', icon: Package },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-foreground">
                  Developer Integration Package Generator
                </h3>
                {packageData && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                    v{packageData.packageVersion}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Download preconfigured, ready-to-integrate software licensing SDK & UI for{' '}
                <strong className="text-foreground">{productName || packageData?.productName || 'this product'}</strong>.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Framework Selector Tabs */}
        <div className="p-3 border-b border-border bg-secondary/10 flex items-center gap-1.5 overflow-x-auto">
          {frameworkList.map((fw) => {
            const Icon = fw.icon;
            const isSelected = framework === fw.key;
            return (
              <button
                key={fw.key}
                type="button"
                onClick={() => setFramework(fw.key as IntegrationFramework)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {fw.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        {loading || !packageData ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
            <p className="text-xs text-muted-foreground">Generating customized package manifest...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Compatibility & Info Banner */}
            <div className="p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-indigo-600 font-medium">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>{packageData.compatibility}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-muted-foreground">{packageData.fileCount} files included</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Zero Server Secrets
                </span>
              </div>
            </div>

            {/* Split View: File Tree on left, File Preview on right */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border border-border rounded-2xl overflow-hidden bg-card">
              {/* Left Column: Files Tree */}
              <div className="p-3 border-r border-border bg-secondary/15 space-y-1 max-h-[340px] overflow-y-auto">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2 px-1">
                  Included Files
                </span>
                {packageData.files.map((file) => {
                  const isSelected = selectedFile?.path === file.path;
                  return (
                    <button
                      key={file.path}
                      type="button"
                      onClick={() => setSelectedFile(file)}
                      className={`w-full text-left p-2 rounded-xl text-xs font-mono transition-all flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 font-bold'
                          : 'hover:bg-secondary/40 text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <FileText className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{file.path}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground/60 shrink-0">
                        {Math.round(file.sizeBytes / 1024 * 10) / 10}KB
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Code Preview */}
              <div className="md:col-span-2 p-3 bg-[#0d1117] flex flex-col justify-between max-h-[340px] overflow-hidden">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#c9d1d9]">
                    <span className="text-indigo-400 font-bold">{selectedFile?.path}</span>
                    <span className="text-[10px] text-muted-foreground/60">({selectedFile?.description})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectedFile && copyCode(selectedFile.preview)}
                    className="p-1 rounded text-muted-foreground hover:text-white transition-colors"
                    title="Copy code"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <pre className="p-2 overflow-y-auto text-[11px] font-mono text-[#c9d1d9] leading-relaxed flex-1">
                  <code>{selectedFile?.preview}</code>
                </pre>
              </div>
            </div>

            {/* Version Management Row */}
            <div className="p-3.5 rounded-2xl border border-border bg-secondary/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase">Version:</span>
                <code className="text-xs font-mono font-bold text-foreground bg-background px-2 py-0.5 rounded-md border border-border">
                  v{packageData.packageVersion}
                </code>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={versionBump}
                  onChange={(e) => setVersionBump(e.target.value)}
                  placeholder="Bump to (e.g. 2.1.0)"
                  className="px-2.5 py-1 text-xs font-mono rounded-lg border border-border bg-background outline-none w-36"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateNewVersion}
                  disabled={!versionBump.trim() || generatingVersion}
                  className="text-xs font-semibold h-7"
                >
                  {generatingVersion ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Bump Version'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-border bg-secondary/30 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs font-semibold">
            Close
          </Button>

          <Button
            size="sm"
            onClick={handleDownloadZip}
            disabled={downloading || !packageData}
            className="gap-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20"
          >
            {downloading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Download Integration Package (.ZIP)
          </Button>
        </div>
      </div>
    </div>
  );
}
