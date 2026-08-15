'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, Globe2, ShieldCheck, Key, Sliders, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any>({
    systemName: 'LicenseNest Manager',
    supportEmail: 'support@example.com',
    companyName: 'LicenseNest Inc.',
    defaultGracePeriodDays: 7,
    defaultValidationIntervalHours: 24,
    defaultActivationLimit: 1,
    allowRegistration: true,
    rateLimitMaxRequests: 100,
    rateLimitWindowSeconds: 60,
    envatoApiConfigured: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await apiRequest('/admin/settings');
        if (res.data) setSettings((prev: any) => ({ ...prev, ...res.data }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      await apiRequest('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          key: 'global_config',
          value: settings,
          description: 'Updated via Admin Settings panel',
        }),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">System & Platform Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure default validation intervals, offline grace periods, security limits, and marketplace API connections
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Platform settings updated and persisted successfully across the cluster!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Branding & Platform Identity */}
        <div className="p-6 rounded-3xl border border-border bg-card space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Settings className="h-4 w-4 text-indigo-500" />
            Platform Identity & Branding
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">System / Platform Name</label>
              <input
                type="text"
                value={settings.systemName || ''}
                onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-medium"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Company / Issuer Name</label>
              <input
                type="text"
                value={settings.companyName || ''}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-medium"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Support Contact Email</label>
              <input
                type="email"
                value={settings.supportEmail || ''}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-medium"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <label className="flex items-center gap-2 font-semibold text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowRegistration ?? true}
                  onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
                  className="rounded"
                />
                <span>Allow Public Customer Self-Registration</span>
              </label>
            </div>
          </div>
        </div>

        {/* Licensing Parameters */}
        <div className="p-6 rounded-3xl border border-border bg-card space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Sliders className="h-4 w-4 text-purple-500" />
            Licensing & Token Defaults
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">Validation Interval (Hours)</label>
              <input
                type="number"
                min="1"
                value={settings.defaultValidationIntervalHours || 24}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultValidationIntervalHours: Number(e.target.value),
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Offline Grace Period (Days)</label>
              <input
                type="number"
                min="1"
                value={settings.defaultGracePeriodDays || 7}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultGracePeriodDays: Number(e.target.value),
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Default Activation Limit</label>
              <input
                type="number"
                min="1"
                value={settings.defaultActivationLimit || 1}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultActivationLimit: Number(e.target.value),
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-mono"
              />
            </div>
          </div>
        </div>

        {/* Security & Rate Limiting */}
        <div className="p-6 rounded-3xl border border-border bg-card space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            API Rate Limiting & Protection
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">Max Requests per Window</label>
              <input
                type="number"
                min="10"
                value={settings.rateLimitMaxRequests || 100}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    rateLimitMaxRequests: Number(e.target.value),
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Rate Limit Window (Seconds)</label>
              <input
                type="number"
                min="1"
                value={settings.rateLimitWindowSeconds || 60}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    rateLimitWindowSeconds: Number(e.target.value),
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-mono"
              />
            </div>
          </div>
        </div>

        {/* Marketplace Integration */}
        <div className="p-6 rounded-3xl border border-border bg-card space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-emerald-500" />
            Marketplace Integrations
          </h2>
          <div className="p-4 rounded-2xl bg-secondary/50 border border-border flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-foreground">Envato Market (CodeCanyon & ThemeForest)</p>
              <p className="text-muted-foreground mt-0.5">
                Automatic purchase verification using your Envato Personal API Token.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-500">
              Active & Verified (.env)
            </span>
          </div>
        </div>

        <Button type="submit" disabled={saving} className="gap-2 h-11 px-8 font-semibold shadow-xs">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </form>
    </div>
  );
}
