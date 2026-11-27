/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'completed';
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
  updatedAt: number;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  lowStockThreshold: number;
  salesPrice: number;
  purchasePrice: number;
  category: string;
}

export type TransactionType =
  | 'sales'
  | 'purchase'
  | 'capital_contribution'
  | 'capital_withdrawal'
  | 'profit_distribution'
  | 'salary_payment'
  | 'tax_payment'
  | 'other_expense'
  | 'other_income';

export interface LedgerTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  type: TransactionType;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  reference?: string;
  isBankCleared: boolean;
  createdAt: number;
  attachmentUrl?: string; // Stores receipt capture or file attachment data URL/base64 blob
  taxableAmount?: number;
  gstRate?: number;
  gstAmount?: number;
  gstMode?: GstTaxMode;
  gstSupplyType?: 'intra' | 'inter';
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
}

export interface FixedAsset {
  id: string;
  name: string;
  purchaseDate: string; // YYYY-MM-DD
  cost: number;
  qty?: number;
  purchasePrice?: number;
  depreciationRate?: number; // Depreciation %
  depreciationMethod: 'straight_line' | 'double_declining' | 'wdv';
  usefulLifeYears: number;
  salvageValue: number;
  currentBookValue: number;
  accumulatedDepreciation: number;
  disposalDate?: string;
  disposalValue?: number;
  disposalLog?: string;
  status: 'active' | 'disposed';
}

export interface PartnerCapital {
  id: string;
  partnerName: string;
  contributions: number;
  withdrawals: number;
  profitSharePercentage: number;
  balance: number;
}

export interface EmployeeSalary {
  id: string;
  name: string;
  role: string;
  monthlyBase: number;
  providentFund: number; // statutory deduction (e.g. 12%)
  incomeTaxDeduction: number; // TDS (e.g. 10%)
  allowances: number;
  disbursedAt?: string; // YYYY-MM
  status: 'pending' | 'disbursed';
}

export interface BankStatementItem {
  id: string;
  date: string;
  description: string;
  amount: number; // positive is deposit, negative is withdrawal
  referenceNumber: string;
  reconciledTransactionId?: string; // Links to LedgerTransaction
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: string;
  category: 'transaction' | 'user_modification' | 'synchronization' | 'security';
  description: string;
  details: string; // JSON payload details
  user: string;
}

export interface CashForecastingMetrics {
  month: string;
  projectedRevenue: number;
  projectedExpense: number;
  projectedCashBalance: number;
  actualCashBalance: number;
}

export interface SyncPayload {
  tasks: Task[];
  inventory: InventoryItem[];
  ledger: LedgerTransaction[];
  fixedAssets: FixedAsset[];
  partners: PartnerCapital[];
  payroll: EmployeeSalary[];
  bankStatements: BankStatementItem[];
  lastSyncedTimestamp: number;
}

export interface AppDatabase {
  tasks: Task[];
  inventory: InventoryItem[];
  ledger: LedgerTransaction[];
  fixedAssets: FixedAsset[];
  partners: PartnerCapital[];
  payroll: EmployeeSalary[];
  bankStatements: BankStatementItem[];
}

export interface CompanySettings {
  name: string;
  subtitle: string;
  currencySymbol: string;
  fiscalYearStart: string;
}

export type RecurringBillCadence = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringBill {
  id: string;
  title: string;
  vendor: string;
  amount: number;
  expenseAccount: string;
  paymentAccount: string;
  cadence: RecurringBillCadence;
  nextDueDate: string; // YYYY-MM-DD
  reminderDaysBefore: number;
  status: 'active' | 'paused';
  lastPaidDate?: string;
  notes?: string;
}

export type GstTaxMode = 'excluding' | 'including';
export type DiscountType = 'percentage' | 'flat';
export type MasterRecordKind = 'item' | 'ledger';
export type OpeningBalanceType = 'dr' | 'cr';

export interface LedgerItemMaster {
  id: string;
  kind: MasterRecordKind;
  name: string;
  gstRate: number; // e.g. 0, 5, 12, 18, 28
  gstMode: GstTaxMode; // 'excluding' | 'including'
  discount: number;
  discountType: DiscountType;
  defaultPrice?: number;
  openingBalance?: number;
  openingBalanceType?: OpeningBalanceType;
  hsnOrCode?: string;
  accountGroup?: string;
  createdAt: number;
}

export type UserRole = 'admin' | 'user';

export interface WorkspaceUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  addedAt: number;
}

export interface RolePermissions {
  canCreate: boolean;
  canEdit: boolean;
  canPrint: boolean;
  canExport: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
}

export interface TunzuaBackupPayload {
  version: string;
  exportedAt: string;
  companySettings: CompanySettings;
  recurringBills: RecurringBill[];
  ledgerItems?: LedgerItemMaster[];
  workspaceUsers?: WorkspaceUser[];
  db: AppDatabase;
}



