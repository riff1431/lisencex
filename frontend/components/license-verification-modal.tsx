'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Play, Sparkles, Award, Lock, ExternalLink, ChevronDown, ChevronUp,
  X, Check, AlertCircle, Terminal, HelpCircle, ArrowRight, Server,
  Globe, Laptop, FileCheck, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export type VerificationEnvironment = 'development' | 'testing' | 'production';

export interface VerificationTestItem {
  id: string;
  name: string;
  category: 'activation' | 'security' | 'validation' | 'lifecycle' | 'updates';
  status: 'passed' | 'failed' | 'needs_attention';
  durationMs: number;
  description: string;
  expectedResult: string;
  actualResult: string;
  errorDetails?: string;
  suggestedFix?: string;
  requestPayload?: any;
  responsePayload?: any;
}

export interface VerificationCertificate {
  certificationId: string;
  productId: string;
  productName: string;
  productSlug: string;
  environment: VerificationEnvironment;
  passedCount: number;
  failedCount: number;
  needsAttentionCount: number;
  totalTests: number;
  scorePercentage: number;
  isCertified: boolean;
  status: string;
  verifiedAt: string;
  verifiedBy: string;
  results: VerificationTestItem[];
}

interface LicenseVerificationModalProps {
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged?: (newStatus: string) => void;
}

export function LicenseVerificationModal({
  productId,
  productName,
  isOpen,
  onClose,
  onStatusChanged,
}: LicenseVerificationModalProps) {
  const [environment, setEnvironment] = useState<VerificationEnvironment>('testing');
  const [loading, setLoading] = useState(false);
  const [runningTests, setRunningTests] = useState(false);
  const [certifying, setCertifying] = useState(false);
  const [certificate, setCertificate] = useState<VerificationCertificate | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string>('testing');
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState(false);

  useEffect(() => {
    if (isOpen && productId) {
      loadOverview();
    }
  }, [isOpen, productId]);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest(`/admin/products/${productId}/verify`);
      const data = res.data || res;
      setCurrentStatus(data.integrationStatus || 'testing');
      setCertificate(data.currentCertificate || null);
      setHistory(data.history || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load verification status');
    } finally {
      setLoading(false);
    }
  };

  const handleRunVerification = async () => {
    setRunningTests(true);
    setError(null);
    try {
      const res = await apiRequest(`/admin/products/${productId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ environment }),
      });
      const data = res.data || res;
      setCertificate(data);
      if (data.isCertified) {
        setCurrentStatus('verified');
        onStatusChanged?.('verified');
      }
      loadOverview();
    } catch (e: any) {
      setError(e.message || 'Verification suite run failed');
    } finally {
      setRunningTests(false);
    }
  };

  const handleCertifyProductionReady = async () => {
    setCertifying(true);
    setError(null);
    try {
      const res = await apiRequest(`/admin/products/${productId}/certify`, {
        method: 'POST',
      });
      const data = res.data || res;
      setCurrentStatus('production_ready');
      setCelebration(true);
      onStatusChanged?.('production_ready');
    } catch (e: any) {
      setError(e.message || 'Could not mark product as Production Ready');
    } finally {
      setCertifying(false);
    }
  };

  if (!isOpen) return null;

  const statusSteps = [
    { key: 'not_integrated', label: 'Not Integrated' },
    { key: 'integrated', label: 'Integrated' },
    { key: 'testing', label: 'Testing' },
    { key: 'verified', label: 'Verified' },
    { key: 'production_ready', label: 'Production Ready' },
  ];

  const getStepIndex = (st: string) => {
    const idx = statusSteps.findIndex((s) => s.key === st);
    return idx >= 0 ? idx : 2;
  };

  const currentStepIdx = getStepIndex(currentStatus);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-3xl w-full max-w-5xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-foreground">
                  License Integration Verification & Certification
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  13 Real DB Tests
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automated security, lifecycle, and activation test suite for <strong className="text-foreground">{productName}</strong>.
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

        {/* 5-Step Status Flow Visualization */}
        <div className="px-5 py-3 border-b border-border bg-secondary/15">
          <div className="grid grid-cols-5 gap-2">
            {statusSteps.map((step, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <div
                  key={step.key}
                  className={`p-2 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 ${
                    isCurrent
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 font-bold shadow-xs'
                      : isPast
                      ? 'bg-secondary/40 border-border text-foreground font-semibold'
                      : 'bg-transparent border-transparent text-muted-foreground/60'
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                      isCurrent || isPast ? 'bg-emerald-600 text-white' : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {isPast ? '✓' : idx + 1}
                  </div>
                  <span className="text-[11px] truncate">{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Top Control Bar: Environment Picker & Run Button */}
          <div className="p-4 rounded-2xl border border-border bg-card shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Target Environment:</span>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/50 border border-border text-xs">
                {(['development', 'testing', 'production'] as const).map((env) => (
                  <button
                    key={env}
                    type="button"
                    onClick={() => setEnvironment(env)}
                    className={`px-3 py-1 rounded-lg font-bold capitalize transition-all ${
                      environment === env
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {env}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleRunVerification}
              disabled={runningTests}
              className="gap-2 text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20"
            >
              {runningTests ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run Full Verification Suite (13 Tests)
            </Button>
          </div>

          {/* Certificate Badge Card (if certified or tests run) */}
          {certificate && (
            <div className={`p-5 rounded-3xl border transition-all ${
              certificate.isCertified
                ? 'bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/30'
                : 'bg-destructive/5 border-destructive/30'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${
                    certificate.isCertified
                      ? 'bg-emerald-600 shadow-emerald-500/30'
                      : 'bg-destructive shadow-destructive/30'
                  }`}>
                    {certificate.isCertified ? <ShieldCheck className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-foreground">
                        {certificate.isCertified ? 'License Integration Certified' : 'Verification Incomplete / Failed'}
                      </h4>
                      <code className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-background border border-border">
                        {certificate.certificationId}
                      </code>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Verified {new Date(certificate.verifiedAt).toLocaleString()} by <span className="font-mono text-foreground">{certificate.verifiedBy}</span> in <strong className="capitalize">{certificate.environment}</strong> environment.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Test Score</span>
                    <span className={`text-xl font-black ${certificate.isCertified ? 'text-emerald-600' : 'text-destructive'}`}>
                      {certificate.scorePercentage}% ({certificate.passedCount}/{certificate.totalTests})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 13 Tests Grid & Details */}
          {certificate?.results && certificate.results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                  Verification Suite Results ({certificate.results.length} Scenarios)
                </span>
                <span className="text-[11px] text-muted-foreground">Click any test for details & suggested fix</span>
              </div>

              <div className="space-y-2">
                {certificate.results.map((test, index) => {
                  const isExpanded = expandedTestId === test.id;
                  const isPassed = test.status === 'passed';
                  const isAttention = test.status === 'needs_attention';
                  return (
                    <div
                      key={test.id}
                      className={`border rounded-2xl transition-all overflow-hidden bg-card ${
                        isExpanded ? 'ring-2 ring-indigo-500/20 border-indigo-500/40 shadow-xs' : 'border-border'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                        className="w-full text-left p-3.5 flex items-center justify-between gap-3 hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-mono text-muted-foreground font-bold w-5">{index + 1}.</span>
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                            isPassed
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : isAttention
                              ? 'bg-amber-500/10 text-amber-600'
                              : 'bg-destructive/10 text-destructive'
                          }`}>
                            {isPassed ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : isAttention ? (
                              <AlertCircle className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{test.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{test.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                            isPassed
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : isAttention
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              : 'bg-destructive/10 text-destructive border-destructive/20'
                          }`}>
                            {test.status.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground/60">{test.durationMs}ms</span>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-4 border-t border-border/80 bg-secondary/15 space-y-3 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase block">Expected Result</span>
                              <p className="text-xs text-foreground font-mono">{test.expectedResult}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase block">Actual Execution Result</span>
                              <p className={`text-xs font-mono font-bold ${isPassed ? 'text-emerald-600' : 'text-destructive'}`}>
                                {test.actualResult}
                              </p>
                            </div>
                          </div>

                          {test.errorDetails && (
                            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 space-y-1">
                              <span className="text-[10px] font-bold text-destructive uppercase block">Failure Diagnostics</span>
                              <p className="text-xs font-mono text-destructive">{test.errorDetails}</p>
                              {test.suggestedFix && (
                                <p className="text-xs text-foreground mt-1 pt-1 border-t border-destructive/20">
                                  <strong>Suggested Fix:</strong> {test.suggestedFix}
                                </p>
                              )}
                            </div>
                          )}

                          {test.requestPayload && (
                            <div>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Payload Sent</span>
                              <pre className="p-2.5 rounded-xl bg-[#0d1117] text-[#c9d1d9] text-[11px] font-mono overflow-x-auto">
                                <code>{JSON.stringify(test.requestPayload, null, 2)}</code>
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Celebration Banner if just marked Production Ready */}
          {celebration && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-indigo-500/20 border border-emerald-500/30 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                <Sparkles className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-black text-foreground">Product is Certified Production Ready!</h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                All 13 integration and security checks have passed. {productName} is officially certified for live customer distribution and auto-updates.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-secondary/30 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs font-semibold">
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleCertifyProductionReady}
              disabled={!certificate?.isCertified || currentStatus === 'production_ready' || certifying}
              className="gap-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {certifying ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {currentStatus === 'production_ready' ? 'Certified Production Ready' : 'Mark as Production Ready'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
