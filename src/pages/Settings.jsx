import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  KeyRound,
  Monitor,
  Sun,
  Moon,
  LayoutGrid,
  List,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../components/WebsiteCard';

export function applyThemePreference(theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

export default function Settings() {
  const { profile, updatePassword } = useAuth();

  // Application Preferences
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('mwt_theme') || 'system';
  });
  const [defaultView, setDefaultView] = useState(() => {
    return localStorage.getItem('mwt_default_view') || 'grid';
  });

  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState({ type: '', text: '' });

  const handleThemeChange = (nextTheme) => {
    setTheme(nextTheme);
    localStorage.setItem('mwt_theme', nextTheme);
    applyThemePreference(nextTheme);
  };

  const handleDefaultViewChange = (nextView) => {
    setDefaultView(nextView);
    localStorage.setItem('mwt_default_view', nextView);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwMessage({ type: '', text: '' });

    if (newPassword.length < 8) {
      setPwMessage({
        type: 'error',
        text: 'New password must be at least 8 characters long.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwMessage({
        type: 'error',
        text: 'Password confirmation does not match.',
      });
      return;
    }

    setPwLoading(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        setPwMessage({ type: 'error', text: error });
      } else {
        setNewPassword('');
        setConfirmPassword('');
        setPwMessage({
          type: 'success',
          text: 'Owner password updated successfully.',
        });
      }
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Manage your single-owner account details and basic application preferences.
        </p>
      </div>

      {/* 1. Owner Account Details */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-4">
          <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Owner Account
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verified single-owner profile stored in the Google Sheets `profiles` tab.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              Authorized Email
            </span>
            <span className="mt-1 block font-medium text-slate-900 dark:text-white break-all">
              {profile?.email || '—'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              Profile Created
            </span>
            <span className="mt-1 block font-medium text-slate-900 dark:text-white">
              {formatDate(profile?.created_at)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-200">
          <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>
            Single-Owner Google Sheets Access Control is active. All read/write operations on the{' '}
            <code className="font-mono text-[11px]">websites</code> sheet tab require a valid
            session token belonging to owner ID{' '}
            <code className="font-mono text-[11px]">{profile?.id}</code>.
          </span>
        </div>
      </section>

      {/* 2. Application Preferences */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-4">
          <Monitor className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Application Preferences
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customize appearance and default project view on this device.
            </p>
          </div>
        </div>

        {/* Theme Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Color Theme
          </label>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {[
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'system', label: 'System', icon: Monitor },
            ].map((item) => {
              const Icon = item.icon;
              const active = theme === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleThemeChange(item.id)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Default Dashboard Layout */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Default Dashboard Layout
          </label>
          <div className="grid grid-cols-2 gap-3 max-w-xs">
            {[
              { id: 'grid', label: 'Cards', icon: LayoutGrid },
              { id: 'table', label: 'Table', icon: List },
            ].map((item) => {
              const Icon = item.icon;
              const active = defaultView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleDefaultViewChange(item.id)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Update Owner Password */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-4">
          <KeyRound className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Update Password
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Change the SHA-256 hashed password for your single-owner account in Google Sheets.
            </p>
          </div>
        </div>

        {pwMessage.text && (
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
              pwMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/70 text-rose-700 dark:text-rose-300'
            }`}
          >
            {pwMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{pwMessage.text}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
          <div>
            <label
              htmlFor="new-password"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={pwLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {pwLoading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </section>
    </div>
  );
}

