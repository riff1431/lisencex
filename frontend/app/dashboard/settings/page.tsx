'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  User,
  Lock,
  CheckCircle2,
  AlertCircle,
  Save,
  KeyRound,
  ShieldCheck,
  Globe2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardSettingsPage() {
  const { user, updateProfile, changePassword } = useAuth();

  // Profile Form
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [envatoUsername, setEnvatoUsername] = useState(user?.envatoUsername || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
      setEnvatoUsername(user.envatoUsername || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess(false);
    setProfileLoading(true);

    try {
      await updateProfile({
        fullName,
        email,
        envatoUsername: envatoUsername || undefined,
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);

    try {
      await changePassword({ currentPassword, newPassword });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Account & Security Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your personal details, connected Envato account, and security credentials
        </p>
      </div>

      {/* Profile Form */}
      <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold">Personal Profile</h2>
            <p className="text-xs text-muted-foreground">Update your identity and contact information</p>
          </div>
        </div>

        {profileSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>Profile information updated successfully!</span>
          </div>
        )}

        {profileError && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{profileError}</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5 max-w-sm">
            <label className="font-semibold text-foreground">Envato Username (Optional)</label>
            <input
              type="text"
              value={envatoUsername}
              onChange={(e) => setEnvatoUsername(e.target.value)}
              placeholder="e.g. elite_author_99"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-medium"
            />
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={profileLoading} className="gap-2 font-semibold">
              <Save className="h-4 w-4" />
              {profileLoading ? 'Saving...' : 'Save Profile Changes'}
            </Button>
          </div>
        </form>
      </div>

      {/* Password Form */}
      <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="h-10 w-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold">Password & Security</h2>
            <p className="text-xs text-muted-foreground">Ensure your account uses a strong, unique password</p>
          </div>
        </div>

        {passwordSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>Password updated successfully!</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
          <div className="space-y-1.5 max-w-md">
            <label className="font-semibold text-foreground">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={passwordLoading} className="gap-2 font-semibold">
              <KeyRound className="h-4 w-4" />
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
