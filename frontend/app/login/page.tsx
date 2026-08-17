'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Key, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');

  // Only allow same-app relative redirects — an absolute or protocol-relative
  // callbackUrl would send users to an attacker-controlled site post-login.
  const safeCallbackUrl =
    callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')
      ? callbackUrl
      : null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      const savedUser = JSON.parse(localStorage.getItem('auth_user') || '{}');

      if (safeCallbackUrl) {
        router.push(safeCallbackUrl);
      } else if (savedUser.role === 'super_admin' || savedUser.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-background via-card/20 to-secondary/30">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-indigo-500/20">
            <Key className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Welcome to LicenseNest</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to manage your digital products, purchases, and licenses
          </p>
        </div>

        {/* Card */}
        <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xl shadow-black/5 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">Password</label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-sm font-semibold shadow-md shadow-primary/20"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>

          <div className="text-center text-xs text-muted-foreground pt-2">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-foreground hover:underline">
              Create one here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
