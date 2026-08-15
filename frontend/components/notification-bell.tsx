'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  Check,
  RefreshCw,
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export function NotificationBell() {
  const { user, isAdmin } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const res: any = await apiRequest('/notifications/unread-count');
      setUnreadCount(res.data?.unreadCount ?? res.unreadCount ?? 0);
    } catch {
      // Quiet fail if not logged in
    }
  };

  const fetchRecent = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res: any = await apiRequest('/notifications?limit=6');
      setRecentNotifications(res.data?.items || res.items || []);
      setUnreadCount(res.data?.unreadCount ?? res.unreadCount ?? 0);
    } catch {
      // Quiet fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchRecent();
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
      setRecentNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiRequest('/notifications/mark-all-read', { method: 'POST' });
      setRecentNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Ignore
    }
  };

  if (!user) return null;

  const targetCenterUrl = isAdmin ? '/admin/notifications' : '/dashboard/notifications';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications & Alerts"
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/60 hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-black text-white shadow-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl border border-border bg-card/95 backdrop-blur-md shadow-2xl p-4 space-y-3 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-500">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-semibold text-indigo-500 hover:underline flex items-center gap-1"
              >
                <Check className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {loading ? (
              <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
                <span>Loading alerts...</span>
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
                <CheckCircle2 className="h-6 w-6 text-emerald-500/50 mx-auto" />
                <p className="font-semibold text-foreground">You&apos;re all caught up!</p>
                <p className="text-[11px]">No unread alerts or notifications.</p>
              </div>
            ) : (
              recentNotifications.map((notif) => {
                const isCrit = notif.severity === 'critical' || notif.severity === 'error';
                const isWarn = notif.severity === 'warning';

                return (
                  <div
                    key={notif._id}
                    className={`p-3 rounded-2xl border transition-colors flex items-start gap-3 relative group ${
                      !notif.isRead
                        ? 'bg-secondary/50 border-indigo-500/20'
                        : 'bg-card border-border/60 hover:bg-secondary/30'
                    }`}
                  >
                    <div
                      className={`h-7 w-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isCrit
                          ? 'bg-destructive/15 text-destructive'
                          : isWarn
                          ? 'bg-amber-500/15 text-amber-500'
                          : 'bg-indigo-500/15 text-indigo-500'
                      }`}
                    >
                      {isCrit ? (
                        <AlertCircle className="h-3.5 w-3.5" />
                      ) : isWarn ? (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      ) : (
                        <Info className="h-3.5 w-3.5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-foreground truncate">{notif.title}</p>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight line-clamp-2">
                        {notif.message}
                      </p>
                    </div>

                    {!notif.isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(notif._id, e)}
                        title="Mark as read"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500 hover:text-indigo-600 p-1"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between">
            <Link
              href={targetCenterUrl}
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-indigo-500 hover:underline flex items-center gap-1 w-full justify-center py-1"
            >
              <span>Open Notification Center</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
