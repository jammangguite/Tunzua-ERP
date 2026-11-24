/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { LedgerTransaction, FixedAsset, PartnerCapital } from '../types';
import {
  BookOpen,
  DollarSign,
  PlusCircle,
  Play,
  RotateCcw,
  TrendingDown,
  Building,
  UserPlus,
  ArrowRightLeft,
  FileText,
  Calendar,
  Trash2,
  Edit,
  X,
  Check,
  AlertCircle,
  Filter,
  Plus,
  Paperclip,
  Percent,
  ArrowRight,
} from 'lucide-react';
import { motion } from 'motion/react';
import { GoogleSheetsExport } from './GoogleSheetsExport';
import { BatchReceiptImporter } from './BatchReceiptImporter';

/// ==========================================
// 1. LEDGER MODULE & TRIAL BALANCE & P&L (UPGRADED COCKPIT)
// ==========================================

export interface CustomLedgerAccount {
  accNo: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  initialBalance: number;
}

export interface SundryParty {
  partyNo: string;
  name: string;
  groupType: 'debtor' | 'creditor';
  contactPerson: string;
  phone: string;
  email: string;
  gstIn: string;
}

const DEFAULT_LEDGER_ACCOUNTS: CustomLedgerAccount[] = [
  { accNo: 'LED-1001', name: 'Corporate Bank Account', type: 'Asset', initialBalance: 100000 },
  { accNo: 'LED-1002', name: 'Corporate Cash Account', type: 'Asset', initialBalance: 12000 },
  { accNo: 'LED-1003', name: 'Sales Revenue Account', type: 'Revenue', initialBalance: 0 },
  { accNo: 'LED-1004', name: 'Purchase COGS Account', type: 'Expense', initialBalance: 0 },
  { accNo: 'LED-1005', name: 'Office Rent Expense', type: 'Expense', initialBalance: 0 },
  { accNo: 'LED-1006', name: 'Statutory Payroll Expense', type: 'Expense', initialBalance: 0 },
  { accNo: 'LED-1007', name: 'Accumulated Depreciation Account', type: 'Liability', initialBalance: 0 },
  { accNo: 'LED-1008', name: 'Capital Fund - Partner Alice', type: 'Equity', initialBalance: 50000 },
  { accNo: 'LED-1009', name: 'Capital Fund - Partner Bob', type: 'Equity', initialBalance: 50000 },
];

const DEFAULT_SUNDRY_PARTIES: SundryParty[] = [
  { partyNo: 'DEB-5001', name: 'Acme Enterprise Corp', groupType: 'debtor', contactPerson: 'John Doe', phone: '+1-555-0199', email: 'billing@acme.com', gstIn: 'GST27ACME0199' },
  { partyNo: 'DEB-5002', name: 'Global Retail Distributors', groupType: 'debtor', contactPerson: 'Jane Smith', phone: '+1-555-0210', email: 'finance@globaldist.com', gstIn: 'GST27GLOB0210' },
  { partyNo: 'CRE-6001', name: 'Matrix IT Wholesale LTD', groupType: 'creditor', contactPerson: 'Robert Lee', phone: '+1-555-0354', email: 'accounts@matrixwholesale.com', gstIn: 'GST27MATR0354' },
  { partyNo: 'CRE-6002', name: 'Elite Office Interiors', groupType: 'creditor', contactPerson: 'Sarah Connor', phone: '+1-555-0489', email: 'orders@eliteinteriors.com', gstIn: 'GST27ELIT0489' },
];

export const LedgerModule: React.FC = () => {
  const store = useStore();
  const [activeTab, setActiveTab] = useState<'transactions' | 'vouchers_desk' | 'ledger_accounts' | 'sundry_registry'>('vouchers_desk');

  // Registries state loaded from localStorage with default seed data
  const [ledgerAccounts, setLedgerAccounts] = useState<CustomLedgerAccount[]>(() => {
    const saved = localStorage.getItem('syncledger_custom_accounts');
    try {
      return saved ? JSON.parse(saved) : DEFAULT_LEDGER_ACCOUNTS;
    } catch {
      return DEFAULT_LEDGER_ACCOUNTS;
    }
  });

  const [sundryParties, setSundryParties] = useState<SundryParty[]>(() => {
    const saved = localStorage.getItem('syncledger_custom_sundries');
    try {
      return saved ? JSON.parse(saved) : DEFAULT_SUNDRY_PARTIES;
    } catch {
      return DEFAULT_SUNDRY_PARTIES;
    }
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('syncledger_custom_accounts', JSON.stringify(ledgerAccounts));
  }, [ledgerAccounts]);

  useEffect(() => {
    localStorage.setItem('syncledger_custom_sundries', JSON.stringify(sundryParties));
  }, [sundryParties]);

  // VOUCHER FORM STATES
  const [showVoucherModal, setShowVoucherModal] = useState<'add' | 'edit' | null>(null);
  const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null);
  const [vType, setVType] = useState<'sales' | 'purchase' | 'receipt' | 'payment' | 'contra' | 'journal'>('sales');
  const [vDate, setVDate] = useState(new Date().toISOString().split('T')[0]);
  const [vReference, setVReference] = useState('');
  const [vFromAccount, setVFromAccount] = useState('');
  const [vToAccount, setVToAccount] = useState('');
  const [vAmount, setVAmount] = useState('');
  const [vDescription, setVDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [disagreeCheckAccepted, setDisagreeCheckAccepted] = useState(false);

  // LEDGER DIRECTORY FORM STATES
  const [showLedgerModal, setShowLedgerModal] = useState<'add' | 'edit' | null>(null);
  const [editingLedgerId, setEditingLedgerId] = useState<string | null>(null);
  const [ledgerName, setLedgerName] = useState('');
  const [ledgerType, setLedgerType] = useState<CustomLedgerAccount['type']>('Asset');
  const [ledgerBalance, setLedgerBalance] = useState('0');
  const [ledgerFormError, setLedgerFormError] = useState('');

  // SUNDRIES REGISTRY FORM STATES
  const [showSundryModal, setShowSundryModal] = useState<'add' | 'edit' | null>(null);
  const [editingSundryId, setEditingSundryId] = useState<string | null>(null);
  const [sundryName, setSundryName] = useState('');
  const [sundryGroup, setSundryGroup] = useState<'debtor' | 'creditor'>('debtor');
  const [sundryContact, setSundryContact] = useState('');
  const [sundryPhone, setSundryPhone] = useState('');
  const [sundryEmail, setSundryEmail] = useState('');
  const [sundryGstIn, setSundryGstIn] = useState('');
  const [sundryFormError, setSundryFormError] = useState('');
  const [sundryIsGstRegistered, setSundryIsGstRegistered] = useState(false);

  // States to open interactive destination views
  const [selectedVoucher, setSelectedVoucher] = useState<LedgerTransaction | null>(null);
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<CustomLedgerAccount | null>(null);
  const [selectedSundryParty, setSelectedSundryParty] = useState<SundryParty | null>(null);

  // Filters
  const [voucherFilter, setVoucherFilter] = useState<'all' | 'sales' | 'purchase' | 'other_expense'>('all');
  const [sundriesFilter, setSundriesFilter] = useState<'all' | 'debtor' | 'creditor'>('all');

  // AUTOMATE NUMBERING OFFSETS
  const autoAssignVoucherNumber = (type: 'sales' | 'purchase' | 'receipt' | 'payment' | 'contra' | 'journal') => {
    let prefix = 'JRN';
    let offset = 6000;
    if (type === 'sales') { prefix = 'SAL'; offset = 1000; }
    else if (type === 'purchase') { prefix = 'PUR'; offset = 2000; }
    else if (type === 'receipt') { prefix = 'REC'; offset = 3000; }
    else if (type === 'payment') { prefix = 'PAY'; offset = 4000; }
    else if (type === 'contra') { prefix = 'CON'; offset = 5000; }

    const existingMatching = store.db.ledger.filter(tx => 
      tx.reference?.toUpperCase().startsWith(prefix)
    );

    let nextNum = offset + existingMatching.length + 1;
    // ensure complete uniqueness
    while (store.db.ledger.some(t => t.reference === `${prefix}-${nextNum}`)) {
      nextNum++;
    }
    return `${prefix}-${nextNum}`;
  };

  const handleSelectVoucherType = (typeSelected: 'sales' | 'purchase' | 'receipt' | 'payment' | 'contra' | 'journal') => {
    setVType(typeSelected);
    const code = autoAssignVoucherNumber(typeSelected);
    setVReference(code);
    setFormError('');

    // Pre-populate logical debit/credit accounts from directories to avoid blank entries
    if (typeSelected === 'sales') {
      const activeDebtor = sundryParties.find(p => p.groupType === 'debtor');
      setVFromAccount(activeDebtor ? activeDebtor.name : 'Acme Enterprise Corp');
      setVToAccount('Sales Revenue Account');
    } else if (typeSelected === 'purchase') {
      const activeCreditor = sundryParties.find(p => p.groupType === 'creditor');
      setVFromAccount('Purchase COGS Account');
      setVToAccount(activeCreditor ? activeCreditor.name : 'Matrix IT Wholesale LTD');
    } else if (typeSelected === 'receipt') {
      setVFromAccount('Corporate Bank Account');
      const activeDebtor = sundryParties.find(p => p.groupType === 'debtor');
      setVToAccount(activeDebtor ? activeDebtor.name : 'Acme Enterprise Corp');
    } else if (typeSelected === 'payment') {
      const activeCreditor = sundryParties.find(p => p.groupType === 'creditor');
      setVFromAccount(activeCreditor ? activeCreditor.name : 'Matrix IT Wholesale LTD');
      setVToAccount('Corporate Bank Account');
    } else if (typeSelected === 'contra') {
      setVFromAccount('Corporate Bank Account');
      setVToAccount('Corporate Cash Account');
    } else {
      setVFromAccount('Statutory Payroll Expense');
      setVToAccount('Corporate Bank Account');
    }
  };

  // Launch fresh creation modes
  const handleOpenNewVoucher = () => {
    setEditingVoucherId(null);
    setVDescription('');
    setVAmount('');
    handleSelectVoucherType('sales');
    setShowVoucherModal('add');
    setFormError('');
    setDisagreeCheckAccepted(false);
  };

  const handleOpenEditVoucher = (tx: LedgerTransaction) => {
    setEditingVoucherId(tx.id);
    setVDate(tx.date);
    setVReference(tx.reference || '');
    setVFromAccount(tx.debitAccount);
    setVToAccount(tx.creditAccount);
    setVAmount(tx.amount.toString());
    setDisagreeCheckAccepted(false);
    
    // clean bracket tags
    let rawDesc = tx.description;
    if (rawDesc.startsWith('[CANCELLED] ')) rawDesc = rawDesc.replace('[CANCELLED] ', '');
    setVDescription(rawDesc);

    // detect type from accounts or reference prefix
    let detectedType: 'sales' | 'purchase' | 'receipt' | 'payment' | 'contra' | 'journal' = 'journal';
    const ref = (tx.reference || '').toUpperCase();
    if (ref.startsWith('SAL') || tx.type === 'sales') detectedType = 'sales';
    else if (ref.startsWith('PUR') || tx.type === 'purchase') detectedType = 'purchase';
    else if (ref.startsWith('REC')) detectedType = 'receipt';
    else if (ref.startsWith('PAY')) detectedType = 'payment';
    else if (ref.startsWith('CON')) detectedType = 'contra';

    setVType(detectedType);
    setShowVoucherModal('edit');
    setFormError('');
  };

  const getSecurityRiskCheck = () => {
    const flags: string[] = [];
    const parsedAmt = parseFloat(vAmount) || 0;
    
    // 1. High exposure threshold check
    if (parsedAmt > 10000) {
      flags.push(`High Exposure Limit: Transaction value exceeds board threshold of $10,000.00.`);
    }

    // 2. Round figure auditing flag
    if (parsedAmt > 0 && parsedAmt % 1000 === 0) {
      flags.push(`Round Multiplier Alert: Even thousand increments ($${parsedAmt.toLocaleString()}) possess higher risk of journal guessing.`);
    }

    // 3. Normal balance violations
    const lowerFrom = vFromAccount.toLowerCase();
    const lowerTo = vToAccount.toLowerCase();
    if (lowerFrom.includes('revenue') && (lowerTo.includes('expense') || lowerTo.includes('cogs'))) {
      flags.push(`Account Combination Parity Alert: Direct posting between Revenue and Expenses is highly abnormal.`);
    }

    // 4. Inadequate narration detail audit
    if (vDescription.trim().length > 0 && vDescription.trim().length < 12) {
      flags.push(`Narrative Alert: Explanation description is too brief (< 12 chars). Audit trail integrity weak.`);
    }

    // 5. Duplicate pattern matching
    const isDuplicateTx = store.db.ledger.some(tx => 
      tx.amount === parsedAmt && 
      tx.debitAccount === vFromAccount && 
      tx.creditAccount === vToAccount &&
      tx.id !== editingVoucherId
    );
    if (isDuplicateTx) {
      flags.push(`Duplicate Sequence Risk: An identical financial transaction value and accounting route already exists in the ledger.`);
    }

    // 6. GST compliance check for registered sundry debtors/creditors
    const gstRegParty = sundryParties.find(p => p.name === vFromAccount || p.name === vToAccount);
    if (gstRegParty && gstRegParty.gstIn && gstRegParty.gstIn !== 'N/A' && (vType === 'sales' || vType === 'purchase')) {
      const hasGstComplianceTag = vDescription.includes('[GST Rule Compliant:');
      if (!hasGstComplianceTag) {
        flags.push(`GST Regulation Alert: Sundry Party "${gstRegParty.name}" is GST Registered (GSTIN: ${gstRegParty.gstIn}). GST rules require mapping CGST + SGST or IGST. Click the compliance 'Apply' buttons below to split taxes.`);
      }
    }

    let riskRating: 'safe' | 'medium' | 'high' = 'safe';
    if (flags.length >= 3 || parsedAmt > 25000) {
      riskRating = 'high';
    } else if (flags.length > 0) {
      riskRating = 'medium';
    }

    return { flags, riskRating };
  };

  const handleSaveVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!vDescription.trim()) {
      setFormError('Narration desc is required.');
      return;
    }
    const amt = parseFloat(vAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Please input a valid amount greater than zero.');
      return;
    }

    if (!vFromAccount || !vToAccount || vFromAccount === vToAccount) {
      setFormError('Debit and Credit accounts must be distinct validation accounts.');
      return;
    }

    // Do not allow same name/reference entry
    if (vReference.trim()) {
      const isDuplicate = store.db.ledger.some(t => 
        t.reference?.trim().toLowerCase() === vReference.trim().toLowerCase() && 
        t.id !== editingVoucherId
      );
      if (isDuplicate) {
        setFormError(`Sequence Error: A voucher with reference "${vReference.trim()}" already exists. Distinct numbers must be assigned.`);
        return;
      }
    }

    // Validation, Security risk, disagree check override
    const { flags } = getSecurityRiskCheck();
    if (flags.length > 0 && !disagreeCheckAccepted) {
      setFormError('Security Attestation Required: One or more validation and security risk alerts were flagged. Please review and check the override acceptance box below.');
      return;
    }

    // Double entry translation
    const prepared: Omit<LedgerTransaction, 'createdAt'> = {
      id: editingVoucherId || `tr-erp-${Date.now()}`,
      date: vDate,
      description: vDescription.trim(),
      type: (vType === 'sales' || vType === 'purchase') ? vType : 'other_expense',
      debitAccount: vFromAccount,
      creditAccount: vToAccount,
      amount: amt,
      reference: vReference.trim() || undefined,
      isBankCleared: vType === 'contra' ? true : false,
    };

    if (showVoucherModal === 'add') {
      store.addLedgerTransaction(prepared);
    } else {
      store.editLedgerTransaction(editingVoucherId!, prepared);
    }

    // Reset
    setShowVoucherModal(null);
    setEditingVoucherId(null);
    setVDescription('');
    setVAmount('');
    store.triggerSync();
  };

  const handleVoidVoucher = (id: string) => {
    // Audit-compliant cancellation (cancel/void)
    const tx = store.db.ledger.find(t => t.id === id);
    if (!tx) return;

    const updatedDesc = tx.description.includes('[CANCELLED]') 
      ? tx.description 
      : `[CANCELLED] ${tx.description}`;

    store.editLedgerTransaction(id, {
      amount: 0,
      description: updatedDesc,
      isBankCleared: false
    });
    store.triggerSync();
  };

  const handleDeleteVoucher = (id: string) => {
    store.deleteLedgerTransaction(id);
    store.triggerSync();
  };

  // ------------------------------------
  // LEDGER DIRECTORY CRUD HELPERS
  // ------------------------------------
  const handleOpenAddLedger = () => {
    setEditingLedgerId(null);
    setLedgerName('');
    setLedgerType('Asset');
    setLedgerBalance('0');
    setLedgerFormError('');
    setShowLedgerModal('add');
  };

  const handleOpenEditLedger = (acc: CustomLedgerAccount) => {
    setEditingLedgerId(acc.accNo);
    setLedgerName(acc.name);
    setLedgerType(acc.type);
    setLedgerBalance(acc.initialBalance.toString());
    setLedgerFormError('');
    setShowLedgerModal('edit');
  };

  const handleSaveLedgerAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setLedgerFormError('');

    if (!ledgerName.trim()) {
      setLedgerFormError('Account Ledger Name is required.');
      return;
    }

    // do not allow same name entry (case insensitive)
    const isDuplicate = ledgerAccounts.some(acc => 
      acc.name.trim().toLowerCase() === ledgerName.trim().toLowerCase() && 
      acc.accNo !== editingLedgerId
    );
    if (isDuplicate) {
      setLedgerFormError(`A ledger account named "${ledgerName.trim()}" already exists! Same name accounts are strictly prohibited.`);
      return;
    }

    if (showLedgerModal === 'add') {
      // Assign unique number sequence
      let nextIndex = 1010;
      if (ledgerAccounts.length > 0) {
        const nums = ledgerAccounts
          .map(a => parseInt(a.accNo.replace('LED-', ''), 10))
          .filter(n => !isNaN(n));
        if (nums.length > 0) {
          nextIndex = Math.max(...nums) + 1;
        }
      }

      const generatedAccNo = `LED-${nextIndex}`;
      const newAcc: CustomLedgerAccount = {
        accNo: generatedAccNo,
        name: ledgerName.trim(),
        type: ledgerType,
        initialBalance: parseFloat(ledgerBalance) || 0,
      };
      setLedgerAccounts(prev => [...prev, newAcc]);
    } else {
      setLedgerAccounts(prev => prev.map(a => 
        a.accNo === editingLedgerId ? {
          ...a,
          name: ledgerName.trim(),
          type: ledgerType,
          initialBalance: parseFloat(ledgerBalance) || 0,
        } : a
      ));
    }

    setShowLedgerModal(null);
    setEditingLedgerId(null);
    setLedgerName('');
    setLedgerFormError('');
  };

  const handleDeleteLedgerAccount = (accNo: string) => {
    setLedgerAccounts(prev => prev.filter(a => a.accNo !== accNo));
  };


  // ------------------------------------
  // SUNDRY DEBTORS & CREDITORS CRUD HELPERS
  // ------------------------------------
  const handleOpenAddSundry = (role: 'debtor' | 'creditor') => {
    setEditingSundryId(null);
    setSundryName('');
    setSundryGroup(role);
    setSundryContact('');
    setSundryEmail('');
    setSundryPhone('');
    setSundryGstIn('');
    setSundryIsGstRegistered(false);
    setSundryFormError('');
    setShowSundryModal('add');
  };

  const handleOpenEditSundry = (party: SundryParty) => {
    setEditingSundryId(party.partyNo);
    setSundryName(party.name);
    setSundryGroup(party.groupType);
    setSundryContact(party.contactPerson);
    setSundryEmail(party.email);
    setSundryPhone(party.phone);
    setSundryGstIn(party.gstIn === 'N/A' ? '' : party.gstIn);
    setSundryIsGstRegistered(!!(party.gstIn && party.gstIn !== 'N/A'));
    setSundryFormError('');
    setShowSundryModal('edit');
  };

  const handleSaveSundryParty = (e: React.FormEvent) => {
    e.preventDefault();
    setSundryFormError('');

    if (!sundryName.trim()) {
      setSundryFormError('Sundry Name is required.');
      return;
    }

    if (sundryIsGstRegistered && !sundryGstIn.trim()) {
      setSundryFormError('Please enter a valid GSTIN since the partner is marked as GST Registered.');
      return;
    }

    // do not allow same name entry (case insensitive)
    const isDuplicate = sundryParties.some(p => 
      p.name.trim().toLowerCase() === sundryName.trim().toLowerCase() && 
      p.partyNo !== editingSundryId
    );
    if (isDuplicate) {
      setSundryFormError(`Registry Error: Participant named "${sundryName.trim()}" already exists! Same name vendors/clients are prohibited.`);
      return;
    }

    const calculatedGstIn = sundryIsGstRegistered ? (sundryGstIn.trim().toUpperCase() || 'N/A') : 'N/A';

    if (showSundryModal === 'add') {
      const codePrefix = sundryGroup === 'debtor' ? 'DEB' : 'CRE';
      const defaultStart = sundryGroup === 'debtor' ? 5003 : 6003;
      const matchedList = sundryParties.filter(p => p.groupType === sundryGroup);

      let nextIndex = defaultStart;
      if (matchedList.length > 0) {
        const nums = matchedList
          .map(p => {
            const parts = p.partyNo.split('-');
            return parts[1] ? parseInt(parts[1], 10) : null;
          })
          .filter((n): n is number => n !== null && !isNaN(n));
        if (nums.length > 0) {
          nextIndex = Math.max(...nums) + 1;
        }
      }

      const generatedNo = `${codePrefix}-${nextIndex}`;
      const newParty: SundryParty = {
        partyNo: generatedNo,
        name: sundryName.trim(),
        groupType: sundryGroup,
        contactPerson: sundryContact.trim() || 'N/A',
        phone: sundryPhone.trim() || 'N/A',
        email: sundryEmail.trim() || 'N/A',
        gstIn: calculatedGstIn,
      };
      setSundryParties(prev => [...prev, newParty]);
    } else {
      setSundryParties(prev => prev.map(p => 
        p.partyNo === editingSundryId ? {
          ...p,
          name: sundryName.trim(),
          groupType: sundryGroup,
          contactPerson: sundryContact.trim(),
          phone: sundryPhone.trim(),
          email: sundryEmail.trim(),
          gstIn: calculatedGstIn,
        } : p
      ));
    }

    setShowSundryModal(null);
    setEditingSundryId(null);
    setSundryName('');
    setSundryFormError('');
  };

  const handleDeleteSundryParty = (partyNo: string) => {
    setSundryParties(prev => prev.filter(p => p.partyNo !== partyNo));
  };


  // ------------------------------------
  // EXTENDED REPORTS CALCULATIONS
  // ------------------------------------
  const compileTrialBalance = () => {
    const debits: { [account: string]: number } = {};
    const credits: { [account: string]: number } = {};

    // Initial balances count
    ledgerAccounts.forEach(acc => {
      if (acc.initialBalance > 0) {
        const balanceNormal = acc.type === 'Asset' || acc.type === 'Expense';
        if (balanceNormal) {
          debits[acc.name] = (debits[acc.name] || 0) + acc.initialBalance;
        } else {
          credits[acc.name] = (credits[acc.name] || 0) + acc.initialBalance;
        }
      }
    });

    // Operations flow
    store.db.ledger.forEach(tx => {
      debits[tx.debitAccount] = (debits[tx.debitAccount] || 0) + tx.amount;
      credits[tx.creditAccount] = (credits[tx.creditAccount] || 0) + tx.amount;
    });

    // Formulate final Trial columns
    const allAccounts = Array.from(new Set([
      ...Object.keys(debits), 
      ...Object.keys(credits),
      ...ledgerAccounts.map(a => a.name)
    ]));

    return allAccounts.map(accName => {
      const d = debits[accName] || 0;
      const c = credits[accName] || 0;
      let dCol = 0;
      let cCol = 0;

      // Classify normal asset / expense debit offsets
      const matchingDefinedAcc = ledgerAccounts.find(a => a.name === accName);
      const isDebitNormal = matchingDefinedAcc 
        ? (matchingDefinedAcc.type === 'Asset' || matchingDefinedAcc.type === 'Expense')
        : (accName.toLowerCase().includes('bank') ||
           accName.toLowerCase().includes('cash') ||
           accName.toLowerCase().includes('inventory') ||
           accName.toLowerCase().includes('receivable') ||
           accName.toLowerCase().includes('equipment') ||
           accName.toLowerCase().includes('expense') ||
           accName.toLowerCase().includes('cogs'));

      if (isDebitNormal) {
        const net = d - c;
        if (net >= 0) dCol = net;
        else cCol = Math.abs(net);
      } else {
        const net = c - d;
        if (net >= 0) cCol = net;
        else dCol = Math.abs(net);
      }

      return { account: accName, debit: dCol, credit: cCol };
    }).filter(row => row.debit !== 0 || row.credit !== 0);
  };

  const trialBalanceRows = compileTrialBalance();
  const totalDebits = trialBalanceRows.reduce((sum, r) => sum + r.debit, 0);
  const totalCredits = trialBalanceRows.reduce((sum, r) => sum + r.credit, 0);

  const compileIncomeStatement = () => {
    let revenue = 0;
    const expenses: { [category: string]: number } = {};

    store.db.ledger.forEach(tx => {
      const lowerDebit = tx.debitAccount.toLowerCase();
      const lowerCredit = tx.creditAccount.toLowerCase();

      if (lowerCredit.includes('revenue')) {
        revenue += tx.amount;
      }
      if (lowerDebit.includes('expense') || lowerDebit.includes('cogs') || lowerDebit.includes('salary')) {
        expenses[tx.debitAccount] = (expenses[tx.debitAccount] || 0) + tx.amount;
      }
    });

    const totalExpense = Object.values(expenses).reduce((sum, val) => sum + val, 0);
    const netProfit = revenue - totalExpense;

    return { revenue, expenses, totalExpense, netProfit };
  };

  const pnl = compileIncomeStatement();

  // Filter logs list
  const filteredLedgerLogs = store.db.ledger.filter(tx => {
    if (voucherFilter === 'all') return true;
    if (voucherFilter === 'sales') return tx.type === 'sales' || (tx.reference || '').toUpperCase().startsWith('SAL');
    if (voucherFilter === 'purchase') return tx.type === 'purchase' || (tx.reference || '').toUpperCase().startsWith('PUR');
    if (voucherFilter === 'other_expense') {
      const ref = (tx.reference || '').toUpperCase();
      return !ref.startsWith('SAL') && !ref.startsWith('PUR');
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 2. TAB CONTROLS DESK */}
      <div className="flex flex-wrap gap-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-900 self-start">
        <button
          onClick={() => setActiveTab('vouchers_desk')}
          className={`px-3.5 py-2 text-xs rounded-lg transition-all font-medium ${
            activeTab === 'vouchers_desk' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Vouchers Desk
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-3.5 py-2 text-xs rounded-lg transition-all font-medium ${
            activeTab === 'transactions' ? 'bg-zinc-805 bg-zinc-800 text-zinc-100 shadow-md' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          📓 General Ledger Logs
        </button>
        <button
          onClick={() => setActiveTab('ledger_accounts')}
          className={`px-3.5 py-2 text-xs rounded-lg transition-all font-medium ${
            activeTab === 'ledger_accounts' ? 'bg-zinc-800 text-zinc-100 shadow-md' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          📁 Ledger Accounts Directory
        </button>
        <button
          onClick={() => setActiveTab('sundry_registry')}
          className={`px-3.5 py-2 text-xs rounded-lg transition-all font-medium ${
            activeTab === 'sundry_registry' ? 'bg-zinc-800 text-zinc-100 shadow-md' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          👥 Sundry Debtors & Creditors
        </button>
      </div>

      {/* ==================== A. ERP VOUCHERS DESK ==================== */}
      {activeTab === 'vouchers_desk' && (
        <div className="bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-lg space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-zinc-100 uppercase tracking-wide">Enterprise Voucher Posting Room</h3>
              <p className="text-xs text-zinc-400">Post or manage double-entry accounting transactions for all business modules.</p>
            </div>
            <button
              onClick={() => handleOpenNewVoucher()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-xl font-bold transition-all flex items-center gap-2 shadow-md shadow-blue-900/10"
            >
              <PlusCircle className="w-4 h-4" />
              New Transaction Vouchers
            </button>
          </div>
          
          {/* Batch Receipt Bulk Import Section */}
          <div className="py-2">
            <BatchReceiptImporter />
          </div>

          <div className="pt-4 space-y-4">
            <h4 className="text-xs font-bold text-zinc-450 tracking-wider font-mono">RECENTS VOUCHERS JOURNAL</h4>
            <div className="overflow-x-auto rounded-xl border border-zinc-850">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-900 border-b border-zinc-850 text-zinc-350">
                    <th className="p-3">Vouch #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Narrations (Description)</th>
                    <th className="p-3">Debit (Account From)</th>
                    <th className="p-3">Credit (Account To)</th>
                    <th className="p-3 text-right">Debit Cash Value</th>
                    <th className="p-3 text-center">Operation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {store.db.ledger.slice(0, 10).map(tx => {
                    const isCancelled = tx.description.includes('[CANCELLED]') || tx.amount === 0;
                    return (
                      <tr 
                        key={tx.id} 
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button')) return;
                          setSelectedVoucher(tx);
                        }}
                        className={`hover:bg-zinc-800/40 cursor-pointer transition-colors ${isCancelled ? 'opacity-50 line-through bg-zinc-950/10' : ''}`}
                        title="Click to view destination accounts & voucher detail slip"
                      >
                        <td className="p-3 font-mono font-bold text-blue-400">{tx.reference || 'N/A'}</td>
                        <td className="p-3 font-mono text-zinc-400 whitespace-nowrap">{tx.date}</td>
                        <td className="p-3 font-medium text-zinc-250 italic">"{tx.description}"</td>
                        <td className="p-3 text-zinc-300 font-mono text-[11px]">{tx.debitAccount}</td>
                        <td className="p-3 text-zinc-300 font-mono text-[11px]">{tx.creditAccount}</td>
                        <td className="p-3 text-right font-mono font-bold text-zinc-100">${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex justify-center items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditVoucher(tx)}
                              className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-900/20 rounded-md transition-all"
                              title="Edit Voucher Details"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleVoidVoucher(tx.id)}
                              className="p-1.5 text-zinc-400 hover:text-amber-500 hover:bg-amber-955/20 rounded-md transition-all"
                              title="Cancel / Void Voucher"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteVoucher(tx.id)}
                              className="p-1.5 text-zinc-450 hover:text-rose-500 hover:bg-rose-955/20 rounded-md transition-all"
                              title="Permanently Delete Voucher"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {store.db.ledger.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-zinc-550 italic">No business vouchers recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== B. GENERAL LEDGER LOGS TAB ==================== */}
      {activeTab === 'transactions' && (
        <div className="bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 tracking-wide">DOUBLE-ENTRY JOURNAL LOGS</h3>
              <p className="text-xs text-zinc-400">Chronological list of all journal entries impacting the general ledger.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-455 flex items-center gap-1"><Filter className="w-3 h-3" /> Filter Log:</span>
              <div className="bg-zinc-950 rounded-lg p-1 border border-zinc-850 text-xs flex gap-1.5">
                <button
                  onClick={() => setVoucherFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-all ${voucherFilter === 'all' ? 'bg-zinc-800 text-zinc-100 font-bold' : 'text-zinc-400'}`}
                >
                  All Logs
                </button>
                <button
                  onClick={() => setVoucherFilter('sales')}
                  className={`px-2.5 py-1 rounded-md transition-all ${voucherFilter === 'sales' ? 'bg-zinc-800 text-blue-400 font-bold' : 'text-zinc-400'}`}
                >
                  Sales
                </button>
                <button
                  onClick={() => setVoucherFilter('purchase')}
                  className={`px-2.5 py-1 rounded-md transition-all ${voucherFilter === 'purchase' ? 'bg-zinc-800 text-amber-400 font-bold' : 'text-zinc-400'}`}
                >
                  Purchases
                </button>
                <button
                  onClick={() => setVoucherFilter('other_expense')}
                  className={`px-2.5 py-1 rounded-md transition-all ${voucherFilter === 'other_expense' ? 'bg-zinc-800 text-rose-450 font-bold' : 'text-zinc-400'}`}
                >
                  Other
                </button>
              </div>
            </div>
          </div>

          {/* Google Sheets Export Module Panel */}
          <div className="my-6">
            <GoogleSheetsExport filteredLogs={filteredLedgerLogs} filterType={voucherFilter} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-850">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-900 border-b border-zinc-850 text-zinc-350">
                  <th className="p-3">Vouch #</th>
                  <th className="p-3">Timestamp Date</th>
                  <th className="p-3">Narrative Remarks</th>
                  <th className="p-3">Debit Side Account</th>
                  <th className="p-3">Credit Side Account</th>
                  <th className="p-3 text-right">Sum Total Amount</th>
                  <th className="p-3 text-center">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {filteredLedgerLogs.map(tx => {
                  const isVoid = tx.description.includes('[CANCELLED]') || tx.amount === 0;
                  return (
                    <tr 
                      key={tx.id} 
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button')) return;
                        setSelectedVoucher(tx);
                      }}
                      className={`hover:bg-zinc-800/40 cursor-pointer transition-colors ${tx.attachmentUrl ? 'border-l-2 border-l-indigo-500' : ''} ${isVoid ? 'opacity-50 line-through bg-zinc-950/10' : ''}`}
                      title="Click to view destination accounts & voucher detail slip"
                    >
                      <td className="p-3 font-mono font-bold text-zinc-200">{tx.reference || 'N/A'}</td>
                      <td className="p-3 font-mono text-zinc-400 whitespace-nowrap">{tx.date}</td>
                      <td className="p-3">
                        <div className="flex items-center flex-wrap gap-1.5">
                          <span className="font-medium text-zinc-300">"{tx.description}"</span>
                          {tx.attachmentUrl && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.dispatchEvent(new CustomEvent('open-tunzua-receipt', { detail: { url: tx.attachmentUrl } }));
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-400/20 text-[9px] font-mono text-indigo-300 hover:text-indigo-200 cursor-pointer shadow-xs transition-all"
                              title="Original receipt file attached - Click to open"
                            >
                              <Paperclip className="w-2.5 h-2.5 text-indigo-400" />
                              <span>View Source</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-blue-400 font-mono text-[11px]">{tx.debitAccount}</td>
                      <td className="p-3 text-amber-400 font-mono text-[11px]">{tx.creditAccount}</td>
                      <td className="p-3 text-right font-mono font-bold text-zinc-100">${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="p-3">
                        <div className="flex justify-center items-center gap-1">
                          <button
                            onClick={() => handleOpenEditVoucher(tx)}
                            className="p-1 px-2 text-[10px] bg-sky-900/40 text-sky-400 hover:bg-sky-900/70 hover:text-sky-300 rounded-md transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleVoidVoucher(tx.id)}
                            className="p-1 px-2 text-[10px] bg-amber-950/40 text-amber-400 hover:bg-amber-950/70 hover:text-amber-300 rounded-md transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDeleteVoucher(tx.id)}
                            className="p-1 text-zinc-450 hover:text-rose-450 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== C. LEDGER ACCOUNTS DIRECTORY TAB ==================== */}
      {activeTab === 'ledger_accounts' && (
        <div className="bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-zinc-100 uppercase tracking-wide">Ledger Registry Accounts</h3>
              <p className="text-xs text-zinc-400">Review or configure double-entry bookkeeping ledger classifications.</p>
            </div>
            <button
              onClick={() => handleOpenAddLedger()}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg font-bold transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add custom ledger account
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ledgerAccounts.map(acc => {
              // calculate current balance
              let calculatedBalance = acc.initialBalance;
              store.db.ledger.forEach(tx => {
                if (tx.debitAccount === acc.name) {
                  calculatedBalance += (acc.type === 'Asset' || acc.type === 'Expense') ? tx.amount : -tx.amount;
                }
                if (tx.creditAccount === acc.name) {
                  calculatedBalance += (acc.type === 'Asset' || acc.type === 'Expense') ? -tx.amount : tx.amount;
                }
              });

               return (
                <div 
                  key={acc.accNo} 
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    setSelectedLedgerAccount(acc);
                  }}
                  className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl flex flex-col justify-between hover:border-zinc-700 hover:bg-zinc-900/95 cursor-pointer transition-all"
                  title="Click to view destination journal ledger sheet"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-bold uppercase">{acc.accNo}</span>
                      <h4 className="font-semibold text-zinc-200 mt-2 text-sm">{acc.name}</h4>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-blue-900/20 text-blue-400 font-semibold">{acc.type}</span>
                  </div>

                  <div className="flex justify-between items-end mt-6 pt-3 border-t border-zinc-850">
                    <div>
                      <span className="text-[10px] text-zinc-450 block uppercase font-mono">Current balance</span>
                      <span className="font-mono font-bold text-sm text-zinc-100">${calculatedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleOpenEditLedger(acc)}
                        className="p-1 px-2 text-[10px] bg-zinc-805 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteLedgerAccount(acc.accNo)}
                        disabled={['LED-1001', 'LED-1002', 'LED-1003', 'LED-1004'].includes(acc.accNo)} // lock system defaults
                        className="p-1 text-zinc-500 hover:text-rose-450 disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== D. SUNDRY REGISTRY TAB ==================== */}
      {activeTab === 'sundry_registry' && (
        <div className="bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-zinc-100 uppercase tracking-wide">Sundry Debtors & Creditors Registry</h3>
              <p className="text-xs text-zinc-400">Manage client (sundry debtors) accounts receivables and suppliers (sundry creditors) accounts payables.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleOpenAddSundry('debtor')}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg font-bold transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Debtor (Customer)
              </button>
              <button
                onClick={() => handleOpenAddSundry('creditor')}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded-lg font-bold transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Creditor (Vendor)
              </button>
            </div>
          </div>

          <div className="flex gap-2 bg-zinc-950 p-1 rounded-lg border border-zinc-850 self-start w-fit text-xs">
            <button
              onClick={() => setSundriesFilter('all')}
              className={`px-3 py-1 rounded-md transition-all ${sundriesFilter === 'all' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400'}`}
            >
              All Partners ({sundryParties.length})
            </button>
            <button
              onClick={() => setSundriesFilter('debtor')}
              className={`px-3 py-1 rounded-md transition-all ${sundriesFilter === 'debtor' ? 'bg-zinc-800 text-blue-400 font-bold' : 'text-zinc-400'}`}
            >
              Sundry Debtors ({sundryParties.filter(p => p.groupType === 'debtor').length})
            </button>
            <button
              onClick={() => setSundriesFilter('creditor')}
              className={`px-3 py-1 rounded-md transition-all ${sundriesFilter === 'creditor' ? 'bg-zinc-800 text-amber-400 font-bold' : 'text-zinc-400'}`}
            >
              Sundry Creditors ({sundryParties.filter(p => p.groupType === 'creditor').length})
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-850">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-900 border-b border-zinc-850 text-zinc-350">
                  <th className="p-3">Party No</th>
                  <th className="p-3">Party/Enterprise Name</th>
                  <th className="p-3">Group Designation</th>
                  <th className="p-3">Contact Representative</th>
                  <th className="p-3">Phone Line</th>
                  <th className="p-3">Tax GstIn No</th>
                  <th className="p-3 text-right">O/S balance Value</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {sundryParties
                  .filter(p => sundriesFilter === 'all' || p.groupType === sundriesFilter)
                  .map(p => {
                    // Calculate dynamic Outstanding Balance based on double entry journal
                    let balance = 0;
                    store.db.ledger.forEach(tx => {
                      if (p.groupType === 'debtor') {
                        // debtor balance goes up on debit, down on credit
                        if (tx.debitAccount === p.name) balance += tx.amount;
                        if (tx.creditAccount === p.name) balance -= tx.amount;
                      } else {
                        // creditor balance goes up on credit, down on debit
                        if (tx.creditAccount === p.name) balance += tx.amount;
                        if (tx.debitAccount === p.name) balance -= tx.amount;
                      }
                    });

                    return (
                      <tr 
                        key={p.partyNo} 
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button')) return;
                          setSelectedSundryParty(p);
                        }}
                        className="hover:bg-zinc-805 cursor-pointer transition-colors"
                        title="Click to view destination subsidiary statement ledger"
                      >
                        <td className="p-3 font-mono font-bold text-zinc-400">{p.partyNo}</td>
                        <td className="p-3 font-semibold text-zinc-100">{p.name}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono leading-none font-semibold ${
                            p.groupType === 'debtor' ? 'bg-blue-900/20 text-blue-400' : 'bg-amber-900/20 text-amber-400'
                          }`}>
                            {p.groupType === 'debtor' ? 'Sundry Debtor' : 'Sundry Creditor'}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-300">{p.contactPerson}</td>
                        <td className="p-3 text-zinc-350 font-mono text-[11px]">{p.phone}</td>
                        <td className="p-3 text-zinc-350 font-mono text-[11px]">
                          {p.gstIn && p.gstIn !== 'N/A' ? (
                            <span className="inline-flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold" title="Registered GSTIN Active taxpayer">
                              <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full" />
                              {p.gstIn}
                            </span>
                          ) : (
                            <span className="text-zinc-550 italic text-[10.5px]">Unregistered</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-zinc-100">${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-3">
                          <div className="flex justify-center items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditSundry(p)}
                              className="p-1 px-2 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSundryParty(p.partyNo)}
                              className="p-1 text-zinc-500 hover:text-rose-450 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================= VOUCHER DIALOG OVERLAY ================================= */}
      {showVoucherModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-zinc-900 px-6 py-4 border-b border-zinc-850 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest font-mono">
                  {showVoucherModal === 'add' ? '📝 Post transaction voucher' : '✏️ edit transaction voucher'}
                </h3>
                <p className="text-[11px] text-zinc-400">Capture dual-entry ledger allocations safely.</p>
              </div>
              <button
                onClick={() => setShowVoucherModal(null)}
                className="text-zinc-400 hover:text-white transition-colors p-1.5 hover:bg-zinc-800 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVoucher} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              {formError && (
                <div className="bg-rose-955/20 bg-rose-950/20 border border-rose-900 text-rose-450 p-2.5 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Voucher Selector Block */}
              {showVoucherModal === 'add' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">Voucher Category Classification</label>
                  <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-850 text-[11px]">
                    {[
                      { key: 'sales', label: 'Sales' },
                      { key: 'purchase', label: 'Purchase' },
                      { key: 'receipt', label: 'Receipt' },
                      { key: 'payment', label: 'Payment' },
                      { key: 'contra', label: 'Contra' },
                      { key: 'journal', label: 'Journal' },
                    ].map(btn => (
                      <button
                        type="button"
                        key={btn.key}
                        onClick={() => handleSelectVoucherType(btn.key as any)}
                        className={`py-1.5 rounded transition-all font-semibold ${
                          vType === btn.key ? 'bg-blue-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">Voucher date</label>
                  <input
                    type="date"
                    required
                    value={vDate}
                    onChange={e => setVDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded-lg p-2 text-xs text-zinc-100 font-mono focus:border-zinc-700 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">Vouch # (Assign Number)</label>
                  <input
                    type="text"
                    required
                    value={vReference}
                    onChange={e => setVReference(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded-lg p-2 text-xs text-blue-400 font-mono focus:border-zinc-700 outline-none"
                    placeholder="e.g. SAL-1001"
                  />
                </div>
              </div>

              {/* ACCOUNT CHANNELS DYNAMIC ASSIGNMENT */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">Debit side (Account receiving fund)</label>
                <select
                  value={vFromAccount}
                  onChange={e => setVFromAccount(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded-lg p-2 text-xs text-zinc-100 focus:border-zinc-700 outline-none"
                >
                  <option value="">-- Choose Account --</option>
                  <optgroup label="General Ledger Accounts">
                    {ledgerAccounts.map(a => (
                      <option key={a.accNo} value={a.name}>{a.name} ({a.accNo})</option>
                    ))}
                  </optgroup>
                  <optgroup label="Sundry Clients & Creditors">
                    {sundryParties.map(p => (
                      <option key={p.partyNo} value={p.name}>{p.name} ({p.partyNo})</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">Credit side (Account providing fund)</label>
                <select
                  value={vToAccount}
                  onChange={e => setVToAccount(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded-lg p-2 text-xs text-zinc-100 focus:border-zinc-700 outline-none"
                >
                  <option value="">-- Choose Account --</option>
                  <optgroup label="General Ledger Accounts">
                    {ledgerAccounts.map(a => (
                      <option key={a.accNo} value={a.name}>{a.name} ({a.accNo})</option>
                    ))}
                  </optgroup>
                  <optgroup label="Sundry Clients & Creditors">
                    {sundryParties.map(p => (
                      <option key={p.partyNo} value={p.name}>{p.name} ({p.partyNo})</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">Total Transaction amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={vAmount}
                  onChange={e => setVAmount(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded-lg p-2 text-xs text-zinc-100 font-mono focus:border-zinc-700 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">narration / Remarks / details</label>
                <textarea
                  required
                  rows={2}
                  value={vDescription}
                  onChange={e => setVDescription(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded-lg p-2.5 text-xs text-zinc-100 focus:border-zinc-700 outline-none resize-none"
                  placeholder="Record description of transaction for visual audit trail"
                />
              </div>

              {/* GST RULE COMPLIANCE ENGINE FOR REGISTERED SUNDRIES */}
              {(() => {
                const activeParty = sundryParties.find(p => p.name === vFromAccount || p.name === vToAccount);
                if (activeParty && activeParty.gstIn && activeParty.gstIn !== 'N/A' && (vType === 'sales' || vType === 'purchase')) {
                  const amt = parseFloat(vAmount);
                  const hasGstComplianceTag = vDescription.includes('[GST Rule Compliant:');
                  return (
                    <div className="p-3 bg-indigo-950/45 border border-indigo-900/60 rounded-xl space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-indigo-300 flex items-center gap-1.5">
                          <Percent className="w-3.5 h-3.5 text-indigo-400" />
                          GST Registered Sundry Partner Detected
                        </span>
                        <span className="text-[9px] bg-indigo-900 text-indigo-100 font-mono px-1.5 py-0.5 rounded border border-indigo-700">
                          GSTIN: {activeParty.gstIn}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-normal font-sans">
                        Under Indian GST Rules, transactions with registered partners require CGST/SGST/IGST breakdown to claim Input Tax Credit (ITC) or file GSTR compliance forms.
                      </p>

                      <div className="grid grid-cols-2 gap-2 pt-1 font-sans">
                        <button
                          type="button"
                          onClick={() => {
                            if (!amt || isNaN(amt) || amt <= 0) {
                              alert("Please enter a valid amount first to calculate the GST split.");
                              return;
                            }
                            const taxable = (amt / 1.18);
                            const gstEach = (amt - taxable) / 2;
                            const cleanDesc = vDescription.includes('[GST Rule Compliant:') 
                              ? vDescription.split('[GST Rule Compliant:')[0].trim() 
                              : vDescription.trim();
                            setVDescription(`${cleanDesc}\n[GST Rule Compliant: Intra-State (CGST 9% + SGST 9%) | Taxable=${taxable.toFixed(2)}, CGST=${gstEach.toFixed(2)}, SGST=${gstEach.toFixed(2)} | GSTIN=${activeParty.gstIn}]`);
                          }}
                          className="py-1.5 px-2 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 text-[10px] font-bold rounded-lg border border-indigo-850 text-center cursor-pointer transition-all"
                          title="Apply Intra-State CGST (9%) & SGST (9%) splits"
                        >
                          Apply Intrastate (CGST + SGST 9%)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!amt || isNaN(amt) || amt <= 0) {
                              alert("Please enter a valid amount first to calculate the GST split.");
                              return;
                            }
                            const taxable = (amt / 1.18);
                            const igst = amt - taxable;
                            const cleanDesc = vDescription.includes('[GST Rule Compliant:') 
                              ? vDescription.split('[GST Rule Compliant:')[0].trim() 
                              : vDescription.trim();
                            setVDescription(`${cleanDesc}\n[GST Rule Compliant: Inter-State (IGST 18%) | Taxable=${taxable.toFixed(2)}, IGST=${igst.toFixed(2)} | GSTIN=${activeParty.gstIn}]`);
                          }}
                          className="py-1.5 px-2 bg-purple-900 hover:bg-purple-800 text-purple-200 text-[10px] font-bold rounded-lg border border-purple-850 text-center cursor-pointer transition-all"
                          title="Apply Inter-State IGST (18%) split"
                        >
                          Apply Interstate (IGST 18%)
                        </button>
                      </div>

                      {amt > 0 && (
                        <div className="bg-black/30 border border-indigo-900/30 p-2 rounded-lg font-mono text-[10px] text-zinc-300 space-y-1">
                          <div className="flex justify-between">
                            <span>Base Taxable Cost:</span>
                            <span className="text-zinc-100">${(amt / 1.18).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>GST Central & State Tax (18%):</span>
                            <span className="text-indigo-400">${(amt - amt / 1.18).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-t border-indigo-900/40 pt-1 font-bold">
                            <span>Composite Invoice Value:</span>
                            <span>${amt.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}

              {/* REAL-TIME SECURITY AUDIT RISK & DISAGREE MONITOR */}
              {(() => {
                const { flags, riskRating } = getSecurityRiskCheck();
                const hasFlags = flags.length > 0;
                return (
                  <div className="pt-2">
                    {hasFlags ? (
                      <div className={`p-4 rounded-xl border border-dashed space-y-3 ${
                        riskRating === 'high' 
                          ? 'bg-red-950/40 text-red-350 border-red-900/60' 
                          : 'bg-amber-955/30 bg-amber-950/30 text-amber-300 border-amber-850'
                      }`}>
                        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider font-extrabold">
                          <span className={`w-2 h-2 rounded-full ${riskRating === 'high' ? 'bg-red-500' : 'bg-amber-400'} animate-pulse`} />
                          <span>Audit Sentinel Alert: {riskRating} Exposure Rating Detected ({flags.length} flags)</span>
                        </div>
                        <ul className="list-disc pl-4 space-y-1 text-[11px] opacity-90 leading-relaxed font-sans">
                          {flags.map((flg, idx) => (
                            <li key={idx}>{flg}</li>
                          ))}
                        </ul>

                        {/* DISAGREE CHECK CHECKBOX */}
                        <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-300 flex items-start gap-2.5 bg-black/25 p-2.5 rounded-lg">
                          <input
                            type="checkbox"
                            id="disagree-override-checkbox"
                            className="mt-0.5 rounded border-zinc-805 bg-zinc-900 text-blue-600 focus:ring-0 cursor-pointer h-3.5 w-3.5 shrink-0"
                            checked={disagreeCheckAccepted}
                            onChange={e => setDisagreeCheckAccepted(e.target.checked)}
                          />
                          <label htmlFor="disagree-override-checkbox" className="leading-tight font-sans cursor-pointer select-none">
                            <strong>Attest Override (Disagree Check):</strong> I verify that this entry is authorized, valid, and should override audit warnings.
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 rounded-xl flex items-center gap-2 text-[11px] font-mono">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>Secure Compliance State: Auto-validation compliant.</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex gap-2 pt-4 border-t border-zinc-850 justify-end">
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(null)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-805 text-zinc-350 text-xs rounded-lg transition-colors"
                >
                  Cancel / discard
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg font-bold transition-all shadow-md"
                >
                  Confirm Posting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================= LEDGER ACCOUNT DIALOG OVERLAY ================================= */}
      {showLedgerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-zinc-900 px-6 py-4 border-b border-zinc-850 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest font-mono">
                  {showLedgerModal === 'add' ? '📁 Add Ledger Account' : '✏️ edit Ledger Account'}
                </h3>
                <p className="text-[11px] text-zinc-450">Create account classifications for bookkeeping.</p>
              </div>
              <button
                onClick={() => setShowLedgerModal(null)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLedgerAccount} className="p-6 space-y-4">
              {ledgerFormError && (
                <div className="bg-rose-955/20 bg-rose-950/20 border border-rose-900 text-rose-400 p-2.5 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{ledgerFormError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">Ledger Name</label>
                <input
                  type="text"
                  required
                  value={ledgerName}
                  onChange={e => setLedgerName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded-lg p-2 text-xs text-zinc-100 focus:border-zinc-700 outline-none"
                  placeholder="e.g. Machinery Maintenance"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">Account Group Category</label>
                <select
                  value={ledgerType}
                  onChange={e => setLedgerType(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded-lg p-2 text-xs text-zinc-100 focus:border-zinc-700 outline-none"
                >
                  <option value="Asset">Asset (Debit Normal)</option>
                  <option value="Liability">Liability (Credit Normal)</option>
                  <option value="Equity">Equity (Credit Normal)</option>
                  <option value="Revenue">Revenue (Credit Normal)</option>
                  <option value="Expense">Expense (Debit Normal)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">Initial Seat balance ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={ledgerBalance}
                  onChange={e => setLedgerBalance(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded-lg p-2 text-xs text-zinc-100 font-mono focus:border-zinc-700 outline-none"
                  placeholder="0.00"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-zinc-850 justify-end text-xs">
                <button
                  type="button"
                  onClick={() => setShowLedgerModal(null)}
                  className="px-4 py-2 bg-zinc-900 text-zinc-400 hover:text-zinc-200 rounded-lg"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold"
                >
                  Save Ledger account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================= SUNDRY DIRECTORY DIALOG OVERLAY ================================= */}
      {showSundryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-zinc-900 px-6 py-4 border-b border-zinc-850 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest font-mono">
                  {showSundryModal === 'add' ? '👥 Add Sundry Participant' : '✏️ edit Sundry Contact'}
                </h3>
                <p className="text-[11px] text-zinc-450">Manage accounts receivables/payables contact profile.</p>
              </div>
              <button
                onClick={() => setShowSundryModal(null)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSundryParty} className="p-6 space-y-4">
              {sundryFormError && (
                <div className="bg-rose-955/20 bg-rose-950/20 border border-rose-900 text-rose-450 p-2.5 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{sundryFormError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">Enterprise / Party Name</label>
                <input
                  type="text"
                  required
                  value={sundryName}
                  onChange={e => setSundryName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded-lg p-2 text-xs text-zinc-100 focus:border-zinc-700 outline-none"
                  placeholder="e.g. Phoenix Logistics LTD"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">Registry classification Group</label>
                <div className="grid grid-cols-2 gap-2 bg-zinc-900 p-1 border border-zinc-850 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setSundryGroup('debtor')}
                    className={`py-1.5 rounded transition-all font-semibold ${
                      sundryGroup === 'debtor' ? 'bg-blue-600 text-white font-bold' : 'text-zinc-400'
                    }`}
                  >
                    Sundry Debtor (Customer)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSundryGroup('creditor')}
                    className={`py-1.5 rounded transition-all font-semibold ${
                      sundryGroup === 'creditor' ? 'bg-amber-600 text-white font-bold' : 'text-zinc-400'
                    }`}
                  >
                    Sundry Creditor (Supplier)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">Key Contact Person name</label>
                <input
                  type="text"
                  value={sundryContact}
                  onChange={e => setSundryContact(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded-lg p-2 text-xs text-zinc-100 focus:border-zinc-700 outline-none"
                  placeholder="e.g. Alice Cooper"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">Phone</label>
                  <input
                    type="text"
                    value={sundryPhone}
                    onChange={e => setSundryPhone(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded-lg p-2 text-xs text-zinc-100 focus:border-zinc-700 outline-none"
                    placeholder="+1-555-0011"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">Email address</label>
                  <input
                    type="email"
                    value={sundryEmail}
                    onChange={e => setSundryEmail(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded-lg p-2 text-xs text-zinc-100 focus:border-zinc-700 outline-none"
                    placeholder="contact@enterprise.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">GST Registration Status</label>
                <div className="grid grid-cols-2 gap-2 bg-zinc-900 p-1 border border-zinc-850 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setSundryIsGstRegistered(false);
                    }}
                    className={`py-1.5 rounded transition-all font-semibold cursor-pointer ${
                      !sundryIsGstRegistered
                        ? 'bg-zinc-805 text-zinc-100 font-bold border border-zinc-700 bg-zinc-800'
                        : 'text-zinc-500 hover:text-zinc-400'
                    }`}
                  >
                    Unregistered Partner
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSundryIsGstRegistered(true);
                    }}
                    className={`py-1.5 rounded transition-all font-semibold cursor-pointer ${
                      sundryIsGstRegistered
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-zinc-500 hover:text-zinc-400'
                    }`}
                  >
                    GST Registered Partner
                  </button>
                </div>
              </div>

              {sundryIsGstRegistered && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold font-mono flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    GSTIN (Taxpayer Identification No)
                  </label>
                  <input
                    type="text"
                    required
                    value={sundryGstIn}
                    onChange={e => setSundryGstIn(e.target.value)}
                    className="w-full bg-zinc-900 border border-emerald-800/60 focus:border-emerald-500 rounded-lg p-2 text-xs text-zinc-100 font-mono outline-none"
                    placeholder="e.g. GST27PHOE1099"
                  />
                  <p className="text-[10px] text-zinc-500 leading-normal">
                    Format: 15-character alphanumeric GSTIN matching registration rules.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-zinc-850 justify-end text-xs">
                <button
                  type="button"
                  onClick={() => setShowSundryModal(null)}
                  className="px-4 py-2 bg-zinc-900 text-zinc-450 hover:text-zinc-200 rounded-lg"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold"
                >
                  Save Partner profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================= DETAIL MODAL A: VOUCHER AUDIT SLIP ================================= */}
      {selectedVoucher && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#121214] border border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col font-sans">
            <div className="bg-zinc-900 px-6 py-4.5 border-b border-zinc-855 flex justify-between items-center text-zinc-100">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold font-mono tracking-widest bg-blue-900/40 text-blue-400 px-2.5 py-1 rounded-md uppercase border border-blue-900/30">
                  {selectedVoucher.reference || 'GL-VCH'}
                </span>
                <span className="text-xs font-semibold text-zinc-400 font-mono">{selectedVoucher.date}</span>
              </div>
              <button 
                onClick={() => setSelectedVoucher(null)} 
                className="text-zinc-500 hover:text-zinc-200 p-1.5 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
              {/* PRIMARY VALUE STAMP */}
              <div className="text-center py-4 bg-zinc-950/40 border border-zinc-850/60 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-widest font-mono text-zinc-550">Principal Vouch Value</span>
                <div className="text-3xl font-extrabold text-white font-mono">
                  ${selectedVoucher.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                {selectedVoucher.description.includes('[CANCELLED]') && (
                  <span className="inline-block mt-1 text-[9px] font-bold font-mono uppercase bg-rose-950/50 text-rose-400 border border-rose-900/40 px-2 py-0.5 rounded">
                    ⚠️ Cancelled / Voided Transaction
                  </span>
                )}
              </div>

              {/* NARRATION & REMARKS */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-zinc-450 block">Narration &amp; Ledger Remarks</span>
                <p className="text-xs text-zinc-300 italic bg-zinc-900/60 p-3 rounded-lg border border-zinc-850/50 leading-relaxed">
                  "{selectedVoucher.description}"
                </p>
              </div>

              {/* DOUBLE ENTRY DESTINATION FLOW */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-zinc-455 block">Double-Entry Destination Flow</span>
                <div className="grid grid-cols-1 md:grid-cols-7 items-center gap-3 bg-zinc-950 p-4 rounded-xl border border-zinc-900">
                  {/* Credit Source Account */}
                  <div className="md:col-span-3 bg-zinc-900/80 p-3 rounded-lg border border-zinc-850 text-center space-y-1">
                    <span className="text-[9px] uppercase font-bold tracking-wider font-mono text-amber-400">Credit (Account To)</span>
                    <p className="text-xs font-semibold text-zinc-200 truncate">{selectedVoucher.creditAccount}</p>
                    <span className="text-[8.5px] uppercase font-mono text-zinc-500">Source of funds</span>
                  </div>

                  {/* Flow Arrow */}
                  <div className="md:col-span-1 flex flex-col items-center justify-center text-zinc-550 py-1">
                    <span className="text-[9px] font-mono font-bold uppercase shrink-0 text-zinc-550 hidden md:block">Voucher</span>
                    {/* Direction arrow */}
                    <div className="flex md:flex-col items-center gap-1.5">
                      <ArrowRight className="w-4 h-4 text-emerald-400 hidden md:block" />
                      <span className="text-[11px] md:hidden font-mono text-emerald-400 font-bold">&#8595; Transfers Value &#8595;</span>
                    </div>
                  </div>

                  {/* Debit Destination Account */}
                  <div className="md:col-span-3 bg-zinc-900/80 p-3 rounded-lg border border-zinc-850 text-center space-y-1">
                    <span className="text-[9px] uppercase font-bold tracking-wider font-mono text-blue-400">Debit (Account From)</span>
                    <p className="text-xs font-semibold text-zinc-200 truncate">{selectedVoucher.debitAccount}</p>
                    <span className="text-[8.5px] uppercase font-mono text-zinc-500">Application of funds</span>
                  </div>
                </div>
              </div>

              {/* GST / TAX COMPLIANCE SUB-REPORT */}
              {(() => {
                const isGstCompliant = selectedVoucher.description.includes('[GST Rule Compliant:');
                if (!isGstCompliant) return null;

                const gstPart = selectedVoucher.description.match(/\[GST/);
                // Extract parameters
                const description = selectedVoucher.description;
                const gstInMatch = description.match(/GSTIN=([^ ]+)/);
                const taxableMatch = description.match(/Taxable=([\d.]+)/);
                const cgstMatch = description.match(/CGST=([\d.]+)/);
                const sgstMatch = description.match(/SGST=([\d.]+)/);
                const igstMatch = description.match(/IGST=([\d.]+)/);

                const gstIn = gstInMatch ? gstInMatch[1] : 'N/A';
                const taxableValue = taxableMatch ? parseFloat(taxableMatch[1]) : selectedVoucher.amount / 1.18;
                const cgst = cgstMatch ? parseFloat(cgstMatch[1]) : 0;
                const sgst = sgstMatch ? parseFloat(sgstMatch[1]) : 0;
                const igst = igstMatch ? parseFloat(igstMatch[1]) : 0;
                const totalTax = cgst + sgst + igst || (selectedVoucher.amount - taxableValue);

                return (
                  <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-4.5 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-emerald-900/30">
                      <span className="text-[10px] font-bold font-mono uppercase text-emerald-400 tracking-wide flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        🇮🇳 Indian GST Portal Compliance Report
                      </span>
                      {gstIn !== 'N/A' && (
                        <span className="text-[9px] font-mono leading-none font-bold bg-emerald-500/10 text-emerald-350 px-2 py-1 rounded border border-emerald-500/20">
                          GSTIN: {gstIn}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-[10.5px] font-mono">
                      <div className="bg-zinc-950/40 p-2 rounded border border-emerald-950">
                        <span className="text-zinc-500 block text-[8px] font-sans uppercase">Taxable base value</span>
                        <span className="font-bold text-zinc-205 text-zinc-200">${taxableValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      
                      {igst > 0 ? (
                        <div className="bg-zinc-950/40 p-2 rounded border border-emerald-950 col-span-2">
                          <span className="text-zinc-500 block text-[8px] font-sans uppercase">IGST Liability (18%)</span>
                          <span className="font-bold text-indigo-400">${igst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      ) : (
                        <>
                          <div className="bg-zinc-950/40 p-2 rounded border border-emerald-950">
                            <span className="text-zinc-500 block text-[8px] font-sans uppercase">CGST Amount (9%)</span>
                            <span className="font-bold text-zinc-300">${cgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="bg-zinc-950/40 p-2 rounded border border-emerald-950">
                            <span className="text-zinc-500 block text-[8px] font-sans uppercase">SGST Amount (9%)</span>
                            <span className="font-bold text-zinc-300">${sgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        </>
                      )}

                      <div className="bg-zinc-950/40 p-2 rounded border border-emerald-950">
                        <span className="text-zinc-500 block text-[8px] font-sans uppercase">Total Tax accrued</span>
                        <span className="font-bold text-emerald-400">${totalTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ATTACHMENT DETAILS */}
              {selectedVoucher.attachmentUrl && (
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-950/40 border border-indigo-900/40 rounded-lg text-indigo-400">
                      <Paperclip className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-zinc-200">Audit Digitized Image Attached</h5>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate max-w-xs">{selectedVoucher.attachmentUrl}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('open-tunzua-receipt', { detail: { url: selectedVoucher.attachmentUrl } }));
                    }}
                    className="cursor-pointer shrink-0 text-[10.5px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Audit Attached File</span>
                  </button>
                </div>
              )}
            </div>

            <div className="bg-zinc-950 px-6 py-4 border-t border-zinc-850 flex justify-between items-center text-xs">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenEditVoucher(selectedVoucher);
                    setSelectedVoucher(null);
                  }}
                  className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-350 hover:text-zinc-100 rounded-lg transition-colors border border-zinc-850 cursor-pointer flex items-center gap-1"
                >
                  <Edit className="w-3 h-3" />
                  <span>Edit Voucher</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Are you sure you want to cancel/void this general ledger voucher?")) {
                      handleVoidVoucher(selectedVoucher.id);
                      setSelectedVoucher(null);
                    }
                  }}
                  className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-450 hover:text-amber-500 rounded-lg transition-colors border border-zinc-850 cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Void Entry</span>
                </button>
              </div>
              
              <button
                type="button"
                onClick={() => setSelectedVoucher(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors cursor-pointer"
              >
                Close Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================= DETAIL MODAL B: LEDGER DIRECTORY SHEET STATEMENT ================================= */}
      {selectedLedgerAccount && (() => {
        // Compute transaction rows touching this account
        const accName = selectedLedgerAccount.name;
        const linkedTransactions = store.db.ledger.filter(tx => 
          tx.debitAccount === accName || tx.creditAccount === accName
        );

        // Calculate dynamic elements
        let runningBalance = selectedLedgerAccount.initialBalance;
        let debitFlowSum = 0;
        let creditFlowSum = 0;

        store.db.ledger.forEach(tx => {
          if (tx.debitAccount === accName) {
            debitFlowSum += tx.amount;
          }
          if (tx.creditAccount === accName) {
            creditFlowSum += tx.amount;
          }
        });

        const isAssetOrExpense = ['Asset', 'Expense'].includes(selectedLedgerAccount.type);
        const dynamicClosingBalance = isAssetOrExpense 
          ? (selectedLedgerAccount.initialBalance + debitFlowSum - creditFlowSum)
          : (selectedLedgerAccount.initialBalance + creditFlowSum - debitFlowSum);

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#121214] border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col font-sans">
              <div className="bg-zinc-900 px-6 py-4.5 border-b border-zinc-855 flex justify-between items-center text-zinc-100">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono tracking-wider font-bold bg-zinc-850 text-zinc-350 px-2.5 py-1 rounded-md uppercase border border-zinc-800">
                    {selectedLedgerAccount.accNo}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100">{selectedLedgerAccount.name}</h3>
                    <p className="text-[10.5px] text-zinc-500 font-mono italic">Account Statement sheet &bull; {selectedLedgerAccount.type} category</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedLedgerAccount(null)} 
                  className="text-zinc-500 hover:text-zinc-200 p-1.5 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                {/* ACCOUNT STATISTICS ROW */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-900">
                    <span className="text-[9px] uppercase font-bold tracking-wider font-mono text-zinc-500">Initial Balance</span>
                    <p className="text-sm font-bold text-zinc-200 mt-1 font-mono">
                      ${selectedLedgerAccount.initialBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-900">
                    <span className="text-[9px] uppercase font-bold tracking-wider font-mono text-blue-400">Total Debits Flow</span>
                    <p className="text-sm font-bold text-blue-400 mt-1 font-mono">
                      ${debitFlowSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-900">
                    <span className="text-[9px] uppercase font-bold tracking-wider font-mono text-amber-400">Total Credits Flow</span>
                    <p className="text-sm font-bold text-amber-400 mt-1 font-mono">
                      ${creditFlowSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-900 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-wider font-mono text-emerald-400">Closing balance</span>
                      <p className="text-sm font-extrabold text-white mt-1 font-mono">
                        ${dynamicClosingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* OVERDRAFT HEALTH ALERTS */}
                {isAssetOrExpense && dynamicClosingBalance < 0 && (
                  <div className="bg-rose-950/20 border border-rose-900/35 rounded-xl p-3 flex items-start gap-2.5">
                    <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold font-mono text-rose-450 uppercase tracking-widest block">Liquid Overdraft Flag</span>
                      <p className="text-[11px] text-rose-400/90 mt-0.5 leading-normal">
                        This asset account currently exhibits a negative liquid balance of ${Math.abs(dynamicClosingBalance).toLocaleString()}. Direct funding or audit check is recommended.
                      </p>
                    </div>
                  </div>
                )}

                {/* LEDGER ENTRIES TABLE JOURNAL */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-zinc-450 block">Statement ledger entries ({linkedTransactions.length})</span>
                  <div className="overflow-x-auto rounded-xl border border-zinc-850">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-zinc-900 border-b border-zinc-850 text-zinc-400 font-medium text-[10.5px]">
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Voucher Ref</th>
                          <th className="p-2.5">Narration</th>
                          <th className="p-2.5">Leg (Type)</th>
                          <th className="p-2.5 text-right font-mono">Value Line</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850">
                        {linkedTransactions.map(tx => {
                          const isDebitLeg = tx.debitAccount === accName;
                          return (
                            <tr 
                              key={tx.id}
                              onClick={() => setSelectedVoucher(tx)}
                              className="hover:bg-zinc-900 cursor-pointer transition-colors"
                              title="Deep click to audit underlying ledger voucher slip"
                            >
                              <td className="p-2.5 font-mono text-zinc-400 text-[11px] whitespace-nowrap">{tx.date}</td>
                              <td className="p-2.5 font-mono font-bold text-indigo-400">{tx.reference || 'GL-VCH'}</td>
                              <td className="p-2.5 max-w-xxs truncate text-zinc-300 italic">"{tx.description}"</td>
                              <td className="p-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase ${
                                  isDebitLeg ? 'bg-blue-900/10 text-blue-400' : 'bg-amber-900/10 text-amber-400'
                                }`}>
                                  {isDebitLeg ? 'DR DEBIT' : 'CR CREDIT'}
                                </span>
                              </td>
                              <td className="p-2.5 text-right font-mono font-semibold text-zinc-100">
                                ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                        {linkedTransactions.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-zinc-550 italic">No entry logs posted to this ledger account yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[9.5px] text-zinc-500 font-mono italic">
                    💡 Deep navigation active: click on any journal entry line in this statement ledger to inspect its full double-entry voucher slip.
                  </p>
                </div>
              </div>

              <div className="bg-zinc-950 px-6 py-4.5 border-t border-zinc-850 flex justify-end text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedLedgerAccount(null)}
                  className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 rounded-xl font-semibold border border-zinc-850 cursor-pointer"
                >
                  Close Statement Directory
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================================= DETAIL MODAL C: PARTNER SUBSIDIARY STATEMENT ================================= */}
      {selectedSundryParty && (() => {
        const pName = selectedSundryParty.name;
        // Compute transaction logs involving this partner
        const linkedTransactions = store.db.ledger.filter(tx => 
          tx.debitAccount === pName || tx.creditAccount === pName
        );

        // Calculate dynamic Obligations Outstanding Balance
        let balance = 0;
        store.db.ledger.forEach(tx => {
          if (selectedSundryParty.groupType === 'debtor') {
            // debtor balance goes up on debit, down on credit
            if (tx.debitAccount === pName) balance += tx.amount;
            if (tx.creditAccount === pName) balance -= tx.amount;
          } else {
            // creditor balance goes up on credit, down on debit
            if (tx.creditAccount === pName) balance += tx.amount;
            if (tx.debitAccount === pName) balance -= tx.amount;
          }
        });

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#121214] border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col font-sans">
              <div className="bg-zinc-900 px-6 py-4.5 border-b border-zinc-855 flex justify-between items-center text-zinc-100">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono tracking-wider font-bold bg-zinc-850 text-zinc-350 px-2.5 py-1 rounded-md uppercase border border-zinc-800">
                    {selectedSundryParty.partyNo || 'SUNDRY'}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100">{selectedSundryParty.name}</h3>
                    <p className="text-[10.5px] text-zinc-500 font-mono italic">
                      Subsidiary partner files &bull; {selectedSundryParty.groupType === 'debtor' ? 'Sundry Debtor (Receivables)' : 'Sundry Creditor (Payables)'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedSundryParty(null)} 
                  className="text-zinc-500 hover:text-zinc-200 p-1.5 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                {/* HIGHLIGHT SUMMARY GRID */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Ledger Balance obligations */}
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 space-y-1.5 flex flex-col justify-between col-span-1 md:col-span-1">
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-wider font-mono text-zinc-500 block">Total obligations</span>
                      <span className="text-xl font-extrabold text-white font-mono block mt-1">
                        ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <span className={`text-[9.5px] font-bold font-mono px-2 py-0.5 rounded w-fit uppercase ${
                      balance > 0 
                        ? (selectedSundryParty.groupType === 'debtor' ? 'bg-blue-900/20 text-blue-400' : 'bg-amber-900/20 text-amber-400')
                        : 'bg-zinc-850 text-zinc-500'
                    }`}>
                      {balance > 0 
                        ? (selectedSundryParty.groupType === 'debtor' ? 'Account Receivable' : 'Account Payable')
                        : 'Fully Settled'
                      }
                    </span>
                  </div>

                  {/* Partner compliance and contacts info card */}
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 col-span-1 md:col-span-2 grid grid-cols-2 gap-4 text-xs font-sans">
                    <div className="space-y-2">
                      <div>
                        <span className="text-[8.5px] uppercase font-bold tracking-wider font-mono text-zinc-500 block">Contact person</span>
                        <p className="text-zinc-300 font-semibold">{selectedSundryParty.contactPerson || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-[8.5px] uppercase font-bold tracking-wider font-mono text-zinc-500 block">Active Phone Line</span>
                        <p className="text-zinc-350 font-mono">{selectedSundryParty.phone || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="text-[8.5px] uppercase font-bold tracking-wider font-mono text-zinc-500 block">GST taxpayers index</span>
                        {selectedSundryParty.gstIn && selectedSundryParty.gstIn !== 'N/A' ? (
                          <span className="inline-flex items-center gap-1.5 mt-1 bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 px-2.5 py-0.5 rounded-full font-mono text-[9.5px] font-bold">
                            <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                            Registered GSTIN: {selectedSundryParty.gstIn}
                          </span>
                        ) : (
                          <span className="text-zinc-550 block italic text-[11px] mt-1">Unregistered taxpayer</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[8.5px] uppercase font-bold tracking-wider font-mono text-zinc-500 block">Email Address</span>
                        <p className="text-zinc-350 lowercase truncate font-mono text-[11px]">{selectedSundryParty.email || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* COMPOSITE SUBSIDIARY LEDGER LOGS SHEET */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-zinc-455 block">Customer/Vendor subsidiary ledger entries ({linkedTransactions.length})</span>
                  <div className="overflow-x-auto rounded-xl border border-zinc-850">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-zinc-900 border-b border-zinc-850 text-zinc-400 font-medium text-[10.5px]">
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Voucher Ref</th>
                          <th className="p-2.5">Ledger Narration</th>
                          <th className="p-2.5">Flow Type</th>
                          <th className="p-2.5 text-right font-mono">Invoice Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850">
                        {linkedTransactions.map(tx => {
                          const isDebitLeg = tx.debitAccount === pName;
                          return (
                            <tr 
                              key={tx.id}
                              onClick={() => setSelectedVoucher(tx)}
                              className="hover:bg-zinc-900 cursor-pointer transition-colors"
                              title="Deep click to audit underlying ledger voucher slip"
                            >
                              <td className="p-2.5 font-mono text-zinc-400 text-[11px] whitespace-nowrap">{tx.date}</td>
                              <td className="p-2.5 font-mono font-bold text-indigo-400">{tx.reference || 'GL-VCH'}</td>
                              <td className="p-2.5 max-w-xxs truncate text-zinc-300 italic">"{tx.description}"</td>
                              <td className="p-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase ${
                                  isDebitLeg ? 'bg-blue-900/15 text-blue-400' : 'bg-amber-900/15 text-amber-400'
                                }`}>
                                  {isDebitLeg ? 'DR RECEIVED / OWED' : 'CR PAID / CREDIT'}
                                </span>
                              </td>
                              <td className="p-2.5 text-right font-mono font-semibold text-zinc-100">
                                ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                        {linkedTransactions.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-zinc-550 italic">No business journal ledger posted against this sundry entity profile yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[9.5px] text-zinc-500 font-mono italic">
                    💡 Deep navigation active: click on any journal entry line in this sundry statement ledger to inspect its full double-entry voucher slip.
                  </p>
                </div>
              </div>

              <div className="bg-zinc-950 px-6 py-4.5 border-t border-zinc-850 flex justify-end text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedSundryParty(null)}
                  className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 rounded-xl font-semibold border border-zinc-850 cursor-pointer"
                >
                  Close Subsidiary Statement
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// ==========================================
// 2. FINAL ACCOUNTS MODULE
// ==========================================
export const FinalAccountsModule: React.FC = () => {
  const store = useStore();

  // Accumulate total balances dynamically from standard ledger rules
  const [activeReportTab, setActiveReportTab] = useState<'trial_balance' | 'pnl' | 'balance_sheet' | 'cash_flow'>('trial_balance');

  // Load custom accounts from localStorage or default seed to correctly map name references
  const [ledgerAccounts] = useState<CustomLedgerAccount[]>(() => {
    const saved = localStorage.getItem('syncledger_custom_accounts');
    try {
      return saved ? JSON.parse(saved) : DEFAULT_LEDGER_ACCOUNTS;
    } catch {
      return DEFAULT_LEDGER_ACCOUNTS;
    }
  });

  // Compile Trial Balance
  const compileTrialBalance = () => {
    const debits: { [account: string]: number } = {};
    const credits: { [account: string]: number } = {};

    ledgerAccounts.forEach(acc => {
      if (acc.initialBalance > 0) {
        const balanceNormal = acc.type === 'Asset' || acc.type === 'Expense';
        if (balanceNormal) {
          debits[acc.name] = (debits[acc.name] || 0) + acc.initialBalance;
        } else {
          credits[acc.name] = (credits[acc.name] || 0) + acc.initialBalance;
        }
      }
    });

    store.db.ledger.forEach(tx => {
      debits[tx.debitAccount] = (debits[tx.debitAccount] || 0) + tx.amount;
      credits[tx.creditAccount] = (credits[tx.creditAccount] || 0) + tx.amount;
    });

    const allAccounts = Array.from(new Set([
      ...Object.keys(debits), 
      ...Object.keys(credits),
      ...ledgerAccounts.map(a => a.name)
    ]));

    return allAccounts.map(accName => {
      const d = debits[accName] || 0;
      const c = credits[accName] || 0;
      let dCol = 0;
      let cCol = 0;

      const matchingDefinedAcc = ledgerAccounts.find(a => a.name === accName);
      const isDebitNormal = matchingDefinedAcc 
        ? (matchingDefinedAcc.type === 'Asset' || matchingDefinedAcc.type === 'Expense')
        : (accName.toLowerCase().includes('bank') ||
           accName.toLowerCase().includes('cash') ||
           accName.toLowerCase().includes('inventory') ||
           accName.toLowerCase().includes('receivable') ||
           accName.toLowerCase().includes('equipment') ||
           accName.toLowerCase().includes('expense') ||
           accName.toLowerCase().includes('cogs'));

      if (isDebitNormal) {
        const net = d - c;
        if (net >= 0) dCol = net;
        else cCol = Math.abs(net);
      } else {
        const net = c - d;
        if (net >= 0) cCol = net;
        else dCol = Math.abs(net);
      }

      return { account: accName, debit: dCol, credit: cCol };
    }).filter(row => row.debit !== 0 || row.credit !== 0);
  };

  const trialBalanceRows = compileTrialBalance();
  const totalDebits = trialBalanceRows.reduce((sum, r) => sum + r.debit, 0);
  const totalCredits = trialBalanceRows.reduce((sum, r) => sum + r.credit, 0);

  // Compile Profit & Loss (Income Statement)
  const compileIncomeStatement = () => {
    let revenue = 0;
    const expenses: { [category: string]: number } = {};

    store.db.ledger.forEach(tx => {
      const lowerDebit = tx.debitAccount.toLowerCase();
      const lowerCredit = tx.creditAccount.toLowerCase();

      if (lowerCredit.includes('revenue')) {
        revenue += tx.amount;
      }
      if (lowerDebit.includes('expense') || lowerDebit.includes('cogs') || lowerDebit.includes('salary')) {
        expenses[tx.debitAccount] = (expenses[tx.debitAccount] || 0) + tx.amount;
      }
    });

    const totalExpense = Object.values(expenses).reduce((sum, val) => sum + val, 0);
    const netProfit = revenue - totalExpense;

    return { revenue, expenses, totalExpense, netProfit };
  };

  const pnl = compileIncomeStatement();

  // Compile Cash Flow Statement
  const compileCashFlowStatement = () => {
    const initialCash = 100000; // Starting Capital
    let operatingInflows = 0;
    let operatingOutflows = 0;
    let investingOutflows = 0;
    let financingInflows = 0;
    let financingOutflows = 0;

    const details: {
      operating: { desc: string; amount: number }[];
      investing: { desc: string; amount: number }[];
      financing: { desc: string; amount: number }[];
    } = {
      operating: [],
      investing: [],
      financing: [],
    };

    store.db.ledger.forEach(tx => {
      const lowerDebit = tx.debitAccount.toLowerCase();
      const lowerCredit = tx.creditAccount.toLowerCase();
      const debitIsCash = lowerDebit.includes('bank') || lowerDebit.includes('cash');
      const creditIsCash = lowerCredit.includes('bank') || lowerCredit.includes('cash');

      if (debitIsCash && !creditIsCash) {
        const amt = tx.amount;
        if (lowerCredit.includes('capital') || lowerCredit.includes('partner') || lowerCredit.includes('equity')) {
          financingInflows += amt;
        } else if (lowerCredit.includes('fixed asset') || lowerCredit.includes('equipment') || lowerCredit.includes('plant')) {
          details.investing.push({ desc: `Inflow from asset disposal: ${tx.description}`, amount: amt });
        } else {
          operatingInflows += amt;
        }
      } else if (creditIsCash && !debitIsCash) {
        const amt = tx.amount;
        if (lowerDebit.includes('capital') || lowerDebit.includes('partner') || lowerDebit.includes('drawings') || lowerDebit.includes('equity')) {
          financingOutflows += amt;
        } else if (lowerDebit.includes('fixed asset') || lowerDebit.includes('equipment') || lowerDebit.includes('plant') || lowerDebit.includes('depreciation') || lowerDebit.includes('office equipment')) {
          investingOutflows += amt;
        } else {
          operatingOutflows += amt;
        }
      }
    });

    if (operatingInflows > 0) {
      details.operating.push({ desc: 'Cash Receipts from Customers & Modules', amount: operatingInflows });
    }
    if (operatingOutflows > 0) {
      details.operating.push({ desc: 'Cash Outflows for Expenses & Statutory Dues', amount: -operatingOutflows });
    }
    if (investingOutflows > 0) {
      details.investing.push({ desc: 'Cash Investment in Fixed Productive Assets', amount: -investingOutflows });
    }
    if (financingInflows > 0) {
      details.financing.push({ desc: 'Equity Inflow from Partner Investments', amount: financingInflows });
    }
    if (financingOutflows > 0) {
      details.financing.push({ desc: 'Owner Drawings / Capital Redeployment', amount: -financingOutflows });
    }

    const netOperating = operatingInflows - operatingOutflows;
    const netInvesting = -investingOutflows;
    const netFinancing = financingInflows - financingOutflows;
    const netIncrease = netOperating + netInvesting + netFinancing;
    const closingCash = initialCash + netIncrease;

    return {
      initialCash,
      details,
      netOperating,
      netInvesting,
      netFinancing,
      netIncrease,
      closingCash
    };
  };

  const cashFlow = compileCashFlowStatement();

  const getNetBalance = (accountNameKeyword: string, isDebitNormal: boolean) => {
    let debits = 0;
    let credits = 0;
    store.db.ledger.forEach(tx => {
      if (tx.debitAccount.toLowerCase().includes(accountNameKeyword.toLowerCase())) {
        debits += tx.amount;
      }
      if (tx.creditAccount.toLowerCase().includes(accountNameKeyword.toLowerCase())) {
        credits += tx.amount;
      }
    });
    return isDebitNormal ? (debits - credits) : (credits - debits);
  };

  // Compile Assets
  // Starting corporate bank accounts contains initial infusions $100k
  const bankAndCash = 100000 + getNetBalance('bank', true) + getNetBalance('cash', true);
  const inventoryAssetVal = getNetBalance('inventory asset', true);
  
  // Non Current Assets
  // Direct purchase cost of active fixed assets
  const fixedAssetCost = store.db.fixedAssets
    .filter(a => a.status === 'active')
    .reduce((sum, a) => sum + a.cost, 0);

  const accumulatedDepreciation = store.db.fixedAssets
    .filter(a => a.status === 'active')
    .reduce((sum, a) => sum + a.accumulatedDepreciation, 0);

  const totalAssets = bankAndCash + inventoryAssetVal + fixedAssetCost - accumulatedDepreciation;

  // Compile Liabilities
  const gstPayable = getNetBalance('gst payable', false);
  const epfLiability = getNetBalance('provident fund', false);
  const tdsLiability = getNetBalance('withholding tax', false);
  const totalLiabilities = gstPayable + epfLiability + tdsLiability;

  // Compile Equity
  // Partners capital allocations
  const totalPartnerCapital = store.db.partners.reduce((sum, p) => sum + p.balance, 0);

  const retainedEarningsVal = pnl.netProfit;

  const totalEquity = totalPartnerCapital + retainedEarningsVal;
  const totalFinancialClaims = totalLiabilities + totalEquity;

  const isBalanced = Math.abs(totalAssets - totalFinancialClaims) < 0.10;

  return (
    <div className="space-y-6 font-sans">
      {/* Tab Selectors inside Final Accounts */}
      <div className="flex flex-wrap gap-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-900 self-start">
        <button
          onClick={() => setActiveReportTab('trial_balance')}
          className={`px-3.5 py-2 text-xs rounded-lg transition-all font-medium ${
            activeReportTab === 'trial_balance' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          ⚖️ Trial Balance
        </button>
        <button
          onClick={() => setActiveReportTab('pnl')}
          className={`px-3.5 py-2 text-xs rounded-lg transition-all font-medium ${
            activeReportTab === 'pnl' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          📈 Profit & Loss Statement (P&L)
        </button>
        <button
          onClick={() => setActiveReportTab('balance_sheet')}
          className={`px-3.5 py-2 text-xs rounded-lg transition-all font-medium ${
            activeReportTab === 'balance_sheet' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          📋 Balance Sheet
        </button>
        <button
          onClick={() => setActiveReportTab('cash_flow')}
          className={`px-3.5 py-2 text-xs rounded-lg transition-all font-medium ${
            activeReportTab === 'cash_flow' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          💸 Cash Flow
        </button>
      </div>

      {/* Trial Balance VIEW */}
      {activeReportTab === 'trial_balance' && (
        <div className="bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 tracking-wide">DOUBLE-ENTRY AUTOMATED TRIAL BALANCE</h3>
            <p className="text-xs text-zinc-450">Calculated on the flying dual-side trial balance ledger. Both columns must perfectly balance.</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-850">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-900 border-b border-zinc-850 text-zinc-350 font-semibold uppercase tracking-wider text-[10px] text-zinc-450">
                  <th className="p-3">Standard Account Classification Description</th>
                  <th className="p-3 text-right">Debit Balances ($)</th>
                  <th className="p-3 text-right">Credit Balances ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {trialBalanceRows.map((row, index) => (
                  <tr key={index} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="p-3 font-semibold text-zinc-250 font-sans">{row.account}</td>
                    <td className={`p-3 text-right font-mono text-zinc-300 ${row.debit > 0 ? 'font-bold' : ''}`}>
                      {row.debit > 0 ? `$${row.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className={`p-3 text-right font-mono text-zinc-300 ${row.credit > 0 ? 'font-bold' : ''}`}>
                      {row.credit > 0 ? `$${row.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                  </tr>
                ))}
                <tr className="bg-zinc-950 font-bold border-t-2 border-zinc-700">
                  <td className="p-4 uppercase text-zinc-200 tracking-wide">Grand Unified Ledger Summary Totals</td>
                  <td className="p-4 text-right font-mono text-emerald-400 text-sm">${totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="p-4 text-right font-mono text-emerald-400 text-sm">${totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {Math.abs(totalDebits - totalCredits) < 0.05 ? (
            <div className="bg-emerald-950/20 border border-emerald-900 text-emerald-400 p-3 rounded-lg text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>Perfect Balance Confirmed! Double-entry ledger parity is complete and validated.</span>
            </div>
          ) : (
            <div className="bg-amber-955/20 bg-amber-950/20 border border-amber-900 text-amber-400 p-3 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Discrepancy Alarm: Debits and Credits columns differ by ${Math.abs(totalDebits - totalCredits).toLocaleString()}. Please check manual entries and balance sheets.</span>
            </div>
          )}
        </div>
      )}

      {/* Profit & Loss (P&L) VIEW */}
      {activeReportTab === 'pnl' && (
        <div className="bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-sm space-y-4 font-sans">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 tracking-wide">INTERIM PROFIT & LOSS STATEMENT (P&L)</h3>
            <p className="text-xs text-zinc-450">Operating performance review computed directly from revenue and cost of goods ledger entries.</p>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl space-y-6">
            <div className="text-center pb-4 border-b border-zinc-800">
              <h4 className="font-semibold text-zinc-200 tracking-wide uppercase text-sm">Tunzua Financial Statement</h4>
              <p className="text-[10px] font-mono text-zinc-500 font-sans mt-0.5">Serving the needs of other people</p>
              <p className="text-[10px] font-mono text-zinc-500 mt-1">For the period ending: June 20, 2026</p>
            </div>

            {/* Revenue SECTION */}
            <div className="space-y-2">
              <div className="flex justify-between font-semibold border-b border-zinc-850 pb-1 text-xs">
                <span className="uppercase text-zinc-400 font-mono tracking-widest text-[10px]">I. Operating Revenues</span>
              </div>
              <div className="flex justify-between text-xs pl-4 text-zinc-300 font-mono">
                <span>Revenue Account (Product Inventory Sales)</span>
                <span>${pnl.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold border-b border-zinc-755 text-xs pt-1 pl-4 font-mono">
                <span>Gross Revenue Sales</span>
                <span className="text-emerald-400">${pnl.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* EXPENSES SECTION */}
            <div className="space-y-2">
              <div className="flex justify-between font-semibold border-b border-zinc-850 pb-1 text-xs">
                <span className="uppercase text-zinc-400 font-mono tracking-widest text-[10px]">II. Operating Expenses</span>
              </div>
              {Object.keys(pnl.expenses).map((accName, i) => (
                <div key={i} className="flex justify-between text-xs pl-4 text-zinc-300 font-mono">
                  <span>{accName}</span>
                  <span>${pnl.expenses[accName].toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
              {Object.keys(pnl.expenses).length === 0 && (
                <div className="text-zinc-550 italic text-xs pl-4">No active operating expenses posted.</div>
              )}
              <div className="flex justify-between font-bold border-b border-zinc-755 text-xs pt-1 pl-4 font-mono text-zinc-350">
                <span>Total General Operating Expenses</span>
                <span>(${pnl.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })})</span>
              </div>
            </div>

            {/* NET OUTCOME */}
            <div className="pt-4 border-t-2 border-dashed border-zinc-755 flex justify-between items-center bg-zinc-900/40 p-4 rounded-xl">
              <span className="font-bold text-sm text-zinc-200">NET RETAINED OPERATING INCOME</span>
              <span className={`text-lg font-bold font-mono ${pnl.netProfit >= 0 ? 'text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.1)]' : 'text-red-400'}`}>
                ${pnl.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Balance Sheet VIEW */}
      {activeReportTab === 'balance_sheet' && (
        <div className="bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 tracking-wide">DOUBLE-ENTRY BALANCE SHEET</h3>
              <p className="text-xs text-zinc-455">Real-time assets, liabilities, and retained capital positions (Accrual basis).</p>
            </div>
            <div className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 ${
              isBalanced ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30' : 'bg-red-950/40 text-red-400 border border-red-800/20'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
              {isBalanced ? 'Asset Balance Equalized' : 'Unbalanced Suspense Variance'}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-zinc-950 border border-zinc-800 rounded-xl p-5 font-sans">
            
            {/* LEFT COLUMN: ACTIVE ASSETS */}
            <div className="space-y-4">
              <h4 className="font-semibold text-zinc-400 uppercase tracking-widest text-[10px] pb-1 border-b border-zinc-800">I. Corporate Assets</h4>
              
              <div className="space-y-2">
                <h5 className="font-semibold text-zinc-350 text-xs">Current & Cash Assets</h5>
                <div className="flex justify-between text-xs pl-4 text-zinc-300 font-mono">
                  <span>Cash & Corporate Bank Balances</span>
                  <span>${bankAndCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs pl-4 text-zinc-300 font-mono">
                  <span>Ending Inventory Valuations (At Cost)</span>
                  <span>${inventoryAssetVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h5 className="font-semibold text-zinc-350 text-xs">Long-term Fixed Assets</h5>
                <div className="flex justify-between text-xs pl-4 text-zinc-300 font-mono">
                  <span>Property, Plant & Office Equipment</span>
                  <span>${fixedAssetCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs pl-4 text-red-400 font-mono">
                  <span>Less: Accumulated Depreciation Allowance</span>
                  <span>(${accumulatedDepreciation.toLocaleString(undefined, { minimumFractionDigits: 2 })})</span>
                </div>
              </div>

              <div className="flex justify-between font-bold border-t-2 border-zinc-800 pt-3 text-sm mt-4 bg-zinc-900/30 px-3 py-2 rounded-lg">
                <span className="text-zinc-200 uppercase tracking-wider text-[11px]">Total Operating Assets</span>
                <span className="font-mono text-emerald-400">${totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* RIGHT COLUMN: LIABILITIES & CAPITAL EQUITY */}
            <div className="space-y-4">
              <h4 className="font-semibold text-zinc-400 uppercase tracking-widest text-[10px] pb-1 border-b border-zinc-800">II. Liabilities & Owner Equity</h4>
              
              <div className="space-y-2">
                <h5 className="font-semibold text-zinc-350 text-xs">Current Operating Liabilities</h5>
                <div className="flex justify-between text-xs pl-4 text-zinc-300 font-mono">
                  <span>GST Computations Payable (Tax Liab.)</span>
                  <span>${gstPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs pl-4 text-zinc-300 font-mono">
                  <span>Staff statutory PF Holdings Suspense</span>
                  <span>${epfLiability.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs pl-4 text-zinc-300 font-mono">
                  <span>payroll Statutory Taxes TDS Payable</span>
                  <span>${tdsLiability.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-bold border-b border-zinc-850 text-xs pt-1 pl-4 font-mono text-zinc-350">
                  <span>Total Operating Liabilities</span>
                  <span>${totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h5 className="font-semibold text-zinc-350 text-xs">Owner Partner Equity Accounts</h5>
                <div className="flex justify-between text-xs pl-4 text-zinc-300 font-mono">
                  <span>Paid-in Partner Capital Fund</span>
                  <span>${totalPartnerCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs pl-4 text-zinc-300 font-mono">
                  <span>Retained Operational Net Earnings</span>
                  <span>${retainedEarningsVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="flex justify-between font-bold border-t-2 border-zinc-800 pt-3 text-sm mt-4 bg-zinc-900/30 px-3 py-2 rounded-lg">
                <span className="text-zinc-200 uppercase tracking-wider text-[11px]">Total Equity & Claims</span>
                <span className="font-mono text-emerald-400">${totalFinancialClaims.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

          </div>

          <div className="mt-4 text-center text-[10px] font-mono text-zinc-550 uppercase tracking-widest">
            Accrual balanced verification matrix: ${totalAssets.toFixed(2)} [ASSETS] === {totalFinancialClaims.toFixed(2)} [LIABILITIES + EQUITY]
          </div>
        </div>
      )}

      {/* Cash Flow VIEW */}
      {activeReportTab === 'cash_flow' && (
        <div className="bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 tracking-wide">DOUBLE-ENTRY CASH FLOW STATEMENT</h3>
            <p className="text-xs text-zinc-450">Reconciles starting and closing cash balances (Direct Method) of operating, investing, and financing items.</p>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl space-y-6">
            <div className="text-center pb-4 border-b border-zinc-800">
              <h4 className="font-semibold text-zinc-200 tracking-wide uppercase text-sm">Tunzua Financial Statement</h4>
              <p className="text-[10px] text-zinc-500 font-sans mt-0.5">Cash Flows Statement (Direct Method)</p>
              <p className="text-[10px] font-mono text-zinc-500 mt-1">For the period ending: June 20, 2026</p>
            </div>

            {/* A. OPERATING FLOWS */}
            <div className="space-y-2">
              <div className="flex justify-between font-semibold border-b border-zinc-850 pb-1 text-xs">
                <span className="uppercase text-zinc-400 font-mono tracking-widest text-[10px]">I. Cash Flows from Operating Activities</span>
                <span className={`font-mono ${cashFlow.netOperating >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${cashFlow.netOperating.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              {cashFlow.details.operating.map((item, i) => (
                <div key={i} className="flex justify-between text-xs pl-4 text-zinc-300 font-mono">
                  <span>{item.desc}</span>
                  <span className={item.amount >= 0 ? 'text-emerald-500' : 'text-zinc-400'}>
                    {item.amount >= 0 ? '' : '('}${Math.abs(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}{item.amount >= 0 ? '' : ')'}
                  </span>
                </div>
              ))}
              {cashFlow.details.operating.length === 0 && (
                <div className="text-zinc-550 italic text-xs pl-4">No active cash flow movements posted.</div>
              )}
            </div>

            {/* B. INVESTING FLOWS */}
            <div className="space-y-2">
              <div className="flex justify-between font-semibold border-b border-zinc-850 pb-1 text-xs">
                <span className="uppercase text-zinc-400 font-mono tracking-widest text-[10px]">II. Cash Flows from Investing Activities</span>
                <span className={`font-mono ${cashFlow.netInvesting >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${cashFlow.netInvesting >= 0 ? '' : '-'}${Math.abs(cashFlow.netInvesting).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              {cashFlow.details.investing.map((item, i) => (
                <div key={i} className="flex justify-between text-xs pl-4 text-zinc-300 font-mono">
                  <span>{item.desc}</span>
                  <span className={item.amount >= 0 ? 'text-emerald-500' : 'text-zinc-400'}>
                    {item.amount >= 0 ? '' : '('}${Math.abs(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}{item.amount >= 0 ? '' : ')'}
                  </span>
                </div>
              ))}
              {cashFlow.details.investing.length === 0 && (
                <div className="text-zinc-550 italic text-xs pl-4">No active plant/equipment transactions posted.</div>
              )}
            </div>

            {/* C. FINANCING FLOWS */}
            <div className="space-y-2">
              <div className="flex justify-between font-semibold border-b border-zinc-850 pb-1 text-xs">
                <span className="uppercase text-zinc-400 font-mono tracking-widest text-[10px]">III. Cash Flows from Financing Activities</span>
                <span className={`font-mono ${cashFlow.netFinancing >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${cashFlow.netFinancing >= 0 ? '' : '-'}${Math.abs(cashFlow.netFinancing).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              {cashFlow.details.financing.map((item, i) => (
                <div key={i} className="flex justify-between text-xs pl-4 text-zinc-300 font-mono">
                  <span>{item.desc}</span>
                  <span className={item.amount >= 0 ? 'text-emerald-500' : 'text-zinc-400'}>
                    {item.amount >= 0 ? '' : '('}${Math.abs(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}{item.amount >= 0 ? '' : ')'}
                  </span>
                </div>
              ))}
              {cashFlow.details.financing.length === 0 && (
                <div className="text-zinc-550 italic text-xs pl-4">No capital movements registered.</div>
              )}
            </div>

            {/* CASH RECONCILIATION SUMMARY */}
            <div className="pt-4 border-t-2 border-dashed border-zinc-755 space-y-2.5">
              <div className="flex justify-between text-xs text-zinc-400 font-medium font-mono pl-2">
                <span>NET INCREASE IN CASH AND CASH EQUIVALENTS</span>
                <span className={cashFlow.netIncrease >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {cashFlow.netIncrease >= 0 ? '+' : '-'}${Math.abs(cashFlow.netIncrease).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-xs text-zinc-400 font-medium font-mono pl-2">
                <span>CASH AND CASH EQUIV. AT BEGINNING OF YEAR</span>
                <span className="text-zinc-200 font-bold">${cashFlow.initialCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              
              <div className="border-t border-zinc-800 pt-2.5 flex justify-between items-center bg-zinc-900/60 p-4 rounded-xl">
                <span className="font-bold text-sm text-zinc-100">CASH AND CASH EQUIV. AT END OF PERIOD</span>
                <span className="text-lg font-bold font-mono text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.1)]">
                  ${cashFlow.closingCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-900 text-emerald-400 p-3 rounded-lg text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>Balance Checked: Cash balance matches physical trial ledger cash positions of ${bankAndCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}.</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 3. FIXED ASSETS MODULE & DEPRECIATION
// ==========================================
export const FixedAssetsModule: React.FC = () => {
  const store = useStore();
  const [showForm, setShowForm] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [qty, setQty] = useState('1');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [depreciationRate, setDepreciationRate] = useState('15');
  const [depreciationMethod, setDepreciationMethod] = useState<'straight_line' | 'wdv'>('wdv');
  const [usefulLife, setUsefulLife] = useState('5');
  const [salvageVal, setSalvageVal] = useState('0');

  const [disposalId, setDisposalId] = useState('');
  const [disposalDate, setDisposalDate] = useState(new Date().toISOString().split('T')[0]);
  const [disposalValue, setDisposalValue] = useState('');
  const [disposalLog, setDisposalLog] = useState('');

  const liveCost = (parseFloat(qty) || 0) * (parseFloat(purchasePrice) || 0);

  const handleSubmitAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName || liveCost <= 0) return;

    store.addFixedAsset({
      id: `asset-${Date.now()}`,
      name: assetName,
      purchaseDate,
      cost: liveCost,
      qty: parseInt(qty) || 1,
      purchasePrice: parseFloat(purchasePrice) || 0,
      depreciationRate: parseFloat(depreciationRate) || 15,
      depreciationMethod: depreciationMethod,
      usefulLifeYears: parseInt(usefulLife) || 5,
      salvageValue: parseFloat(salvageVal) || 0,
    });

    setAssetName('');
    setQty('1');
    setPurchasePrice('');
    setDepreciationRate('15');
    setDepreciationMethod('wdv');
    setUsefulLife('5');
    setSalvageVal('0');
    setShowForm(false);
    store.triggerSync();
  };

  const handleDisposeAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disposalId || !disposalValue) return;

    store.disposeAsset(
      disposalId,
      disposalDate,
      parseFloat(disposalValue),
      disposalLog || "Standard asset disposal writeoff."
    );

    setDisposalId('');
    setDisposalValue('');
    setDisposalLog('');
    store.triggerSync();
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      {/* Asset logs list */}
      <div className="xl:col-span-2 bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 tracking-wide">FIXED ASSETS REGISTRATION</h3>
            <p className="text-xs text-zinc-455">Track capital expenditure, historical costs and WDV / Straight-Line depreciation write-offs.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                store.depreciateAssets();
                store.triggerSync();
              }}
              className="px-3 py-1.5 bg-indigo-900/40 text-indigo-400 hover:bg-indigo-900/60 text-xs rounded-md font-medium border border-indigo-800/40 flex items-center gap-1.5 transition-colors"
              title="Click to run Straight Line or WDV Income Tax depreciation rule calculations"
            >
              <Calendar className="w-4 h-4" />
              Depreciate Assets
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-100 text-xs rounded-md font-medium flex items-center gap-1.5 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Register Asset
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmitAsset} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-mono text-zinc-450 mb-1">Item Name</label>
              <input
                type="text"
                required
                value={assetName}
                onChange={e => setAssetName(e.target.value)}
                placeholder="e.g. Cisco Server Racks"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono text-zinc-450 mb-1">Purchase Date</label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono text-zinc-450 mb-1">Qty</label>
              <input
                type="number"
                required
                min="1"
                value={qty}
                onChange={e => setQty(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono text-zinc-450 mb-1">Purchase Price ($)</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={purchasePrice}
                onChange={e => setPurchasePrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono text-zinc-450 mb-1">Depreciation %</label>
              <input
                type="number"
                required
                min="0"
                max="100"
                step="0.1"
                value={depreciationRate}
                onChange={e => setDepreciationRate(e.target.value)}
                placeholder="15%"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono text-zinc-450 mb-1">Depreciation Method</label>
              <select
                value={depreciationMethod}
                onChange={e => setDepreciationMethod(e.target.value as 'straight_line' | 'wdv')}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200"
              >
                <option value="wdv">Written Down Value (IT 180-Day Rule)</option>
                <option value="straight_line">Straight Line Method</option>
              </select>
            </div>
            {depreciationMethod === 'straight_line' && (
              <>
                <div>
                  <label className="block text-[10px] uppercase font-mono text-zinc-450 mb-1">Useful Life (Years)</label>
                  <input
                    type="number"
                    value={usefulLife}
                    onChange={e => setUsefulLife(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-mono text-zinc-450 mb-1">Salvage Value ($)</label>
                  <input
                    type="number"
                    value={salvageVal}
                    onChange={e => setSalvageVal(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 font-mono"
                  />
                </div>
              </>
            )}
            <div className="flex flex-col justify-end text-right p-1 md:col-span-3">
              <span className="text-[10px] font-mono text-emerald-400 mb-2">
                Auto-calculated Total Cost: ${liveCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-zinc-100 text-xs font-semibold rounded-md transition-colors cursor-pointer"
              >
                Register Fixed Asset
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] text-zinc-500 uppercase tracking-widest">
                <th className="pb-3">Asset Item</th>
                <th className="pb-3">Acq. Date</th>
                <th className="pb-3 text-right">Cost</th>
                <th className="pb-3 text-right">acc. dep.</th>
                <th className="pb-3 text-right">Book Value</th>
                <th className="pb-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {store.db.fixedAssets.map(asset => (
                <tr key={asset.id} className="hover:bg-zinc-900/40">
                  <td className="py-3 font-sans">
                    <div className="text-zinc-200 font-medium">{asset.name}</div>
                    <div className="text-[10px] font-mono text-zinc-550 mt-1 flex flex-col gap-0.5">
                      {asset.qty !== undefined && (
                        <span>Qty: {asset.qty} @ ${asset.purchasePrice?.toLocaleString()} each</span>
                      )}
                      <span>
                        Method: {asset.depreciationMethod === 'wdv' ? 'WDV (IT Rule)' : 'Straight Line'}{' '}
                        ({asset.depreciationRate || 15}%)
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-zinc-400">{asset.purchaseDate}</td>
                  <td className="py-3 text-right text-zinc-200">${asset.cost.toLocaleString()}</td>
                  <td className="py-3 text-right text-red-400">-${asset.accumulatedDepreciation.toLocaleString()}</td>
                  <td className="py-3 text-right text-emerald-400 font-semibold">${asset.currentBookValue.toLocaleString()}</td>
                  <td className="py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold ${
                      asset.status === 'active' ? 'bg-emerald-950 border border-emerald-900/60 text-emerald-400' : 'bg-zinc-800 border border-zinc-700 text-zinc-400'
                    }`}>
                      {asset.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disposal Form Panel */}
      <div className="bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-sm h-fit">
        <h3 className="text-xs font-semibold text-zinc-150 uppercase tracking-widest pb-2 border-b border-zinc-800 mb-4">De-commission & Asset Disposal</h3>
        
        <form onSubmit={handleDisposeAsset} className="space-y-4">
          <div>
            <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Target Asset</label>
            <select
              value={disposalId}
              required
              onChange={e => setDisposalId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none"
            >
              <option value="">-- Choose active asset --</option>
              {store.db.fixedAssets
                .filter(a => a.status === 'active')
                .map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} (Val: ${a.currentBookValue})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Disposal Date</label>
            <input
              type="date"
              value={disposalDate}
              onChange={e => setDisposalDate(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Salvage Value / Disposal Revenue ($)</label>
            <input
              type="number"
              required
              value={disposalValue}
              onChange={e => setDisposalValue(e.target.value)}
              placeholder="0.00"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Disposal Log Narrative</label>
            <textarea
              value={disposalLog}
              onChange={e => setDisposalLog(e.target.value)}
              placeholder="e.g. Scrapped due to motherboard malfunction."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-300 h-16"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-red-950 border border-red-900/50 hover:bg-red-900 hover:text-white transition-colors text-red-400 text-xs font-semibold rounded-lg"
          >
            Log Disposal & Writeoff
          </button>
        </form>
      </div>

    </div>
  );
};

// ==========================================
// 4. PARTNERS CAPITAL ACCOUNTS MODULE
// ==========================================
export const CapitalModule: React.FC = () => {
  const store = useStore();
  const [partnerId, setPartnerId] = useState('');
  const [actionType, setActionType] = useState<'contribution' | 'withdrawal' | 'distribution'>('contribution');
  const [amount, setAmount] = useState('');

  const handleCapitalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerId || !amount) return;

    store.adjustPartnerCapital(partnerId, actionType, parseFloat(amount));
    setAmount('');
    store.triggerSync();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Partner Capital list */}
      <div className="lg:col-span-2 bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 tracking-wide">PARTNERS CAPITAL ACCOUNTS</h3>
          <p className="text-xs text-zinc-455">Track individual contributions, draws, and operational equity allocations.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {store.db.partners.map(p => (
            <div key={p.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-zinc-200 text-xs">{p.partnerName}</span>
                  <span className="bg-indigo-900/45 text-indigo-400 border border-indigo-800/40 text-[9px] font-mono px-2 py-0.5 rounded-full uppercase">
                    {p.profitSharePercentage}% profit stake
                  </span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">CODE ID: {p.id}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] font-mono text-zinc-400">
                <div className="bg-zinc-900 border border-zinc-850 p-2 rounded">
                  <div className="text-zinc-500 uppercase">Paid-In</div>
                  <div className="text-xs font-semibold text-zinc-200">${p.contributions.toLocaleString()}</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-850 p-2 rounded">
                  <div className="text-zinc-500 uppercase">Equity Draws</div>
                  <div className="text-xs font-semibold text-zinc-200">${p.withdrawals.toLocaleString()}</div>
                </div>
              </div>

              <div className="border-t border-zinc-850 pt-3 mt-3 flex justify-between items-center">
                <span className="text-[10px] uppercase font-semibold text-zinc-400">Claims Balance</span>
                <span className="font-mono text-emerald-400 font-bold text-sm">${p.balance.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Allocate Form */}
      <div className="bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-sm h-fit">
        <h3 className="text-xs font-semibold text-zinc-150 uppercase tracking-widest pb-2 border-b border-zinc-800 mb-4">Capital adjustment ledger</h3>

        <form onSubmit={handleCapitalSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Select Partner</label>
            <select
              required
              value={partnerId}
              onChange={e => setPartnerId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none"
            >
              <option value="">-- Choose partner --</option>
              {store.db.partners.map(p => (
                <option key={p.id} value={p.id}>
                  {p.partnerName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Allocation Action</label>
            <select
              value={actionType}
              onChange={e => setActionType(e.target.value as any)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none"
            >
              <option value="contribution">Capital Infusion / Contribution (Credited)</option>
              <option value="withdrawal">Partner Withdrawal / Drawings (Debited)</option>
              <option value="distribution">Profit distribution Release (Debited)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Transaction Value ($)</label>
            <input
              type="number"
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-100 font-mono"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 transition-colors text-zinc-100 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Commit capital Entry
          </button>
        </form>
      </div>

    </div>
  );
};
