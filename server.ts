/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { AppDatabase, LedgerTransaction, InventoryItem, Task, WorkspaceUser, UserRole } from './src/types.js';

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize local disk storage path
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'ledger_db.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SHEET_CONFIG_FILE = path.join(DATA_DIR, 'sheet_config.json');

// Ensure data folder and seed database exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_USERS: WorkspaceUser[] = [
  {
    id: 'user-owner-admin',
    name: 'Workspace Admin',
    email: 'jammangguite@gmail.com',
    role: 'admin',
    status: 'active',
    addedAt: Date.now() - 86400000 * 30,
  },
  {
    id: 'user-member-1',
    name: 'Ledger Associate',
    email: 'associate@tunzua.com',
    role: 'user',
    status: 'active',
    addedAt: Date.now() - 86400000 * 14,
  },
];

function readUsers(): WorkspaceUser[] {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2), 'utf-8');
    return DEFAULT_USERS;
  }
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_USERS;
  } catch (err) {
    console.error('Failed to read users file, restoring defaults.', err);
    return DEFAULT_USERS;
  }
}

function writeUsers(users: WorkspaceUser[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write users file:', err);
  }
}

function isServerAdminEmail(emailHeader: unknown, users: WorkspaceUser[]): boolean {
  if (typeof emailHeader !== 'string' || !emailHeader.trim()) return false;
  const normalized = emailHeader.trim().toLowerCase();
  return users.some(
    u => u.email.trim().toLowerCase() === normalized && u.role === 'admin' && u.status === 'active'
  );
}

function getPrimaryAdminEmail(users: WorkspaceUser[]): string {
  const activeAdmin = users.find(u => u.role === 'admin' && u.status === 'active');
  return activeAdmin?.email || DEFAULT_USERS[0].email;
}

interface AdminSheetConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  adminEmail: string;
  linkedByEmail: string;
  linkedAt: string;
  lastSavedAt: string;
  lastSavedByEmail: string;
}

function readSheetConfig(): AdminSheetConfig | null {
  if (!fs.existsSync(SHEET_CONFIG_FILE)) return null;
  try {
    const raw = fs.readFileSync(SHEET_CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.spreadsheetId === 'string' && parsed.spreadsheetId.trim()) {
      return parsed as AdminSheetConfig;
    }
    return null;
  } catch (err) {
    console.error('Failed to read sheet config file:', err);
    return null;
  }
}

function writeSheetConfig(config: AdminSheetConfig | null) {
  try {
    if (!config) {
      if (fs.existsSync(SHEET_CONFIG_FILE)) {
        fs.unlinkSync(SHEET_CONFIG_FILE);
      }
      return;
    }
    fs.writeFileSync(SHEET_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write sheet config file:', err);
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_DB: AppDatabase = {
  tasks: [],
  inventory: [],
  ledger: [],
  fixedAssets: [],
  partners: [],
  payroll: [],
  bankStatements: [],
};

// Full seed database representing realistic starting business accounts
const DEFAULT_DB: AppDatabase = {
  tasks: [
    {
      id: "task-1",
      title: "File GST-3B Monthly Return",
      description: "Perform consolidated tax computation and finalize monthly filing via GST portal.",
      status: "todo",
      dueDate: "2026-07-20",
      priority: "high",
      createdAt: Date.now() - 3600000 * 24 * 3,
      updatedAt: Date.now() - 3600000 * 24 * 3,
    },
    {
      id: "task-2",
      title: "Auto-depreciate Office equipment",
      description: "Run monthly Straight-Line calculations for the fixed assets inventory.",
      status: "completed",
      dueDate: "2026-06-30",
      priority: "medium",
      createdAt: Date.now() - 3600000 * 24 * 5,
      updatedAt: Date.now() - 3600000 * 24,
    },
    {
      id: "task-3",
      title: "Bank Statement Auto-Sync",
      description: "Import corporate bank feeds and perform automated reconciliation on suspense ledgers.",
      status: "in_progress",
      dueDate: "2026-06-25",
      priority: "high",
      createdAt: Date.now() - 360000 * 24,
      updatedAt: Date.now() - 360000 * 12,
    }
  ],
  inventory: [
    {
      id: "inv-1",
      sku: "M3-PRO-MAC",
      name: "M3 Ultra Laptop Pro 16\"",
      quantity: 3, // LOW STOCK TRIGGER (threshold is 5)
      lowStockThreshold: 5,
      salesPrice: 2499,
      purchasePrice: 1800,
      category: "Hardware",
    },
    {
      id: "inv-2",
      sku: "OLED-CURVE-34",
      name: "OLED Curved Curved-Ultrawide Display 34\"",
      quantity: 12,
      lowStockThreshold: 4,
      salesPrice: 899,
      purchasePrice: 600,
      category: "Hardware",
    },
    {
      id: "inv-3",
      sku: "CH-MESH-ERG",
      name: "Ergonomic Task Mesh Chair",
      quantity: 1, // LOW STOCK TRIGGER (threshold is 3)
      lowStockThreshold: 3,
      salesPrice: 349,
      purchasePrice: 220,
      category: "Furniture",
    },
    {
      id: "inv-4",
      sku: "KEY-MECH-TC",
      name: "Mechanical Dual-Mode Type-C Keyboard",
      quantity: 45,
      lowStockThreshold: 10,
      salesPrice: 129,
      purchasePrice: 75,
      category: "Accessories",
    }
  ],
  ledger: [
    {
      id: "tr-1",
      date: "2026-06-01",
      description: "Initial Capital Infusion - Alice",
      type: "capital_contribution",
      debitAccount: "Corporate Bank Account",
      creditAccount: "Capital Fund - Partner Alice",
      amount: 50000,
      reference: "CHQ-10029",
      isBankCleared: true,
      createdAt: Date.now() - 3600000 * 24 * 19,
    },
    {
      id: "tr-2",
      date: "2026-06-01",
      description: "Initial Capital Infusion - Bob",
      type: "capital_contribution",
      debitAccount: "Corporate Bank Account",
      creditAccount: "Capital Fund - Partner Bob",
      amount: 50000,
      reference: "CHQ-10030",
      isBankCleared: true,
      createdAt: Date.now() - 3600000 * 24 * 19,
    },
    {
      id: "tr-3",
      date: "2026-06-05",
      description: "Bulk Acquisition Office Inventories (KEY-MECH-TC)",
      type: "purchase",
      debitAccount: "Inventory Asset Account",
      creditAccount: "Corporate Bank Account",
      amount: 3750, // 50 keyboards * $75
      reference: "PO-2026-001",
      isBankCleared: true,
      createdAt: Date.now() - 3600000 * 24 * 15,
    },
    {
      id: "tr-4",
      date: "2026-06-12",
      description: "Sales Invoice - Web Solutions Inc",
      type: "sales",
      debitAccount: "Corporate Bank Account",
      creditAccount: "Revenue Account",
      amount: 1290, // 10 keyboards * $129
      reference: "INV-2026-042",
      isBankCleared: true,
      createdAt: Date.now() - 3600000 * 24 * 8,
    },
    {
      id: "tr-5",
      date: "2026-06-15",
      description: "Tax Reserve Allotment (GST Q2 Liability)",
      type: "tax_payment",
      debitAccount: "GST Tax Expense Account",
      creditAccount: "GST Payable Liability",
      amount: 232.2, // Computed GST tax
      reference: "GST-TX-RES",
      isBankCleared: false,
      createdAt: Date.now() - 3600000 * 24 * 5,
    }
  ],
  fixedAssets: [
    {
      id: "asset-1",
      name: "Corporate Executive Workspace Laptops",
      purchaseDate: "2026-01-05",
      cost: 5400,
      depreciationMethod: "straight_line",
      usefulLifeYears: 5,
      salvageValue: 600,
      currentBookValue: 4920,
      accumulatedDepreciation: 480, // 6 months of depreciation ($80/month)
      status: "active",
    },
    {
      id: "asset-2",
      name: "Vending Machine Kiosk Lounge",
      purchaseDate: "2026-03-10",
      cost: 2400,
      depreciationMethod: "straight_line",
      usefulLifeYears: 3,
      salvageValue: 300,
      currentBookValue: 2150,
      accumulatedDepreciation: 250,
      status: "active",
    }
  ],
  partners: [
    {
      id: "partner-1",
      partnerName: "Alice Chen (MD)",
      contributions: 50000,
      withdrawals: 1500,
      profitSharePercentage: 60,
      balance: 48500,
    },
    {
      id: "partner-2",
      partnerName: "Bob Miller (CFO)",
      contributions: 50000,
      withdrawals: 800,
      profitSharePercentage: 40,
      balance: 49200,
    }
  ],
  payroll: [
    {
      id: "staff-1",
      name: "Darlene Vance",
      role: "Lead Software Architect",
      monthlyBase: 8500,
      providentFund: 1020, // 12% STATUTORY PF
      incomeTaxDeduction: 1275, // 15% INCOME TAX TDS
      allowances: 450,
      status: "pending",
    },
    {
      id: "staff-2",
      name: "Marcus Aurelius",
      role: "Inventory & QA Supervisor",
      monthlyBase: 4200,
      providentFund: 504,
      incomeTaxDeduction: 420,
      allowances: 150,
      status: "pending",
    }
  ],
  bankStatements: [
    {
      id: "stmt-1",
      date: "2026-06-01",
      description: "Alice Chen Capital CHQ-10029",
      amount: 50000,
      referenceNumber: "CHQ-10029",
      reconciledTransactionId: "tr-1"
    },
    {
      id: "stmt-2",
      date: "2026-06-01",
      description: "Bob Miller Capital CHQ-10030",
      amount: 50000,
      referenceNumber: "CHQ-10030",
      reconciledTransactionId: "tr-2"
    },
    {
      id: "stmt-3",
      date: "2026-06-05",
      description: "Transfer PO-2026-001 Keys",
      amount: -3750,
      referenceNumber: "PO-2026-001",
      reconciledTransactionId: "tr-3"
    },
    {
      id: "stmt-4",
      date: "2026-06-12",
      description: "Web Solutions Inc Direct Deposit",
      amount: 1290,
      referenceNumber: "INV-2026-042",
      reconciledTransactionId: "tr-4"
    },
    // Unreconciled statements loaded from bank
    {
      id: "stmt-5",
      date: "2026-06-18",
      description: "E-Payment Stripe Solutions Payout",
      amount: 4500,
      referenceNumber: "STR-00182",
    },
    {
      id: "stmt-6",
      date: "2026-06-19",
      description: "Amazon Web Services Hosting Charge",
      amount: -180,
      referenceNumber: "AWS-99120",
    }
  ],
};

function readDb(): AppDatabase {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
    return DEFAULT_DB;
  }
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Failed to read database file, restoring defaults.", err);
    return DEFAULT_DB;
  }
}

function writeDb(db: AppDatabase) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error("Failed to write to local database file:", err);
  }
}

// Ensure database and users directory are seeded on load
readDb();
readUsers();

/**
 * Server-side Gemini client wrapper
 */
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("⚠️ Warning: GEMINI_API_KEY environment variable is not defined. NLP prompt functionality will use simulated fallback answers.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// API endpoint: Sync client state with central server-side ledger
app.post('/api/sync', (req: Request, res: Response) => {
  const clientData = (req.body || {}) as Partial<AppDatabase>;
  const currentDb = readDb();

  // Initial empty pull: return current server snapshot without mutating
  const hasAnyCollection =
    Array.isArray(clientData.tasks) ||
    Array.isArray(clientData.inventory) ||
    Array.isArray(clientData.ledger) ||
    Array.isArray(clientData.fixedAssets) ||
    Array.isArray(clientData.partners) ||
    Array.isArray(clientData.payroll) ||
    Array.isArray(clientData.bankStatements);

  if (!hasAnyCollection) {
    return res.json({ success: true, db: currentDb });
  }

  const users = readUsers();
  const actorEmail = req.header('x-tunzua-actor-email');
  const canDeleteOnServer = isServerAdminEmail(actorEmail, users);

  const syncCollection = <T extends { id: string }>(server: T[], client?: T[]): T[] => {
    if (!client || !Array.isArray(client)) return server;

    const clientIds = new Set(client.map(item => item.id));
    const hasDeletions = server.some(item => !clientIds.has(item.id));

    // Honor deletions only for verified server Admins; non-Admins can only add/edit
    if (!hasDeletions || canDeleteOnServer) {
      return client;
    }

    const map = new Map<string, T>();
    server.forEach(item => map.set(item.id, item));
    client.forEach(item => map.set(item.id, { ...map.get(item.id), ...item }));
    return Array.from(map.values());
  };

  const updatedDb: AppDatabase = {
    tasks: syncCollection(currentDb.tasks, clientData.tasks),
    inventory: syncCollection(currentDb.inventory, clientData.inventory),
    ledger: syncCollection(currentDb.ledger, clientData.ledger),
    fixedAssets: syncCollection(currentDb.fixedAssets, clientData.fixedAssets),
    partners: syncCollection(currentDb.partners, clientData.partners),
    payroll: syncCollection(currentDb.payroll, clientData.payroll),
    bankStatements: syncCollection(currentDb.bankStatements, clientData.bankStatements),
  };

  writeDb(updatedDb);
  res.json({ success: true, db: updatedDb });
});

// API endpoint: Clear all demo/ledger data to a clean blank slate (Admin-only)
app.post('/api/clear', (req: Request, res: Response) => {
  const users = readUsers();
  const actorEmail = req.header('x-tunzua-actor-email');
  if (!isServerAdminEmail(actorEmail, users)) {
    return res.status(403).json({ success: false, error: 'Admin role is required to clear workspace data.' });
  }
  const blankDb: AppDatabase = JSON.parse(JSON.stringify(EMPTY_DB));
  writeDb(blankDb);
  res.json({ success: true, db: blankDb });
});

// API endpoint: Reset Database to original seed state (Admin-only)
app.post('/api/reset', (req: Request, res: Response) => {
  const users = readUsers();
  const actorEmail = req.header('x-tunzua-actor-email');
  if (!isServerAdminEmail(actorEmail, users)) {
    return res.status(403).json({ success: false, error: 'Admin role is required to reset workspace data.' });
  }
  const freshDb = JSON.parse(JSON.stringify(DEFAULT_DB));
  writeDb(freshDb);
  res.json({ success: true, db: freshDb });
});

// API endpoints: Multi-User Management (persisted in data/users.json)
app.get('/api/users', (_req: Request, res: Response) => {
  const users = readUsers();
  res.json({ success: true, users });
});

app.post('/api/users', (req: Request, res: Response) => {
  const users = readUsers();
  const actorEmail = req.header('x-tunzua-actor-email');
  if (!isServerAdminEmail(actorEmail, users)) {
    return res.status(403).json({ success: false, error: 'Only Admins can add users.' });
  }

  const { name, email, role, status } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
    return res.status(400).json({ success: false, error: 'A valid user name is required.' });
  }
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
    return res.status(400).json({ success: false, error: 'A valid email address is required.' });
  }
  const cleanEmail = email.trim().toLowerCase();
  if (users.some(u => u.email.trim().toLowerCase() === cleanEmail)) {
    return res.status(409).json({ success: false, error: 'A user with this email already exists.' });
  }

  const cleanRole: UserRole = role === 'admin' ? 'admin' : 'user';
  const cleanStatus: 'active' | 'inactive' = status === 'inactive' ? 'inactive' : 'active';

  const newUser: WorkspaceUser = {
    id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: name.trim(),
    email: cleanEmail,
    role: cleanRole,
    status: cleanStatus,
    addedAt: Date.now(),
  };

  const next = [newUser, ...users];
  writeUsers(next);
  res.status(201).json({ success: true, user: newUser, users: next });
});

app.patch('/api/users/:id', (req: Request, res: Response) => {
  const users = readUsers();
  const actorEmail = req.header('x-tunzua-actor-email');
  if (!isServerAdminEmail(actorEmail, users)) {
    return res.status(403).json({ success: false, error: 'Only Admins can update user roles.' });
  }

  const { id } = req.params;
  const target = users.find(u => u.id === id);
  if (!target) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }

  const { name, email, role, status } = req.body || {};
  const nextRole: UserRole = role === 'admin' || role === 'user' ? role : target.role;
  const nextStatus: 'active' | 'inactive' =
    status === 'active' || status === 'inactive' ? status : target.status;

  // Prevent demoting or deactivating the last active admin
  const activeAdmins = users.filter(u => u.role === 'admin' && u.status === 'active');
  if (
    target.role === 'admin' &&
    target.status === 'active' &&
    activeAdmins.length <= 1 &&
    (nextRole !== 'admin' || nextStatus !== 'active')
  ) {
    return res.status(400).json({
      success: false,
      error: 'At least one active Admin account must remain in the workspace.',
    });
  }

  let cleanEmail = target.email;
  if (typeof email === 'string' && email.trim()) {
    if (!EMAIL_PATTERN.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'Invalid email address.' });
    }
    const candidate = email.trim().toLowerCase();
    if (users.some(u => u.id !== id && u.email.trim().toLowerCase() === candidate)) {
      return res.status(409).json({ success: false, error: 'Email is already assigned to another user.' });
    }
    cleanEmail = candidate;
  }

  const nextName =
    typeof name === 'string' && name.trim() ? name.trim().slice(0, 120) : target.name;

  const next = users.map(u =>
    u.id === id
      ? { ...u, name: nextName, email: cleanEmail, role: nextRole, status: nextStatus }
      : u
  );
  writeUsers(next);
  res.json({ success: true, users: next });
});

app.delete('/api/users/:id', (req: Request, res: Response) => {
  const users = readUsers();
  const actorEmail = req.header('x-tunzua-actor-email');
  if (!isServerAdminEmail(actorEmail, users)) {
    return res.status(403).json({ success: false, error: 'Only Admins can delete users.' });
  }

  const { id } = req.params;
  const target = users.find(u => u.id === id);
  if (!target) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }

  const activeAdmins = users.filter(u => u.role === 'admin' && u.status === 'active');
  if (target.role === 'admin' && target.status === 'active' && activeAdmins.length <= 1) {
    return res.status(400).json({
      success: false,
      error: 'Cannot remove the last active Admin account.',
    });
  }

  const next = users.filter(u => u.id !== id);
  writeUsers(next);
  res.json({ success: true, users: next });
});

// Self-registration for new workspace users: assigns standard 'user' role and NEVER alters the Admin's linked Google Sheet
app.post('/api/users/register', (req: Request, res: Response) => {
  const users = readUsers();
  const { name, email } = req.body || {};
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
    return res.status(400).json({ success: false, error: 'A valid email address is required.' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const existing = users.find(u => u.email.trim().toLowerCase() === cleanEmail);
  if (existing) {
    return res.json({ success: true, user: existing, users, sheet: readSheetConfig() });
  }

  const displayName =
    typeof name === 'string' && name.trim()
      ? name.trim().slice(0, 120)
      : cleanEmail.split('@')[0];

  const newUser: WorkspaceUser = {
    id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: displayName,
    email: cleanEmail,
    role: 'user',
    status: 'active',
    addedAt: Date.now(),
  };

  const next = [...users, newUser];
  writeUsers(next);
  res.status(201).json({ success: true, user: newUser, users: next, sheet: readSheetConfig() });
});

// Workspace-wide Admin Google Sheet configuration (always shared across all users; only Admin can link/change/unlink)
app.get('/api/sheet-config', (_req: Request, res: Response) => {
  const users = readUsers();
  res.json({
    success: true,
    sheet: readSheetConfig(),
    adminEmail: getPrimaryAdminEmail(users),
  });
});

app.put('/api/sheet-config', (req: Request, res: Response) => {
  const users = readUsers();
  const actorEmail = req.header('x-tunzua-actor-email');
  if (!isServerAdminEmail(actorEmail, users)) {
    return res.status(403).json({
      success: false,
      error: 'Only the Workspace Admin can link or change the master Google Sheet.',
    });
  }

  const { spreadsheetId, spreadsheetUrl, title, lastSavedAt } = req.body || {};
  if (typeof spreadsheetId !== 'string' || !spreadsheetId.trim()) {
    return res.status(400).json({ success: false, error: 'A valid spreadsheetId is required.' });
  }

  const cleanId = spreadsheetId.trim();
  const nowIso = typeof lastSavedAt === 'string' && lastSavedAt ? lastSavedAt : new Date().toISOString();
  const cleanActor = (actorEmail || getPrimaryAdminEmail(users)).trim().toLowerCase();
  const existing = readSheetConfig();

  const updated: AdminSheetConfig = {
    spreadsheetId: cleanId,
    spreadsheetUrl:
      typeof spreadsheetUrl === 'string' && spreadsheetUrl.trim()
        ? spreadsheetUrl.trim()
        : `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
    title:
      typeof title === 'string' && title.trim()
        ? title.trim().slice(0, 200)
        : 'Tunzua Master Ledger',
    adminEmail: getPrimaryAdminEmail(users),
    linkedByEmail: existing && existing.spreadsheetId === cleanId ? existing.linkedByEmail : cleanActor,
    linkedAt: existing && existing.spreadsheetId === cleanId ? existing.linkedAt : nowIso,
    lastSavedAt: nowIso,
    lastSavedByEmail: cleanActor,
  };

  writeSheetConfig(updated);
  res.json({ success: true, sheet: updated, adminEmail: updated.adminEmail });
});

app.post('/api/sheet-config/saved', (req: Request, res: Response) => {
  const existing = readSheetConfig();
  if (!existing) {
    return res.status(404).json({
      success: false,
      error: 'No Admin Google Sheet is linked yet.',
    });
  }

  const { spreadsheetId, lastSavedAt, savedByEmail } = req.body || {};
  if (typeof spreadsheetId === 'string' && spreadsheetId.trim() && spreadsheetId.trim() !== existing.spreadsheetId) {
    return res.status(403).json({
      success: false,
      error: 'Data must always be saved to the Admin-linked Google Sheet.',
    });
  }

  const actorEmail =
    (typeof savedByEmail === 'string' && savedByEmail.trim()) ||
    (typeof req.header('x-tunzua-actor-email') === 'string' && req.header('x-tunzua-actor-email')!.trim()) ||
    existing.lastSavedByEmail;

  const updated: AdminSheetConfig = {
    ...existing,
    lastSavedAt: typeof lastSavedAt === 'string' && lastSavedAt ? lastSavedAt : new Date().toISOString(),
    lastSavedByEmail: actorEmail,
  };

  writeSheetConfig(updated);
  res.json({ success: true, sheet: updated });
});

app.delete('/api/sheet-config', (req: Request, res: Response) => {
  const users = readUsers();
  const actorEmail = req.header('x-tunzua-actor-email');
  if (!isServerAdminEmail(actorEmail, users)) {
    return res.status(403).json({
      success: false,
      error: 'Only the Workspace Admin can unlink the master Google Sheet.',
    });
  }
  writeSheetConfig(null);
  res.json({ success: true, sheet: null, adminEmail: getPrimaryAdminEmail(users) });
});

// API endpoint: NLP accounting query or action execution
app.post('/api/nlp', async (req: Request, res: Response) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: "Propmt must be a string." });
  }

  const currentDb = readDb();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "MOCK_KEY") {
    // Elegant fallback simulation if user hasn't configured key yet
    let reply = "I would be happy to help! However, the GEMINI_API_KEY is not defined. ";
    let action: any = null;

    const lower = prompt.toLowerCase();
    if (lower.includes('task') || lower.includes('todo')) {
      const generatedId = `task-${Date.now()}`;
      reply += `[Simulated Model Response] Understood! I have created a task for you.`;
      action = {
        type: 'ADD_TASK',
        payload: {
          id: generatedId,
          title: "New NLP Task",
          description: prompt,
          status: "todo",
          dueDate: new Date(Date.now() + 3600000 * 48).toISOString().split('T')[0],
          priority: "medium",
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      };
    } else if (lower.includes('contribute') || lower.includes('partner') || lower.includes('capital')) {
      const generatedId = `tr-${Date.now()}`;
      reply += `[Simulated Model Response] Added a Capital Contribution ledger entry.`;
      action = {
        type: 'ADD_LEDGER_TRANSACTION',
        payload: {
          id: generatedId,
          date: new Date().toISOString().split('T')[0],
          description: `Capital Contribution parsed from command: "${prompt}"`,
          type: 'capital_contribution',
          debitAccount: "Corporate Bank Account",
          creditAccount: "Capital Fund - Partner Alice",
          amount: 5000,
          isBankCleared: false,
          createdAt: Date.now()
        }
      };
    } else if (lower.includes('asset') || lower.includes('depreciation') || lower.includes('chair') || lower.includes('furniture')) {
      const generatedId = `asset-${Date.now()}`;
      reply += `[Simulated Model Response] Recorded new office furniture asset.`;
      action = {
        type: 'ADD_FIXED_ASSET',
        payload: {
          id: generatedId,
          name: "Highback Office Ergonomic Chairs",
          purchaseDate: new Date().toISOString().split('T')[0],
          cost: 1200,
          depreciationMethod: "straight_line",
          usefulLifeYears: 5,
          salvageValue: 150,
          currentBookValue: 1200,
          accumulatedDepreciation: 0,
          status: 'active'
        }
      };
    } else {
      reply += `To try out actual AI smart parsing, click the Secrets icon in AI Studio and configure GEMINI_API_KEY!
Example simulated action: try saying "Add task prepare bank ledger".`;
    }

    return res.json({ reply, action });
  }

  try {
    const ai = getAi();
    
    // Provide a snapshot of current DB accounts to Gemini to make it highly accurate!
    const contextStr = JSON.stringify({
      tasks: currentDb.tasks.map(t => ({ id: t.id, title: t.title, status: t.status })),
      inventory: currentDb.inventory.map(i => ({ sku: i.sku, name: i.name, qty: i.quantity, threshold: i.lowStockThreshold })),
      capital_accounts: currentDb.partners.map(p => ({ partner: p.partnerName, balance: p.balance })),
      assets: currentDb.fixedAssets.map(a => ({ id: a.id, name: a.name, status: a.status, cost: a.cost })),
      ledger_balances_summary: "Bank Balance is $100,000, Capital alice: $50,000, Capital bob: $50,000"
    });

    const systemInstruction = `You are the core AI parsing agent for "SyncLedger", an advanced Task Management and Financial ERP system.
The user speaks to you via voice or typing. You must analyze their prompt and:
1. Formulate an highly intelligence helpful reply of what you will do or report.
2. If the user wants to perform an action (like adding a task, recording capital contribution, buying or selling items, adding assets), produce a structured action schema that can be dynamically dispatched on the client's store.

Current Database State context:
${contextStr}

We support the following client action structures:
A) ADD_TASK:
   payload: { id: string, title: string, description: string, status: "todo"|"in_progress"|"completed", dueDate: "YYYY-MM-DD", priority: "low"|"medium"|"high", createdAt: unixTimestamp, updatedAt: unixTimestamp }

B) ADD_LEDGER_TRANSACTION:
   payload: { id: string, date: "YYYY-MM-DD", description: string, type: "sales"|"purchase"|"capital_contribution"|"capital_withdrawal"|"profit_distribution"|"salary_payment"|"tax_payment"|"other_expense"|"other_income", debitAccount: string, creditAccount: string, amount: number, reference: string, isBankCleared: boolean, createdAt: unixTimestamp }

C) ADD_INVENTORY_QTY:
   payload: { sku: string, qtyToAdd: number }  (Or subtraction if negative, e.g. selling inventory)

D) ADD_FIXED_ASSET:
   payload: { id: string, name: string, purchaseDate: "YYYY-MM-DD", cost: number, depreciationMethod: "straight_line"|"double_declining", usefulLifeYears: number, salvageValue: number, currentBookValue: number, accumulatedDepreciation: number, status: "active" }

E) GENERAL_REPLY:
   payload: null

Return your output STRICTLY in JSON format following this exact schema:
{
  "reply": "friendly explanation of action/answer",
  "action": {
    "type": "ADD_TASK" | "ADD_LEDGER_TRANSACTION" | "ADD_INVENTORY_QTY" | "ADD_FIXED_ASSET" | null,
    "payload": ...object matching the action specifications...
  }
}
Generate unique string IDs (e.g., prefix-'randomHex') where required. Always match dates on request, or default to current date "2026-06-20" if undefined.
Do not wrap your response in markdown code blocks unless they are specifically 'json' and can be easily parsed. Return valid JSON only.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: "The verbal assistant response back to the user."
            },
            action: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  enum: ["ADD_TASK", "ADD_LEDGER_TRANSACTION", "ADD_INVENTORY_QTY", "ADD_FIXED_ASSET"],
                  description: "The execution action identifier."
                },
                payload: {
                  type: Type.OBJECT,
                  description: "Action-specific dictionary configuration."
                }
              }
            }
          },
          required: ["reply"]
        }
      }
    });

    const text = response.text || '';
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (error) {
    console.error("NLP parsing failed via Gemini API:", error);
    res.status(500).json({
      error: "Natural Language processing failed.",
      reply: "Sorry, I had trouble parsing that command. Please type it in manual entries instead!",
      details: String(error)
    });
  }
});

// API endpoint: Parse receipt/invoice image or PDF block elements via Gemini Multimodal API
app.post('/api/parse-receipt', async (req: Request, res: Response) => {
  const { base64, fileName, mimeType, currentValues, documentType } = req.body;
  if (!base64 || typeof base64 !== 'string') {
    return res.status(400).json({ error: "Missing receipt image base64 data" });
  }

  // Extract clean base64 data and mime type
  let cleanBase64 = base64;
  let cleanMimeType = mimeType || "image/jpeg";

  if (base64.startsWith('data:')) {
    const parts = base64.split(';base64,');
    if (parts.length === 2) {
      const mimePart = parts[0].substring(5);
      // Ensure we don't accidentally send wrong metadata
      cleanMimeType = mimePart.split(';')[0];
      cleanBase64 = parts[1];
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MOCK_KEY") {
    // Intelligent simulation for trial and offline modes
    const nameLower = (fileName || "").toLowerCase();
    
    // Default values representing an outbound administrative expense
    let type: any = currentValues?.type || "other_expense";
    let debitAccount = currentValues?.debitAccount || "Office Rent Expense";
    let creditAccount = currentValues?.creditAccount || "Corporate Bank Account";
    let amount = currentValues?.amount ? parseFloat(currentValues.amount) : 34.80;
    let description = currentValues?.description || "Office cafeteria meals and client drinks";
    let reference = currentValues?.reference || "UPI-REF-" + Math.floor(100000 + Math.random() * 900000);

    if (currentValues) {
      // Auto-correct mode highlights the AI refinement
      if (typeof description === 'string' && !description.includes('Refined')) {
        description = `${description} (AI Refined & Audited)`;
      }
      if (!reference) {
        reference = "POI-TXN-" + Math.floor(200000 + Math.random() * 800000);
      }
    } else {
      if (documentType === 'sales') {
        type = "sales";
        debitAccount = "Corporate Bank Account";
        creditAccount = "Sales Revenue Account";
        amount = 1450.00;
        description = `Sales Invoice: ${fileName?.split('.')[0] || 'Client sales project settlement'}`;
        reference = "INV-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);
      } else if (documentType === 'purchase') {
        type = "purchase";
        debitAccount = "Purchase COGS Account";
        creditAccount = "Corporate Bank Account";
        amount = 350.00;
        description = `Purchase Bill: ${fileName?.split('.')[0] || 'Supplier raw materials intake'}`;
        reference = "PO-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);
      } else if (nameLower.includes("upi") || nameLower.includes("qr") || nameLower.includes("gpay") || nameLower.includes("phoenepe")) {
        type = "other_income";
        debitAccount = "Corporate Bank Account";
        creditAccount = "Sales Revenue Account";
        amount = 850.00;
        description = "Instant settle UPI digital payout - Business settlement";
        reference = "UPI-TXN-" + Math.floor(100000 + Math.random() * 900000);
      } else if (nameLower.includes("purchase") || nameLower.includes("bill") || nameLower.includes("cogs") || nameLower.includes("vendor")) {
        type = "purchase";
        debitAccount = "Purchase COGS Account";
        creditAccount = "Corporate Bank Account";
        amount = 175.50;
        description = "Production materials purchase - Stock intake";
        reference = "PO-" + new Date().getFullYear() + "-" + Math.floor(110 + Math.random() * 880);
      } else if (nameLower.includes("sales") || nameLower.includes("invoice") || nameLower.includes("received") || nameLower.includes("customer")) {
        type = "sales";
        debitAccount = "Corporate Bank Account";
        creditAccount = "Sales Revenue Account";
        amount = 1250.00;
        description = "Standard corporate customer invoice payment clearance";
        reference = "INV-" + new Date().getFullYear() + "-" + Math.floor(110 + Math.random() * 880);
      } else if (nameLower.includes("rent") || nameLower.includes("co-working") || nameLower.includes("lease")) {
        type = "other_expense";
        debitAccount = "Office Rent Expense";
        creditAccount = "Corporate Bank Account";
        amount = 1800.00;
        description = "Co-working lounge modern corporate lease settlement";
        reference = "RENT-LEASE-" + Math.floor(1000 + Math.random() * 9000);
      } else if (nameLower.includes("tax") || nameLower.includes("gst") || nameLower.includes("levy")) {
        type = "tax_payment";
        debitAccount = "GST Tax Expense Account";
        creditAccount = "GST Payable Liability";
        amount = 195.40;
        description = "Statutory corporate tax levy payment";
        reference = "TAX-CLR-" + Math.floor(10000 + Math.random() * 90000);
      }
    }

    // Insert 1.5 seconds simulated extraction loop delay to match native experience perfectly
    await new Promise(resolve => setTimeout(resolve, 1500));

    return res.json({
      success: true,
      data: {
        amount,
        description,
        date: currentValues?.date || new Date().toISOString().split('T')[0],
        type,
        debitAccount,
        creditAccount,
        reference
      },
      simulated: true
    });
  }

  try {
    const ai = getAi();

    const systemInstruction = `You are a professional financial compliance AI audit bot.
You will receive base64 receipt/invoice image files (purchase receipt, sales invoice, tax bill, UPI receipt, etc.).
Extract and parse details of the payment, and return valid JSON obeying this schema:
{
  "amount": number,
  "description": "short, concrete descriptive summary of what was paid or settled on the receipt",
  "date": "YYYY-MM-DD",
  "type": "sales" | "purchase" | "capital_contribution" | "capital_withdrawal" | "profit_distribution" | "salary_payment" | "tax_payment" | "other_expense" | "other_income",
  "debitAccount": "must select EXACTLY one of standard categories: 'Corporate Bank Account' | 'Corporate Cash Account' | 'Sales Revenue Account' | 'Purchase COGS Account' | 'Office Rent Expense' | 'Statutory Payroll Expense' | 'Accumulated Depreciation Account' | 'Capital Fund - Partner Alice' | 'Capital Fund - Partner Bob'",
  "creditAccount": "must select EXACTLY one of standard categories: 'Corporate Bank Account' | 'Corporate Cash Account' | 'Sales Revenue Account' | 'Purchase COGS Account' | 'Office Rent Expense' | 'Statutory Payroll Expense' | 'Accumulated Depreciation Account' | 'Capital Fund - Partner Alice' | 'Capital Fund - Partner Bob'",
  "reference": "invoice #, voucher code, check serial, or UPI settlement reference code"
}

If you cannot read the date, format as 2026-06-20. Map the accounts appropriately depending on whether it is an expense (debit expense/cogs, credit bank/cash) or receipt (debit bank/cash, credit sales/other income).
Response must be STRICTLY valid parser-ready JSON only.`;

    let userPrompt = currentValues
      ? `Re-analyze this fiscal receipt and auto-correct/refine the digital transaction data.
The user manually fine-tuned/typed the following field inputs inside the application:
${JSON.stringify(currentValues, null, 2)}

Incorporate these inputs specifically to correct or fill missing parts, auditing the numbers and descriptions carefully against the source receipt image. Ensure standard double-entry compliance.`
      : "Analyze this fiscal receipt and extract double-entry general ledger voucher compliance attributes.";

    if (documentType) {
      userPrompt += `\nNote: This document is expected to be a ${documentType.toUpperCase()} document. Please map the 'type' attribute to '${documentType}' if it matches. Also select the corresponding accounts correctly (e.g. for sales: debit 'Corporate Bank Account' and credit 'Sales Revenue Account'; for purchase: debit 'Purchase COGS Account' and credit 'Corporate Bank Account').`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: cleanMimeType,
            data: cleanBase64
          }
        },
        userPrompt
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: "Full digital invoice total amount" },
            description: { type: Type.STRING, description: "Concise auditor-ready purchase note" },
            date: { type: Type.STRING, description: "Transaction timestamp date in YYYY-MM-DD formatting style" },
            type: { type: Type.STRING, description: "Best matched transaction type identifier classification" },
            debitAccount: { type: Type.STRING, description: "ERPs exact matching dual debited account" },
            creditAccount: { type: Type.STRING, description: "ERPs exact matching dual credited account" },
            reference: { type: Type.STRING, description: "Captured alphanumeric document ID" }
          },
          required: ["amount", "description", "date", "type", "debitAccount", "creditAccount", "reference"]
        }
      }
    });

    const text = response.text || '';
    const parsed = JSON.parse(text);
    return res.json({ success: true, data: parsed, simulated: false });
  } catch (error) {
    console.error("Gemini receipt parsing failed:", error);
    res.status(500).json({ error: "Dynamic OCR extraction from receipt image failed via Gemini.", details: String(error) });
  }
});

// API endpoint: Classify description or merchant into a standard General Ledger Debited Account
app.post('/api/classify-expense', async (req: Request, res: Response) => {
  const { description, merchantName, availableAccounts } = req.body;
  if (!description && !merchantName) {
    return res.status(400).json({ error: "Missing description or merchantName to classify." });
  }

  const defaultAccounts = [
    'Corporate Bank Account',
    'Corporate Cash Account',
    'Sales Revenue Account',
    'Purchase COGS Account',
    'Office Rent Expense',
    'Statutory Payroll Expense',
    'Accumulated Depreciation Account',
    'Capital Fund - Partner Alice',
    'Capital Fund - Partner Bob'
  ];

  const accounts = (Array.isArray(availableAccounts) && availableAccounts.length > 0)
    ? availableAccounts
    : defaultAccounts;

  const textToClassify = [merchantName, description].filter(Boolean).join(' - ');
  const textLower = textToClassify.toLowerCase();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MOCK_KEY") {
    // Elegant rule-based offline smart classification engine
    let suggestedAccount = 'Office Rent Expense';
    let confidence = 0.70;
    let explanation = "Classified using offline keyword matching heuristic.";

    if (textLower.includes('rent') || textLower.includes('wework') || textLower.includes('leasing') || textLower.includes('landlord') || textLower.includes('office space') || textLower.includes('lease') || textLower.includes('utility') || textLower.includes('electricity') || textLower.includes('internet')) {
      suggestedAccount = 'Office Rent Expense';
      confidence = 0.95;
      explanation = "Matched keywords for corporate premises, rent, coworking, or recurring overhead utilities.";
    } else if (textLower.includes('salary') || textLower.includes('payroll') || textLower.includes('wage') || textLower.includes('employee') || textLower.includes('pf') || textLower.includes('provident') || textLower.includes('bonus') || textLower.includes('commission') || textLower.includes('stipend') || textLower.includes('recruitment')) {
      suggestedAccount = 'Statutory Payroll Expense';
      confidence = 0.95;
      explanation = "Detected payroll, employee benefits, compensatory stipend, or statutory staff wages.";
    } else if (textLower.includes('merchant') || textLower.includes('supplier') || textLower.includes('goods') || textLower.includes('purchase') || textLower.includes('wholesale') || textLower.includes('raw material') || textLower.includes('trading') || textLower.includes('stock') || textLower.includes('cogs') || textLower.includes('inventory') || textLower.includes('printing paper') || textLower.includes('office supply') || textLower.includes('buying')) {
      suggestedAccount = 'Purchase COGS Account';
      confidence = 0.90;
      explanation = "Identified as commercial direct purchases, inventory stock acquisition, or wholesale supplier transaction.";
    } else if (textLower.includes('alice') || textLower.includes('partner a')) {
      suggestedAccount = 'Capital Fund - Partner Alice';
      confidence = 0.95;
      explanation = "Attributed to equity deposits or drawers for Partner Alice Chen.";
    } else if (textLower.includes('bob') || textLower.includes('partner b')) {
      suggestedAccount = 'Capital Fund - Partner Bob';
      confidence = 0.95;
      explanation = "Attributed to equity deposits or drawers for Partner Bob Miller.";
    } else if (textLower.includes('depreciation') || textLower.includes('amortization') || textLower.includes('write-down') || textLower.includes('accumulated')) {
      suggestedAccount = 'Accumulated Depreciation Account';
      confidence = 0.90;
      explanation = "Assigned as straight-line depreciation or wear-and-tear amortization adjust.";
    } else if (textLower.includes('sales') || textLower.includes('revenue') || textLower.includes('consulting') || textLower.includes('retainer') || textLower.includes('receipt') || textLower.includes('client settlement') || textLower.includes('invoice total')) {
      suggestedAccount = 'Sales Revenue Account';
      confidence = 0.85;
      explanation = "Matched inbound customer billing, revenue retainer or credit-grade sales pipeline value.";
    } else if (textLower.includes('cash') || textLower.includes('atm') || textLower.includes('petty') || textLower.includes('counter')) {
      suggestedAccount = 'Corporate Cash Account';
      confidence = 0.85;
      explanation = "Assigned to cash-on-hand vault or petty cash currency drawers.";
    } else if (textLower.includes('bank') || textLower.includes('fee') || textLower.includes('transfer') || textLower.includes('wire')) {
      suggestedAccount = 'Corporate Bank Account';
      confidence = 0.80;
      explanation = "Defaulted to institutional bank clearing or active vault settlement ledger.";
    } else {
      // Find closest matches by looking for substring matches against available accounts
      const matched = accounts.find(acc => textLower.includes(acc.toLowerCase()) || acc.toLowerCase().includes(textLower));
      if (matched) {
        suggestedAccount = matched;
        confidence = 0.85;
        explanation = "Direct target matching with existing ledger class name.";
      } else {
        // Fallback depending on type / context
        suggestedAccount = accounts[4] || accounts[3] || accounts[0]; // Office Rent or COGS or Bank
        confidence = 0.50;
        explanation = "Suggested default general ledger overhead classification.";
      }
    }

    // Return fallback response
    return res.json({
      success: true,
      debitAccount: suggestedAccount,
      confidence,
      explanation,
      simulated: true
    });
  }

  try {
    const ai = getAi();
    const systemInstruction = `You are a professional machine learning tax auditor.
You will analyze a transaction reference description, notes, and/or merchant/vendor name.
Select the single best-matched 'debitAccount' from the provided array of available accounts.
Explain your reasoning briefly (1-2 sentences max).
Return a strictly formatted JSON object obeying this schema:
{
  "debitAccount": "must be one EXACT entry from the availableAccounts array",
  "confidence": number (between 0.00 and 1.00),
  "explanation": "brief contextual description of why this account fits best"
}`;

    const prompt = `Classify this expense and select the best debited ledger account from the given list.
Merchant Name: ${merchantName || 'N/A'}
Transaction Description: ${description || 'N/A'}
Available Accounts list: ${JSON.stringify(accounts)}

Return strictly valid JSON only.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            debitAccount: { type: Type.STRING, description: "One exact string from availableAccounts list" },
            confidence: { type: Type.NUMBER, description: "Machine confidence from 0.00 to 1.00" },
            explanation: { type: Type.STRING, description: "A one-sentence financial rationale for classification choice" }
          },
          required: ["debitAccount", "confidence", "explanation"]
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    // Ensure the suggested debitAccount exists in the accounts array
    if (parsed.debitAccount && !accounts.includes(parsed.debitAccount)) {
      // Find closest substring or default
      const closest = accounts.find(acc => acc.toLowerCase().includes(parsed.debitAccount.toLowerCase()) || parsed.debitAccount.toLowerCase().includes(acc.toLowerCase()));
      if (closest) {
        parsed.debitAccount = closest;
      } else {
        parsed.debitAccount = accounts[4] || accounts[0]; // fallback to rentable or bank
      }
    }

    return res.json({
      success: true,
      debitAccount: parsed.debitAccount,
      confidence: parsed.confidence || 0.85,
      explanation: parsed.explanation || "Classified via advanced neural category mapper.",
      simulated: false
    });
  } catch (error) {
    console.error("AI expense classification error:", error);
    // Silent failover to fallback logic
    let fallbackAcc = accounts[4] || accounts[0];
    if (textLower.includes('salary') || textLower.includes('payroll')) fallbackAcc = 'Statutory Payroll Expense';
    if (textLower.includes('cogs') || textLower.includes('paper') || textLower.includes('goods')) fallbackAcc = 'Purchase COGS Account';
    
    return res.json({
      success: true,
      debitAccount: fallbackAcc,
      confidence: 0.60,
      explanation: "Classified using resilient recovery heuristic due to dynamic model processing exception.",
      simulated: true
    });
  }
});

async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, ws: false, hmr: false },
      appType: 'spa',
    });

    // HMR is disabled in this environment; serve a WebSocket-free /@vite/client shim
    // that preserves CSS style injection and HMR module hooks without opening a dead socket.
    app.get('/@vite/client', (_req: Request, res: Response) => {
      res.type('application/javascript').send(`
const sheetsMap = new Map();

export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else {
    style.textContent = content;
  }
}

export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}

export function createHotContext() {
  const noop = () => {};
  return {
    data: {},
    accept: noop,
    acceptExports: noop,
    dispose: noop,
    prune: noop,
    decline: noop,
    invalidate: noop,
    on: noop,
    off: noop,
    send: noop,
  };
}

export function injectQuery(url, queryToInject) {
  if (!url || !queryToInject) return url;
  const [base, hash] = url.split('#');
  const sep = base.includes('?') ? '&' : '?';
  return base + sep + queryToInject + (hash ? '#' + hash : '');
}

export class ErrorOverlay extends HTMLElement {}
`);
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SyncLedger ERP Server running on http://localhost:${PORT}`);
  });
}

startServer();
