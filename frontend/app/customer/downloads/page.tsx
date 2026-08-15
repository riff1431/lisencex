'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Download, Box, KeyRound, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function CustomerDownloadsPage() {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadLicenses() {
      try {
        const res = await apiRequest('/customer/licenses');
        setLicenses(res.data || []);
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
    try {
      const res = await apiRequest(`/customer/downloads/${productId}`);
      if (res.data?.downloadUrl) {
        window.open(res.data.downloadUrl, '_blank');
      }
    } catch (err: any) {
      alert(err.message || 'Download authorization failed');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Protected Product Downloads</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Generate secure, signed temporary download links for your active licensed products
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground text-xs">Loading available downloads...</div>
      ) : licenses.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-card/50">
          <p className="text-sm font-semibold">No active licenses found to download.</p>
        </div>
      ) : (
        <div className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-secondary/40 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Current Release</th>
                  <th className="px-6 py-4">License Key</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {licenses.map((lic) => (
                  <tr key={lic._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-semibold text-foreground">
                      {lic.productId?.name}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-500">
                      v{lic.productId?.currentVersion}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                      {lic.licenseKey}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 uppercase">
                        {lic.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        onClick={() => handleDownload(lic.productId?._id)}
                        disabled={downloadingId === lic.productId?._id || lic.status !== 'active'}
                        className="h-8 text-xs font-semibold gap-1.5"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {downloadingId === lic.productId?._id ? 'Generating Link...' : 'Download ZIP'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
