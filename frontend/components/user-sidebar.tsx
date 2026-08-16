'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import {
  LayoutDashboard, Box, KeyRound, Sparkles, Download,
  Settings, ShieldCheck, LogOut, AlertTriangle, ExternalLink, Bell,
  ShoppingBag, Tag, LifeBuoy, MessageSquare, Receipt,
} from 'lucide-react';

export function UserSidebar() {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();
  const [licenseCount, setLicenseCount] = useState<number | null>(null);
  const [hasExpiring, setHasExpiring] = useState(false);

  useEffect(() => {
    apiRequest('/customer/licenses')
      .then(res => {
        const licenses = res.data || [];
        setLicenseCount(licenses.length);
        const now = Date.now();
        setHasExpiring(licenses.some((l: any) => {
          if (!l.expiresAt) return false;
          const diff = new Date(l.expiresAt).getTime() - now;
          return diff > 0 && diff < 30 * 24 * 3600 * 1000;
        }));
      })
      .catch(() => {});
  }, []);

  const navItems = [
    {
      href: '/dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
      exact: true,
      badge: hasExpiring ? <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" title="Licenses expiring soon" /> : null,
    },
    {
      href: '/dashboard/licenses',
      label: 'Licenses & Domains',
      icon: KeyRound,
      badge: licenseCount !== null && licenseCount > 0
        ? <span className="ml-auto text-[10px] font-bold bg-indigo-500/15 text-indigo-500 px-1.5 py-0.5 rounded-full">{licenseCount}</span>
        : null,
    },
    {
      href: '/dashboard/products',
      label: 'My Products',
      icon: Box,
    },
    {
      href: '/dashboard/orders',
      label: 'My Orders',
      icon: ShoppingBag,
    },
    {
      href: '/dashboard/purchases',
      label: 'My Purchases',
      icon: Tag,
    },
    {
      href: '/dashboard/downloads',
      label: 'Downloads & Releases',
      icon: Download,
    },
    {
      href: '/dashboard/envato',
      label: 'Import Envato',
      icon: Sparkles,
      badge: <span className="ml-auto text-[10px] font-bold bg-[#79c41a]/15 text-[#79c41a] px-1.5 py-0.5 rounded-full">New</span>,
    },
    {
      href: '/dashboard/support',
      label: 'Support Tickets',
      icon: LifeBuoy,
    },
    {
      href: '/dashboard/reviews',
      label: 'My Reviews',
      icon: MessageSquare,
    },
    {
      href: '/dashboard/billing',
      label: 'Billing & Invoices',
      icon: Receipt,
    },
    {
      href: '/dashboard/notifications',
      label: 'Notifications',
      icon: Bell,
    },
    {
      href: '/dashboard/settings',
      label: 'Account & Security',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-border min-h-[calc(100vh-4rem)] p-4 bg-card/30 flex flex-col justify-between">
      <div className="space-y-5">
        {/* User Profile Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/8 via-purple-500/5 to-transparent border border-indigo-500/15 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 font-black text-white text-base shadow-md shadow-indigo-500/30">
              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-sm text-foreground truncate">{user?.fullName}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          {licenseCount !== null && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <KeyRound className="h-3 w-3 text-indigo-400" />
              <span>{licenseCount} license{licenseCount !== 1 ? 's' : ''} on your account</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="space-y-1">
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Customer Dashboard
          </div>
          <nav className="space-y-0.5">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-xl transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold shadow-sm shadow-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Expiry Warning */}
        {hasExpiring && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-amber-600 dark:text-amber-400">License expiring soon</p>
              <Link href="/dashboard/licenses" className="text-amber-600/80 dark:text-amber-400/80 hover:underline">
                Review your licenses →
              </Link>
            </div>
          </div>
        )}

        {/* Admin Shortcut */}
        {isAdmin && (
          <div className="pt-1 border-t border-border">
            <Link
              href="/admin"
              className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-xl text-indigo-500 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 transition-all"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Switch to Admin Panel</span>
              <ExternalLink className="h-3.5 w-3.5 ml-auto opacity-60" />
            </Link>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="space-y-2 pt-4 border-t border-border mt-4">
        {/* Envato Promo Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#79c41a]/5 via-emerald-500/5 to-transparent border border-[#79c41a]/20 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#79c41a]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Envato Buyer?</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Import CodeCanyon &amp; ThemeForest codes to unlock instant updates.
          </p>
          <Link href="/dashboard/envato" className="text-[11px] text-[#79c41a] hover:underline font-bold flex items-center gap-1">
            Claim now <ExternalLink className="h-2.5 w-2.5" />
          </Link>
        </div>

        {/* Sign Out */}
        {logout && (
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        )}
      </div>
    </aside>
  );
}
