'use client';

import React, { useState, useEffect } from 'react';
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
  Sliders,
  Mail,
  Smartphone,
  Globe,
  Calendar,
  Layers,
  ArrowRight,
  Save,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function CustomerNotificationsPage() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'preferences'>('inbox');

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Preferences state
  const [prefLoading, setPrefLoading] = useState(false);
  const [savingPref, setSavingPref] = useState(false);
  const [prefSavedSuccess, setPrefSavedSuccess] = useState(false);
  const [preferences, setPreferences] = useState({
    inAppEnabled: true,
    emailEnabled: true,
    webhookEnabled: false,
    webhookUrl: '',
    expiryReminderDays: [30, 7, 1],
    subscribedEvents: {
      license_activated: true,
      license_deactivated: true,
      license_expiring_soon: true,
      license_expired: true,
      support_expiring_soon: true,
      support_expired: true,
      suspicious_activity: true,
      product_update_available: true,
    },
  });

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/notifications?limit=50${unreadOnly ? '&isRead=false' : ''}`);
      const data = res.data || res;
      setNotifications(data.items || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    setPrefLoading(true);
    try {
      const res = await apiRequest('/notifications/preferences');
      const data = res.data || res;
      if (data) {
        setPreferences({
          inAppEnabled: data.inAppEnabled ?? true,
          emailEnabled: data.emailEnabled ?? true,
          webhookEnabled: data.webhookEnabled ?? false,
          webhookUrl: data.webhookUrl || '',
          expiryReminderDays: data.expiryReminderDays || [30, 7, 1],
          subscribedEvents: {
            license_activated: data.subscribedEvents?.license_activated ?? true,
            license_deactivated: data.subscribedEvents?.license_deactivated ?? true,
            license_expiring_soon: data.subscribedEvents?.license_expiring_soon ?? true,
            license_expired: data.subscribedEvents?.license_expired ?? true,
            support_expiring_soon: data.subscribedEvents?.support_expiring_soon ?? true,
            support_expired: data.subscribedEvents?.support_expired ?? true,
            suspicious_activity: data.subscribedEvents?.suspicious_activity ?? true,
            product_update_available: data.subscribedEvents?.product_update_available ?? true,
          },
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPrefLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'inbox') {
      fetchNotifications();
    } else {
      fetchPreferences();
    }
  }, [activeTab, unreadOnly]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      alert(err.message || 'Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiRequest('/notifications/mark-all-read', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err: any) {
      alert(err.message || 'Failed to mark all as read');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/notifications/${id}`, { method: 'DELETE' });
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPref(true);
    setPrefSavedSuccess(false);
    try {
      await apiRequest('/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify(preferences),
      });
      setPrefSavedSuccess(true);
      setTimeout(() => setPrefSavedSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save preferences');
    } finally {
      setSavingPref(false);
    }
  };

  const toggleReminderDay = (day: number) => {
    setPreferences((prev) => {
      const current = prev.expiryReminderDays || [];
      const updated = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort((a, b) => b - a);
      return { ...prev, expiryReminderDays: updated };
    });
  };

  const toggleEventSub = (eventKey: string) => {
    setPreferences((prev) => ({
      ...prev,
      subscribedEvents: {
        ...prev.subscribedEvents,
        [eventKey]: !prev.subscribedEvents[eventKey as keyof typeof prev.subscribedEvents],
      },
    }));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Bell className="h-5 w-5" />
            </div>
            <span>Notifications &amp; Alerts</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stay updated with license activations, expiry warnings, security notices, and software releases
          </p>
        </div>

        {/* Tab Toggle Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-secondary/70 border border-border self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'inbox'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
            <span>Inbox</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-600 text-white font-black">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'preferences'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Preferences</span>
          </button>
        </div>
      </div>

      {/* TAB 1: INBOX & HISTORY */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
          {/* Action header */}
          <div className="flex items-center justify-between gap-3 p-4 rounded-3xl border border-border bg-card shadow-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUnreadOnly(false)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                  !unreadOnly
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                All Alerts
              </button>
              <button
                onClick={() => setUnreadOnly(true)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 ${
                  unreadOnly
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                <span>Unread</span>
                {unreadCount > 0 && (
                  <span className="h-2 w-2 rounded-full bg-indigo-400 shrink-0" />
                )}
              </button>
            </div>

            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-8 text-xs font-semibold gap-1"
              >
                <Check className="h-3 w-3" />
                Mark All Read
              </Button>
            )}
          </div>

          {/* List */}
          <div className="space-y-3">
            {loading ? (
              <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
                <span>Loading your inbox...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-16 text-center rounded-3xl border border-dashed border-border bg-card/40 space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/50 mx-auto" />
                <h3 className="text-sm font-bold text-foreground">Inbox is empty</h3>
                <p className="text-xs text-muted-foreground">You have no new notifications or alerts at this time.</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isCrit = notif.severity === 'critical' || notif.severity === 'error';
                const isWarn = notif.severity === 'warning';

                return (
                  <div
                    key={notif._id}
                    className={`p-5 rounded-3xl border transition-all space-y-2 ${
                      !notif.isRead
                        ? 'bg-secondary/40 border-indigo-500/30 shadow-xs'
                        : 'bg-card border-border/80 hover:bg-secondary/20'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`h-9 w-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                            isCrit
                              ? 'bg-destructive/15 text-destructive'
                              : isWarn
                              ? 'bg-amber-500/15 text-amber-500'
                              : 'bg-indigo-500/15 text-indigo-500'
                          }`}
                        >
                          {isCrit ? (
                            <AlertCircle className="h-4 w-4" />
                          ) : isWarn ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            <Info className="h-4 w-4" />
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-foreground">{notif.title}</h3>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {notif.message}
                          </p>

                          {notif.actionUrl && (
                            <div className="pt-1.5">
                              <Link
                                href={notif.actionUrl}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:underline"
                              >
                                <span>View Details</span>
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {!notif.isRead && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMarkAsRead(notif._id)}
                            className="h-7 text-[11px] font-semibold text-indigo-500 hover:bg-indigo-500/10 px-2"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Mark Read
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(notif._id)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PREFERENCES */}
      {activeTab === 'preferences' && (
        <form onSubmit={handleSavePreferences} className="space-y-6">
          {prefSavedSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Notification preferences saved successfully!</span>
            </div>
          )}

          {/* Delivery Channels */}
          <div className="p-6 rounded-3xl border border-border bg-card shadow-xs space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-indigo-500" />
              Notification Delivery Channels
            </h2>
            <p className="text-xs text-muted-foreground">Choose where you want to receive alerts &amp; reminders.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* In-App */}
              <label className="p-4 rounded-2xl border border-border bg-background flex items-start gap-3 cursor-pointer hover:border-indigo-500/30 transition-colors">
                <input
                  type="checkbox"
                  checked={preferences.inAppEnabled}
                  onChange={(e) => setPreferences({ ...preferences, inAppEnabled: e.target.checked })}
                  className="mt-0.5 rounded text-indigo-600"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5 text-indigo-500" />
                    In-App Notification Center
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Display real-time notification bells and history in your dashboard.
                  </p>
                </div>
              </label>

              {/* Email */}
              <label className="p-4 rounded-2xl border border-border bg-background flex items-start gap-3 cursor-pointer hover:border-indigo-500/30 transition-colors">
                <input
                  type="checkbox"
                  checked={preferences.emailEnabled}
                  onChange={(e) => setPreferences({ ...preferences, emailEnabled: e.target.checked })}
                  className="mt-0.5 rounded text-indigo-600"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-indigo-500" />
                    Email Notifications
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Receive email digests for expiring licenses and security alerts.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Expiry Reminders Schedule */}
          <div className="p-6 rounded-3xl border border-border bg-card shadow-xs space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-500" />
              Automated Expiry Reminder Schedule
            </h2>
            <p className="text-xs text-muted-foreground">Select how many days in advance you wish to be notified before license or support expiration.</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {[30, 14, 7, 1].map((day) => {
                const isSelected = preferences.expiryReminderDays.includes(day);
                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => toggleReminderDay(day)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-500/10 border-indigo-500 text-foreground font-bold shadow-xs'
                        : 'bg-background border-border text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    <div className="text-xs">{day} Day{day > 1 ? 's' : ''} Before</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {isSelected ? '✓ Enabled' : 'Disabled'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Event Subscriptions */}
          <div className="p-6 rounded-3xl border border-border bg-card shadow-xs space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-500" />
              Event Subscriptions
            </h2>
            <p className="text-xs text-muted-foreground">Fine-tune individual event notifications.</p>

            <div className="space-y-3 pt-2">
              {[
                { key: 'license_activated', label: 'License Activations', desc: 'Alerts when a domain or installation is activated.' },
                { key: 'license_deactivated', label: 'License Deactivations', desc: 'Alerts when a domain is deactivated or an activation slot is freed.' },
                { key: 'license_expiring_soon', label: 'License Expiry Warnings', desc: 'Reminders before subscription or periodic license terms end.' },
                { key: 'support_expiring_soon', label: 'Support Period Expirations', desc: 'Reminders when premium developer support is ending.' },
                { key: 'suspicious_activity', label: 'Suspicious Security Alerts', desc: 'Critical alerts for unauthorized activation attempts or IP blocks.' },
                { key: 'product_update_available', label: 'Product Updates & Releases', desc: 'Notices when new software versions or security patches are published.' },
              ].map((ev) => {
                const isChecked = (preferences.subscribedEvents as any)[ev.key] !== false;
                return (
                  <div
                    key={ev.key}
                    className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground">{ev.label}</p>
                      <p className="text-[11px] text-muted-foreground">{ev.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleEventSub(ev.key)}
                      className="rounded text-indigo-600 h-4 w-4"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3">
            <Button type="submit" disabled={savingPref} className="gap-2">
              <Save className="h-4 w-4" />
              <span>{savingPref ? 'Saving Settings...' : 'Save Preferences'}</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
