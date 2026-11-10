import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  isGoogleSheetsConfigured,
  configuredOwnerEmail,
  getStoredToken,
  getStoredProfile,
  saveStoredSession,
  clearStoredSession,
  callSheetsApi,
} from '../lib/sheets';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const verifySession = useCallback(async () => {
    if (!isGoogleSheetsConfigured) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    // Optimistically hydrate cached profile while verifying token against Google Sheets `profiles` tab
    const cachedProfile = getStoredProfile();
    if (cachedProfile?.id) {
      setUser({ id: cachedProfile.id, email: cachedProfile.email });
      setProfile(cachedProfile);
    }

    const res = await callSheetsApi('verifySession');
    if (res.ok && res.profile) {
      if (
        configuredOwnerEmail &&
        res.profile.email?.toLowerCase() !== configuredOwnerEmail
      ) {
        clearStoredSession();
        setUser(null);
        setProfile(null);
        setAuthError('Unauthorized account. Only the designated owner may sign in.');
      } else {
        saveStoredSession(token, res.profile);
        setUser({ id: res.profile.id, email: res.profile.email });
        setProfile(res.profile);
        setAuthError('');
      }
    } else {
      clearStoredSession();
      setUser(null);
      setProfile(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  const signIn = async (email, password) => {
    setAuthError('');
    if (!isGoogleSheetsConfigured) {
      const msg =
        'Google Sheets Web App URL is not configured. Check GOOGLE_SHEETS_WEBAPP_URL in your .env file.';
      setAuthError(msg);
      return { error: msg };
    }

    const cleanEmail = email?.trim().toLowerCase() || '';
    if (!cleanEmail || !password) {
      const msg = 'Email address and password are required.';
      setAuthError(msg);
      return { error: msg };
    }

    if (configuredOwnerEmail && cleanEmail !== configuredOwnerEmail) {
      const msg = 'Access denied. Only the pre-authorized owner account is permitted.';
      setAuthError(msg);
      return { error: msg };
    }

    const res = await callSheetsApi('login', { email: cleanEmail, password });
    if (!res.ok || !res.token || !res.profile) {
      const msg = res.error || 'Invalid email or password.';
      setAuthError(msg);
      return { error: msg };
    }

    saveStoredSession(res.token, res.profile);
    setUser({ id: res.profile.id, email: res.profile.email });
    setProfile(res.profile);
    setAuthError('');
    return { profile: res.profile, error: null };
  };

  const signOut = async () => {
    setAuthError('');
    if (isGoogleSheetsConfigured && getStoredToken()) {
      await callSheetsApi('logout');
    }
    clearStoredSession();
    setUser(null);
    setProfile(null);
  };

  const updatePassword = async (newPassword) => {
    if (!user || !getStoredToken()) {
      return { error: 'Not authenticated.' };
    }
    if (!newPassword || newPassword.length < 8) {
      return { error: 'Password must be at least 8 characters long.' };
    }
    const res = await callSheetsApi('updatePassword', { newPassword });
    if (!res.ok) {
      return { error: res.error || 'Failed to update password in Google Sheets.' };
    }
    return { error: null };
  };

  const value = {
    user,
    profile,
    isAuthenticated: Boolean(user && profile),
    loading,
    authError,
    setAuthError,
    signIn,
    signOut,
    updatePassword,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
