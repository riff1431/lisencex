'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Download,
  Box,
  KeyRound,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Package,
  ShieldCheck,
  FileCode,
  HardDrive,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function DashboardDownloadsPage() {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadLicenses() {
      setLoading(true);
      try {
        const res = await apiRequest('/customer/licenses');
        const data = res.data?.data || res.data || [];
        setLicenses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadLicenses();
  }, []);

  const handleDownload = async (productId: string) => {
    setDownloadingId(productId);
    setErrorMessage(null);
    try {
      const res = await apiRequest(`/customer/downloads/${productId}`);
      const downloadData = res.data?.data || res.data;
      if (downloadData?.downloadUrl) {
        window.open(downloadData.downloadUrl, '_blank');
      } else {
        throw new Error('Download URL could not be generated for this package');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Download authorization failed. Ensure your license is active.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Download className="h-6 w-6 text-indigo-500" />
            <span>Product Downloads & Packages</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Download authorized release packages with instant cryptographically signed download tokens.
          </p>
        </div>

        <Link href="/store">
          <Button size="sm" variant="outline" className="rounded-xl font-semibold gap-1.5 border-border">
            <Box className="h-4 w-4" />
            <span>Browse Catalog</span>
          </Button>
        </Link>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-semibold flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading available software packages...</p>
        </div>
      ) : licenses.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/30">
          <Download className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="text-base font-bold text-foreground">No Downloadable Products</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            You need an active license to download product release packages.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link href="/store">
              <Button size="sm" className="rounded-xl font-semibold">
                Explore Store
              </Button>
            </Link>
            <Link href="/dashboard/envato">
              <Button size="sm" variant="outline" className="rounded-xl font-semibold">
                Import Envato Code
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {licenses.map((license) => {
            const product = license.productId;
            const isDownloading = downloadingId === (product?._id || product?.id);

            return (
              <div
                key={license._id || license.id}
                className="p-5 rounded-2xl border border-border bg-card flex flex-col justify-between gap-4 hover:border-border/80 transition-all shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 capitalize">
                      {product?.productType?.replace('_', ' ') || 'Software'}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                      v{product?.currentVersion || '1.0.0'}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-foreground">
                    {product?.name || 'Licensed Product'}
                  </h3>

                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {product?.shortDescription || product?.description || 'Official software package archive.'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="font-mono">License: {license.licenseKey}</span>
                    <span className="capitalize font-semibold text-emerald-600 dark:text-emerald-400">
                      {license.status}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
                  <Link
                    href="/dashboard/licenses"
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>View Key</span>
                  </Link>

                  <Button
                    onClick={() => handleDownload(product?._id || product?.id)}
                    disabled={isDownloading || license.status !== 'active'}
                    size="sm"
                    className="h-9 px-4 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-xs"
                  >
                    {isDownloading ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Authorizing...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5" />
                        <span>Download ZIP</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
