import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { TransactionType } from '../types';
import { X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { computeItemPricing } from '../utils/itemPricing';

interface QuickEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPreset?: EntryPreset;
}

export type EntryPreset = 'sales' | 'purchase' | 'receipt' | 'payment' | 'contra' | 'journal';

const PRESET_CONFIG: Record<
  EntryPreset,
  {
    label: string;
    txType: TransactionType;
    debit: string;
    credit: string;
    refPrefix: string;
    placeholder: string;
    cleared: boolean;
  }
> = {
  sales: {
    label: 'Sale',
    txType: 'sales',
    debit: 'Corporate Bank Account',
    credit: 'Revenue Account',
    refPrefix: 'INV',
    placeholder: 'e.g. Monthly consulting invoice to Aris Global',
    cleared: true,
  },
  purchase: {
    label: 'Purchase',
    txType: 'purchase',
    debit: 'Inventory Asset Account',
    credit: 'Corporate Bank Account',
    refPrefix: 'PO',
    placeholder: 'e.g. Stock replenishment from Nippon Steel Supplies',
    cleared: true,
  },
  receipt: {
    label: 'Receipt',
    txType: 'other_income',
    debit: 'Corporate Bank Account',
    credit: 'Sundry Income Account',
    refPrefix: 'REC',
    placeholder: 'e.g. Settlement payment received from customer',
    cleared: true,
  },
  payment: {
    label: 'Payment',
    txType: 'other_expense',
    debit: 'Operating Expense Account',
    credit: 'Corporate Bank Account',
    refPrefix: 'PAY',
    placeholder: 'e.g. Office utilities and telecom settlement',
    cleared: true,
  },
  contra: {
    label: 'Contra',
    txType: 'other_expense',
    debit: 'Corporate Bank Account',
    credit: 'Petty Cash Drawer',
    refPrefix: 'CON',
    placeholder: 'e.g. Cash deposit into main bank account',
    cleared: true,
  },
  journal: {
    label: 'Journal',
    txType: 'other_expense',
    debit: 'Depreciation Expense Account',
    credit: 'Accumulated Depreciation Asset',
    refPrefix: 'JV',
    placeholder: 'e.g. Month-end accrual or depreciation adjustment',
    cleared: false,
  },
};

const CORE_PRESETS: EntryPreset[] = ['sales', 'purchase', 'receipt', 'payment'];
const EXTRA_PRESETS: EntryPreset[] = ['contra', 'journal'];

export const QuickEntryModal: React.FC<QuickEntryModalProps> = ({
  isOpen,
  onClose,
  defaultPreset = 'sales' as EntryPreset,
}) => {
  const { db, ledgerItems, addLedgerTransaction, triggerSync, companySettings, formatMoney } = useStore();
  const [preset, setPreset] = useState<EntryPreset>(defaultPreset);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [debitAccount, setDebitAccount] = useState(PRESET_CONFIG[defaultPreset].debit);
  const [creditAccount, setCreditAccount] = useState(PRESET_CONFIG[defaultPreset].credit);
  const [isBankCleared, setIsBankCleared] = useState(PRESET_CONFIG[defaultPreset].cleared);
  const [selectedMasterId, setSelectedMasterId] = useState('');

  const accountSuggestions = useMemo(() => {
    const base = new Set<string>([
      'Corporate Bank Account',
      'Petty Cash Drawer',
      'Revenue Account',
      'Inventory Asset Account',
      'Operating Expense Account',
      'Sundry Income Account',
      'Accounts Receivable',
      'Accounts Payable',
      'Office Rent Expense',
      'Utilities Expense',
    ]);
    db.ledger.forEach(tx => {
      if (tx.debitAccount) base.add(tx.debitAccount);
      if (tx.creditAccount) base.add(tx.creditAccount);
    });
    ledgerItems.forEach(item => {
      if (item.kind === 'ledger') base.add(item.name);
      if (item.accountGroup) base.add(item.accountGroup);
    });
    return Array.from(base).sort();
  }, [db.ledger, ledgerItems]);

  const selectedMaster = useMemo(
    () => ledgerItems.find(item => item.id === selectedMasterId) || null,
    [ledgerItems, selectedMasterId]
  );

  const selectedMasterBreakdown = useMemo(() => {
    if (!selectedMaster || selectedMaster.defaultPrice === undefined) return null;
    return computeItemPricing(
      selectedMaster.defaultPrice,
      selectedMaster.gstRate,
      selectedMaster.gstMode,
      selectedMaster.discount,
      selectedMaster.discountType
    );
  }, [selectedMaster]);

  const duplicateRef = useMemo(() => {
    const refKey = reference.trim().toLowerCase();
    if (!refKey) return null;
    return (
      db.ledger.find(
        tx => (tx.reference || '').trim().toLowerCase() === refKey
      ) || null
    );
  }, [db.ledger, reference]);

  const handleSelectMaster = (masterId: string) => {
    setSelectedMasterId(masterId);
    const chosen = ledgerItems.find(item => item.id === masterId);
    if (!chosen) return;

    const parts = [
      chosen.name,
      `GST ${chosen.gstRate}% ${chosen.gstMode === 'including' ? 'Incl.' : 'Excl.'}`,
    ];
    if (chosen.discount > 0) {
      parts.push(
        chosen.discountType === 'percentage'
          ? `${chosen.discount}% Disc.`
          : `${formatMoney(chosen.discount)} Disc.`
      );
    }
    setDescription(parts.join(' — '));

    if (chosen.accountGroup) {
      if (preset === 'sales' || preset === 'receipt') {
        setCreditAccount(chosen.accountGroup);
      } else if (preset === 'purchase' || preset === 'payment') {
        setDebitAccount(chosen.accountGroup);
      }
    }

    if (chosen.defaultPrice !== undefined && chosen.defaultPrice > 0) {
      const calc = computeItemPricing(
        chosen.defaultPrice,
        chosen.gstRate,
        chosen.gstMode,
        chosen.discount,
        chosen.discountType
      );
      setAmount(calc.finalTotal.toFixed(2));
    }
  };

  const applyPreset = (next: EntryPreset) => {
    const cfg = PRESET_CONFIG[next];
    setPreset(next);
    setDebitAccount(cfg.debit);
    setCreditAccount(cfg.credit);
    setIsBankCleared(cfg.cleared);
    setReference(`${cfg.refPrefix}-${Date.now().toString().slice(-4)}`);
  };

  useEffect(() => {
    if (isOpen) {
      applyPreset(defaultPreset);
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setAmount('');
      setSelectedMasterId('');
    }
  }, [isOpen, defaultPreset]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!description.trim()) {
      toast.error('Please enter a short description for this entry.');
      return;
    }
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Please enter an amount greater than 0.');
      return;
    }
    if (!debitAccount.trim() || !creditAccount.trim()) {
      toast.error('Both debit and credit accounts are required.');
      return;
    }
    if (debitAccount.trim().toLowerCase() === creditAccount.trim().toLowerCase()) {
      toast.error('Debit and credit accounts must be different.');
      return;
    }

    const cfg = PRESET_CONFIG[preset];
    const res = addLedgerTransaction({
      id: `${preset}-${Date.now()}`,
      date,
      description: description.trim(),
      type: cfg.txType,
      debitAccount: debitAccount.trim(),
      creditAccount: creditAccount.trim(),
      amount: numericAmount,
      reference: reference.trim() || `${cfg.refPrefix}-${Date.now().toString().slice(-4)}`,
      isBankCleared,
    });
    if (!res.ok) {
      toast.error(res.error || 'Duplicate invoice / reference number is not allowed.');
      return;
    }
    triggerSync();
    toast.success(`${cfg.label} entry recorded in ledger.`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1F1D1A]/40 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-entry-title"
    >
      <div
        className="w-full max-w-xl bg-[#FFFDF9] border border-[#E5E0D5] rounded-xl shadow-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#E5E0D5] flex items-center justify-between bg-[#F8F6F1]">
          <div>
            <h2 id="quick-entry-title" className="font-display text-lg font-semibold text-[#1F1D1A]">
              Quick Entry
            </h2>
            <p className="text-xs text-[#6B655C] mt-0.5">
              Record a sale, purchase, receipt, payment, or voucher from anywhere in {companySettings.name}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#6B655C] hover:text-[#1F1D1A] hover:bg-[#EAE5DB] rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Primary 4 Transaction Types + Contra/Journal */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-[#6B655C]">Transaction Type</label>
              <div className="flex items-center gap-1.5">
                {EXTRA_PRESETS.map(key => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyPreset(key)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                      preset === key
                        ? 'bg-[#EBF3F0] text-[#1B4D3E] font-semibold border border-[#C7DFD6]'
                        : 'text-[#6B655C] hover:text-[#1F1D1A] hover:bg-[#F2EFE9]'
                    }`}
                  >
                    {PRESET_CONFIG[key].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#F2EFE9] border border-[#E5E0D5] rounded-lg">
              {CORE_PRESETS.map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className={`py-2 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    preset === key
                      ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF] shadow-2xs'
                      : 'text-[#6B655C] hover:text-[#1F1D1A]'
                  }`}
                >
                  {PRESET_CONFIG[key].label}
                </button>
              ))}
            </div>
          </div>

          {ledgerItems.length > 0 && (
            <div>
              <label htmlFor="qe-master" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                Apply Item / Ledger Preset (Optional)
              </label>
              <select
                id="qe-master"
                value={selectedMasterId}
                onChange={e => handleSelectMaster(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
              >
                <option value="">Manual entry</option>
                {ledgerItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {item.gstRate}% {item.gstMode === 'including' ? 'Incl.' : 'Excl.'} GST
                    {item.discount > 0
                      ? `, ${item.discountType === 'percentage' ? `${item.discount}%` : formatMoney(item.discount)} off`
                      : ''}
                  </option>
                ))}
              </select>
              {selectedMaster && selectedMasterBreakdown && (
                <div className="mt-1.5 text-[11px] font-mono tabular-nums text-[#6B655C] flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span>Base {formatMoney(selectedMasterBreakdown.baseAmount)}</span>
                  <span aria-hidden="true">·</span>
                  <span>Disc -{formatMoney(selectedMasterBreakdown.discountAmount)}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    GST ({selectedMaster.gstRate}% {selectedMaster.gstMode}) {formatMoney(selectedMasterBreakdown.gstAmount)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-[#1B4D3E]">
                    Net {formatMoney(selectedMasterBreakdown.finalTotal)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="qe-date" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                Date
              </label>
              <input
                id="qe-date"
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm font-mono tabular-nums text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
              />
            </div>

            <div>
              <label htmlFor="qe-ref" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                Reference No.
              </label>
              <input
                id="qe-ref"
                type="text"
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="e.g. INV-2026"
                className={`w-full px-3 py-2 bg-[#F8F6F1] border rounded-lg text-sm font-mono text-[#1F1D1A] focus:outline-none focus:bg-[#FFFDF9] ${
                  duplicateRef
                    ? 'border-[#B91C1C] focus:border-[#B91C1C]'
                    : 'border-[#E5E0D5] focus:border-[#1B4D3E]'
                }`}
              />
              {duplicateRef && (
                <p className="mt-1 text-[11px] text-[#B91C1C]">
                  Invoice / reference &ldquo;{duplicateRef.reference}&rdquo; already exists.
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="qe-desc" className="block text-xs font-medium text-[#6B655C] mb-1.5">
              Description / Narration
            </label>
            <input
              id="qe-desc"
              type="text"
              required
              autoFocus
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={PRESET_CONFIG[preset].placeholder}
              className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] placeholder:text-[#968E82] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
            />
          </div>

          <datalist id="tunzua-accounts-list">
            {accountSuggestions.map(acc => (
              <option key={acc} value={acc} />
            ))}
          </datalist>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="qe-dr" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                Debit Account (Dr)
              </label>
              <input
                id="qe-dr"
                type="text"
                list="tunzua-accounts-list"
                required
                value={debitAccount}
                onChange={e => setDebitAccount(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
              />
            </div>

            <div>
              <label htmlFor="qe-cr" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                Credit Account (Cr)
              </label>
              <input
                id="qe-cr"
                type="text"
                list="tunzua-accounts-list"
                required
                value={creditAccount}
                onChange={e => setCreditAccount(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label htmlFor="qe-amount" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                Amount ({companySettings.currencySymbol})
              </label>
              <input
                id="qe-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm font-mono tabular-nums font-semibold text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
              />
            </div>

            <label className="flex items-center gap-2.5 py-2.5 px-3 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isBankCleared}
                onChange={e => setIsBankCleared(e.target.checked)}
                className="w-4 h-4 accent-[#1B4D3E] rounded cursor-pointer"
              />
              <span className="text-xs text-[#1F1D1A] font-medium">Mark as bank cleared</span>
            </label>
          </div>

          <div className="pt-3 border-t border-[#E5E0D5] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#6B655C] hover:text-[#1F1D1A] hover:bg-[#F2EFE9] rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Save {PRESET_CONFIG[preset].label}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
