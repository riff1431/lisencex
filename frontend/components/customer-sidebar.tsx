'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Box,
  KeyRound,
  Download,
  Sparkles,
} from 'lucide-react';

const customerLinks = [
  { href: '/customer', label: 'My Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/customer/products', label: 'My Products', icon: Box },
  { href: '/customer/licenses', label: 'Licenses & Domains', icon: KeyRound },
  { href: '/customer/envato', label: 'Import Envato Purchase', icon: Sparkles },
  { href: '/customer/downloads', label: 'Downloads & Releases', icon: Download },
];

export function CustomerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-border min-h-[calc(100vh-4rem)] p-4 bg-card/30 flex flex-col justify-between">
      <div className="space-y-6">
        <div>
          <div className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Customer Space
          </div>
          <nav className="space-y-1">
            {customerLinks.map((item) => {
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
                      ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-secondary border border-border">
        <p className="text-xs font-semibold text-foreground">Need Support?</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Have an Envato purchase? Use the import tool to claim your license key instantly.
        </p>
      </div>
    </aside>
  );
}
