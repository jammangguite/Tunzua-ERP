import { LedgerTransaction, TransactionType } from '../types';

export type LedgerKind = 'purchases' | 'sales' | 'receipts' | 'payments';

export type LedgerFieldKey =
  | 'date'
  | 'description'
  | 'amount'
  | 'reference'
  | 'debitAccount'
  | 'creditAccount'
  | 'type'
  | 'isBankCleared';

export type ColumnMapping = Record<LedgerFieldKey, number | null>;

export interface CsvDefaults {
  debitAccount: string;
  creditAccount: string;
  transactionType: TransactionType;
  isBankCleared: boolean;
}

export interface ParsedCsvData {
  rawRows: string[][];
  delimiter: string;
}

export interface ValidatedImportRow {
  rowIndex: number; // 1-based data row index
  rawValues: string[];
  transaction: Omit<LedgerTransaction, 'createdAt'> | null;
  errors: string[];
}

export interface LedgerFieldMeta {
  key: LedgerFieldKey;
  label: string;
  required: boolean;
  hint: string;
}

export const LEDGER_FIELDS: LedgerFieldMeta[] = [
  {
    key: 'date',
    label: 'Date',
    required: true,
    hint: 'YYYY-MM-DD, MM/DD/YYYY, or DD/MM/YYYY',
  },
  {
    key: 'description',
    label: 'Narration / Description',
    required: true,
    hint: 'Transaction details, memo, or vendor/client name',
  },
  {
    key: 'amount',
    label: 'Amount',
    required: true,
    hint: 'Numeric value greater than 0 (currency symbols stripped)',
  },
  {
    key: 'reference',
    label: 'Reference No.',
    required: false,
    hint: 'Invoice, PO, or voucher reference (auto-generated if blank)',
  },
  {
    key: 'debitAccount',
    label: 'Debit Account (Dr)',
    required: false,
    hint: 'Uses default debit account when unmapped or blank',
  },
  {
    key: 'creditAccount',
    label: 'Credit Account (Cr)',
    required: false,
    hint: 'Uses default credit account when unmapped or blank',
  },
  {
    key: 'isBankCleared',
    label: 'Bank Cleared Status',
    required: false,
    hint: 'Yes/No, Cleared/Pending, True/False, or 1/0',
  },
  {
    key: 'type',
    label: 'Entry Sub-Type',
    required: false,
    hint: 'Optional sub-category for Receipts or Payments',
  },
];

export function getDefaultValuesForKind(kind: LedgerKind): CsvDefaults {
  if (kind === 'purchases') {
    return {
      debitAccount: 'Inventory Asset Account',
      creditAccount: 'Corporate Bank Account',
      transactionType: 'purchase',
      isBankCleared: true,
    };
  }
  if (kind === 'sales') {
    return {
      debitAccount: 'Corporate Bank Account',
      creditAccount: 'Revenue Account',
      transactionType: 'sales',
      isBankCleared: true,
    };
  }
  if (kind === 'receipts') {
    return {
      debitAccount: 'Corporate Bank Account',
      creditAccount: 'Sundry Income Account',
      transactionType: 'other_income',
      isBankCleared: true,
    };
  }
  return {
    debitAccount: 'Operating Expense Account',
    creditAccount: 'Corporate Bank Account',
    transactionType: 'other_expense',
    isBankCleared: true,
  };
}

export function getReferencePrefix(kind: LedgerKind): string {
  switch (kind) {
    case 'purchases':
      return 'PO';
    case 'sales':
      return 'INV';
    case 'receipts':
      return 'REC';
    case 'payments':
      return 'PAY';
  }
}

/**
 * Detects the most probable delimiter (comma, semicolon, or tab) from the first few lines.
 */
function detectDelimiter(text: string): string {
  const sampleLines = text
    .split(/\r\n|\n|\r/)
    .filter(line => line.trim().length > 0)
    .slice(0, 5);

  if (sampleLines.length === 0) return ',';

  const candidates = [',', ';', '\t'];
  let bestDelimiter = ',';
  let bestScore = -1;

  for (const delim of candidates) {
    const counts = sampleLines.map(line => {
      let inQuotes = false;
      let count = 0;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (!inQuotes && ch === delim) {
          count++;
        }
      }
      return count;
    });

    const first = counts[0];
    if (first === 0) continue;
    const consistent = counts.every(c => c === first) ? 2 : 1;
    const score = first * consistent;
    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delim;
    }
  }

  return bestDelimiter;
}

/**
 * RFC 4180 compliant CSV/TSV parser supporting quoted values, escaped quotes, and multiline cells.
 */
export function parseCsvText(rawText: string): ParsedCsvData {
  const text = rawText.replace(/^\uFEFF/, ''); // Strip UTF-8 BOM
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (ch === '\r' || ch === '\n') {
        if (ch === '\r' && text[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        if (currentRow.some(cell => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += ch;
      }
    }
  }

  // Push trailing field/row
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return { rawRows: rows, delimiter };
}

/**
 * Auto-maps CSV column headers to Tunzua ledger fields based on normalized header names.
 */
export function autoMapHeaders(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    date: null,
    description: null,
    amount: null,
    reference: null,
    debitAccount: null,
    creditAccount: null,
    type: null,
    isBankCleared: null,
  };

  const usedIndices = new Set<number>();

  const matchField = (field: LedgerFieldKey, patterns: RegExp[]) => {
    for (const pattern of patterns) {
      const idx = headers.findIndex(
        (h, i) => !usedIndices.has(i) && pattern.test(h.toLowerCase().trim())
      );
      if (idx !== -1) {
        mapping[field] = idx;
        usedIndices.add(idx);
        return;
      }
    }
  };

  matchField('date', [
    /^(tx|txn|transaction|voucher|invoice|bill|entry|posting)?[\s_-]*date$/,
    /^date\b/,
    /\bdate\b/,
  ]);

  matchField('reference', [
    /^(ref|reference|voucher|invoice|inv|po|bill|receipt|cheque|check|chq)[\s_.-]*(no|num|number|id|#)?$/,
    /\b(reference|ref\s*no|invoice\s*no|voucher\s*no)\b/,
  ]);

  matchField('debitAccount', [
    /^(debit|dr)[\s_-]*(account|acct|ledger|head)?$/,
    /\bdebit\b/,
    /\(dr\)/,
  ]);

  matchField('creditAccount', [
    /^(credit|cr)[\s_-]*(account|acct|ledger|head)?$/,
    /\bcredit\b/,
    /\(cr\)/,
  ]);

  matchField('amount', [
    /^(amount|total|net\s*amount|gross\s*amount|grand\s*total|value|sum|price)$/,
    /\b(amount|total|value)\b/,
  ]);

  matchField('description', [
    /^(narration|description|particulars|memo|details|notes|item|summary|party|vendor|customer|client)$/,
    /\b(narration|description|particulars|memo|details)\b/,
  ]);

  matchField('isBankCleared', [
    /^(status|cleared|bank[\s_-]*cleared|reconciled|bank[\s_-]*status|state)$/,
    /\b(cleared|reconciled|status)\b/,
  ]);

  matchField('type', [
    /^(type|category|sub[\s_-]*type|voucher[\s_-]*type|tx[\s_-]*type)$/,
    /\b(type|category)\b/,
  ]);

  return mapping;
}

/**
 * Normalizes a variety of date strings into YYYY-MM-DD, returning null if invalid.
 */
export function normalizeDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (isValidCalendarDate(year, month, day)) {
      return formatYmd(year, month, day);
    }
    return null;
  }

  // DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, MM-DD-YYYY
  const slashMatch = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (slashMatch) {
    const p1 = Number(slashMatch[1]);
    const p2 = Number(slashMatch[2]);
    let year = Number(slashMatch[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;

    // Disambiguate DD/MM vs MM/DD: if p1 > 12 it must be DD/MM; if p2 > 12 it must be MM/DD; default MM/DD
    let month: number;
    let day: number;
    if (p1 > 12 && p2 <= 12) {
      day = p1;
      month = p2;
    } else if (p2 > 12 && p1 <= 12) {
      month = p1;
      day = p2;
    } else {
      month = p1;
      day = p2;
    }
    if (isValidCalendarDate(year, month, day)) {
      return formatYmd(year, month, day);
    }
    return null;
  }

  // Fallback for textual dates like "12 Jun 2026" or "June 12, 2026"
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = parsed.getMonth() + 1;
    const day = parsed.getDate();
    if (year >= 1900 && year <= 2100 && isValidCalendarDate(year, month, day)) {
      return formatYmd(year, month, day);
    }
  }

  return null;
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

function formatYmd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Parses currency strings like "$1,250.50", "INR 4,500", "1200.00", "(450.00)" into a positive number.
 */
export function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Handle accounting parentheses (120.00) -> 120.00
  const unwrapped =
    trimmed.startsWith('(') && trimmed.endsWith(')') ? trimmed.slice(1, -1) : trimmed;

  // Strip common currency symbols, letters, spaces, and thousands separators
  let cleaned = unwrapped.replace(/[^0-9.,-]/g, '');
  if (!cleaned) return null;

  // If format is European like "1.234,56" (single comma after dots)
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    // Treat single comma with 1-2 trailing decimals as decimal separator if no thousands grouping
    if (parts.length === 2 && parts[1].length <= 2) {
      cleaned = `${parts[0]}.${parts[1]}`;
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }

  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  return Math.round(Math.abs(num) * 100) / 100;
}

function parseBankCleared(raw: string | undefined, fallback: boolean): boolean {
  if (!raw || !raw.trim()) return fallback;
  const val = raw.trim().toLowerCase();
  if (['yes', 'y', 'true', '1', 'cleared', 'reconciled', 'settled', 'paid'].includes(val)) {
    return true;
  }
  if (['no', 'n', 'false', '0', 'pending', 'uncleared', 'unreconciled', 'open'].includes(val)) {
    return false;
  }
  return fallback;
}

function resolveTransactionType(
  raw: string | undefined,
  kind: LedgerKind,
  fallback: TransactionType
): TransactionType {
  if (kind === 'sales') return 'sales';
  if (kind === 'purchases') return 'purchase';

  const val = (raw || '').trim().toLowerCase();
  if (kind === 'receipts') {
    if (val.includes('capital') || val.includes('partner') || val.includes('equity')) {
      return 'capital_contribution';
    }
    if (val.includes('income') || val.includes('sundry') || val.includes('receipt')) {
      return 'other_income';
    }
    return fallback;
  }

  // kind === 'payments'
  if (val.includes('salary') || val.includes('payroll') || val.includes('wage')) {
    return 'salary_payment';
  }
  if (val.includes('tax') || val.includes('gst') || val.includes('vat') || val.includes('tds')) {
    return 'tax_payment';
  }
  if (val.includes('expense') || val.includes('operating') || val.includes('bill')) {
    return 'other_expense';
  }
  return fallback;
}

/**
 * Validates and transforms CSV data rows into LedgerTransaction objects using the active mapping.
 */
export function validateMappedRows(
  dataRows: string[][],
  mapping: ColumnMapping,
  kind: LedgerKind,
  defaults: CsvDefaults,
  existingReferences: string[] = []
): ValidatedImportRow[] {
  const prefix = getReferencePrefix(kind);
  const batchStamp = Date.now();
  const existingRefSet = new Set(
    existingReferences.map(ref => ref.trim().toLowerCase()).filter(Boolean)
  );
  const batchRefSet = new Set<string>();
  let autoCounter = 1;

  const nextUniqueAutoRef = (): string => {
    while (true) {
      const candidate = `${prefix}-IMP-${String(autoCounter).padStart(3, '0')}`;
      autoCounter++;
      const key = candidate.toLowerCase();
      if (!existingRefSet.has(key) && !batchRefSet.has(key)) {
        return candidate;
      }
    }
  };

  return dataRows.map((row, idx) => {
    const errors: string[] = [];

    const readCell = (field: LedgerFieldKey): string => {
      const colIdx = mapping[field];
      if (colIdx === null || colIdx < 0 || colIdx >= row.length) return '';
      return (row[colIdx] ?? '').trim();
    };

    const rawDate = readCell('date');
    const normalizedDate = normalizeDate(rawDate);
    if (!rawDate) {
      errors.push('Missing date');
    } else if (!normalizedDate) {
      errors.push(`Unrecognized date "${rawDate}"`);
    }

    const description = readCell('description');
    if (!description) {
      errors.push('Missing narration');
    }

    const rawAmount = readCell('amount');
    const parsedAmount = parseAmount(rawAmount);
    if (!rawAmount) {
      errors.push('Missing amount');
    } else if (parsedAmount === null || parsedAmount <= 0) {
      errors.push(`Invalid amount "${rawAmount}"`);
    }

    const rawRef = readCell('reference');
    const reference = rawRef || nextUniqueAutoRef();
    const refKey = reference.trim().toLowerCase();
    if (existingRefSet.has(refKey)) {
      errors.push(`Duplicate invoice/reference "${reference}" already exists`);
    } else if (batchRefSet.has(refKey)) {
      errors.push(`Duplicate invoice/reference "${reference}" in CSV`);
    } else if (errors.length === 0) {
      batchRefSet.add(refKey);
    }

    const debitAccount = readCell('debitAccount') || defaults.debitAccount.trim();
    const creditAccount = readCell('creditAccount') || defaults.creditAccount.trim();

    if (!debitAccount) errors.push('Missing debit account');
    if (!creditAccount) errors.push('Missing credit account');

    const isBankCleared = parseBankCleared(readCell('isBankCleared'), defaults.isBankCleared);
    const txType = resolveTransactionType(readCell('type'), kind, defaults.transactionType);

    if (errors.length > 0) {
      return {
        rowIndex: idx + 1,
        rawValues: row,
        transaction: null,
        errors,
      };
    }

    return {
      rowIndex: idx + 1,
      rawValues: row,
      transaction: {
        id: `${kind}-csv-${batchStamp}-${idx}`,
        date: normalizedDate!,
        description,
        type: txType,
        debitAccount,
        creditAccount,
        amount: parsedAmount!,
        reference,
        isBankCleared,
      },
      errors: [],
    };
  });
}

/**
 * Generates a realistic downloadable CSV template for the active ledger kind.
 */
export function buildSampleCsvTemplate(kind: LedgerKind): string {
  const header = 'Date,Reference,Narration,Debit Account,Credit Account,Amount,Status,Category';

  if (kind === 'sales') {
    return [
      header,
      '2026-07-02,INV-2026-101,Consulting Retainer - Horizon Labs,Corporate Bank Account,Revenue Account,2450.00,Cleared,Sales',
      '2026-07-05,INV-2026-102,Hardware Supply - Meridian Co.,Corporate Bank Account,Revenue Account,1890.50,Pending,Sales',
      '2026-07-09,INV-2026-103,"Annual Support Renewal, Tier 2",Corporate Bank Account,Revenue Account,3200.00,Cleared,Sales',
    ].join('\n');
  }

  if (kind === 'purchases') {
    return [
      header,
      '2026-07-03,PO-2026-201,Office Workstation Monitors,Inventory Asset Account,Corporate Bank Account,1420.00,Cleared,Purchase',
      '2026-07-06,PO-2026-202,Packaging & Fulfillment Stock,Inventory Asset Account,Corporate Bank Account,640.25,Cleared,Purchase',
      '2026-07-11,PO-2026-203,"Mechanical Keyboards, Batch B",Inventory Asset Account,Corporate Bank Account,980.00,Pending,Purchase',
    ].join('\n');
  }

  if (kind === 'receipts') {
    return [
      header,
      '2026-07-01,REC-2026-301,Bank Interest Credited Q2,Corporate Bank Account,Sundry Income Account,185.40,Cleared,Sundry Income',
      '2026-07-08,REC-2026-302,Partner Working Capital Infusion,Corporate Bank Account,Capital Fund - Partners,10000.00,Cleared,Capital Contribution',
      '2026-07-12,REC-2026-303,Supplier Volume Rebate,Corporate Bank Account,Sundry Income Account,420.00,Pending,Sundry Income',
    ].join('\n');
  }

  return [
    header,
    '2026-07-01,PAY-2026-401,Monthly Cloud Infrastructure,Software & Hosting Expense,Corporate Bank Account,340.00,Cleared,Operating Expense',
    '2026-07-04,PAY-2026-402,Quarterly GST Remittance,GST Tax Expense Account,Corporate Bank Account,1120.00,Cleared,Tax Payment',
    '2026-07-10,PAY-2026-403,Contractor Payroll Settlement,Payroll Expense Account,Corporate Bank Account,2600.00,Pending,Salary Payment',
  ].join('\n');
}
