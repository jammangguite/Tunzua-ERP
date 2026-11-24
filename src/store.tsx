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
  TunzuaBackupPayload,
} from './types';

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

interface StoreState {
  db: AppDatabase;
  companySettings: CompanySettings;
  recurringBills: RecurringBill[];
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

  // Recurring Bills
  addRecurringBill: (bill: Omit<RecurringBill, 'id'>) => void;
  updateRecurringBill: (id: string, updates: Partial<RecurringBill>) => void;
  deleteRecurringBill: (id: string) => void;
  payRecurringBill: (id: string, paymentDate?: string) => void;

  // Actions
  addAuditLog: (entry: { action: string; category: AuditLogEntry['category']; description: string; details: any }) => void;
  clearAuditLogs: () => void;
  addTask: (task: Omit<Task, 'createdAt' | 'updatedAt'>) => void;
  updateTaskStatus: (id: string, status: Task['status']) => void;
  addInventoryItem: (item: InventoryItem) => void;
  recordInventoryTransaction: (sku: string, type: 'sales' | 'purchase', qty: number, unitPrice: number, partnerName: string) => void;
  addLedgerTransaction: (tx: Omit<LedgerTransaction, 'createdAt'>) => void;
  editLedgerTransaction: (id: string, tx: Partial<LedgerTransaction>) => void;
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
  resetDatabase: () => Promise<void>;
}

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
  const [db, setDb] = useState<AppDatabase>({
    tasks: [],
    inventory: [],
    ledger: [],
    fixedAssets: [],
    partners: [],
    payroll: [],
    bankStatements: [],
  });

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

  useEffect(() => {
    localStorage.setItem('tunzua_company_settings', JSON.stringify(companySettings));
  }, [companySettings]);

  useEffect(() => {
    localStorage.setItem('tunzua_recurring_bills', JSON.stringify(recurringBills));
  }, [recurringBills]);

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
      user: "jammangguite@gmail.com"
    };
    setAuditLogs(prev => {
      const next = [newEntry, ...prev];
      localStorage.setItem('syncledger_audit_logs', JSON.stringify(next));
      return next;
    });
  };

  const clearAuditLogs = () => {
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
        setDb(JSON.parse(cachedDb));
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

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync to database caches whenever db state updates
  useEffect(() => {
    if (db.tasks.length > 0 || db.inventory.length > 0 || db.ledger.length > 0) {
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
        setDb(data.db);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(db),
      });
      const data = await response.json();
      const end = performance.now();

      if (data.success && data.db) {
        setDb(data.db);
        setSyncStatus('synced');
        const finalLatency = parseFloat((end - start).toFixed(2));
        setLatencyMs(finalLatency);
        
        // Log synchronization event
        addAuditLog({
          action: 'sync_completed',
          category: 'synchronization',
          description: `Telemetry records synchronized with external server`,
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

  const resetDatabase = async () => {
    // 1. Instantly perform client-side hard-reset to avoid sync / race conditions
    const cleanGenesis = JSON.parse(JSON.stringify(INITIAL_GENESIS_DB));
    const freshBills = createInitialRecurringBills();
    setDb(cleanGenesis);
    setRecurringBills(freshBills);
    setCompanySettings(DEFAULT_COMPANY_SETTINGS);
    localStorage.setItem('syncledger_db_cache', JSON.stringify(cleanGenesis));
    localStorage.setItem('tunzua_recurring_bills', JSON.stringify(freshBills));
    localStorage.setItem('tunzua_company_settings', JSON.stringify(DEFAULT_COMPANY_SETTINGS));
    
    addAuditLog({
      action: 'database_reset',
      category: 'user_modification',
      description: 'Workspace reset to clean initial ledger data',
      details: { status: 'success' },
    });

    if (isOffline) {
      setSyncStatus('offline');
      return;
    }

    try {
      setSyncStatus('syncing');
      const res = await fetch('/api/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.db) {
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

    const newTx: LedgerTransaction = {
      id: `billpay-${Date.now()}`,
      date: paidOn,
      description: `${target.title} — ${target.vendor}`,
      type: 'other_expense',
      debitAccount: target.expenseAccount,
      creditAccount: target.paymentAccount,
      amount: target.amount,
      reference: `BILL-${target.id.slice(-4).toUpperCase()}`,
      isBankCleared: true,
      createdAt: Date.now(),
    };

    setDb(prev => ({
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

  // JSON Backup Export & Restore
  const exportBackup = (): TunzuaBackupPayload => ({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    companySettings,
    recurringBills,
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
  const addLedgerTransaction = (txInput: Omit<LedgerTransaction, 'createdAt'>) => {
    measureLatency(() => {
      const newTx: LedgerTransaction = {
        ...txInput,
        createdAt: Date.now(),
      };
      setDb(prev => ({
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
  };

  const editLedgerTransaction = (id: string, updatedFields: Partial<LedgerTransaction>) => {
    measureLatency(() => {
      setDb(prev => {
        const original = prev.ledger.find(tx => tx.id === id);
        if (original) {
          addAuditLog({
            action: 'ledger_updated',
            category: 'transaction',
            description: `Updated ledger voucher ref ${original.reference || original.id.slice(-5)}: "${original.description}"`,
            details: { id, original: { amount: original.amount, description: original.description }, updated: updatedFields },
          });
        }
        return {
          ...prev,
          ledger: prev.ledger.map(tx => tx.id === id ? { ...tx, ...updatedFields } : tx),
        };
      });
    });
  };

  const deleteLedgerTransaction = (id: string) => {
    measureLatency(() => {
      setDb(prev => {
        const original = prev.ledger.find(tx => tx.id === id);
        if (original) {
          addAuditLog({
            action: 'ledger_deleted',
            category: 'transaction',
            description: `Removed ledger voucher ref ${original.reference || original.id.slice(-5)}: "${original.description}"`,
            details: original,
          });
        }
        return {
          ...prev,
          ledger: prev.ledger.filter(tx => tx.id !== id),
        };
      });
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
        addRecurringBill,
        updateRecurringBill,
        deleteRecurringBill,
        payRecurringBill,
        addAuditLog,
        clearAuditLogs,
        addTask,
        updateTaskStatus,
        addInventoryItem,
        recordInventoryTransaction,
        addLedgerTransaction,
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
        resetDatabase,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};
