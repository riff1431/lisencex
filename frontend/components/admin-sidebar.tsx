'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Box,
  ShoppingBag,
  KeyRound,
  Laptop2,
  ShieldAlert,
  ScrollText,
  Settings,
  Flame,
  ArrowUpRight,
  LogOut,
  User,
  ShieldCheck,
  Bell,
  Code2,
  BookOpen,
  Terminal,
  Zap,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const adminLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/products', label: 'Products & Releases', icon: Box },
  { href: '/admin/license-plans', label: 'License Plans', icon: Layers },
  { href: '/admin/purchases', label: 'Purchases & Orders', icon: ShoppingBag },
  { href: '/admin/licenses', label: 'Licenses Manager', icon: KeyRound },
  { href: '/admin/activations', label: 'Live Activations', icon: Laptop2 },
  { href: '/admin/security', label: 'Security & Blocklist', icon: ShieldAlert },
  { href: '/admin/notifications', label: 'Notification Center', icon: Bell },
  { href: '/admin/integration', label: 'Developer Integration', icon: Zap },
  { href: '/admin/developers', label: 'API Credentials', icon: Code2 },
  { href: '/admin/audit', label: 'Audit Logs Stream', icon: ScrollText },
  { href: '/admin/settings', label: 'System Settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <aside className="w-64 shrink-0 border-r border-border min-h-[calc(100vh-4rem)] p-4 bg-card/40 flex flex-col justify-between">
      <div className="space-y-6">
        {/* Admin Badge */}
        <div className="p-3 rounded-2xl bg-secondary/50 border border-border flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-xs">
            {user?.fullName?.charAt(0) || 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-xs truncate text-foreground flex items-center gap-1">
              <span>{user?.fullName || 'Super Admin'}</span>
              <ShieldCheck className="h-3 w-3 text-indigo-500 shrink-0" />
            </div>
            <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
              {user?.role?.replace('_', ' ') || 'Super Administrator'}
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Administration
          </div>
          <nav className="space-y-1">
            {adminLinks.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Customer Portal Link */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Switch View
          </div>
          <Link
            href="/dashboard"
            className="flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-all border border-dashed border-border"
          >
            <span>Customer Dashboard</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Bottom info & Logout */}
      <div className="space-y-3 pt-4 border-t border-border">
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>

        <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-500 mb-1">
            <Flame className="h-3.5 w-3.5" />
            <span>Licensing Core Active</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            NestJS Engine + MongoDB Atlas + ECDSA/HMAC.
          </p>
        </div>
      </div>
    </aside>
  );
}
