import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Globe, Lock, Mail, AlertCircle, ShieldAlert, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isGoogleSheetsConfigured } from '../lib/sheets';

export default function Login() {
  const { isAuthenticated, loading, signIn, authError, setAuthError } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/';

  if (!loading && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-sm mb-4">
            <Globe className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            My Website Tracker
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            Private Single-Owner Dashboard (Powered by Google Sheets)
          </p>
        </div>

        {/* Google Sheets Setup Notice if .env is not configured */}
        {!isGoogleSheetsConfigured && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/70 text-xs text-amber-800 dark:text-amber-300 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Google Sheets Connection Not Configured</span>
            </div>
            <p className="leading-relaxed">
              Deploy <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">google-sheets/Code.gs</code> inside your private Google Sheet&apos;s Apps Script editor, then copy{' '}
              <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">.env.example</code> to{' '}
              <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">.env</code> and set{' '}
              <code className="font-mono">VITE_GOOGLE_SHEETS_WEBAPP_URL</code>.
            </p>
          </div>
        )}

        {/* Login Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Owner Sign In
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enter your authorized owner credentials stored in your Google Sheet.
            </p>
          </div>

          {authError && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/70 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (authError) setAuthError('');
                  }}
                  placeholder="owner@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (authError) setAuthError('');
                  }}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>{submitting ? 'Authenticating...' : 'Login'}</span>
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <Lock className="w-3.5 h-3.5" />
            <span>Private system — Public registration is disabled.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
