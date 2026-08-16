'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  ShieldCheck,
  Key,
  LayoutDashboard,
  LogOut,
  User as UserIcon,
  PlayCircle,
  Menu,
  X,
  Settings,
  BookOpen,
  ShoppingBag,
  ShoppingCart,
} from 'lucide-react';
import { useState } from 'react';
import { NotificationBell } from '@/components/notification-bell';
import { useCart } from '@/lib/cart-context';

export function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { cartCount } = useCart();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md shadow-indigo-500/20">
              <Key className="h-5 w-5" />
            </div>
            <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text font-black text-xl tracking-tight">
              License<span className="text-indigo-500">Nest</span>
            </span>
          </Link>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/store"
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                pathname.startsWith('/store')
                  ? 'bg-indigo-500/10 text-indigo-500 font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              Store
            </Link>
            <Link
              href="/"
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                pathname === '/'
                  ? 'bg-secondary text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              Overview
            </Link>
            <Link
              href="/playground"
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                pathname === '/playground'
                  ? 'bg-indigo-500/10 text-indigo-500 font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <PlayCircle className="h-4 w-4" />
              API Playground
            </Link>
            <Link
              href="/docs"
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                pathname === '/docs'
                  ? 'bg-indigo-500/10 text-indigo-500 font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              API Docs
            </Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Cart Button */}
          <Link
            href="/cart"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary/40 text-foreground hover:bg-secondary transition-colors"
            title="Shopping Cart"
          >
            <ShoppingCart className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white shadow-xs animate-in zoom-in-50">
                {cartCount}
              </span>
            )}
          </Link>
          {user ? (
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                    pathname.startsWith('/admin')
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary text-foreground hover:bg-secondary/80'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Admin Panel</span>
                </Link>
              )}

              <Link
                href="/dashboard"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  pathname.startsWith('/dashboard')
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary text-foreground hover:bg-secondary/80'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>

              {/* Notification Bell Dropdown */}
              <NotificationBell />

              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-semibold leading-none">{user.fullName}</span>
                  <span className="text-[10px] text-muted-foreground capitalize mt-0.5">
                    {user.role.replace('_', ' ')}
                  </span>
                </div>
                <button
                  onClick={logout}
                  title="Logout"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm shadow-primary/20"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-b border-border bg-background p-4 space-y-2">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 text-sm font-medium rounded-lg hover:bg-secondary"
          >
            Overview
          </Link>
          <Link
            href="/playground"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 text-sm font-medium rounded-lg hover:bg-secondary text-indigo-500 font-semibold"
          >
            API Playground
          </Link>
          <Link
            href="/docs"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 text-sm font-medium rounded-lg hover:bg-secondary"
          >
            API Docs
          </Link>
          {user ? (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 text-sm font-medium rounded-lg bg-secondary"
                >
                  Admin Panel
                </Link>
              )}
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 text-sm font-medium rounded-lg hover:bg-secondary"
              >
                User Dashboard
              </Link>
              <Link
                href="/dashboard/settings"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 text-sm font-medium rounded-lg hover:bg-secondary"
              >
                Account Settings
              </Link>
              <button
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
                className="w-full text-left px-3 py-2 text-sm font-medium text-destructive rounded-lg hover:bg-destructive/10"
              >
                Sign Out
              </button>
            </>
          ) : (
            <div className="pt-2 border-t border-border flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="w-full text-center py-2 text-sm font-medium border border-border rounded-lg"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="w-full text-center py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
