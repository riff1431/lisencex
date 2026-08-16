'use client';

import React, { useState } from 'react';
import {
  Flame, AlertTriangle, ShieldAlert, X, Check, RefreshCw,
  Power, PowerOff, ShieldOff, DownloadCloud, AlertOctagon,
  ArrowRight, CheckCircle2, History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

interface EmergencyKillSwitchModalProps {
  productId: string;
  productName: string;
  currentKillSwitch?: {
    disableNewActivations?: boolean;
    disableValidation?: boolean;
    disableUpdatesDownloads?: boolean;
    isProductSuspended?: boolean;
    activeReason?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EmergencyKillSwitchModal({
  productId,
  productName,
  currentKillSwitch,
  isOpen,
  onClose,
  onSuccess,
}: EmergencyKillSwitchModalProps) {
  const [disableNewActivations, setDisableNewActivations] = useState(
    currentKillSwitch?.disableNewActivations ?? false,
  );
  const [disableValidation, setDisableValidation] = useState(
    currentKillSwitch?.disableValidation ?? false,
  );
  const [disableUpdatesDownloads, setDisableUpdatesDownloads] = useState(
    currentKillSwitch?.disableUpdatesDownloads ?? false,
  );
  const [isProductSuspended, setIsProductSuspended] = useState(
    currentKillSwitch?.isProductSuspended ?? false,
  );
  const [massAction, setMassAction] = useState<'none' | 'suspendAll' | 'restoreAll'>('none');
  const [reason, setReason] = useState(currentKillSwitch?.activeReason || '');
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasCriticalChanges =
    disableNewActivations ||
    disableValidation ||
    disableUpdatesDownloads ||
    isProductSuspended ||
    massAction === 'suspendAll';

  const isFormValid = reason.trim().length >= 5 && (!hasCriticalChanges || confirmText.toUpperCase() === 'CONFIRM');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setSubmitting(true);
    setError(null);

    try {
      await apiRequest(`/admin/emergency/products/${productId}/kill-switch`, {
        method: 'POST',
        body: JSON.stringify({
          disableNewActivations,
          disableValidation,
          disableUpdatesDownloads,
          isProductSuspended,
          suspendAllActiveInstallations: massAction === 'suspendAll',
          restoreAllInstallations: massAction === 'restoreAll',
          reason: reason.trim(),
        }),
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update emergency kill-switch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-destructive/40 rounded-3xl w-full max-w-2xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden ring-1 ring-destructive/30">
        {/* Header */}
        <div className="p-5 border-b border-border bg-gradient-to-r from-destructive/15 via-amber-500/10 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-destructive text-white flex items-center justify-center shadow-lg shadow-destructive/30">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-foreground">Emergency Kill-Switch & Freeze</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-destructive/20 text-destructive border border-destructive/30">
                  Critical Admin Action
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage emergency locks and mass license controls for <strong className="text-foreground">{productName}</strong>.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5">
            <AlertOctagon className="h-4 w-4 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Emergency Kill Switches Toggles */}
          <div className="space-y-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground block px-1">
              Product-Level Emergency Flags
            </span>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Disable New Activations */}
              <label
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  disableNewActivations
                    ? 'bg-amber-500/10 border-amber-500/40 text-foreground'
                    : 'bg-card border-border hover:bg-secondary/30 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                    disableNewActivations ? 'bg-amber-500 text-white' : 'bg-secondary text-muted-foreground'
                  }`}>
                    <PowerOff className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">Disable New Activations</span>
                    <span className="text-[11px] text-muted-foreground">
                      Blocks all new activation attempts for this product with immediate error.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={disableNewActivations}
                  onChange={(e) => setDisableNewActivations(e.target.checked)}
                  className="h-4 w-4 accent-amber-500 rounded"
                />
              </label>

              {/* Disable Validation */}
              <label
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  disableValidation
                    ? 'bg-destructive/10 border-destructive/40 text-foreground'
                    : 'bg-card border-border hover:bg-secondary/30 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                    disableValidation ? 'bg-destructive text-white' : 'bg-secondary text-muted-foreground'
                  }`}>
                    <ShieldOff className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">Disable Validation Heartbeat</span>
                    <span className="text-[11px] text-muted-foreground">
                      Freezes validation checks and returns PRODUCT_VALIDATIONS_DISABLED to all clients.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={disableValidation}
                  onChange={(e) => setDisableValidation(e.target.checked)}
                  className="h-4 w-4 accent-destructive rounded"
                />
              </label>

              {/* Disable Updates & Downloads */}
              <label
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  disableUpdatesDownloads
                    ? 'bg-amber-500/10 border-amber-500/40 text-foreground'
                    : 'bg-card border-border hover:bg-secondary/30 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                    disableUpdatesDownloads ? 'bg-amber-500 text-white' : 'bg-secondary text-muted-foreground'
                  }`}>
                    <DownloadCloud className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">Disable Updates & Downloads</span>
                    <span className="text-[11px] text-muted-foreground">
                      Prevents customers and SDKs from querying releases or downloading ZIP files.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={disableUpdatesDownloads}
                  onChange={(e) => setDisableUpdatesDownloads(e.target.checked)}
                  className="h-4 w-4 accent-amber-500 rounded"
                />
              </label>

              {/* Suspend Entire Product */}
              <label
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  isProductSuspended
                    ? 'bg-destructive/15 border-destructive text-foreground ring-1 ring-destructive'
                    : 'bg-card border-border hover:bg-secondary/30 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                    isProductSuspended ? 'bg-destructive text-white' : 'bg-secondary text-muted-foreground'
                  }`}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">Master Product Suspension</span>
                    <span className="text-[11px] text-muted-foreground">
                      Locks all operations (activations, validations, updates) simultaneously.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isProductSuspended}
                  onChange={(e) => setIsProductSuspended(e.target.checked)}
                  className="h-4 w-4 accent-destructive rounded"
                />
              </label>
            </div>
          </div>

          {/* Mass Active Installation Actions */}
          <div className="p-4 rounded-2xl border border-border bg-secondary/20 space-y-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground block">
              Mass Installation Action (Optional)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMassAction('none')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                  massAction === 'none'
                    ? 'bg-background border-border text-foreground shadow-xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Keep Existing
              </button>
              <button
                type="button"
                onClick={() => setMassAction('suspendAll')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                  massAction === 'suspendAll'
                    ? 'bg-destructive/20 border-destructive text-destructive shadow-xs'
                    : 'border-transparent text-muted-foreground hover:text-destructive'
                }`}
              >
                ⚡ Suspend All Active
              </button>
              <button
                type="button"
                onClick={() => setMassAction('restoreAll')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                  massAction === 'restoreAll'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 shadow-xs'
                    : 'border-transparent text-muted-foreground hover:text-emerald-600'
                }`}
              >
                ✓ Restore All Suspended
              </button>
            </div>
          </div>

          {/* Mandatory Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>Mandatory Reason / Incident ID *</span>
              <span className="text-[10px] text-muted-foreground">Required for Audit Trail</span>
            </label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Critical security vulnerability detected in v2.4, freezing activations pending patch release."
              className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:ring-2 focus:ring-destructive focus:border-destructive outline-hidden resize-none"
            />
          </div>

          {/* Type CONFIRM for safety */}
          {hasCriticalChanges && (
            <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/30 space-y-2">
              <span className="text-xs font-bold text-destructive flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Safety Confirmation
              </span>
              <p className="text-[11px] text-muted-foreground">
                You are applying critical emergency flags. Please type <strong className="text-destructive font-mono">CONFIRM</strong> below to proceed:
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type CONFIRM"
                className="w-full px-3 py-1.5 text-xs font-mono rounded-lg bg-background border border-destructive/40 focus:ring-2 focus:ring-destructive outline-hidden uppercase"
              />
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-between border-t border-border">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={!isFormValid || submitting}
              className="gap-2 text-xs font-bold bg-destructive hover:bg-destructive/90 text-white shadow-md shadow-destructive/20 disabled:opacity-50"
            >
              {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
              Apply Emergency Action
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
