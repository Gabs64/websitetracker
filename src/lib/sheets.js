const envWebAppUrl = import.meta.env.VITE_GOOGLE_SHEETS_WEBAPP_URL?.trim() || '';
export const configuredOwnerEmail =
  import.meta.env.VITE_OWNER_EMAIL?.trim().toLowerCase() || '';

const WEBAPP_URL_STORAGE_KEY = 'mwt_sheets_webapp_url';
const SESSION_TOKEN_KEY = 'mwt_sheets_session_token';
const SESSION_PROFILE_KEY = 'mwt_sheets_owner_profile';

export const WEBSITE_STATUSES = [
  'Planning',
  'In Development',
  'Testing',
  'Deployed / Live',
  'Maintenance',
  'Archived',
];

export function getGoogleSheetsWebAppUrl() {
  if (
    envWebAppUrl &&
    envWebAppUrl.startsWith('https://') &&
    !envWebAppUrl.includes('YOUR_DEPLOYMENT_ID')
  ) {
    return envWebAppUrl;
  }
  const storedUrl = localStorage.getItem(WEBAPP_URL_STORAGE_KEY)?.trim() || '';
  if (
    storedUrl &&
    storedUrl.startsWith('https://') &&
    !storedUrl.includes('YOUR_DEPLOYMENT_ID')
  ) {
    return storedUrl;
  }
  return '';
}

export function setCustomGoogleSheetsWebAppUrl(url) {
  const trimmed = String(url || '').trim();
  if (!trimmed) {
    localStorage.removeItem(WEBAPP_URL_STORAGE_KEY);
    return;
  }
  localStorage.setItem(WEBAPP_URL_STORAGE_KEY, trimmed);
}

export function checkGoogleSheetsConfigured() {
  return Boolean(getGoogleSheetsWebAppUrl());
}

export const isGoogleSheetsConfigured = Boolean(
  envWebAppUrl &&
    envWebAppUrl.startsWith('https://') &&
    !envWebAppUrl.includes('YOUR_DEPLOYMENT_ID')
);

export function getStoredToken() {
  return localStorage.getItem(SESSION_TOKEN_KEY) || '';
}

export function getStoredProfile() {
  try {
    const raw = localStorage.getItem(SESSION_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredSession(token, profile) {
  if (token) {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  }
  if (profile) {
    localStorage.setItem(SESSION_PROFILE_KEY, JSON.stringify(profile));
  }
}

export function clearStoredSession() {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(SESSION_PROFILE_KEY);
}

/**
 * Sends a POST request to the Google Apps Script Web App bound to the Google Sheet.
 * Uses `text/plain;charset=utf-8` so browsers do not fail on Google Apps Script CORS preflight.
 */
export async function callSheetsApi(action, params = {}) {
  const webAppUrl = getGoogleSheetsWebAppUrl();
  if (!webAppUrl) {
    return {
      ok: false,
      error:
        'Google Sheets Web App URL is not configured. Set VITE_GOOGLE_SHEETS_WEBAPP_URL in .env or connect your Web App URL on the login screen.',
    };
  }

  const token = getStoredToken();

  try {
    const response = await fetch(webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action,
        token,
        ...params,
      }),
      redirect: 'follow',
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `Google Sheets API request failed (HTTP ${response.status}).`,
      };
    }

    const result = await response.json();
    if (result?.unauthorized) {
      clearStoredSession();
    }
    return result;
  } catch (err) {
    return {
      ok: false,
      error:
        err?.message ||
        'Unable to reach Google Sheets Web App. Verify your deployment URL and permissions.',
    };
  }
}

// ============================================================================
// URL, TECH STACK & FILTER HELPERS
// ============================================================================

export function normalizeUrl(url) {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function validateUrl(url) {
  if (!url || !String(url).trim()) return { valid: true, value: null };
  const normalized = normalizeUrl(url);
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'URL must use http:// or https://' };
    }
    return {
      valid: true,
      value:
        parsed.toString().replace(/\/$/, '') === normalized.replace(/\/$/, '')
          ? normalized
          : parsed.toString(),
    };
  } catch {
    return { valid: false, error: 'Please enter a valid URL (e.g., https://example.com)' };
  }
}

export function parseTechStack(techStack) {
  if (!techStack) return [];
  if (Array.isArray(techStack)) {
    return techStack.map((t) => String(t).trim()).filter(Boolean);
  }
  return String(techStack)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatTechStack(techStackInput) {
  return parseTechStack(techStackInput).join(', ');
}

export function computeSummaryStats(websites = []) {
  const total = websites.length;
  const inDevelopment = websites.filter(
    (w) => w.status === 'In Development' || w.status === 'Planning' || w.status === 'Testing'
  ).length;
  const deployedLive = websites.filter(
    (w) => w.status === 'Deployed / Live' || w.status === 'Maintenance'
  ).length;
  const completedArchived = websites.filter((w) => w.status === 'Archived').length;

  return {
    total,
    inDevelopment,
    deployedLive,
    completedArchived,
  };
}

export function filterWebsites(websites = [], searchQuery = '', statusFilter = 'ALL') {
  const q = searchQuery.trim().toLowerCase();

  return websites.filter((site) => {
    if (statusFilter && statusFilter !== 'ALL') {
      if (statusFilter === 'ACTIVE_DEV') {
        if (
          site.status !== 'In Development' &&
          site.status !== 'Planning' &&
          site.status !== 'Testing'
        ) {
          return false;
        }
      } else if (site.status !== statusFilter) {
        return false;
      }
    }

    if (!q) return true;

    const nameMatch = (site.name || '').toLowerCase().includes(q);
    const descMatch = (site.description || '').toLowerCase().includes(q);
    const techString = Array.isArray(site.tech_stack)
      ? site.tech_stack.join(', ')
      : site.tech_stack || '';
    const techMatch = techString.toLowerCase().includes(q);

    return nameMatch || descMatch || techMatch;
  });
}

// ============================================================================
// GOOGLE SHEETS DATABASE CRUD OPERATIONS (`websites` sheet tab)
// ============================================================================

export async function fetchWebsites() {
  const res = await callSheetsApi('listWebsites');
  if (!res.ok) {
    return { data: [], error: res.error || 'Failed to fetch websites from Google Sheets.' };
  }
  return { data: res.data || [], error: null };
}

export async function fetchWebsiteById(id) {
  const res = await callSheetsApi('getWebsite', { id });
  if (!res.ok) {
    return { data: null, error: res.error || 'Failed to fetch website from Google Sheets.' };
  }
  return { data: res.data || null, error: null };
}

export async function createWebsite(_ownerId, payload) {
  const res = await callSheetsApi('createWebsite', { payload });
  if (!res.ok) {
    return { data: null, error: res.error || 'Failed to add row to Google Sheets.' };
  }
  return { data: res.data, error: null };
}

export async function updateWebsite(id, _ownerId, payload) {
  const res = await callSheetsApi('updateWebsite', { id, payload });
  if (!res.ok) {
    return { data: null, error: res.error || 'Failed to update row in Google Sheets.' };
  }
  return { data: res.data, error: null };
}

export async function deleteWebsite(id) {
  const res = await callSheetsApi('deleteWebsite', { id });
  if (!res.ok) {
    return { error: res.error || 'Failed to delete row from Google Sheets.' };
  }
  return { error: null };
}
