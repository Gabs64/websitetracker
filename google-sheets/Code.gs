/**
 * ============================================================================
 * MY WEBSITE TRACKER — GOOGLE SHEETS BACKEND & SINGLE-OWNER AUTH (Code.gs)
 * Version: 1.0
 * Storage: 100% Google Sheets (`profiles` tab & `websites` tab)
 * ============================================================================
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a new private Google Sheet at https://sheets.new
 * 2. Click Extensions -> Apps Script
 * 3. Replace the default code in `Code.gs` with this entire file and click Save.
 * 4. At the top of this file, set INITIAL_OWNER_EMAIL and INITIAL_OWNER_PASSWORD,
 *    then select `setupDatabaseAndOwner` in the toolbar dropdown and click Run
 *    (Approve permissions when prompted).
 * 5. Click Deploy -> New deployment -> Select type: "Web app"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (The script itself enforces strict token & password auth;
 *      your Google Sheet remains completely private in Google Drive).
 * 6. Copy the generated Web App URL (`https://script.google.com/macros/s/.../exec`)
 *    and set it as `VITE_GOOGLE_SHEETS_WEBAPP_URL` in your `.env` file.
 */

// Configure these two values before running `setupDatabaseAndOwner()`:
const INITIAL_OWNER_EMAIL = 'owner@example.com';
const INITIAL_OWNER_PASSWORD = 'ChangeMe123!';

const PROFILES_SHEET = 'profiles';
const WEBSITES_SHEET = 'websites';

const PROFILE_HEADERS = [
  'id',
  'email',
  'password_hash',
  'salt',
  'session_token',
  'token_expires_at',
  'created_at',
];

const WEBSITE_HEADERS = [
  'id',
  'owner_id',
  'name',
  'description',
  'website_url',
  'repository_url',
  'tech_stack',
  'status',
  'notes',
  'created_at',
  'updated_at',
];

const VALID_STATUSES = [
  'Planning',
  'In Development',
  'Testing',
  'Deployed / Live',
  'Maintenance',
  'Archived',
];

/**
 * Adds an admin menu inside the Google Sheet for 1-click initialization.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Website Tracker Admin')
    .addItem('Initialize / Reset Owner Account', 'setupDatabaseAndOwner')
    .addToUi();
}

/**
 * Run this function from the Apps Script editor to create the `profiles`
 * and `websites` sheet tabs and register (or update) the single authorized owner.
 */
function setupDatabaseAndOwner() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet(ss, PROFILES_SHEET, PROFILE_HEADERS);
  ensureSheet(ss, WEBSITES_SHEET, WEBSITE_HEADERS);

  const profileSheet = ss.getSheetByName(PROFILES_SHEET);
  const lastRow = profileSheet.getLastRow();

  const cleanEmail = String(INITIAL_OWNER_EMAIL).trim().toLowerCase();
  const salt = Utilities.getUuid();
  const passwordHash = hashPassword(INITIAL_OWNER_PASSWORD, salt);
  const now = new Date().toISOString();

  if (lastRow < 2) {
    const ownerId = Utilities.getUuid();
    profileSheet.appendRow([
      ownerId,
      cleanEmail,
      passwordHash,
      salt,
      '',
      '',
      now,
    ]);
    Logger.log('Single owner profile created for: ' + cleanEmail);
  } else {
    const existingId =
      String(profileSheet.getRange(2, 1).getValue() || '').trim() || Utilities.getUuid();
    const existingCreatedAt =
      String(profileSheet.getRange(2, 7).getValue() || '').trim() || now;

    profileSheet.getRange(2, 1, 1, PROFILE_HEADERS.length).setValues([
      [existingId, cleanEmail, passwordHash, salt, '', '', existingCreatedAt],
    ]);
    Logger.log('Single owner profile updated in Row 2 for: ' + cleanEmail);
  }
}

/**
 * Handles GET requests (health check).
 */
function doGet() {
  return jsonResponse({
    ok: true,
    service: 'My Website Tracker - Google Sheets Database',
    version: '1.0',
  });
}

/**
 * Handles all POST API requests from the React frontend.
 * Uses text/plain JSON payload to avoid CORS preflight issues on browsers.
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ ok: false, error: 'Missing request payload.' });
    }

    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const token = body.token || '';

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const profileSheet = ensureSheet(ss, PROFILES_SHEET, PROFILE_HEADERS);
    const websiteSheet = ensureSheet(ss, WEBSITES_SHEET, WEBSITE_HEADERS);

    // Public Action: Login
    if (action === 'login') {
      return handleLogin(profileSheet, body.email, body.password);
    }

    // All other actions require a valid single-owner session token
    const auth = verifySessionToken(profileSheet, token);
    if (!auth.authorized) {
      return jsonResponse({ ok: false, unauthorized: true, error: auth.error });
    }

    const owner = auth.owner;

    switch (action) {
      case 'verifySession':
        return jsonResponse({
          ok: true,
          profile: {
            id: owner.id,
            email: owner.email,
            created_at: owner.created_at,
          },
        });

      case 'logout':
        clearSessionToken(profileSheet);
        return jsonResponse({ ok: true });

      case 'updatePassword':
        return handleUpdatePassword(profileSheet, owner, body.newPassword);

      case 'listWebsites':
        return handleListWebsites(websiteSheet, owner);

      case 'getWebsite':
        return handleGetWebsite(websiteSheet, owner, body.id);

      case 'createWebsite':
        return handleCreateWebsite(websiteSheet, owner, body.payload);

      case 'updateWebsite':
        return handleUpdateWebsite(websiteSheet, owner, body.id, body.payload);

      case 'deleteWebsite':
        return handleDeleteWebsite(websiteSheet, owner, body.id);

      default:
        return jsonResponse({ ok: false, error: 'Unknown API action: ' + action });
    }
  } catch (err) {
    return jsonResponse({
      ok: false,
      error: err && err.message ? err.message : 'Internal Google Sheets error.',
    });
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// AUTHENTICATION & SINGLE-OWNER ACCESS CONTROL
// ============================================================================

function getSingleOwnerRecord(profileSheet) {
  const lastRow = profileSheet.getLastRow();
  if (lastRow < 2) return null;

  // Strictly enforce single owner: only Row 2 is ever read as the authorized owner
  const values = profileSheet.getRange(2, 1, 1, PROFILE_HEADERS.length).getValues()[0];
  if (!values[0] || !values[1]) return null;

  return {
    rowIndex: 2,
    id: String(values[0]),
    email: String(values[1]).trim().toLowerCase(),
    password_hash: String(values[2]),
    salt: String(values[3]),
    session_token: String(values[4] || ''),
    token_expires_at: String(values[5] || ''),
    created_at: String(values[6] || ''),
  };
}

function handleLogin(profileSheet, email, password) {
  const owner = getSingleOwnerRecord(profileSheet);
  if (!owner) {
    return jsonResponse({
      ok: false,
      error:
        'Owner account has not been initialized in the `profiles` sheet yet. Run `setupDatabaseAndOwner()` in Apps Script.',
    });
  }

  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !password) {
    return jsonResponse({ ok: false, error: 'Email and password are required.' });
  }

  if (cleanEmail !== owner.email) {
    return jsonResponse({
      ok: false,
      error: 'Access denied. Only the pre-authorized owner account may log in.',
    });
  }

  const candidateHash = hashPassword(password, owner.salt);
  if (candidateHash !== owner.password_hash) {
    return jsonResponse({ ok: false, error: 'Invalid email or password.' });
  }

  // Generate a new session token valid for 7 days
  const sessionToken = Utilities.getUuid() + '-' + Utilities.getUuid();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  profileSheet.getRange(2, 5, 1, 2).setValues([[sessionToken, expiresAt]]);

  return jsonResponse({
    ok: true,
    token: sessionToken,
    profile: {
      id: owner.id,
      email: owner.email,
      created_at: owner.created_at,
    },
  });
}

function verifySessionToken(profileSheet, token) {
  if (!token || typeof token !== 'string' || token.trim().length < 20) {
    return { authorized: false, error: 'Authentication required. Please log in.' };
  }

  const owner = getSingleOwnerRecord(profileSheet);
  if (!owner) {
    return { authorized: false, error: 'No authorized owner profile exists in Google Sheets.' };
  }

  if (!owner.session_token || owner.session_token !== token.trim()) {
    return { authorized: false, error: 'Session expired or invalid. Please log in again.' };
  }

  if (owner.token_expires_at) {
    const expiryTime = new Date(owner.token_expires_at).getTime();
    if (!isNaN(expiryTime) && Date.now() > expiryTime) {
      clearSessionToken(profileSheet);
      return { authorized: false, error: 'Session has expired. Please log in again.' };
    }
  }

  return { authorized: true, owner: owner };
}

function clearSessionToken(profileSheet) {
  if (profileSheet.getLastRow() >= 2) {
    profileSheet.getRange(2, 5, 1, 2).setValues([['', '']]);
  }
}

function handleUpdatePassword(profileSheet, owner, newPassword) {
  if (!newPassword || String(newPassword).length < 8) {
    return jsonResponse({
      ok: false,
      error: 'Password must be at least 8 characters long.',
    });
  }

  const newSalt = Utilities.getUuid();
  const newHash = hashPassword(String(newPassword), newSalt);
  profileSheet.getRange(2, 3, 1, 2).setValues([[newHash, newSalt]]);

  return jsonResponse({ ok: true });
}

function hashPassword(password, salt) {
  const raw = String(salt) + ':' + String(password);
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    raw,
    Utilities.Charset.UTF_8
  );
  return digest
    .map(function (byte) {
      const v = byte < 0 ? byte + 256 : byte;
      return ('0' + v.toString(16)).slice(-2);
    })
    .join('');
}

// ============================================================================
// WEBSITES SHEET CRUD OPERATIONS
// ============================================================================

function getAllWebsiteRows(websiteSheet, ownerId) {
  const lastRow = websiteSheet.getLastRow();
  if (lastRow < 2) return [];

  const rows = websiteSheet
    .getRange(2, 1, lastRow - 1, WEBSITE_HEADERS.length)
    .getValues();

  const items = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const id = String(r[0] || '').trim();
    const rowOwnerId = String(r[1] || '').trim();

    if (!id || rowOwnerId !== ownerId) continue;

    items.push({
      _rowNumber: i + 2,
      id: id,
      owner_id: rowOwnerId,
      name: String(r[2] || ''),
      description: String(r[3] || ''),
      website_url: r[4] ? String(r[4]) : null,
      repository_url: r[5] ? String(r[5]) : null,
      tech_stack: String(r[6] || ''),
      status: String(r[7] || 'Planning'),
      notes: String(r[8] || ''),
      created_at: String(r[9] || ''),
      updated_at: String(r[10] || ''),
    });
  }

  return items;
}

function stripInternalFields(item) {
  return {
    id: item.id,
    owner_id: item.owner_id,
    name: item.name,
    description: item.description,
    website_url: item.website_url,
    repository_url: item.repository_url,
    tech_stack: item.tech_stack,
    status: item.status,
    notes: item.notes,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

function handleListWebsites(websiteSheet, owner) {
  const items = getAllWebsiteRows(websiteSheet, owner.id).map(stripInternalFields);
  items.sort(function (a, b) {
    return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
  });
  return jsonResponse({ ok: true, data: items });
}

function handleGetWebsite(websiteSheet, owner, id) {
  if (!id) {
    return jsonResponse({ ok: false, error: 'Website ID is required.' });
  }
  const items = getAllWebsiteRows(websiteSheet, owner.id);
  const match = items.find(function (item) {
    return item.id === String(id);
  });

  if (!match) {
    return jsonResponse({ ok: false, error: 'Website project not found in Google Sheets.' });
  }

  return jsonResponse({ ok: true, data: stripInternalFields(match) });
}

function handleCreateWebsite(websiteSheet, owner, payload) {
  if (!payload || !String(payload.name || '').trim()) {
    return jsonResponse({ ok: false, error: 'Website name is required.' });
  }

  const status = VALID_STATUSES.indexOf(payload.status) !== -1 ? payload.status : 'Planning';
  const now = new Date().toISOString();
  const newWebsite = {
    id: Utilities.getUuid(),
    owner_id: owner.id,
    name: String(payload.name).trim(),
    description: String(payload.description || '').trim(),
    website_url: payload.website_url ? String(payload.website_url).trim() : '',
    repository_url: payload.repository_url ? String(payload.repository_url).trim() : '',
    tech_stack: String(payload.tech_stack || '').trim(),
    status: status,
    notes: String(payload.notes || '').trim(),
    created_at: now,
    updated_at: now,
  };

  websiteSheet.appendRow([
    newWebsite.id,
    newWebsite.owner_id,
    newWebsite.name,
    newWebsite.description,
    newWebsite.website_url,
    newWebsite.repository_url,
    newWebsite.tech_stack,
    newWebsite.status,
    newWebsite.notes,
    newWebsite.created_at,
    newWebsite.updated_at,
  ]);

  return jsonResponse({
    ok: true,
    data: {
      ...newWebsite,
      website_url: newWebsite.website_url || null,
      repository_url: newWebsite.repository_url || null,
    },
  });
}

function handleUpdateWebsite(websiteSheet, owner, id, payload) {
  if (!id) {
    return jsonResponse({ ok: false, error: 'Website ID is required.' });
  }
  if (!payload || !String(payload.name || '').trim()) {
    return jsonResponse({ ok: false, error: 'Website name is required.' });
  }

  const items = getAllWebsiteRows(websiteSheet, owner.id);
  const existing = items.find(function (item) {
    return item.id === String(id);
  });

  if (!existing) {
    return jsonResponse({ ok: false, error: 'Website project not found in Google Sheets.' });
  }

  const status = VALID_STATUSES.indexOf(payload.status) !== -1 ? payload.status : existing.status;
  const now = new Date().toISOString();

  const updated = {
    id: existing.id,
    owner_id: owner.id,
    name: String(payload.name).trim(),
    description: String(payload.description || '').trim(),
    website_url: payload.website_url ? String(payload.website_url).trim() : '',
    repository_url: payload.repository_url ? String(payload.repository_url).trim() : '',
    tech_stack: String(payload.tech_stack || '').trim(),
    status: status,
    notes: String(payload.notes || '').trim(),
    created_at: existing.created_at || now,
    updated_at: now,
  };

  websiteSheet.getRange(existing._rowNumber, 1, 1, WEBSITE_HEADERS.length).setValues([
    [
      updated.id,
      updated.owner_id,
      updated.name,
      updated.description,
      updated.website_url,
      updated.repository_url,
      updated.tech_stack,
      updated.status,
      updated.notes,
      updated.created_at,
      updated.updated_at,
    ],
  ]);

  return jsonResponse({
    ok: true,
    data: {
      ...updated,
      website_url: updated.website_url || null,
      repository_url: updated.repository_url || null,
    },
  });
}

function handleDeleteWebsite(websiteSheet, owner, id) {
  if (!id) {
    return jsonResponse({ ok: false, error: 'Website ID is required.' });
  }

  const items = getAllWebsiteRows(websiteSheet, owner.id);
  const existing = items.find(function (item) {
    return item.id === String(id);
  });

  if (!existing) {
    return jsonResponse({ ok: false, error: 'Website project not found in Google Sheets.' });
  }

  websiteSheet.deleteRow(existing._rowNumber);
  return jsonResponse({ ok: true });
}

// ============================================================================
// SHEET INITIALIZATION & RESPONSE HELPERS
// ============================================================================

function ensureSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
