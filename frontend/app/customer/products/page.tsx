'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Box, Download, KeyRound, Sparkles, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function CustomerProductsPage() {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await apiRequest('/customer/licenses');
        setLicenses(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  const handleDownload = async (productId: string) => {
    setDownloadingId(productId);
    try {
      const res = await apiRequest(`/customer/downloads/${productId}`);
      if (res.data?.downloadUrl) {
        // Trigger download
        window.open(res.data.downloadUrl, '_blank');
      }
    } catch (err: any) {
      alert(err.message || 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">My Purchased Products</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Download latest package archives, view installation credentials, and access updates
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground text-xs">Loading purchased products...</div>
      ) : licenses.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-card/50 space-y-4">
          <Box className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
          <div className="space-y-1">
            <h3 className="text-base font-bold">No purchased products yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              If you purchased via CodeCanyon or ThemeForest, import your purchase code to activate your license.
            </p>
          </div>
          <Link href="/customer/envato">
            <Button size="sm" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Import Envato Purchase
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {licenses.map((lic) => (
            <div
              key={lic._id}
              className="p-6 rounded-3xl border border-border bg-card shadow-xs flex flex-col justify-between space-y-5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-foreground uppercase">
                    {lic.productId?.productType?.replace('_', ' ')}
                  </span>
                  <span className="font-mono text-xs font-bold text-indigo-500">
                    v{lic.productId?.currentVersion}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-lg text-foreground">{lic.productId?.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Licensed to your account • {lic.licenseType} plan
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-border">
                <Button
                  onClick={() => handleDownload(lic.productId?._id)}
                  disabled={downloadingId === lic.productId?._id}
                  className="w-full gap-2 text-xs font-semibold h-10"
                >
                  <Download className="h-4 w-4" />
                  {downloadingId === lic.productId?._id ? 'Preparing...' : 'Download Package (ZIP)'}
                </Button>
                <Link href="/customer/licenses" className="block text-center text-xs text-indigo-500 hover:underline font-semibold">
                  Manage Domain Activations →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
