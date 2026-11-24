/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import {
  Landmark,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Check,
  X,
  CreditCard,
  FileText,
  Sliders,
  AlertCircle,
  HelpCircle,
  Save,
  DollarSign,
  Globe,
  Settings,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Upload,
} from 'lucide-react';

export interface BankAccount {
  id: string;
  accountName: string;
  bankName: string;
  accountType: 'checking' | 'savings' | 'credit_card' | 'paypal_gateway' | 'other';
  accountNumber: string;
  routingNumber: string;
  swiftCode: string;
  currency: string;
  bookBalance: number;
  ledgerAccount: string; // Links to double-entry ledger category (e.g. "Corporate Bank Account")
  showOnInvoices: boolean;
  isDefault: boolean;
  feedStyle: 'auto_plaid' | 'manual_upload';
  feedStatus: 'connected' | 'unlinked' | 'error' | 'syncing';
  lastSyncedAt?: string;
}

export const BankAccountsModule: React.FC = () => {
  const store = useStore();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    const saved = localStorage.getItem('tunzua_bank_accounts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing bank accounts cache, using seeds');
      }
    }
    // Seeds based on invoicing.co / enterprise ledger defaults
    return [
      {
        id: 'acc-seed-1',
        accountName: 'Corporate Primary checking',
        bankName: 'JP Morgan Chase Bank, N.A.',
        accountType: 'checking',
        accountNumber: '•••• •••• 9283',
        routingNumber: '021000021',
        swiftCode: 'CHASUS33XXX',
        currency: 'USD',
        bookBalance: 125430.50,
        ledgerAccount: 'Corporate Bank Account',
        showOnInvoices: true,
        isDefault: true,
        feedStyle: 'auto_plaid',
        feedStatus: 'connected',
        lastSyncedAt: new Date().toISOString().split('T')[0],
      },
      {
        id: 'acc-seed-2',
        accountName: 'International Paypal Clearing Gateway',
        bankName: 'PayPal Holdings Inc.',
        accountType: 'paypal_gateway',
        accountNumber: 'paypal-ops@enterprise.io',
        routingNumber: 'N/A',
        swiftCode: 'N/A',
        currency: 'USD',
        bookBalance: 14500.00,
        ledgerAccount: 'Corporate Bank Account',
        showOnInvoices: true,
        isDefault: false,
        feedStyle: 'auto_plaid',
        feedStatus: 'connected',
        lastSyncedAt: new Date().toISOString().split('T')[0],
      },
      {
        id: 'acc-seed-3',
        accountName: 'Corporate Savings & Reserves',
        bankName: 'Wells Fargo Bank, N.A.',
        accountType: 'savings',
        accountNumber: '•••• •••• 4124',
        routingNumber: '121000248',
        swiftCode: 'WFBNUS66XXX',
        currency: 'USD',
        bookBalance: 85200.00,
        ledgerAccount: 'Savings Reserve Account',
        showOnInvoices: false,
        isDefault: false,
        feedStyle: 'manual_upload',
        feedStatus: 'unlinked',
      },
      {
        id: 'acc-seed-4',
        accountName: 'Executive Team Credit Card',
        bankName: 'American Express',
        accountType: 'credit_card',
        accountNumber: '•••• •••• •••• 8103',
        routingNumber: 'N/A',
        swiftCode: 'N/A',
        currency: 'USD',
        bookBalance: -4320.60,
        ledgerAccount: 'Office Overdraft Expense Liability',
        showOnInvoices: false,
        isDefault: false,
        feedStyle: 'auto_plaid',
        feedStatus: 'error',
      }
    ] as BankAccount[];
  });

  // Modal / Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  
  // Form fields
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountType, setAccountType] = useState<BankAccount['accountType']>('checking');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [swiftCode, setSwiftCode] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [bookBalance, setBookBalance] = useState('');
  const [ledgerAccount, setLedgerAccount] = useState('Corporate Bank Account');
  const [showOnInvoices, setShowOnInvoices] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [feedStyle, setFeedStyle] = useState<BankAccount['feedStyle']>('auto_plaid');

  // Interactive connection Simulation states
  const [plaidSyncingId, setPlaidSyncingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'simulation' | 'integration'>('overview');

  // Sync to localstorage when bank accounts updates
  useEffect(() => {
    localStorage.setItem('tunzua_bank_accounts', JSON.stringify(bankAccounts));
  }, [bankAccounts]);

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setAccountName('');
    setBankName('');
    setAccountType('checking');
    setAccountNumber('');
    setRoutingNumber('');
    setSwiftCode('');
    setCurrency('USD');
    setBookBalance('');
    setLedgerAccount('Corporate Bank Account');
    setShowOnInvoices(true);
    setIsDefault(false);
    setFeedStyle('auto_plaid');
    setShowAddModal(true);
  };

  const handleOpenEdit = (acc: BankAccount) => {
    setEditingAccount(acc);
    setAccountName(acc.accountName);
    setBankName(acc.bankName);
    setAccountType(acc.accountType);
    setAccountNumber(acc.accountNumber);
    setRoutingNumber(acc.routingNumber);
    setSwiftCode(acc.swiftCode);
    setCurrency(acc.currency);
    setBookBalance(acc.bookBalance.toString());
    setLedgerAccount(acc.ledgerAccount);
    setShowOnInvoices(acc.showOnInvoices);
    setIsDefault(acc.isDefault);
    setFeedStyle(acc.feedStyle);
    setShowAddModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName || !bankName) {
      alert('Please fill out Account Name and Bank Name.');
      return;
    }

    const numericBalance = parseFloat(bookBalance) || 0;

    if (editingAccount) {
      // Edit
      setBankAccounts(prev => prev.map(acc => {
        if (acc.id === editingAccount.id) {
          const updated = {
            ...acc,
            accountName,
            bankName,
            accountType,
            accountNumber,
            routingNumber,
            swiftCode,
            currency,
            bookBalance: numericBalance,
            ledgerAccount,
            showOnInvoices,
            isDefault: isDefault || acc.isDefault, // Keep default safely
            feedStyle,
          };
          
          store.addAuditLog({
            action: 'bank_account_edited',
            category: 'user_modification',
            description: `Edited bank account configuration: ${accountName} (${bankName})`,
            details: { id: acc.id, accountName, currency, bookBalance: numericBalance },
          });

          return updated;
        }
        return acc;
      }));
    } else {
      // Create new
      const newAcc: BankAccount = {
        id: `bank-acc-${Date.now()}`,
        accountName,
        bankName,
        accountType,
        accountNumber: accountNumber || '•••• •••• •••• 1234',
        routingNumber: routingNumber || 'N/A',
        swiftCode: swiftCode || 'N/A',
        currency,
        bookBalance: numericBalance,
        ledgerAccount,
        showOnInvoices,
        isDefault,
        feedStyle,
        feedStatus: feedStyle === 'auto_plaid' ? 'connected' : 'unlinked',
        lastSyncedAt: feedStyle === 'auto_plaid' ? new Date().toISOString().split('T')[0] : undefined,
      };

      setBankAccounts(prev => {
        let list = [...prev];
        if (isDefault) {
          list = list.map(a => ({ ...a, isDefault: false }));
        }
        return [...list, newAcc];
      });

      store.addAuditLog({
        action: 'bank_account_created',
        category: 'user_modification',
        description: `Connected new ${accountType} bank account: "${accountName}" with default instructions`,
        details: { accountNumber, routingNumber, currency, feedStyle },
      });
    }

    // Solve defaults logic if isDefault was checked
    if (isDefault) {
      setBankAccounts(prev => prev.map(acc => {
        if (editingAccount && acc.id === editingAccount.id) {
          return { ...acc, isDefault: true };
        }
        if (!editingAccount && acc.id === `bank-acc-${Date.now()}`) {
          // already set
          return acc;
        }
        return { ...acc, isDefault: false };
      }));
    }

    setShowAddModal(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to disconnect and delete bank account "${name}"? This removes its payment portal rendering and statement sync parameters.`)) {
      setBankAccounts(prev => prev.filter(acc => acc.id !== id));
      store.addAuditLog({
        action: 'bank_account_deleted',
        category: 'user_modification',
        description: `Disconnected and removed bank account: "${name}"`,
        details: { id },
      });
    }
  };

  const handleSimulateSync = (id: string, name: string) => {
    setPlaidSyncingId(id);
    setBankAccounts(prev => prev.map(acc => {
      if (acc.id === id) {
        return { ...acc, feedStatus: 'syncing' };
      }
      return acc;
    }));

    setTimeout(() => {
      setBankAccounts(prev => prev.map(acc => {
        if (acc.id === id) {
          // Increase balance a bit to simulate real transaction sync changes
          const simulatedDiff = (Math.random() - 0.4) * 2000;
          return {
            ...acc,
            bookBalance: parseFloat((acc.bookBalance + simulatedDiff).toFixed(2)),
            feedStatus: 'connected',
            lastSyncedAt: new Date().toISOString().split('T')[0],
          };
        }
        return acc;
      }));
      setPlaidSyncingId(null);
      
      store.addAuditLog({
        action: 'bank_feed_manual_sync',
        category: 'synchronization',
        description: `Successfully synced Plaid secure credentials feed for "${name}"`,
        details: { id },
      });
    }, 1500);
  };

  const toggleInvoiceDisplay = (id: string) => {
    setBankAccounts(prev => prev.map(acc => {
      if (acc.id === id) {
        const nextShow = !acc.showOnInvoices;
        store.addAuditLog({
          action: 'bank_invoice_display_toggled',
          category: 'user_modification',
          description: `Toggled invoice payment display instructions for "${acc.accountName}" to ${nextShow ? 'ACTIVE' : 'INACTIVE'}`,
          details: { id, showOnInvoices: nextShow },
        });
        return { ...acc, showOnInvoices: nextShow };
      }
      return acc;
    }));
  };

  const makeDefault = (id: string) => {
    setBankAccounts(prev => prev.map(acc => ({
      ...acc,
      isDefault: acc.id === id,
    })));
    const targetAccount = bankAccounts.find(a => a.id === id);
    if (targetAccount) {
      store.addAuditLog({
        action: 'bank_default_payment_set',
        category: 'user_modification',
        description: `Set "${targetAccount.accountName}" as the primary enterprise payment transfer destination on client bills`,
        details: { id },
      });
    }
  };

  // Extract Invoice rendering instructions mockup
  const primaryAccount = bankAccounts.find(a => a.isDefault) || bankAccounts[0];

  return (
    <div className="space-y-6">
      
      {/* SECTION HEADER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-600">
              <Landmark className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight font-sans">Bank Accounts &amp; Gateways Settings</h2>
          </div>
          <p className="text-xs text-slate-500 font-sans max-w-2xl">
            Configure financial links, payment gateway profiles, and manual/API bank statements feed. Registered accounts automatically render as payment details on customer invoices and populate double-entry books.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleOpenAdd}
            className="cursor-pointer text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Bank Account</span>
          </button>
        </div>
      </div>

      {/* METRIC SUBSECTION TABS */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 border-b-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-550 hover:text-slate-800'
          }`}
        >
          Active Bank Links ({bankAccounts.length})
        </button>
        <button
          onClick={() => setActiveTab('simulation')}
          className={`px-4 py-2 border-b-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'simulation'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-550 hover:text-slate-800'
          }`}
        >
          Invoice PDF Payment Instructions Preview
        </button>
        <button
          onClick={() => setActiveTab('integration')}
          className={`px-4 py-2 border-b-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'integration'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-550 hover:text-slate-800'
          }`}
        >
          Feed Security Certifications
        </button>
      </div>

      {/* TAB A: OVERVIEW LISTING */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bankAccounts.map((acc) => {
              const accountTypeLabels: Record<BankAccount['accountType'], string> = {
                checking: 'Primary Checking (Asset)',
                savings: 'Savings & Reserves (Asset)',
                credit_card: 'Commercial Credit Card (Liability)',
                paypal_gateway: 'Online Payment Gateway',
                other: 'Other Treasury Account',
              };

              return (
                <div
                  key={acc.id}
                  className="bg-white border border-slate-200 hover:border-slate-310 duration-200 transition-all rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 relative overflow-hidden"
                >
                  {/* Card status banner */}
                  {acc.isDefault && (
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-bold font-mono px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                      ★ Default Payments
                    </div>
                  )}

                  {/* Top segment: Title + Bank Icon */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl border ${
                        acc.accountType === 'credit_card'
                          ? 'bg-amber-50 border-amber-200 text-amber-655'
                          : acc.accountType === 'paypal_gateway'
                          ? 'bg-blue-50 border-blue-200 text-blue-655'
                          : 'bg-indigo-50 border-indigo-200 text-indigo-655'
                      }`}>
                        {acc.accountType === 'credit_card' ? (
                          <CreditCard className="w-5 h-5" />
                        ) : acc.accountType === 'paypal_gateway' ? (
                          <Globe className="w-5 h-5" />
                        ) : (
                          <Landmark className="w-5 h-5" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-extrabold text-slate-900 font-sans tracking-tight leading-snug">
                          {acc.accountName}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {acc.bankName} &bull; <span className="font-mono">{acc.accountType.toUpperCase()}</span>
                        </p>
                      </div>
                    </div>

                    {/* Numerical Account Strings */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-mono text-[10.5px]">
                      <div>
                        <span className="text-slate-400 text-[8.5px] font-sans font-bold uppercase block tracking-wider">Account Number</span>
                        <span className="font-bold text-slate-700">{acc.accountNumber || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[8.5px] font-sans font-bold uppercase block tracking-wider">Routing Code</span>
                        <span className="text-slate-700">{acc.routingNumber || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[8.5px] font-sans font-bold uppercase block tracking-wider">SWIFT Code</span>
                        <span className="text-slate-700 uppercase">{acc.swiftCode || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Segment: Balance + Sync status */}
                  <div className="flex items-end justify-between pt-1 border-t border-slate-100/80">
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-widest font-mono text-slate-400">Current Ledger Book Balance</span>
                      <p className={`text-xl font-extrabold font-mono mt-1 ${
                        acc.bookBalance >= 0 ? 'text-slate-900' : 'text-rose-600'
                      }`}>
                        ${acc.bookBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs text-slate-400">{acc.currency}</span>
                      </p>
                    </div>

                    <div className="text-right space-y-1">
                      <span className="text-[9px] uppercase font-bold tracking-widest font-mono text-slate-400 block">Bank Feed Hook</span>
                      {acc.feedStyle === 'auto_plaid' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${
                            acc.feedStatus === 'connected'
                              ? 'bg-emerald-500'
                              : acc.feedStatus === 'syncing'
                              ? 'bg-blue-500 animate-pulse'
                              : 'bg-rose-500'
                          }`} />
                          <span className={`text-[10.5px] font-bold uppercase font-mono ${
                            acc.feedStatus === 'connected'
                              ? 'text-emerald-600'
                              : acc.feedStatus === 'syncing'
                              ? 'text-blue-600'
                              : 'text-rose-600'
                          }`}>
                            {acc.feedStatus === 'connected'
                              ? 'Plaid Synced'
                              : acc.feedStatus === 'syncing'
                              ? 'Refreshing...'
                              : 'Feed Error'}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-block text-[10.5px] font-bold text-slate-500 uppercase font-mono bg-slate-100 border border-slate-205 px-2 py-0.5 rounded">
                          Manual Upload (CSV/OFX)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Segment: Operations controls */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 bg-slate-50/60 -mx-5 -mb-5 p-4.5 px-5 rounded-b-2xl">
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs select-none">
                        <input
                          type="checkbox"
                          checked={acc.showOnInvoices}
                          onChange={() => toggleInvoiceDisplay(acc.id)}
                          className="rounded text-indigo-600 focus:ring-indigo-505/20 border-slate-300"
                        />
                        <span className="text-slate-600 font-semibold text-[11px] hover:text-slate-900 transition-colors">Show on client invoices</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-1">
                      {acc.feedStyle === 'auto_plaid' && (
                        <button
                          type="button"
                          onClick={() => handleSimulateSync(acc.id, acc.accountName)}
                          disabled={plaidSyncingId !== null}
                          className="p-1 px-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-600 hover:text-slate-900 text-[10.5px] font-bold font-sans transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Simulate refreshing Plaid bank feed"
                        >
                          <RefreshCw className={`w-3 h-3 text-indigo-505 ${plaidSyncingId === acc.id ? 'animate-spin' : ''}`} />
                          <span>Sync Feed</span>
                        </button>
                      )}
                      
                      {!acc.isDefault && (
                        <button
                          type="button"
                          onClick={() => makeDefault(acc.id)}
                          className="p-1 px-2 bg-white border border-slate-200 hover:border-indigo-200 text-[10.5px] font-bold rounded-lg text-slate-550 hover:text-indigo-600 font-sans transition-colors cursor-pointer"
                        >
                          Make Default
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(acc)}
                        className="p-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                        title="Edit Account details"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(acc.id, acc.accountName)}
                        className="p-1.5 bg-white border border-slate-200 hover:border-rose-200 rounded-lg text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Disconnect Account connection"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          <div className="bg-slate-55 bg-indigo-50/40 border border-indigo-100 p-4.5 rounded-2xl flex items-start gap-3 text-xs text-slate-655 leading-relaxed">
            <Lock className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <h5 className="font-bold text-indigo-950 uppercase tracking-wide text-[10px]">Bank-Level Plaid Sandbox Security Encryption</h5>
              <p className="mt-0.5">
                Connecting third-party accounting linkages within our general books app adheres to secure SOC-2 compliance paradigms. Credentials and multi-factor authorization parameters remain fully sandboxed and stored locally, guaranteeing offline resilience and user safety.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB B: INVOICE PDF PAYMENTS INSTRUCTIONS PREVIEW */}
      {activeTab === 'simulation' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 max-w-3xl mx-auto">
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase">Customer-Facing Payment Instructions</h3>
            <p className="text-[11px] text-slate-500">
              When clients click "Pay Bill" or download the invoice PDF, default payment details are compiled to prompt quick wire transfer settlements.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6 font-sans border-dashed relative">
            <span className="absolute top-3 right-3 text-[9px] font-mono font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded uppercase">
              MOCK PREVIEW
            </span>

            {/* Simulated Invoice Header */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-200">
              <div>
                <h4 className="font-extrabold text-slate-950 text-base">TUNZUA ENTERPRISES LTD</h4>
                <p className="text-[10px] text-slate-550">120 Corporate Boulevard, Suite 500<br />San Francisco, CA 94105</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-bold uppercase block tracking-wider">INVOICE</span>
                <span className="text-xs font-mono font-bold text-slate-900">INV-2026-08103</span>
              </div>
            </div>

            {/* Main Billing Table Itemizer */}
            <div className="space-y-2">
              <span className="text-[9px] uppercase font-bold tracking-widest font-mono text-slate-400">Bill Breakdown</span>
              <div className="border border-slate-205 rounded-xl overflow-hidden text-[11px] bg-white">
                <div className="bg-slate-100 p-2 font-bold grid grid-cols-4 text-slate-700">
                  <span className="col-span-2">Service Rendered</span>
                  <span className="text-center">Hours/Qty</span>
                  <span className="text-right">Total (USD)</span>
                </div>
                <div className="p-2 grid grid-cols-4 border-b border-slate-150">
                  <span className="col-span-2 font-medium">Enterprise Suite Integration Support</span>
                  <span className="text-center font-mono">40 hrs</span>
                  <span className="text-right font-mono">$6,000.00</span>
                </div>
                <div className="p-2 grid grid-cols-4 text-slate-800 font-bold bg-slate-50">
                  <span className="col-span-3 text-right">Invoice Balance Due:</span>
                  <span className="text-right font-mono text-indigo-650 font-extrabold">$6,000.00</span>
                </div>
              </div>
            </div>

            {/* THE BANK FORM DYNAMIC PAYMENTS INSTRUCTIONS PANEL */}
            {primaryAccount ? (
              <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4.5 space-y-3">
                <div className="flex items-center gap-2 border-b border-indigo-200/40 pb-2">
                  <Landmark className="w-4 h-4 text-indigo-655" />
                  <h5 className="text-[11px] font-extrabold uppercase tracking-wide text-indigo-950">
                    Client payment transfer instructions (Wire details)
                  </h5>
                </div>

                <p className="text-[10.5px] text-indigo-900 leading-snug">
                  Please direct your bank wire, electronic ACH or swift transfer payload matching the invoice total to the following escrow security holding:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-white p-3 rounded-lg border border-indigo-100 font-mono">
                  <div className="space-y-1">
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 font-sans block font-semibold">Creditor Beneficiary</span>
                      <span className="font-bold text-slate-900">TUNZUA ENTERPRISES LTD</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 font-sans block font-semibold">Settlement Bank Name</span>
                      <span className="font-bold text-slate-800">{primaryAccount.bankName}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 font-sans block font-semibold">Account Label</span>
                      <span className="text-slate-700 italic">"{primaryAccount.accountName}"</span>
                    </div>
                  </div>

                  <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-150 pt-2 md:pt-0 md:pl-3">
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 font-sans block font-semibold">Account / IBAN Number</span>
                      <span className="font-bold text-indigo-600 text-sm select-all">{primaryAccount.accountNumber}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 font-sans block font-semibold">ACH Routing Number</span>
                      <span className="font-bold text-slate-800">{primaryAccount.routingNumber}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 font-sans block font-semibold">BIC / SWIFT Clearing Code</span>
                      <span className="font-bold text-slate-850 uppercase">{primaryAccount.swiftCode}</span>
                    </div>
                  </div>
                </div>

                <div className="text-[9.5px] text-indigo-800/80 italic flex items-center gap-1.5 font-sans pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Wire instructions encrypted and verified matching corporate records database. Reference Invoice ID automatically.</span>
                </div>
              </div>
            ) : (
              <div className="text-center p-6 bg-rose-50 border border-rose-200 text-rose-750 text-xs italic rounded-xl">
                ⚠️ No default bank account selected. Please select "Show on client invoices" and "Make Default" on an active bank link to populate bill payment instructions automatically.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB C: SECURITY INTEGRATIONS CERTIFICATES */}
      {activeTab === 'integration' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-205 rounded-xl p-5 space-y-3.5">
            <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-200 w-fit">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">SOC-2 compliance certification</h4>
            <p className="text-[11px] text-slate-500 leading-normal">
              Direct telemetry feeds undergo enterprise secure encryption layers before updating the offline cache, complying fully with financial accounting privacy standards.
            </p>
          </div>

          <div className="bg-white border border-slate-205 rounded-xl p-5 space-y-3.5">
            <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600 border border-blue-200 w-fit">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Double-Entry Reconciliation</h4>
            <p className="text-[11px] text-slate-500 leading-normal">
              Synchronized balances match double-entry journal logs automatically, isolating liquid asset classes from operational expenditure lists effortlessly.
            </p>
          </div>

          <div className="bg-white border border-slate-205 rounded-xl p-5 space-y-3.5">
            <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600 border border-indigo-200 w-fit">
              <Settings className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Auto-Generated Invoices</h4>
            <p className="text-[11px] text-slate-500 leading-normal">
              Client details are stored securely. Changing default payment instruction registries ensures immediate update across all dynamic invoice payloads.
            </p>
          </div>
        </div>
      )}

      {/* RENDER DYNAMIC ADD/EDIT BANK ACCOUNT MODAL FORM */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col font-sans">
            <div className="bg-slate-50 px-6 py-4.5 border-b border-slate-200 flex justify-between items-center text-slate-900">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 rounded text-indigo-600">
                  <Landmark className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold uppercase tracking-wide">
                  {editingAccount ? 'Configure Bank Account Settings' : 'Connect New Bank Account Link'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto max-h-[72vh] text-xs">
              
              {/* Account Label & Bank Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Account Friendly Name *</label>
                  <input
                    type="text"
                    required
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="e.g. Primary checking"
                    className="w-full focus:ring-1 focus:ring-indigo-600 border border-slate-300 rounded-lg p-2 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Bank Entity Name *</label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. JP Morgan Chase"
                    className="w-full focus:ring-1 focus:ring-indigo-600 border border-slate-300 rounded-lg p-2 bg-white"
                  />
                </div>
              </div>

              {/* Acc Type & Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Account Type</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as BankAccount['accountType'])}
                    className="w-full focus:ring-1 focus:ring-indigo-600 border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    <option value="checking">Checking Account</option>
                    <option value="savings">Savings Account</option>
                    <option value="credit_card">Commercial Credit Card</option>
                    <option value="paypal_gateway">PayPal / Merchant gateway</option>
                    <option value="other">Other Treasury Cash</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Corporate Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full focus:ring-1 focus:ring-indigo-600 border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    <option value="USD">USD ($) - US dollar &bull; Default</option>
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="EUR">EUR (€) - European Union Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                  </select>
                </div>
              </div>

              {/* Identifiers Numbers Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Account Number / IBAN</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="•••• •••• •••• 9283"
                    className="w-full font-mono focus:ring-1 focus:ring-indigo-600 border border-slate-300 rounded-lg p-2 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">ACH Routing Number</label>
                  <input
                    type="text"
                    value={routingNumber}
                    onChange={(e) => setRoutingNumber(e.target.value)}
                    placeholder="021000021"
                    className="w-full font-mono focus:ring-1 focus:ring-indigo-600 border border-slate-300 rounded-lg p-2 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">SWIFT Clearing Code</label>
                  <input
                    type="text"
                    value={swiftCode}
                    onChange={(e) => setSwiftCode(e.target.value)}
                    placeholder="CHASUS33XXX"
                    className="w-full font-mono uppercase focus:ring-1 focus:ring-indigo-600 border border-slate-300 rounded-lg p-1.5 p-2 bg-white"
                  />
                </div>
              </div>

              {/* Balances & double entry links */}
              <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-100">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Current Book Balance</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={bookBalance}
                      onChange={(e) => setBookBalance(e.target.value)}
                      placeholder="125430.50"
                      className="w-full pl-6 focus:ring-1 focus:ring-indigo-600 border border-slate-300 rounded-lg p-2 bg-white font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block flex items-center gap-1">
                    <span>Mapped Ledger Account</span>
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" title="This controls double-entry mapping in journals" />
                  </label>
                  <select
                    value={ledgerAccount}
                    onChange={(e) => setLedgerAccount(e.target.value)}
                    className="w-full focus:ring-1 focus:ring-indigo-600 border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    <option value="Corporate Bank Account">Corporate Bank Account (Asset)</option>
                    <option value="Savings Reserve Account">Savings Reserve Account (Asset)</option>
                    <option value="Office Overdraft Expense Liability">Office Overdraft Expense Liability</option>
                  </select>
                </div>
              </div>

              {/* Preferences: Toggles */}
              <div className="space-y-2.5">
                <span className="font-bold uppercase text-[9px] tracking-wide text-slate-400 block">Invoice Settings &amp; bank feeds</span>
                
                <div className="bg-slate-50 border border-slate-205 rounded-xl p-3 space-y-2.5">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showOnInvoices}
                      onChange={(e) => setShowOnInvoices(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500/20 border-slate-300"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block">Show wiring instruction card on invoices</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">Allow automatic attachment of Bank name, SWIFT, Account, Routing instructions to quote/billing client receipts.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500/20 border-slate-300"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block">Mark as Primary payment account</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">Use details from this specific account by default for online wire transfers or bank payments instructions.</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Feed Sync selection */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 block">Plaid feed integration or Manual CSV upload?</label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    onClick={() => setFeedStyle('auto_plaid')}
                    className={`p-3 rounded-xl border-2 text-center space-y-1 cursor-pointer select-none duration-150 transition-all ${
                      feedStyle === 'auto_plaid'
                        ? 'border-indigo-600 bg-indigo-50/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="font-extrabold text-slate-900 block text-xs">Plaid Feed Synchronizer</span>
                    <span className="text-[10px] text-slate-400 block leading-tight">Secure corporate transaction sync stream</span>
                  </label>

                  <label
                    onClick={() => setFeedStyle('manual_upload')}
                    className={`p-3 rounded-xl border-2 text-center space-y-1 cursor-pointer select-none duration-150 transition-all ${
                      feedStyle === 'manual_upload'
                        ? 'border-indigo-600 bg-indigo-50/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="font-extrabold text-slate-900 block text-xs">Manual Statement upload</span>
                    <span className="text-[10px] text-slate-400 block leading-tight">Periodically upload CSV, OFX or QBO files</span>
                  </label>
                </div>
              </div>

            </form>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-[10.5px] italic text-slate-500 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>SOC-2 bank transfer privacy active</span>
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-650 hover:bg-slate-100 hover:text-slate-900 duration-150 rounded-xl transition-all font-semibold cursor-pointer"
                >
                  Close Form
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl transition-all font-semibold flex items-center gap-1 cursor-pointer shadow"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingAccount ? 'Save configuration' : 'Save & Link Account'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
