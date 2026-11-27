/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  AppDatabase,
  Task,
  InventoryItem,
  LedgerTransaction,
  FixedAsset,
  PartnerCapital,
  EmployeeSalary,
  BankStatementItem,
  AuditLogEntry,
  CompanySettings,
  RecurringBill,
  RecurringBillCadence,
  LedgerItemMaster,
  UserRole,
  WorkspaceUser,
  RolePermissions,
  TunzuaBackupPayload,
} from './types';

export const getPermissionsForRole = (role: UserRole): RolePermissions => ({
  canCreate: true,
  canEdit: true,
  canPrint: true,
  canExport: true,
  canDelete: role === 'admin',
  canManageUsers: role === 'admin',
});

const OWNER_ADMIN_EMAIL = 'jammangguite@gmail.com';

const createInitialWorkspaceUsers = (): WorkspaceUser[] => [
  {
    id: 'user-owner-admin',
    name: 'Workspace Admin',
    email: OWNER_ADMIN_EMAIL,
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

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  name: 'Tunzua',
  subtitle: 'Simple Double-Entry Ledger',
  currencySymbol: '$',
  fiscalYearStart: 'January',
};

const addDateOffset = (daysOffset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
};

const advanceDueDate = (dateStr: string, cadence: RecurringBillCadence): string => {
  const parts = dateStr.split('-').map(Number);
  const base = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date();
  if (cadence === 'weekly') {
    base.setDate(base.getDate() + 7);
  } else if (cadence === 'monthly') {
    base.setMonth(base.getMonth() + 1);
  } else if (cadence === 'quarterly') {
    base.setMonth(base.getMonth() + 3);
  } else if (cadence === 'yearly') {
    base.setFullYear(base.getFullYear() + 1);
  }
  const yyyy = base.getFullYear();
  const mm = String(base.getMonth() + 1).padStart(2, '0');
  const dd = String(base.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const createInitialRecurringBills = (): RecurringBill[] => [
  {
    id: 'bill-rent-1',
    title: 'Studio & Office Lease',
    vendor: 'Meridian Properties LLC',
    amount: 2400,
    expenseAccount: 'Rent Expense Account',
    paymentAccount: 'Corporate Bank Account',
    cadence: 'monthly',
    nextDueDate: addDateOffset(-2),
    reminderDaysBefore: 5,
    status: 'active',
    lastPaidDate: addDateOffset(-32),
    notes: 'Monthly suite lease due on the 1st.',
  },
  {
    id: 'bill-cloud-2',
    title: 'Cloud Hosting & Backups',
    vendor: 'Northstar Cloud Services',
    amount: 320,
    expenseAccount: 'Software & Hosting Expense',
    paymentAccount: 'Corporate Bank Account',
    cadence: 'monthly',
    nextDueDate: addDateOffset(3),
    reminderDaysBefore: 5,
    status: 'active',
    lastPaidDate: addDateOffset(-27),
    notes: 'Production infrastructure and daily encrypted snapshots.',
  },
  {
    id: 'bill-internet-3',
    title: 'Fiber Business Internet',
    vendor: 'MetroLine Fiber',
    amount: 145,
    expenseAccount: 'Utilities Expense Account',
    paymentAccount: 'Corporate Bank Account',
    cadence: 'monthly',
    nextDueDate: addDateOffset(11),
    reminderDaysBefore: 4,
    status: 'active',
    notes: 'Dedicated 1Gbps office line.',
  },
  {
    id: 'bill-insurance-4',
    title: 'General Liability Insurance',
    vendor: 'Harbor Mutual Assurance',
    amount: 780,
    expenseAccount: 'Insurance Expense Account',
    paymentAccount: 'Corporate Bank Account',
    cadence: 'quarterly',
    nextDueDate: addDateOffset(24),
    reminderDaysBefore: 7,
    status: 'active',
    notes: 'Quarterly business policy renewal.',
  },
];

const createInitialLedgerItems = (): LedgerItemMaster[] => [
  {
    id: 'master-item-1',
    kind: 'item',
    name: 'IT Advisory & Consulting Services',
    gstRate: 18,
    gstMode: 'excluding',
    discount: 0,
    discountType: 'percentage',
    defaultPrice: 1500,
    hsnOrCode: '998313',
    accountGroup: 'Revenue Account',
    createdAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'master-item-2',
    kind: 'item',
    name: 'M3 Ultra Laptop Pro 16"',
    gstRate: 18,
    gstMode: 'including',
    discount: 5,
    discountType: 'percentage',
    defaultPrice: 2499,
    hsnOrCode: '847130',
    accountGroup: 'Inventory Asset Account',
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'master-ledger-1',
    kind: 'ledger',
    name: 'Sales — Standard GST (18%)',
    gstRate: 18,
    gstMode: 'excluding',
    discount: 0,
    discountType: 'percentage',
    accountGroup: 'Revenue Account',
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'master-ledger-2',
    kind: 'ledger',
    name: 'Office & Packaging Supplies',
    gstRate: 12,
    gstMode: 'including',
    discount: 2,
    discountType: 'percentage',
    accountGroup: 'Operating Expense Account',
    createdAt: Date.now() - 86400000 * 3,
  },
];

interface StoreState {
  db: AppDatabase;
  companySettings: CompanySettings;
  recurringBills: RecurringBill[];
  ledgerItems: LedgerItemMaster[];
  workspaceUsers: WorkspaceUser[];
  activeUser: WorkspaceUser;
  realUser: WorkspaceUser;
  activeRole: UserRole;
  isRealAdmin: boolean;
  isPreviewingRole: boolean;
  permissions: RolePermissions;
  isOffline: boolean;
  syncStatus: 'synced' | 'syncing' | 'failed' | 'offline';
  latencyMs: number;
  isUnlocked: boolean;
  hasPasscode: boolean;
  passcode: string;
  isSyncing: boolean;
  auditLogs: AuditLogEntry[];

  // Helpers & Settings
  formatMoney: (amount: number) => string;
  updateCompanySettings: (partial: Partial<CompanySettings>) => void;
  exportBackup: () => TunzuaBackupPayload;
  importBackup: (payload: TunzuaBackupPayload) => { ok: boolean; error?: string };

  // Multi-User & Role Access
  syncSignedInIdentity: (email: string | null, displayName?: string | null) => void;
  setActingUserId: (userId: string | null) => void;
  addWorkspaceUser: (input: { name: string; email: string; role: UserRole; status?: 'active' | 'inactive' }) => Promise<{ ok: boolean; error?: string }>;
  updateWorkspaceUser: (id: string, updates: Partial<Omit<WorkspaceUser, 'id' | 'addedAt'>>) => Promise<{ ok: boolean; error?: string }>;
  deleteWorkspaceUser: (id: string) => Promise<{ ok: boolean; error?: string }>;

  // Recurring Bills
  addRecurringBill: (bill: Omit<RecurringBill, 'id'>) => void;
  updateRecurringBill: (id: string, updates: Partial<RecurringBill>) => void;
  deleteRecurringBill: (id: string) => void;
  payRecurringBill: (id: string, paymentDate?: string) => void;

  // Item / Ledger Masters (Settings)
  addLedgerItem: (item: Omit<LedgerItemMaster, 'id' | 'createdAt'>) => { ok: boolean; error?: string };
  updateLedgerItem: (id: string, updates: Partial<Omit<LedgerItemMaster, 'id' | 'createdAt'>>) => { ok: boolean; error?: string };
  deleteLedgerItem: (id: string) => void;

  // Actions
  addAuditLog: (entry: { action: string; category: AuditLogEntry['category']; description: string; details: any }) => void;
  clearAuditLogs: () => void;
  addTask: (task: Omit<Task, 'createdAt' | 'updatedAt'>) => void;
  updateTaskStatus: (id: string, status: Task['status']) => void;
  addInventoryItem: (item: InventoryItem) => void;
  recordInventoryTransaction: (sku: string, type: 'sales' | 'purchase', qty: number, unitPrice: number, partnerName: string) => void;
  addLedgerTransaction: (tx: Omit<LedgerTransaction, 'createdAt'>) => { ok: boolean; error?: string };
  addBulkLedgerTransactions: (txs: Omit<LedgerTransaction, 'createdAt'>[]) => { insertedCount: number; skippedDuplicates: string[] };
  editLedgerTransaction: (id: string, tx: Partial<LedgerTransaction>) => { ok: boolean; error?: string };
  deleteLedgerTransaction: (id: string) => void;
  addFixedAsset: (asset: Omit<FixedAsset, 'currentBookValue' | 'accumulatedDepreciation' | 'status'>) => void;
  depreciateAssets: () => void;
  disposeAsset: (assetId: string, disposalDate: string, salvageVal: number, logDesc: string) => void;
  adjustPartnerCapital: (partnerId: string, type: 'contribution' | 'withdrawal' | 'distribution', amount: number) => void;
  disburseSalary: (staffId: string) => void;
  addEmployee: (employee: EmployeeSalary) => void;
  editEmployee: (id: string, employee: Partial<EmployeeSalary>) => void;
  deleteEmployee: (id: string) => void;
  reconcileBankStatement: (statementId: string, ledgerTxId: string) => void;
  bulkClearLedgerTransactions: (ledgerTxIds: string[]) => void;
  importBankStatements: (items: BankStatementItem[]) => void;
  toggleOfflineMode: () => void;
  triggerSync: () => Promise<void>;
  setupSecurityPasscode: (code: string) => void;
  removePasscode: () => void;
  unlockWithPasscode: (code: string) => boolean;
  lockNow: () => void;
  clearAllData: () => Promise<{ ok: boolean; error?: string }>;
  resetDatabase: () => Promise<void>;
}

const EMPTY_APP_DB: AppDatabase = {
  tasks: [],
  inventory: [],
  ledger: [],
  fixedAssets: [],
  partners: [],
  payroll: [],
  bankStatements: [],
};

const INITIAL_GENESIS_DB: AppDatabase = {
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
      name: `M3 Ultra Laptop Pro 16"`,
      quantity: 3,
      lowStockThreshold: 5,
      salesPrice: 2499,
      purchasePrice: 1800,
      category: "Hardware",
    },
    {
      id: "inv-2",
      sku: "OLED-CURVE-34",
      name: `OLED Curved Curved-Ultrawide Display 34"`,
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
      quantity: 1,
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
      amount: 3750,
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
      amount: 1290,
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
      amount: 232.2,
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
      accumulatedDepreciation: 480,
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
      providentFund: 1020,
      incomeTaxDeduction: 1275,
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

const StoreContext = createContext<StoreState | undefined>(undefined);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used inside StoreProvider");
  return context;
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Setup database structure in state
  const [db, setDb] = useState<AppDatabase>({ ...EMPTY_APP_DB });
  const dbRef = React.useRef<AppDatabase>(db);
  const dbInitializedRef = React.useRef<boolean>(false);

  const commitDb = (updater: AppDatabase | ((prev: AppDatabase) => AppDatabase)) => {
    const next = typeof updater === 'function' ? updater(dbRef.current) : updater;
    dbRef.current = next;
    dbInitializedRef.current = true;
    localStorage.setItem('syncledger_db_cache', JSON.stringify(next));
    setDb(next);
  };

  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem('tunzua_company_settings');
    if (saved) {
      try {
        return { ...DEFAULT_COMPANY_SETTINGS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_COMPANY_SETTINGS;
      }
    }
    return DEFAULT_COMPANY_SETTINGS;
  });

  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>(() => {
    const saved = localStorage.getItem('tunzua_recurring_bills');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return createInitialRecurringBills();
      }
    }
    return createInitialRecurringBills();
  });

  const [ledgerItems, setLedgerItems] = useState<LedgerItemMaster[]>(() => {
    const saved = localStorage.getItem('tunzua_ledger_items');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return createInitialLedgerItems();
      }
    }
    return createInitialLedgerItems();
  });

  const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUser[]>(() => {
    const saved = localStorage.getItem('tunzua_workspace_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        return createInitialWorkspaceUsers();
      }
    }
    return createInitialWorkspaceUsers();
  });

  const [signedInIdentity, setSignedInIdentity] = useState<{ email: string | null; displayName: string | null }>({
    email: OWNER_ADMIN_EMAIL,
    displayName: 'Workspace Admin',
  });
  const [actingUserId, setActingUserIdState] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('tunzua_company_settings', JSON.stringify(companySettings));
  }, [companySettings]);

  useEffect(() => {
    localStorage.setItem('tunzua_recurring_bills', JSON.stringify(recurringBills));
  }, [recurringBills]);

  useEffect(() => {
    localStorage.setItem('tunzua_ledger_items', JSON.stringify(ledgerItems));
  }, [ledgerItems]);

  useEffect(() => {
    localStorage.setItem('tunzua_workspace_users', JSON.stringify(workspaceUsers));
  }, [workspaceUsers]);

  // Resolve real signed-in user against the workspace directory (least-privilege fallback to 'user')
  const realUser: WorkspaceUser = React.useMemo(() => {
    const emailNorm = (signedInIdentity.email || '').trim().toLowerCase();
    if (emailNorm) {
      const matched = workspaceUsers.find(
        u => u.email.trim().toLowerCase() === emailNorm && u.status === 'active'
      );
      if (matched) return matched;
      if (emailNorm === OWNER_ADMIN_EMAIL) {
        return {
          id: 'user-owner-admin',
          name: signedInIdentity.displayName || 'Workspace Admin',
          email: OWNER_ADMIN_EMAIL,
          role: 'admin',
          status: 'active',
          addedAt: Date.now(),
        };
      }
      return {
        id: `session-${emailNorm}`,
        name: signedInIdentity.displayName || emailNorm.split('@')[0],
        email: emailNorm,
        role: 'user',
        status: 'active',
        addedAt: Date.now(),
      };
    }
    return (
      workspaceUsers.find(u => u.role === 'admin' && u.status === 'active') ||
      createInitialWorkspaceUsers()[0]
    );
  }, [signedInIdentity, workspaceUsers]);

  const isRealAdmin = realUser.role === 'admin' && realUser.status === 'active';

  // Only a real Admin can switch/preview another member's active role
  const activeUser: WorkspaceUser = React.useMemo(() => {
    if (isRealAdmin && actingUserId) {
      const target = workspaceUsers.find(u => u.id === actingUserId && u.status === 'active');
      if (target) return target;
    }
    return realUser;
  }, [isRealAdmin, actingUserId, workspaceUsers, realUser]);

  const activeRole: UserRole = activeUser.role;
  const isPreviewingRole = isRealAdmin && activeUser.id !== realUser.id;
  const permissions: RolePermissions = React.useMemo(
    () => getPermissionsForRole(activeRole),
    [activeRole]
  );

  const syncSignedInIdentity = (email: string | null, displayName?: string | null) => {
    setSignedInIdentity(prev => {
      const nextEmail = email ? email.trim().toLowerCase() : null;
      const nextName = displayName || null;
      if (prev.email === nextEmail && prev.displayName === nextName) return prev;
      return { email: nextEmail, displayName: nextName };
    });
  };

  const setActingUserId = (userId: string | null) => {
    if (!isRealAdmin) return;
    if (!userId || userId === realUser.id) {
      setActingUserIdState(null);
      return;
    }
    const target = workspaceUsers.find(u => u.id === userId && u.status === 'active');
    if (target) {
      setActingUserIdState(target.id);
    }
  };

  const formatMoney = (amount: number): string => {
    const sign = amount < 0 ? '-' : '';
    const formatted = Math.abs(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const sym = companySettings.currencySymbol || '$';
    const spacer = sym.length > 1 ? ' ' : '';
    return `${sign}${sym}${spacer}${formatted}`;
  };

  const updateCompanySettings = (partial: Partial<CompanySettings>) => {
    setCompanySettings(prev => ({ ...prev, ...partial }));
  };

  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'failed' | 'offline'>('synced');
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(true);
  const [hasPasscode, setHasPasscode] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Setup detailed system audit logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem('syncledger_audit_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Audit log parsing error");
      }
    }
    const seeded = [
      {
        id: "audit-seed-1",
        timestamp: Date.now() - 3600000 * 24 * 19,
        action: "ledger_created",
        category: "transaction",
        description: "Alice Chen Capital contribution ledger recorded",
        details: JSON.stringify({ amount: 50000, debit: "Corporate Bank Account", credit: "Capital Fund - Partner Alice" }),
        user: "jammangguite@gmail.com"
      },
      {
        id: "audit-seed-2",
        timestamp: Date.now() - 3600000 * 24 * 19,
        action: "ledger_created",
        category: "transaction",
        description: "Bob Miller Capital contribution ledger recorded",
        details: JSON.stringify({ amount: 50000, debit: "Corporate Bank Account", credit: "Capital Fund - Partner Bob" }),
        user: "jammangguite@gmail.com"
      },
      {
        id: "audit-seed-3",
        timestamp: Date.now() - 3600000 * 24 * 15,
        action: "ledger_created",
        category: "transaction",
        description: "Acquisition Invoice PO-2026-001 filed",
        details: JSON.stringify({ amount: 3750, debit: "Inventory Asset Account", credit: "Corporate Bank Account" }),
        user: "jammangguite@gmail.com"
      },
      {
        id: "audit-seed-4",
        timestamp: Date.now() - 3600000 * 24 * 8,
        action: "ledger_created",
        category: "transaction",
        description: "Sales Invoice INV-2026-042 generated",
        details: JSON.stringify({ amount: 1290, debit: "Corporate Bank Account", credit: "Revenue Account" }),
        user: "jammangguite@gmail.com"
      },
      {
        id: "audit-seed-5",
        timestamp: Date.now() - 3600000 * 24 * 5,
        action: "security_vulnerability_scan",
        category: "security",
        description: "Audit Sentinel ran ISO-27001 security vector sweep",
        details: JSON.stringify({ ip: "127.0.0.1", status: "Active Lock Verified" }),
        user: "System Admin"
      },
      {
        id: "audit-seed-6",
        timestamp: Date.now() - 3600000 * 4,
        action: "sync_completed",
        category: "synchronization",
        description: "Periodic database background sync completed",
        details: JSON.stringify({ syncedCollections: ["tasks", "inventory", "ledger", "fixedAssets"], latencyMs: 42.1 }),
        user: "System Daemon"
      }
    ] as AuditLogEntry[];
    localStorage.setItem('syncledger_audit_logs', JSON.stringify(seeded));
    return seeded;
  });

  const addAuditLog = (entry: { action: string; category: AuditLogEntry['category']; description: string; details: any }) => {
    const newEntry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: Date.now(),
      action: entry.action,
      category: entry.category,
      description: entry.description,
      details: typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details),
      user: activeUser?.email || OWNER_ADMIN_EMAIL,
    };
    setAuditLogs(prev => {
      const next = [newEntry, ...prev];
      localStorage.setItem('syncledger_audit_logs', JSON.stringify(next));
      return next;
    });
  };

  const clearAuditLogs = () => {
    if (!permissions.canDelete) return;
    const fresh: AuditLogEntry[] = [];
    localStorage.setItem('syncledger_audit_logs', JSON.stringify(fresh));
    setAuditLogs(fresh);
  };

  // Measure and update latency metrics for local-first confirmation
  const measureLatency = <T,>(fn: () => T): T => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    setLatencyMs(parseFloat((end - start).toFixed(2)));
    return result;
  };

  // Load passcode + cached local data from localStorage on mount
  useEffect(() => {
    const savedPin = localStorage.getItem('syncledger_pin');
    if (savedPin) {
      setHasPasscode(true);
      setPasscode(savedPin);
      setIsUnlocked(false);
    }

    const cachedDb = localStorage.getItem('syncledger_db_cache');
    if (cachedDb) {
      try {
        const parsedCache = JSON.parse(cachedDb);
        dbRef.current = parsedCache;
        dbInitializedRef.current = true;
        setDb(parsedCache);
      } catch (e) {
        console.error("Local database cache corruption, fetching fresh snapshot.");
      }
    }

    // Bind real network listeners
    const handleOnline = () => {
      setIsOffline(false);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial pull
    pullFromServer();
    fetch('/api/users')
      .then(r => r.json())
      .then(data => {
        if (data?.success && Array.isArray(data.users) && data.users.length > 0) {
          setWorkspaceUsers(data.users);
        }
      })
      .catch(() => {
        // Offline or local-only fallback uses localStorage cache
      });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync to database caches whenever db state updates (including empty cleared state)
  useEffect(() => {
    dbRef.current = db;
    if (dbInitializedRef.current) {
      localStorage.setItem('syncledger_db_cache', JSON.stringify(db));
    }
  }, [db]);

  // Periodic automatic sync
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isOffline) {
        triggerSync();
      }
    }, 15000); // sync every 15s when active/online
    return () => clearInterval(interval);
  }, [db, isOffline]);

  // Pull server data and merge
  const pullFromServer = async () => {
    if (isOffline) {
      setSyncStatus('offline');
      return;
    }
    try {
      setSyncStatus('syncing');
      const start = performance.now();
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      const end = performance.now();
      
      if (data.success && data.db) {
        dbRef.current = data.db;
        dbInitializedRef.current = true;
        setDb(data.db);
        localStorage.setItem('syncledger_db_cache', JSON.stringify(data.db));
        setSyncStatus('synced');
        setLatencyMs(parseFloat((end - start).toFixed(2)));
      } else {
        setSyncStatus('failed');
      }
    } catch {
      setSyncStatus('failed');
    }
  };

  const triggerSync = async () => {
    if (isOffline) {
      setSyncStatus('offline');
      return;
    }
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      const start = performance.now();
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tunzua-actor-email': realUser.email,
        },
        body: JSON.stringify(dbRef.current),
      });
      const data = await response.json();
      const end = performance.now();

      if (data.success && data.db) {
        dbRef.current = data.db;
        dbInitializedRef.current = true;
        setDb(data.db);
        localStorage.setItem('syncledger_db_cache', JSON.stringify(data.db));
        setSyncStatus('synced');
        const finalLatency = parseFloat((end - start).toFixed(2));
        setLatencyMs(finalLatency);
        
        // Log synchronization event
        addAuditLog({
          action: 'sync_completed',
          category: 'synchronization',
          description: `Records synchronized with server`,
          details: { latencyMs: finalLatency },
        });
      } else {
        setSyncStatus('failed');
      }
    } catch {
      setSyncStatus('failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const clearAllData = async (): Promise<{ ok: boolean; error?: string }> => {
    if (!permissions.canDelete) {
      addAuditLog({
        action: 'permission_denied',
        category: 'security',
        description: `Blocked clear-all-data attempt by non-admin user (${activeUser.email})`,
        details: { role: activeRole },
      });
      return { ok: false, error: 'Only Admins can clear all workspace data.' };
    }

    const blankDb: AppDatabase = JSON.parse(JSON.stringify(EMPTY_APP_DB));
    dbRef.current = blankDb;
    dbInitializedRef.current = true;
    setDb(blankDb);
    setRecurringBills([]);
    setLedgerItems([]);
    localStorage.setItem('syncledger_db_cache', JSON.stringify(blankDb));
    localStorage.setItem('tunzua_recurring_bills', JSON.stringify([]));
    localStorage.setItem('tunzua_ledger_items', JSON.stringify([]));
    localStorage.setItem('tunzua_sundry_parties', JSON.stringify([]));

    addAuditLog({
      action: 'workspace_cleared',
      category: 'user_modification',
      description: 'Cleared all demo and ledger data to start with a blank workspace',
      details: { status: 'success' },
    });

    if (isOffline) {
      setSyncStatus('offline');
      return { ok: true };
    }

    try {
      setSyncStatus('syncing');
      const res = await fetch('/api/clear', {
        method: 'POST',
        headers: {
          'x-tunzua-actor-email': realUser.email,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSyncStatus('failed');
        return { ok: false, error: data?.error || 'Server could not clear workspace data.' };
      }
      dbRef.current = data.db;
      setDb(data.db);
      localStorage.setItem('syncledger_db_cache', JSON.stringify(data.db));
      setSyncStatus('synced');
      return { ok: true };
    } catch (err) {
      console.error('Server clear failed', err);
      setSyncStatus('failed');
      return { ok: true };
    }
  };

  const resetDatabase = async () => {
    if (!permissions.canDelete) {
      addAuditLog({
        action: 'permission_denied',
        category: 'security',
        description: `Blocked workspace reset attempt by non-admin user (${activeUser.email})`,
        details: { role: activeRole },
      });
      return;
    }

    // 1. Instantly perform client-side hard-reset to avoid sync / race conditions
    const cleanGenesis = JSON.parse(JSON.stringify(INITIAL_GENESIS_DB));
    const freshBills = createInitialRecurringBills();
    const freshItems = createInitialLedgerItems();
    dbRef.current = cleanGenesis;
    dbInitializedRef.current = true;
    setDb(cleanGenesis);
    setRecurringBills(freshBills);
    setLedgerItems(freshItems);
    setCompanySettings(DEFAULT_COMPANY_SETTINGS);
    localStorage.setItem('syncledger_db_cache', JSON.stringify(cleanGenesis));
    localStorage.setItem('tunzua_recurring_bills', JSON.stringify(freshBills));
    localStorage.setItem('tunzua_ledger_items', JSON.stringify(freshItems));
    localStorage.setItem('tunzua_company_settings', JSON.stringify(DEFAULT_COMPANY_SETTINGS));
    localStorage.removeItem('tunzua_sundry_parties');
    
    addAuditLog({
      action: 'database_reset',
      category: 'user_modification',
      description: 'Workspace restored to clean initial sample ledger data',
      details: { status: 'success' },
    });

    if (isOffline) {
      setSyncStatus('offline');
      return;
    }

    try {
      setSyncStatus('syncing');
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: {
          'x-tunzua-actor-email': realUser.email,
        },
      });
      const data = await res.json();
      if (data.success && data.db) {
        dbRef.current = data.db;
        setDb(data.db);
        localStorage.setItem('syncledger_db_cache', JSON.stringify(data.db));
        setSyncStatus('synced');
      } else {
        setSyncStatus('failed');
      }
    } catch (err) {
      console.error("Server reset failed", err);
      setSyncStatus('failed');
    }
  };

  // Multi-User Directory Actions (Admin-only)
  const addWorkspaceUser = async (input: {
    name: string;
    email: string;
    role: UserRole;
    status?: 'active' | 'inactive';
  }): Promise<{ ok: boolean; error?: string }> => {
    if (!isRealAdmin) {
      return { ok: false, error: 'Only Admins can add workspace users.' };
    }
    const cleanName = input.name.trim();
    const cleanEmail = input.email.trim().toLowerCase();
    if (!cleanName) return { ok: false, error: 'Please enter a full name.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { ok: false, error: 'Please enter a valid email address.' };
    }
    if (workspaceUsers.some(u => u.email.trim().toLowerCase() === cleanEmail)) {
      return { ok: false, error: 'A user with this email already exists.' };
    }

    const newUser: WorkspaceUser = {
      id: `user-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      role: input.role === 'admin' ? 'admin' : 'user',
      status: input.status === 'inactive' ? 'inactive' : 'active',
      addedAt: Date.now(),
    };

    try {
      if (!isOffline) {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tunzua-actor-email': realUser.email,
          },
          body: JSON.stringify(newUser),
        });
        const data = await res.json();
        if (!res.ok) {
          return { ok: false, error: data?.error || 'Could not add user.' };
        }
        if (Array.isArray(data.users)) {
          setWorkspaceUsers(data.users);
        } else {
          setWorkspaceUsers(prev => [newUser, ...prev]);
        }
      } else {
        setWorkspaceUsers(prev => [newUser, ...prev]);
      }
    } catch {
      setWorkspaceUsers(prev => [newUser, ...prev]);
    }

    addAuditLog({
      action: 'workspace_user_added',
      category: 'security',
      description: `Added ${newUser.role} user: ${newUser.name} (${newUser.email})`,
      details: newUser,
    });
    return { ok: true };
  };

  const updateWorkspaceUser = async (
    id: string,
    updates: Partial<Omit<WorkspaceUser, 'id' | 'addedAt'>>
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!isRealAdmin) {
      return { ok: false, error: 'Only Admins can update user roles.' };
    }
    const target = workspaceUsers.find(u => u.id === id);
    if (!target) return { ok: false, error: 'User not found.' };

    const nextRole = updates.role || target.role;
    const nextStatus = updates.status || target.status;
    const activeAdmins = workspaceUsers.filter(u => u.role === 'admin' && u.status === 'active');

    if (
      target.role === 'admin' &&
      target.status === 'active' &&
      activeAdmins.length <= 1 &&
      (nextRole !== 'admin' || nextStatus !== 'active')
    ) {
      return { ok: false, error: 'At least one active Admin must remain in the workspace.' };
    }

    const cleanEmail = updates.email ? updates.email.trim().toLowerCase() : target.email;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { ok: false, error: 'Please enter a valid email address.' };
    }
    if (workspaceUsers.some(u => u.id !== id && u.email.trim().toLowerCase() === cleanEmail)) {
      return { ok: false, error: 'Email is already assigned to another user.' };
    }

    const merged: WorkspaceUser = {
      ...target,
      name: updates.name?.trim() || target.name,
      email: cleanEmail,
      role: nextRole,
      status: nextStatus,
    };

    try {
      if (!isOffline) {
        const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-tunzua-actor-email': realUser.email,
          },
          body: JSON.stringify(merged),
        });
        const data = await res.json();
        if (!res.ok) {
          return { ok: false, error: data?.error || 'Could not update user.' };
        }
        if (Array.isArray(data.users)) {
          setWorkspaceUsers(data.users);
        } else {
          setWorkspaceUsers(prev => prev.map(u => (u.id === id ? merged : u)));
        }
      } else {
        setWorkspaceUsers(prev => prev.map(u => (u.id === id ? merged : u)));
      }
    } catch {
      setWorkspaceUsers(prev => prev.map(u => (u.id === id ? merged : u)));
    }

    if (actingUserId === id && merged.status !== 'active') {
      setActingUserIdState(null);
    }

    addAuditLog({
      action: 'workspace_user_updated',
      category: 'security',
      description: `Updated user ${merged.email} (Role: ${merged.role}, Status: ${merged.status})`,
      details: merged,
    });
    return { ok: true };
  };

  const deleteWorkspaceUser = async (id: string): Promise<{ ok: boolean; error?: string }> => {
    if (!isRealAdmin) {
      return { ok: false, error: 'Only Admins can delete workspace users.' };
    }
    const target = workspaceUsers.find(u => u.id === id);
    if (!target) return { ok: false, error: 'User not found.' };

    const activeAdmins = workspaceUsers.filter(u => u.role === 'admin' && u.status === 'active');
    if (target.role === 'admin' && target.status === 'active' && activeAdmins.length <= 1) {
      return { ok: false, error: 'Cannot remove the last active Admin account.' };
    }

    try {
      if (!isOffline) {
        const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: {
            'x-tunzua-actor-email': realUser.email,
          },
        });
        const data = await res.json();
        if (!res.ok) {
          return { ok: false, error: data?.error || 'Could not remove user.' };
        }
        if (Array.isArray(data.users)) {
          setWorkspaceUsers(data.users);
        } else {
          setWorkspaceUsers(prev => prev.filter(u => u.id !== id));
        }
      } else {
        setWorkspaceUsers(prev => prev.filter(u => u.id !== id));
      }
    } catch {
      setWorkspaceUsers(prev => prev.filter(u => u.id !== id));
    }

    if (actingUserId === id) {
      setActingUserIdState(null);
    }

    addAuditLog({
      action: 'workspace_user_removed',
      category: 'security',
      description: `Removed workspace user ${target.email}`,
      details: { id, email: target.email },
    });
    return { ok: true };
  };

  // Recurring Bills Actions
  const addRecurringBill = (billInput: Omit<RecurringBill, 'id'>) => {
    const newBill: RecurringBill = {
      ...billInput,
      id: `bill-${Date.now()}`,
    };
    setRecurringBills(prev => [newBill, ...prev]);
    addAuditLog({
      action: 'recurring_bill_created',
      category: 'transaction',
      description: `Added recurring bill: ${newBill.title} (${newBill.vendor})`,
      details: newBill,
    });
  };

  const updateRecurringBill = (id: string, updates: Partial<RecurringBill>) => {
    setRecurringBills(prev => prev.map(b => (b.id === id ? { ...b, ...updates } : b)));
  };

  const deleteRecurringBill = (id: string) => {
    if (!permissions.canDelete) {
      addAuditLog({
        action: 'permission_denied',
        category: 'security',
        description: `Blocked recurring bill deletion by ${activeUser.email}`,
        details: { id, role: activeRole },
      });
      return;
    }
    setRecurringBills(prev => prev.filter(b => b.id !== id));
    addAuditLog({
      action: 'recurring_bill_deleted',
      category: 'transaction',
      description: `Removed recurring bill ${id}`,
      details: { id },
    });
  };

  const payRecurringBill = (id: string, paymentDate?: string) => {
    const target = recurringBills.find(b => b.id === id);
    if (!target) return;
    const paidOn = paymentDate || new Date().toISOString().split('T')[0];
    const nextDue = advanceDueDate(target.nextDueDate, target.cadence);

    const baseBillRef = `BILL-${target.id.slice(-4).toUpperCase()}-${paidOn.replace(/-/g, '')}`;
    const existingRefs = new Set(
      dbRef.current.ledger
        .map(t => (t.reference || '').trim().toLowerCase())
        .filter(Boolean)
    );
    let billRef = baseBillRef;
    let suffix = 2;
    while (existingRefs.has(billRef.toLowerCase())) {
      billRef = `${baseBillRef}-${suffix}`;
      suffix++;
    }

    const newTx: LedgerTransaction = {
      id: `billpay-${Date.now()}`,
      date: paidOn,
      description: `${target.title} — ${target.vendor}`,
      type: 'other_expense',
      debitAccount: target.expenseAccount,
      creditAccount: target.paymentAccount,
      amount: target.amount,
      reference: billRef,
      isBankCleared: true,
      createdAt: Date.now(),
    };

    commitDb(prev => ({
      ...prev,
      ledger: [newTx, ...prev.ledger],
    }));

    setRecurringBills(prev =>
      prev.map(b =>
        b.id === id
          ? { ...b, lastPaidDate: paidOn, nextDueDate: nextDue }
          : b
      )
    );

    addAuditLog({
      action: 'recurring_bill_paid',
      category: 'transaction',
      description: `Paid recurring bill ${target.title} (${target.amount})`,
      details: { billId: id, paidOn, nextDue, amount: target.amount },
    });
  };

  const normalizeTextKey = (value: string): string =>
    value.trim().replace(/\s+/g, ' ').toLowerCase();

  // Item / Ledger Master CRUD (Settings)
  const addLedgerItem = (
    itemInput: Omit<LedgerItemMaster, 'id' | 'createdAt'>
  ): { ok: boolean; error?: string } => {
    const cleanName = itemInput.name.trim().replace(/\s+/g, ' ');
    if (!cleanName) {
      return { ok: false, error: `Please enter ${itemInput.kind === 'item' ? 'an item' : 'a ledger'} name.` };
    }
    const candidateKey = normalizeTextKey(cleanName);
    const duplicate = ledgerItems.find(existing => normalizeTextKey(existing.name) === candidateKey);
    if (duplicate) {
      const label = duplicate.kind === 'item' ? 'item' : 'ledger';
      return {
        ok: false,
        error: `A ${label} named "${duplicate.name}" already exists. Duplicate item or ledger names are not allowed.`,
      };
    }

    const newItem: LedgerItemMaster = {
      ...itemInput,
      name: cleanName,
      id: `master-${itemInput.kind}-${Date.now()}`,
      createdAt: Date.now(),
    };
    setLedgerItems(prev => [newItem, ...prev]);
    addAuditLog({
      action: 'ledger_item_created',
      category: 'user_modification',
      description: `Created ${newItem.kind}: ${newItem.name} (GST ${newItem.gstRate}% ${newItem.gstMode})`,
      details: newItem,
    });
    return { ok: true };
  };

  const updateLedgerItem = (
    id: string,
    updates: Partial<Omit<LedgerItemMaster, 'id' | 'createdAt'>>
  ): { ok: boolean; error?: string } => {
    const nextUpdates = { ...updates };
    if (typeof updates.name === 'string') {
      const cleanName = updates.name.trim().replace(/\s+/g, ' ');
      if (!cleanName) {
        return { ok: false, error: 'Name cannot be empty.' };
      }
      const candidateKey = normalizeTextKey(cleanName);
      const duplicate = ledgerItems.find(
        existing => existing.id !== id && normalizeTextKey(existing.name) === candidateKey
      );
      if (duplicate) {
        const label = duplicate.kind === 'item' ? 'item' : 'ledger';
        return {
          ok: false,
          error: `A ${label} named "${duplicate.name}" already exists. Duplicate item or ledger names are not allowed.`,
        };
      }
      nextUpdates.name = cleanName;
    }

    setLedgerItems(prev => prev.map(item => (item.id === id ? { ...item, ...nextUpdates } : item)));
    addAuditLog({
      action: 'ledger_item_updated',
      category: 'user_modification',
      description: `Updated item/ledger master ${nextUpdates.name || id}`,
      details: { id, updates: nextUpdates },
    });
    return { ok: true };
  };

  const deleteLedgerItem = (id: string) => {
    if (!permissions.canDelete) {
      addAuditLog({
        action: 'permission_denied',
        category: 'security',
        description: `Blocked item/ledger master deletion by ${activeUser.email}`,
        details: { id, role: activeRole },
      });
      return;
    }
    setLedgerItems(prev => prev.filter(item => item.id !== id));
    addAuditLog({
      action: 'ledger_item_deleted',
      category: 'user_modification',
      description: `Deleted item/ledger master ${id}`,
      details: { id },
    });
  };

  // JSON Backup Export & Restore
  const exportBackup = (): TunzuaBackupPayload => ({
    version: '1.2',
    exportedAt: new Date().toISOString(),
    companySettings,
    recurringBills,
    ledgerItems,
    workspaceUsers,
    db,
  });

  const importBackup = (payload: TunzuaBackupPayload): { ok: boolean; error?: string } => {
    if (!payload || typeof payload !== 'object' || !payload.db || !Array.isArray(payload.db.ledger)) {
      return { ok: false, error: 'Invalid backup file format. Expected a Tunzua JSON backup.' };
    }
    const restoredDb: AppDatabase = {
      tasks: Array.isArray(payload.db.tasks) ? payload.db.tasks : [],
      inventory: Array.isArray(payload.db.inventory) ? payload.db.inventory : [],
      ledger: Array.isArray(payload.db.ledger) ? payload.db.ledger : [],
      fixedAssets: Array.isArray(payload.db.fixedAssets) ? payload.db.fixedAssets : [],
      partners: Array.isArray(payload.db.partners) ? payload.db.partners : [],
      payroll: Array.isArray(payload.db.payroll) ? payload.db.payroll : [],
      bankStatements: Array.isArray(payload.db.bankStatements) ? payload.db.bankStatements : [],
    };
    setDb(restoredDb);
    localStorage.setItem('syncledger_db_cache', JSON.stringify(restoredDb));

    if (payload.companySettings && typeof payload.companySettings === 'object') {
      const mergedSettings = { ...DEFAULT_COMPANY_SETTINGS, ...payload.companySettings };
      setCompanySettings(mergedSettings);
      localStorage.setItem('tunzua_company_settings', JSON.stringify(mergedSettings));
    }

    if (Array.isArray(payload.recurringBills)) {
      setRecurringBills(payload.recurringBills);
      localStorage.setItem('tunzua_recurring_bills', JSON.stringify(payload.recurringBills));
    }

    if (Array.isArray(payload.ledgerItems)) {
      setLedgerItems(payload.ledgerItems);
      localStorage.setItem('tunzua_ledger_items', JSON.stringify(payload.ledgerItems));
    }

    if (isRealAdmin && Array.isArray(payload.workspaceUsers) && payload.workspaceUsers.length > 0) {
      setWorkspaceUsers(payload.workspaceUsers);
      localStorage.setItem('tunzua_workspace_users', JSON.stringify(payload.workspaceUsers));
    }

    addAuditLog({
      action: 'backup_restored',
      category: 'user_modification',
      description: `Restored Tunzua backup (${restoredDb.ledger.length} ledger entries)`,
      details: { exportedAt: payload.exportedAt },
    });

    return { ok: true };
  };

  // 1. ADD TASK
  const addTask = (taskInput: Omit<Task, 'createdAt' | 'updatedAt'>) => {
    measureLatency(() => {
      const newTask: Task = {
        ...taskInput,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setDb(prev => ({
        ...prev,
        tasks: [newTask, ...prev.tasks],
      }));
      addAuditLog({
        action: 'task_created',
        category: 'user_modification',
        description: `Created task: "${newTask.title}"`,
        details: { id: newTask.id, priority: newTask.priority, dueDate: newTask.dueDate },
      });
    });
  };

  const updateTaskStatus = (id: string, status: Task['status']) => {
    measureLatency(() => {
      setDb(prev => {
        const task = prev.tasks.find(t => t.id === id);
        if (task) {
          addAuditLog({
            action: 'task_status_updated',
            category: 'user_modification',
            description: `Updated task status for "${task.title}" to ${status.toUpperCase()}`,
            details: { id, title: task.title, previousStatus: task.status, newStatus: status },
          });
        }
        return {
          ...prev,
          tasks: prev.tasks.map(t => t.id === id ? { ...t, status, updatedAt: Date.now() } : t),
        };
      });
    });
  };

  // 2. ADD INVENTORY
  const addInventoryItem = (item: InventoryItem) => {
    measureLatency(() => {
      setDb(prev => {
        const index = prev.inventory.findIndex(i => i.sku === item.sku);
        const original = index > -1 ? prev.inventory[index] : null;
        
        addAuditLog({
          action: original ? 'inventory_updated' : 'inventory_created',
          category: 'user_modification',
          description: original 
            ? `Updated stock item SKU ${item.sku}: "${item.name}"`
            : `Created new stock item SKU ${item.sku}: "${item.name}"`,
          details: { item, original },
        });

        if (index > -1) {
          return {
            ...prev,
            inventory: prev.inventory.map((inv, idx) => idx === index ? item : inv),
          };
        } else {
          return {
            ...prev,
            inventory: [...prev.inventory, item],
          };
        }
      });
    });
  };

  // Automation: RECORD INVENTORY SALES / PURCHASES
  // Updates Inventory quantities + updates Ledger with professional accounts
  const recordInventoryTransaction = (
    sku: string,
    type: 'sales' | 'purchase',
    qty: number,
    unitPrice: number,
    partnerName: string
  ) => {
    measureLatency(() => {
      setDb(prev => {
        const item = prev.inventory.find(i => i.sku === sku);
        if (!item) return prev;

        const totalAmount = qty * unitPrice;
        const targetQty = type === 'sales' ? item.quantity - qty : item.quantity + qty;

        // Double check low stock alerts or threshold warnings on sales
        const updatedInventory = prev.inventory.map(i =>
          i.sku === sku ? { ...i, quantity: targetQty } : i
        );

        // Generate General Ledger Entry
        const generatedTransaction: LedgerTransaction = {
          id: `tr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          date: new Date().toISOString().split('T')[0],
          description: `${type === 'sales' ? 'Invoice Out' : 'Purchase In'} - SKU: ${sku} (${item.name}), Qty: ${qty}`,
          type: type,
          debitAccount: type === 'sales' ? 'Corporate Bank Account' : 'Inventory Asset Account',
          creditAccount: type === 'sales' ? 'Revenue Account' : 'Corporate Bank Account',
          amount: totalAmount,
          reference: `${type === 'sales' ? 'INV' : 'PO'}-${Date.now().toString().slice(-5)}`,
          isBankCleared: false,
          createdAt: Date.now(),
        };

        const updatedLedger = [generatedTransaction, ...prev.ledger];

        // Also update cost accounts automatically for sales if we purchase at different cost
        if (type === 'sales') {
          const costOfGoodsSoldAmount = qty * item.purchasePrice;
          const cogsTransaction: LedgerTransaction = {
            id: `tr-cogs-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            description: `Automated COGS matching - SKU: ${sku}, Qty: ${qty}`,
            type: 'other_expense',
            debitAccount: 'Cost of Goods Sold (COGS)',
            creditAccount: 'Inventory Asset Account',
            amount: costOfGoodsSoldAmount,
            reference: `COGS-${Date.now().toString().slice(-5)}`,
            isBankCleared: true,
            createdAt: Date.now(),
          };
          updatedLedger.unshift(cogsTransaction);
        }

        addAuditLog({
          action: type === 'sales' ? 'inventory_sales' : 'inventory_purchase',
          category: 'user_modification',
          description: `Stock transaction logged: SKU ${sku} was ${type}d with quantity ${qty}`,
          details: { sku, type, qty, unitPrice, totalAmount, partnerName },
        });

        return {
          ...prev,
          inventory: updatedInventory,
          ledger: updatedLedger,
        };
      });
    });
  };

  // 3. LEDGER & GENERAL REPORTING
  const findDuplicateReference = (reference: string | undefined, excludeTxId?: string): LedgerTransaction | undefined => {
    const cleanRef = (reference || '').trim().toLowerCase();
    if (!cleanRef) return undefined;
    return dbRef.current.ledger.find(
      tx => tx.id !== excludeTxId && (tx.reference || '').trim().toLowerCase() === cleanRef
    );
  };

  const addLedgerTransaction = (txInput: Omit<LedgerTransaction, 'createdAt'>): { ok: boolean; error?: string } => {
    const cleanRef = txInput.reference?.trim();
    if (cleanRef) {
      const duplicate = findDuplicateReference(cleanRef);
      if (duplicate) {
        return {
          ok: false,
          error: `Invoice / reference number "${cleanRef}" already exists. Duplicate invoice numbers are not allowed.`,
        };
      }
    }

    measureLatency(() => {
      const newTx: LedgerTransaction = {
        ...txInput,
        reference: cleanRef || undefined,
        createdAt: Date.now(),
      };
      commitDb(prev => ({
        ...prev,
        ledger: [newTx, ...prev.ledger],
      }));
      addAuditLog({
        action: 'ledger_created',
        category: 'transaction',
        description: `Created bank cleared? ${newTx.isBankCleared ? 'YES' : 'NO'} ledger voucher: "${newTx.description}"`,
        details: { id: newTx.id, amount: newTx.amount, debitAccount: newTx.debitAccount, creditAccount: newTx.creditAccount },
      });
    });
    return { ok: true };
  };

  const addBulkLedgerTransactions = (
    txInputs: Omit<LedgerTransaction, 'createdAt'>[]
  ): { insertedCount: number; skippedDuplicates: string[] } => {
    if (!txInputs.length) return { insertedCount: 0, skippedDuplicates: [] };

    const seenRefs = new Set(
      dbRef.current.ledger
        .map(tx => (tx.reference || '').trim().toLowerCase())
        .filter(Boolean)
    );
    const skippedDuplicates: string[] = [];
    const baseTime = Date.now();
    const newTxs: LedgerTransaction[] = [];

    txInputs.forEach((txInput, idx) => {
      const cleanRef = txInput.reference?.trim();
      const refKey = cleanRef ? cleanRef.toLowerCase() : '';
      if (refKey && seenRefs.has(refKey)) {
        skippedDuplicates.push(cleanRef!);
        return;
      }
      if (refKey) seenRefs.add(refKey);
      newTxs.push({
        ...txInput,
        reference: cleanRef || undefined,
        createdAt: baseTime + idx,
      });
    });

    if (newTxs.length === 0) {
      return { insertedCount: 0, skippedDuplicates };
    }

    measureLatency(() => {
      commitDb(prev => ({
        ...prev,
        ledger: [...newTxs, ...prev.ledger],
      }));
      const totalAmount = newTxs.reduce((sum, tx) => sum + tx.amount, 0);
      addAuditLog({
        action: 'ledger_bulk_imported',
        category: 'transaction',
        description: `Imported ${newTxs.length} ledger transactions via CSV`,
        details: { count: newTxs.length, totalAmount, skippedDuplicatesCount: skippedDuplicates.length },
      });
    });

    return { insertedCount: newTxs.length, skippedDuplicates };
  };

  const editLedgerTransaction = (
    id: string,
    updatedFields: Partial<LedgerTransaction>
  ): { ok: boolean; error?: string } => {
    const cleanRef =
      typeof updatedFields.reference === 'string' ? updatedFields.reference.trim() : undefined;
    if (cleanRef) {
      const duplicate = findDuplicateReference(cleanRef, id);
      if (duplicate) {
        return {
          ok: false,
          error: `Invoice / reference number "${cleanRef}" already exists. Duplicate invoice numbers are not allowed.`,
        };
      }
    }

    const sanitizedUpdates: Partial<LedgerTransaction> =
      'reference' in updatedFields
        ? { ...updatedFields, reference: cleanRef || undefined }
        : updatedFields;

    measureLatency(() => {
      const original = dbRef.current.ledger.find(tx => tx.id === id);
      if (original) {
        addAuditLog({
          action: 'ledger_updated',
          category: 'transaction',
          description: `Updated ledger voucher ref ${original.reference || original.id.slice(-5)}: "${original.description}"`,
          details: { id, original: { amount: original.amount, description: original.description }, updated: sanitizedUpdates },
        });
      }
      commitDb(prev => ({
        ...prev,
        ledger: prev.ledger.map(tx => tx.id === id ? { ...tx, ...sanitizedUpdates } : tx),
      }));
    });
    return { ok: true };
  };

  const deleteLedgerTransaction = (id: string) => {
    if (!permissions.canDelete) {
      addAuditLog({
        action: 'permission_denied',
        category: 'security',
        description: `Blocked ledger entry deletion by ${activeUser.email}`,
        details: { id, role: activeRole },
      });
      return;
    }
    measureLatency(() => {
      const original = dbRef.current.ledger.find(tx => tx.id === id);
      if (original) {
        addAuditLog({
          action: 'ledger_deleted',
          category: 'transaction',
          description: `Removed ledger voucher ref ${original.reference || original.id.slice(-5)}: "${original.description}"`,
          details: original,
        });
      }
      commitDb(prev => ({
        ...prev,
        ledger: prev.ledger.filter(tx => tx.id !== id),
      }));
    });
  };

  // 4. FIXED ASSETS & DEPRECIATION
  const addFixedAsset = (assetInput: Omit<FixedAsset, 'currentBookValue' | 'accumulatedDepreciation' | 'status'>) => {
    measureLatency(() => {
      const newAsset: FixedAsset = {
        ...assetInput,
        currentBookValue: assetInput.cost,
        accumulatedDepreciation: 0,
        status: 'active',
      };
      setDb(prev => ({
        ...prev,
        fixedAssets: [...prev.fixedAssets, newAsset],
      }));
    });
  };

  // Running periodic/monthly or annual Depreciation
  const depreciateAssets = () => {
    measureLatency(() => {
      setDb(prev => {
        let additionalLedgerTransactions: LedgerTransaction[] = [];
        const updatedAssets = prev.fixedAssets.map(asset => {
          if (asset.status === 'disposed') return asset;

          let calculatedDepreciation = 0;
          const depreciationRate = asset.depreciationRate || 15; // default 15% if not entered

          if (asset.depreciationMethod === 'wdv') {
            // INCOME TAX DEPRECIATION RULE (WDV METHOD with 180-day put-to-use rule)
            // Financial year is April to March.
            // Let's determine if purchased in the second half of the fiscal year (Oct 4 to March 31).
            const pDate = new Date(asset.purchaseDate);
            const month = pDate.getMonth(); // 0-indexed: 0 = Jan, 9 = Oct
            
            // Check if month is between October (9) and March (2) inclusive:
            const isLessThan180Days = (month >= 9 || month <= 2); 
            
            // Adjust rate based on the 180-day rule for the FIRST year depreciation
            const isFirstDepreciation = asset.accumulatedDepreciation === 0;
            const appliedRate = (isFirstDepreciation && isLessThan180Days) 
              ? (depreciationRate / 2) 
              : depreciationRate;

            // Annual depreciation on WDV
            calculatedDepreciation = (asset.currentBookValue * (appliedRate / 100));
          } else {
            // Simple straight line depreciation
            if (asset.depreciationRate) {
              calculatedDepreciation = asset.cost * (asset.depreciationRate / 100);
            } else {
              const depreciableAmount = asset.cost - asset.salvageValue;
              calculatedDepreciation = depreciableAmount / asset.usefulLifeYears;
            }
          }

          const roundedDep = parseFloat(calculatedDepreciation.toFixed(2));
          const newAccDep = parseFloat((asset.accumulatedDepreciation + roundedDep).toFixed(2));
          const newBookVal = parseFloat((asset.cost - newAccDep).toFixed(2));

          // Automated Ledger Entry
          additionalLedgerTransactions.push({
            id: `tr-dep-${Date.now()}-${asset.id}`,
            date: new Date().toISOString().split('T')[0],
            description: `Auto Depreciation Expense - ${asset.name} (${asset.depreciationMethod === 'wdv' ? 'WDV IT Rule' : 'Straight Line'})`,
            type: 'other_expense',
            debitAccount: 'Depreciation Expense Account',
            creditAccount: 'Accumulated Depreciation Account',
            amount: roundedDep,
            reference: `DEP-AUTO-${asset.id.slice(-4)}`,
            isBankCleared: true,
            createdAt: Date.now(),
          });

          return {
            ...asset,
            accumulatedDepreciation: newAccDep,
            currentBookValue: newBookVal,
          };
        });

        return {
          ...prev,
          fixedAssets: updatedAssets,
          ledger: [...additionalLedgerTransactions, ...prev.ledger],
        };
      });
    });
  };

  const disposeAsset = (assetId: string, disposalDate: string, salvageVal: number, logDesc: string) => {
    measureLatency(() => {
      setDb(prev => {
        const asset = prev.fixedAssets.find(a => a.id === assetId);
        if (!asset) return prev;

        // Disposal calculations: book value vs disposal salvage value -> Gain / Loss
        const bookValueAtDisposal = asset.currentBookValue;
        const lossOrGain = salvageVal - bookValueAtDisposal;

        const disposalTx: LedgerTransaction = {
          id: `tr-disp-${Date.now()}`,
          date: disposalDate,
          description: `Disposal of Fixed Asset: ${asset.name} - ${logDesc}`,
          type: 'other_income',
          debitAccount: 'Corporate Bank Account',
          creditAccount: 'Fixed Asset Cost Account',
          amount: salvageVal,
          reference: `DISP-${assetId.slice(-4)}`,
          isBankCleared: false,
          createdAt: Date.now(),
        };

        // Write off accumulated depreciation and asset cost
        const writeOffTx: LedgerTransaction = {
          id: `tr-disp-wo-${Date.now()}`,
          date: disposalDate,
          description: `Asset write-off accumulation - Gain/Loss: $${lossOrGain.toFixed(2)}`,
          type: lossOrGain >= 0 ? 'other_income' : 'other_expense',
          debitAccount: 'Accumulated Depreciation Account',
          creditAccount: 'Fixed Asset Cost Account',
          amount: asset.accumulatedDepreciation,
          reference: `WO-${assetId.slice(-4)}`,
          isBankCleared: true,
          createdAt: Date.now(),
        };

        const updatedLedger = [disposalTx, writeOffTx, ...prev.ledger];

        return {
          ...prev,
          fixedAssets: prev.fixedAssets.map(a => a.id === assetId ? {
            ...a,
            status: 'disposed',
            disposalDate,
            disposalValue: salvageVal,
            disposalLog: logDesc,
            currentBookValue: 0
          } : a),
          ledger: updatedLedger,
        };
      });
    });
  };

  // 5. PARTNERS CAPITAL ACCOUNT
  const adjustPartnerCapital = (
    partnerId: string,
    type: 'contribution' | 'withdrawal' | 'distribution',
    amount: number
  ) => {
    measureLatency(() => {
      setDb(prev => {
        const partner = prev.partners.find(p => p.id === partnerId);
        if (!partner) return prev;

        let balChange = 0;
        let txType: LedgerTransaction['type'] = 'capital_contribution';

        if (type === 'contribution') {
          balChange = amount;
          txType = 'capital_contribution';
        } else if (type === 'withdrawal') {
          balChange = -amount;
          txType = 'capital_withdrawal';
        } else if (type === 'distribution') {
          balChange = -amount;
          txType = 'profit_distribution';
        }

        const trans: LedgerTransaction = {
          id: `tr-cap-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          description: `Capital allocation (${type}) - Partner: ${partner.partnerName}`,
          type: txType,
          debitAccount: type === 'contribution' ? 'Corporate Bank Account' : 'Partner Capital Draws',
          creditAccount: type === 'contribution' ? 'Corporate Partner Capital Ledger' : 'Corporate Bank Account',
          amount: amount,
          reference: `CAP-${type.slice(0, 3).toUpperCase()}`,
          isBankCleared: false,
          createdAt: Date.now(),
        };

        const updatedPartners = prev.partners.map(p => {
          if (p.id === partnerId) {
            return {
              ...p,
              contributions: type === 'contribution' ? p.contributions + amount : p.contributions,
              withdrawals: type === 'withdrawal' ? p.withdrawals + amount : p.withdrawals,
              balance: p.balance + balChange,
            };
          }
          return p;
        });

        return {
          ...prev,
          partners: updatedPartners,
          ledger: [trans, ...prev.ledger],
        };
      });
    });
  };

  // 6. PAYROLL statutory deductions & salary disbursements
  const disburseSalary = (staffId: string) => {
    measureLatency(() => {
      setDb(prev => {
        const employee = prev.payroll.find(e => e.id === staffId);
        if (!employee) return prev;

        const date = new Date().toISOString().split('T')[0];
        const netDisbursed = employee.monthlyBase + employee.allowances - employee.providentFund - employee.incomeTaxDeduction;

        // Ledger Entry (Debit Base Salary, Credit Bank, Credit PF Suspense, Credit TDS liability)
        const payoutTx: LedgerTransaction = {
          id: `tr-pay-${Date.now()}`,
          date,
          description: `Salary Net Disbursement - Staff: ${employee.name}`,
          type: 'salary_payment',
          debitAccount: 'Salary Expense Account',
          creditAccount: 'Corporate Bank Account',
          amount: netDisbursed,
          reference: `PAY-${employee.id.slice(-3)}`,
          isBankCleared: false,
          createdAt: Date.now(),
        };

        const pfHoldingTx: LedgerTransaction = {
          id: `tr-pf-${Date.now()}`,
          date,
          description: `Statutory PF Withholding - Staff: ${employee.name}`,
          type: 'other_expense',
          debitAccount: 'Salary Expense Account',
          creditAccount: 'Employee Provident Fund Liability',
          amount: employee.providentFund,
          reference: `EPF-${employee.id.slice(-3)}`,
          isBankCleared: true,
          createdAt: Date.now(),
        };

        const tdsHoldingTx: LedgerTransaction = {
          id: `tr-tds-${Date.now()}`,
          date,
          description: `Income Tax TDS Withholding - Staff: ${employee.name}`,
          type: 'other_expense',
          debitAccount: 'Salary Expense Account',
          creditAccount: 'Withholding Tax Credit Ledger',
          amount: employee.incomeTaxDeduction,
          reference: `TDS-${employee.id.slice(-3)}`,
          isBankCleared: true,
          createdAt: Date.now(),
        };

        return {
          ...prev,
          payroll: prev.payroll.map(p => p.id === staffId ? { ...p, status: 'disbursed', disbursedAt: date.slice(0, 7) } : p),
          ledger: [payoutTx, pfHoldingTx, tdsHoldingTx, ...prev.ledger],
        };
      });
    });
  };

  const addEmployee = (employee: EmployeeSalary) => {
    measureLatency(() => {
      setDb(prev => ({
        ...prev,
        payroll: [...prev.payroll, employee],
      }));
      addAuditLog({
        action: 'add_employee',
        category: 'user_modification',
        description: `Added new employee ${employee.name} to statutory roster`,
        details: employee,
      });
    });
  };

  const editEmployee = (id: string, updatedFields: Partial<EmployeeSalary>) => {
    measureLatency(() => {
      setDb(prev => ({
        ...prev,
        payroll: prev.payroll.map(p => p.id === id ? { ...p, ...updatedFields } : p),
      }));
      addAuditLog({
        action: 'edit_employee',
        category: 'user_modification',
        description: `Updated salary profile for employee ID: ${id}`,
        details: updatedFields,
      });
    });
  };

  const deleteEmployee = (id: string) => {
    if (!permissions.canDelete) {
      addAuditLog({
        action: 'permission_denied',
        category: 'security',
        description: `Blocked payroll record deletion by ${activeUser.email}`,
        details: { id, role: activeRole },
      });
      return;
    }
    measureLatency(() => {
      setDb(prev => ({
        ...prev,
        payroll: prev.payroll.filter(p => p.id !== id),
      }));
      addAuditLog({
        action: 'delete_employee',
        category: 'user_modification',
        description: `Removed employee ID: ${id} from active payroll registry`,
        details: { id },
      });
    });
  };

  // 7. BANK RECONCILIATION STATEMENT MAPPING
  const reconcileBankStatement = (statementId: string, ledgerTxId: string) => {
    measureLatency(() => {
      setDb(prev => {
        const statement = prev.bankStatements.find(s => s.id === statementId);
        const transaction = prev.ledger.find(t => t.id === ledgerTxId);

        if (!statement || !transaction) return prev;

        return {
          ...prev,
          bankStatements: prev.bankStatements.map(s =>
            s.id === statementId ? { ...s, reconciledTransactionId: ledgerTxId } : s
          ),
          ledger: prev.ledger.map(t =>
            t.id === ledgerTxId ? { ...t, isBankCleared: true } : t
          ),
        };
      });
    });
  };

  const bulkClearLedgerTransactions = (ledgerTxIds: string[]) => {
    measureLatency(() => {
      setDb(prev => ({
        ...prev,
        ledger: prev.ledger.map(t =>
          ledgerTxIds.includes(t.id) ? { ...t, isBankCleared: true } : t
        ),
      }));
      addAuditLog({
        action: 'bulk_clear_transactions',
        category: 'transaction',
        description: `Bulk bank cleared ${ledgerTxIds.length} internal ledger vouchers`,
        details: { count: ledgerTxIds.length, ledgerTxIds },
      });
    });
  };

  const importBankStatements = (items: BankStatementItem[]) => {
    measureLatency(() => {
      setDb(prev => {
        // Prevent duplicate statements by matching referenceNumber if exists, or description + date + amount
        const filteredItems = items.filter(newItem => {
          return !prev.bankStatements.some(existing => {
            if (newItem.referenceNumber && existing.referenceNumber) {
              return newItem.referenceNumber === existing.referenceNumber;
            }
            return (
              existing.date === newItem.date &&
              existing.description === newItem.description &&
              existing.amount === newItem.amount
            );
          });
        });

        if (filteredItems.length === 0) return prev;

        return {
          ...prev,
          bankStatements: [...prev.bankStatements, ...filteredItems],
        };
      });

      addAuditLog({
        action: 'import_bank_statements',
        category: 'transaction',
        description: `Imported ${items.length} bank statement rows`,
        details: { count: items.length },
      });
    });
  };

  // Security passcodes (locking app down)
  const setupSecurityPasscode = (code: string) => {
    localStorage.setItem('syncledger_pin', code);
    setPasscode(code);
    setHasPasscode(true);
    setIsUnlocked(true);
    addAuditLog({
      action: 'security_pin_setup',
      category: 'security',
      description: 'ISO-27001 Cryptographic 4-Digit Security PIN configured',
      details: { hasPasscode: true },
    });
  };

  const removePasscode = () => {
    localStorage.removeItem('syncledger_pin');
    setPasscode('');
    setHasPasscode(false);
    setIsUnlocked(true);
    addAuditLog({
      action: 'security_pin_removed',
      category: 'security',
      description: 'Cleartext cache warning: 4-digit security PIN deactivated',
      details: { hasPasscode: false },
    });
  };

  const unlockWithPasscode = (code: string): boolean => {
    if (code === passcode) {
      setIsUnlocked(true);
      addAuditLog({
        action: 'security_pin_unlock',
        category: 'security',
        description: 'Vault cache unlocked via correct user authentication PIN',
        details: { status: 'success' },
      });
      return true;
    }
    addAuditLog({
      action: 'security_pin_fail',
      category: 'security',
      description: 'Failed credential attempt on restricted vault interface',
      details: { enteredPin: '****', status: 'denied' },
    });
    return false;
  };

  const lockNow = () => {
    if (hasPasscode) {
      setIsUnlocked(false);
      addAuditLog({
        action: 'security_pin_lock',
        category: 'security',
        description: 'Vault access manual lock initiated',
        details: { isUnlocked: false },
      });
    }
  };

  const toggleOfflineMode = () => {
    setIsOffline(prev => {
      const next = !prev;
      if (next) {
        setSyncStatus('offline');
      } else {
        setSyncStatus('synced');
      }
      addAuditLog({
        action: next ? 'offline_mode_enabled' : 'offline_mode_disabled',
        category: 'security',
        description: next ? 'Local-First Offline database routing engaged' : 'Cloud Synchronizer session re-established',
        details: { isOffline: next },
      });
      return next;
    });
  };

  return (
    <StoreContext.Provider
      value={{
        db,
        companySettings,
        recurringBills,
        ledgerItems,
        workspaceUsers,
        activeUser,
        realUser,
        activeRole,
        isRealAdmin,
        isPreviewingRole,
        permissions,
        isOffline,
        syncStatus,
        latencyMs,
        isUnlocked,
        hasPasscode,
        passcode,
        isSyncing,
        auditLogs,
        formatMoney,
        updateCompanySettings,
        exportBackup,
        importBackup,
        syncSignedInIdentity,
        setActingUserId,
        addWorkspaceUser,
        updateWorkspaceUser,
        deleteWorkspaceUser,
        addRecurringBill,
        updateRecurringBill,
        deleteRecurringBill,
        payRecurringBill,
        addLedgerItem,
        updateLedgerItem,
        deleteLedgerItem,
        addAuditLog,
        clearAuditLogs,
        addTask,
        updateTaskStatus,
        addInventoryItem,
        recordInventoryTransaction,
        addLedgerTransaction,
        addBulkLedgerTransactions,
        editLedgerTransaction,
        deleteLedgerTransaction,
        addFixedAsset,
        depreciateAssets,
        disposeAsset,
        adjustPartnerCapital,
        disburseSalary,
        addEmployee,
        editEmployee,
        deleteEmployee,
        reconcileBankStatement,
        bulkClearLedgerTransactions,
        importBankStatements,
        toggleOfflineMode,
        triggerSync,
        setupSecurityPasscode,
        removePasscode,
        unlockWithPasscode,
        lockNow,
        clearAllData,
        resetDatabase,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};
