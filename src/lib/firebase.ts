import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { LedgerTransaction, RecurringBill, FixedAsset, PartnerCapital } from '../types';

// Reuse config
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.setCustomParameters({ prompt: 'select_account' });

let isSigningIn = false;
// Strictly in-memory OAuth access token cache (never stored in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;

// Initialize auth state listener
// Keeps returning Firebase users signed in across cold/offline launches of the installed standalone app.
// The Google Sheets OAuth access token is requested on-demand when syncing to Sheets.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else if (!isSigningIn) {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google Sign-In pop-up (also grants/refreshes Sheets OAuth access token)
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Sign-In');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// Helper to extract spreadsheet ID from URL or return the input as is
export const extractSpreadsheetId = (input: string): string => {
  const matches = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (matches && matches[1]) {
    return matches[1];
  }
  return input.trim();
};

export interface SheetExportRow {
  reference: string;
  date: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
}

export interface LinkedGoogleSheet {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  email: string;
  adminEmail?: string;
  linkedByEmail?: string;
  lastSavedAt: string;
  lastSavedByEmail?: string;
}

const WORKSPACE_ADMIN_SHEET_KEY = 'tunzua_workspace_admin_gsheet_v1';
const legacyLinkedSheetStorageKey = (email: string) =>
  `tunzua_linked_gsheet_v1_${email.trim().toLowerCase()}`;

export const getWorkspaceAdminSheet = (adminEmail?: string | null): LinkedGoogleSheet | null => {
  try {
    const raw = localStorage.getItem(WORKSPACE_ADMIN_SHEET_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.spreadsheetId === 'string' && parsed.spreadsheetId.trim()) {
        return parsed as LinkedGoogleSheet;
      }
    }
    // Migrate legacy per-email Admin link if present so existing Admin sheet is never lost
    if (adminEmail) {
      const legacyRaw = localStorage.getItem(legacyLinkedSheetStorageKey(adminEmail));
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if (parsed && typeof parsed.spreadsheetId === 'string' && parsed.spreadsheetId.trim()) {
          const migrated: LinkedGoogleSheet = {
            ...parsed,
            adminEmail: adminEmail.trim().toLowerCase(),
            linkedByEmail: parsed.email || adminEmail.trim().toLowerCase(),
            lastSavedByEmail: parsed.email || adminEmail.trim().toLowerCase(),
          };
          localStorage.setItem(WORKSPACE_ADMIN_SHEET_KEY, JSON.stringify(migrated));
          return migrated;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
};

export const saveWorkspaceAdminSheet = (link: LinkedGoogleSheet): void => {
  if (!link.spreadsheetId) return;
  try {
    localStorage.setItem(WORKSPACE_ADMIN_SHEET_KEY, JSON.stringify(link));
  } catch {
    // Ignore quota errors
  }
};

export const clearWorkspaceAdminSheet = (): void => {
  try {
    localStorage.removeItem(WORKSPACE_ADMIN_SHEET_KEY);
  } catch {
    // Ignore storage errors
  }
};

// Keep backward-compatible aliases pointing strictly to the single Workspace Admin sheet
export const getLinkedSheetForEmail = (adminEmail?: string | null): LinkedGoogleSheet | null =>
  getWorkspaceAdminSheet(adminEmail);

export const saveLinkedSheetForEmail = (link: LinkedGoogleSheet): void =>
  saveWorkspaceAdminSheet(link);

export const clearLinkedSheetForEmail = (): void => clearWorkspaceAdminSheet();

export const fetchWorkspaceAdminSheet = async (
  fallbackAdminEmail?: string | null
): Promise<{ sheet: LinkedGoogleSheet | null; adminEmail: string }> => {
  const fallbackEmail = fallbackAdminEmail || 'jammangguite@gmail.com';
  try {
    const res = await fetch('/api/sheet-config');
    if (res.ok) {
      const data = await res.json();
      const resolvedAdminEmail = data.adminEmail || fallbackEmail;
      if (data.sheet && data.sheet.spreadsheetId) {
        const sheet: LinkedGoogleSheet = {
          spreadsheetId: data.sheet.spreadsheetId,
          spreadsheetUrl: data.sheet.spreadsheetUrl,
          title: data.sheet.title,
          email: data.sheet.adminEmail || resolvedAdminEmail,
          adminEmail: data.sheet.adminEmail || resolvedAdminEmail,
          linkedByEmail: data.sheet.linkedByEmail || resolvedAdminEmail,
          lastSavedAt: data.sheet.lastSavedAt || new Date().toISOString(),
          lastSavedByEmail: data.sheet.lastSavedByEmail || resolvedAdminEmail,
        };
        saveWorkspaceAdminSheet(sheet);
        return { sheet, adminEmail: resolvedAdminEmail };
      }
      // If server has no sheet yet, check if we have a legacy migrated Admin sheet locally
      const localMigrated = getWorkspaceAdminSheet(resolvedAdminEmail);
      return { sheet: localMigrated, adminEmail: resolvedAdminEmail };
    }
  } catch {
    // Offline fallback to cached workspace Admin sheet
  }
  return {
    sheet: getWorkspaceAdminSheet(fallbackEmail),
    adminEmail: fallbackEmail,
  };
};

export const persistWorkspaceAdminSheet = async (
  link: LinkedGoogleSheet,
  actorEmail: string
): Promise<{ ok: boolean; sheet?: LinkedGoogleSheet; error?: string }> => {
  try {
    const res = await fetch('/api/sheet-config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-tunzua-actor-email': actorEmail,
      },
      body: JSON.stringify({
        spreadsheetId: link.spreadsheetId,
        spreadsheetUrl: link.spreadsheetUrl,
        title: link.title,
        lastSavedAt: link.lastSavedAt,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || 'Only the Workspace Admin can change the linked Google Sheet.' };
    }
    const saved: LinkedGoogleSheet = {
      spreadsheetId: data.sheet.spreadsheetId,
      spreadsheetUrl: data.sheet.spreadsheetUrl,
      title: data.sheet.title,
      email: data.sheet.adminEmail || link.email,
      adminEmail: data.sheet.adminEmail || link.adminEmail || link.email,
      linkedByEmail: data.sheet.linkedByEmail || actorEmail,
      lastSavedAt: data.sheet.lastSavedAt || link.lastSavedAt,
      lastSavedByEmail: data.sheet.lastSavedByEmail || actorEmail,
    };
    saveWorkspaceAdminSheet(saved);
    return { ok: true, sheet: saved };
  } catch {
    saveWorkspaceAdminSheet(link);
    return { ok: true, sheet: link };
  }
};

export const recordWorkspaceSheetSave = async (
  spreadsheetId: string,
  lastSavedAt: string,
  savedByEmail: string
): Promise<void> => {
  const existing = getWorkspaceAdminSheet();
  if (existing && existing.spreadsheetId === spreadsheetId) {
    saveWorkspaceAdminSheet({
      ...existing,
      lastSavedAt,
      lastSavedByEmail: savedByEmail,
    });
  }
  try {
    await fetch('/api/sheet-config/saved', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tunzua-actor-email': savedByEmail,
      },
      body: JSON.stringify({ spreadsheetId, lastSavedAt, savedByEmail }),
    });
  } catch {
    // Offline; local mirror already updated
  }
};

export const deleteWorkspaceAdminSheet = async (
  actorEmail: string
): Promise<{ ok: boolean; error?: string }> => {
  try {
    const res = await fetch('/api/sheet-config', {
      method: 'DELETE',
      headers: {
        'x-tunzua-actor-email': actorEmail,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || 'Only the Workspace Admin can unlink the Google Sheet.' };
    }
  } catch {
    // Offline fallback
  }
  clearWorkspaceAdminSheet();
  return { ok: true };
};

// -------------------------------------------------------------
// Google Sheets API integrations
// -------------------------------------------------------------

// 1. Create a new Google Spreadsheet
export const createNewSpreadsheet = async (
  title: string,
  token: string,
  sheetTitles?: string[]
): Promise<{ id: string; url: string; title: string }> => {
  const body: Record<string, any> = {
    properties: { title },
  };
  if (sheetTitles && sheetTitles.length > 0) {
    body.sheets = sheetTitles.map(tab => ({ properties: { title: tab } }));
  }

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 401) {
      throw new Error('Your Google session expired. Please sign in with Google again.');
    }
    throw new Error(`Failed to create spreadsheet: ${response.statusText} (${errText})`);
  }

  const data = await response.json();
  return {
    id: data.spreadsheetId,
    url: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    title: data.properties?.title || title,
  };
};

// 2. Export ledger rows to a single Spreadsheet tab
export const exportLedgerToSheet = async (
  spreadsheetId: string,
  sheetName: string,
  rows: SheetExportRow[],
  token: string
): Promise<void> => {
  // Inspect existing tabs first so we never assume tab names blindly
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (metaRes.status === 401) {
    throw new Error('Your Google session expired. Please sign in with Google again.');
  }

  let existingTabs: string[] = [];
  if (metaRes.ok) {
    const meta = await metaRes.json();
    existingTabs = (meta.sheets || []).map((s: any) => s.properties?.title).filter(Boolean);
  }

  if (!existingTabs.includes(sheetName)) {
    const addRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{ addSheet: { properties: { title: sheetName } } }],
        }),
      }
    );
    if (!addRes.ok) {
      const errText = await addRes.text();
      throw new Error(`Failed to create sheet tab "${sheetName}": ${errText}`);
    }
  }

  const values = [
    ['Voucher Reference', 'Date', 'Narrative Description', 'Debit Account', 'Credit Account', 'Amount'],
    ...rows.map(r => [
      r.reference || 'N/A',
      r.date,
      r.description,
      r.debitAccount,
      r.creditAccount,
      r.amount,
    ]),
    [],
    ['Summary Statistics', '', '', '', '', ''],
    ['Total Entries', rows.length, '', '', '', ''],
    ['Total Amount', rows.reduce((acc, r) => acc + r.amount, 0), '', '', '', ''],
  ];

  const quotedTab = `'${sheetName.replace(/'/g, "''")}'`;
  const range = `${quotedTab}!A1:F${values.length}`;

  // Clear existing rows first
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${quotedTab}!A:Z`)}:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to write ledger data: ${response.statusText} (${errText})`);
  }
};

export interface WorkspaceSheetPayload {
  token: string;
  email: string;
  adminEmail?: string;
  persistAsAdminLink?: boolean;
  spreadsheetId?: string;
  title: string;
  companyName: string;
  currencySymbol: string;
  ledger: LedgerTransaction[];
  recurringBills: RecurringBill[];
  fixedAssets: FixedAsset[];
  partners: PartnerCapital[];
}

export interface WorkspaceSheetResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  savedAt: string;
}

const WORKSPACE_TABS = ['Summary', 'Ledger', 'Recurring Bills', 'Fixed Assets', 'Partners'];

// 3. Save entire Tunzua workspace (Summary, Ledger, Bills, Assets, Partners) to the Admin-linked Google Sheet
export const saveFullWorkspaceToGoogleSheet = async (
  payload: WorkspaceSheetPayload
): Promise<WorkspaceSheetResult> => {
  const {
    token,
    email,
    adminEmail,
    persistAsAdminLink = false,
    title,
    companyName,
    currencySymbol,
    ledger,
    recurringBills,
    fixedAssets,
    partners,
  } = payload;

  let spreadsheetId = payload.spreadsheetId?.trim() || '';
  let spreadsheetUrl = '';
  let resolvedTitle = title;

  if (!spreadsheetId) {
    const created = await createNewSpreadsheet(title, token, WORKSPACE_TABS);
    spreadsheetId = created.id;
    spreadsheetUrl = created.url;
    resolvedTitle = created.title;
  } else {
    // Verify spreadsheet metadata and fetch existing tab names
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,spreadsheetUrl,sheets.properties.title`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (metaRes.status === 401) {
      throw new Error('Your Google session expired. Please sign in with Google again.');
    }
    if (metaRes.status === 403) {
      throw new Error(
        `Permission denied on the Admin Google Sheet. Ask your Workspace Admin (${adminEmail || 'Admin'}) to share this Google Sheet with ${email} as an Editor.`
      );
    }
    if (!metaRes.ok) {
      const errText = await metaRes.text();
      throw new Error(`Could not open the linked Admin Google Sheet. (${errText})`);
    }

    const meta = await metaRes.json();
    resolvedTitle = meta.properties?.title || title;
    spreadsheetUrl =
      meta.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    const existingTabs: string[] = (meta.sheets || [])
      .map((s: any) => s.properties?.title)
      .filter(Boolean);

    const missingTabs = WORKSPACE_TABS.filter(tab => !existingTabs.includes(tab));
    if (missingTabs.length > 0) {
      const addRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: missingTabs.map(tab => ({
              addSheet: { properties: { title: tab } },
            })),
          }),
        }
      );
      if (!addRes.ok) {
        const errText = await addRes.text();
        throw new Error(`Failed to prepare sheet tabs: ${errText}`);
      }
    }
  }

  const savedAt = new Date().toISOString();

  // Compute summary figures
  const bankCashBalance =
    100000 +
    ledger
      .filter(tx => tx.debitAccount.toLowerCase().includes('bank'))
      .reduce((sum, tx) => sum + tx.amount, 0) -
    ledger
      .filter(tx => tx.creditAccount.toLowerCase().includes('bank'))
      .reduce((sum, tx) => sum + tx.amount, 0);

  const totalSales = ledger
    .filter(tx => tx.type === 'sales')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalPurchases = ledger
    .filter(tx => tx.type === 'purchase')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const netFixedAssets = fixedAssets
    .filter(a => a.status === 'active')
    .reduce((sum, a) => sum + (a.currentBookValue ?? Math.max(0, a.cost - a.accumulatedDepreciation)), 0);

  const activeBillsTotal = recurringBills
    .filter(b => b.status === 'active')
    .reduce((sum, b) => sum + b.amount, 0);

  const summaryRows = [
    ['Tunzua Ledger Snapshot', ''],
    ['Company / Workspace', companyName],
    ['Admin Sheet Owner', adminEmail || email],
    ['Last Saved By', email],
    ['Currency', currencySymbol],
    ['Last Saved (ISO)', savedAt],
    ['', ''],
    ['Metric', `Value (${currencySymbol})`],
    ['Cash & Bank Balance', bankCashBalance],
    ['Total Sales Recorded', totalSales],
    ['Total Purchases Recorded', totalPurchases],
    ['Net Fixed Assets Book Value', netFixedAssets],
    ['Active Recurring Bills Total', activeBillsTotal],
    ['', ''],
    ['Record Counts', 'Count'],
    ['Ledger Entries', ledger.length],
    ['Recurring Bills', recurringBills.length],
    ['Fixed Assets', fixedAssets.length],
    ['Partners', partners.length],
  ];

  const ledgerRows = [
    ['Reference', 'Date', 'Type', 'Description', 'Debit Account', 'Credit Account', `Amount (${currencySymbol})`, 'Bank Cleared'],
    ...ledger.map(tx => [
      tx.reference || '',
      tx.date,
      tx.type,
      tx.description,
      tx.debitAccount,
      tx.creditAccount,
      tx.amount,
      tx.isBankCleared ? 'Cleared' : 'Pending',
    ]),
  ];

  const billRows = [
    ['Bill Title', 'Vendor', 'Cadence', 'Next Due Date', 'Last Paid Date', `Amount (${currencySymbol})`, 'Status', 'Expense Account', 'Payment Account', 'Notes'],
    ...recurringBills.map(b => [
      b.title,
      b.vendor,
      b.cadence,
      b.nextDueDate,
      b.lastPaidDate || '',
      b.amount,
      b.status,
      b.expenseAccount,
      b.paymentAccount,
      b.notes || '',
    ]),
  ];

  const assetRows = [
    ['Asset Name', 'Purchase Date', 'Qty', `Purchase Cost (${currencySymbol})`, `Salvage Value (${currencySymbol})`, 'Useful Life (Yrs)', 'Method', `Accumulated Depreciation (${currencySymbol})`, `Net Book Value (${currencySymbol})`, 'Status'],
    ...fixedAssets.map(a => [
      a.name,
      a.purchaseDate,
      a.qty ?? 1,
      a.cost,
      a.salvageValue,
      a.usefulLifeYears,
      a.depreciationMethod,
      a.accumulatedDepreciation,
      a.currentBookValue ?? Math.max(0, a.cost - a.accumulatedDepreciation),
      a.status,
    ]),
  ];

  const partnerRows = [
    ['Partner Name', `Contributions (${currencySymbol})`, `Withdrawals (${currencySymbol})`, 'Profit Share %', `Net Balance (${currencySymbol})`],
    ...partners.map(p => [
      p.partnerName,
      p.contributions,
      p.withdrawals,
      p.profitSharePercentage,
      p.balance,
    ]),
  ];

  // Clear existing data in all 5 tabs before writing updated snapshot
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ranges: WORKSPACE_TABS.map(tab => `'${tab}'!A:Z`),
      }),
    }
  );

  // Batch write all 5 tabs atomically
  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: `'Summary'!A1`, majorDimension: 'ROWS', values: summaryRows },
          { range: `'Ledger'!A1`, majorDimension: 'ROWS', values: ledgerRows },
          { range: `'Recurring Bills'!A1`, majorDimension: 'ROWS', values: billRows },
          { range: `'Fixed Assets'!A1`, majorDimension: 'ROWS', values: assetRows },
          { range: `'Partners'!A1`, majorDimension: 'ROWS', values: partnerRows },
        ],
      }),
    }
  );

  if (!writeRes.ok) {
    const errText = await writeRes.text();
    if (writeRes.status === 401) {
      throw new Error('Your Google session expired. Please sign in with Google again.');
    }
    if (writeRes.status === 403) {
      throw new Error(
        `Permission denied writing to the Admin Google Sheet. Ask your Workspace Admin (${adminEmail || 'Admin'}) to share this sheet with ${email} as an Editor.`
      );
    }
    throw new Error(`Failed to write data to Google Sheet: ${writeRes.statusText} (${errText})`);
  }

  if (persistAsAdminLink) {
    saveWorkspaceAdminSheet({
      spreadsheetId,
      spreadsheetUrl,
      title: resolvedTitle,
      email: adminEmail || email,
      adminEmail: adminEmail || email,
      linkedByEmail: email,
      lastSavedAt: savedAt,
      lastSavedByEmail: email,
    });
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    title: resolvedTitle,
    savedAt,
  };
};
