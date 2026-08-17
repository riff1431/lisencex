'use client';

import Link from 'next/link';
import {
  ShieldCheck,
  Key,
  Layers,
  Zap,
  Globe2,
  Cpu,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Lock,
  RefreshCw,
  Download,
  Terminal,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24 border-b border-border/40 bg-gradient-to-b from-background via-background to-secondary/30">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-pink-500/20 blur-[120px] pointer-events-none rounded-full" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs font-semibold text-indigo-500 mb-6 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Next-Gen Multi-Marketplace Licensing Engine</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight max-w-4xl mx-auto text-balance">
            Enterprise License & Activation{' '}
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Ecosystem
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-balance">
            Distribute digital products across your own marketplace, Envato CodeCanyon, and ThemeForest. Enforce installation limits, signed cryptographic tokens, and automatic updates.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/store">
              <Button size="lg" className="h-12 px-7 text-base font-bold shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <ShoppingBag className="h-4 w-4" />
                Browse Digital Store
              </Button>
            </Link>
            <Link href="/playground">
              <Button size="lg" variant="outline" className="h-12 px-7 text-base font-semibold gap-2 border-border/80">
                <Terminal className="h-4 w-4" />
                Live API Playground
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="ghost" className="h-12 px-5 text-base font-semibold gap-2">
                Sign In
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-border/50 text-left">
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="text-2xl font-black">6-Stage</div>
              <div className="text-xs text-muted-foreground mt-0.5">Strict Lifecycle Engine</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="text-2xl font-black">Multi-Channel</div>
              <div className="text-xs text-muted-foreground mt-0.5">Internal + Envato Providers</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="text-2xl font-black">RSA/HMAC</div>
              <div className="text-xs text-muted-foreground mt-0.5">Signed Activation Tokens</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="text-2xl font-black">Multi-Product</div>
              <div className="text-xs text-muted-foreground mt-0.5">WordPress, PHP, Next.js, SaaS</div>
            </div>
          </div>
        </div>
      </section>

      {/* Lifecycle Visual Section */}
      <section className="py-20 bg-card/40 border-b border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Architected for Enterprise Scale
            </h2>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base">
              Separates purchases, legal licenses, installations, and signed runtime tokens.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { step: '01', title: 'Product', desc: 'WordPress, PHP, Next.js or SaaS', icon: Layers },
              { step: '02', title: 'Purchase', desc: 'Internal orders or Envato verification', icon: Key },
              { step: '03', title: 'License', desc: 'Entitlements, limits & expiration', icon: ShieldCheck },
              { step: '04', title: 'Installation', desc: 'Domain normalization & fingerprints', icon: Globe2 },
              { step: '05', title: 'Activation', desc: 'Atomic slots & signed JWT tokens', icon: Lock },
              { step: '06', title: 'Validation', desc: 'Periodic heartbeats & updates', icon: RefreshCw },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="relative p-5 rounded-2xl border border-border bg-card shadow-xs hover:border-indigo-500/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold font-mono text-indigo-500">{item.step}</span>
                      <div className="h-8 w-8 rounded-xl bg-secondary flex items-center justify-center text-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <h3 className="font-bold text-base">{item.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl border border-border bg-card space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <Globe2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Multi-Marketplace Verification</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connect your Envato API personal token to verify CodeCanyon and ThemeForest purchase codes directly, matching Item IDs with strict duplicate protection.
              </p>
            </div>

            <div className="p-8 rounded-3xl border border-border bg-card space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Signed Cryptographic Tokens</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Clients receive HMAC-signed tokens with expiration dates and domain hashes. Supports offline grace periods up to 7 days before requiring online heartbeat validation.
              </p>
            </div>

            <div className="p-8 rounded-3xl border border-border bg-card space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-pink-500/10 text-pink-500 flex items-center justify-center">
                <Download className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Auto Updates & Secure Downloads</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Provide secure 15-minute ephemeral download URLs and auto-update endpoints for authorized installations. Automatically block updates for revoked licenses.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 bg-card/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2026 LicenseNest Ecosystem. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/playground" className="hover:text-foreground">Playground</Link>
            <Link href="/login" className="hover:text-foreground">Admin Portal</Link>
            <Link href="/dashboard" className="hover:text-foreground">Customer Portal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
