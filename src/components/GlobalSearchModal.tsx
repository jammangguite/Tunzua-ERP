import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Search, X, ArrowRight } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_HEADS = [
  { label: 'Overview', path: '/app', group: 'Overview' },
  { label: 'Recurring Bills', path: '/app/bills', group: 'Overview' },
  { label: 'Purchase', path: '/app/purchases', group: 'Transactions' },
  { label: 'Sales', path: '/app/sales', group: 'Transactions' },
  { label: 'Receipts', path: '/app/receipts', group: 'Transactions' },
  { label: 'Payments', path: '/app/payments', group: 'Transactions' },
  { label: 'Contra', path: '/app/contra', group: 'Transactions' },
  { label: 'Journal', path: '/app/journal', group: 'Transactions' },
  { label: 'Daybook', path: '/app/daybook', group: 'Transactions' },
  { label: 'Sundry Parties', path: '/app/parties', group: 'Assets & Reports' },
  { label: 'Fixed Assets', path: '/app/assets', group: 'Assets & Reports' },
  { label: 'Financial Reports', path: '/app/reports', group: 'Assets & Reports' },
];

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const { db, recurringBills, formatMoney } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isOpen) setQuery('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const q = query.trim().toLowerCase();

  const matchedHeads = useMemo(() => {
    if (!q) return NAV_HEADS.slice(0, 6);
    return NAV_HEADS.filter(
      h => h.label.toLowerCase().includes(q) || h.path.toLowerCase().includes(q) || h.group.toLowerCase().includes(q)
    );
  }, [q]);

  const matchedTransactions = useMemo(() => {
    if (!q) return db.ledger.slice(0, 4);
    return db.ledger
      .filter(
        tx =>
          tx.description.toLowerCase().includes(q) ||
          (tx.reference && tx.reference.toLowerCase().includes(q)) ||
          tx.debitAccount.toLowerCase().includes(q) ||
          tx.creditAccount.toLowerCase().includes(q) ||
          tx.date.includes(q)
      )
      .slice(0, 6);
  }, [db.ledger, q]);

  const matchedBills = useMemo(() => {
    if (!q) return [];
    return recurringBills
      .filter(
        b =>
          b.title.toLowerCase().includes(q) ||
          b.vendor.toLowerCase().includes(q) ||
          b.expenseAccount.toLowerCase().includes(q)
      )
      .slice(0, 4);
  }, [recurringBills, q]);

  const matchedAssets = useMemo(() => {
    if (!q) return [];
    return db.fixedAssets.filter(a => a.name.toLowerCase().includes(q)).slice(0, 4);
  }, [db.fixedAssets, q]);

  if (!isOpen) return null;

  const goTo = (path: string) => {
    navigate(path);
    onClose();
  };

  const hasAny =
    matchedHeads.length > 0 ||
    matchedTransactions.length > 0 ||
    matchedBills.length > 0 ||
    matchedAssets.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1F1D1A]/40 backdrop-blur-[2px] flex items-start justify-center pt-16 sm:pt-24 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search ledger"
    >
      <div
        className="w-full max-w-xl bg-[#FFFDF9] border border-[#E5E0D5] rounded-xl shadow-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E5E0D5] bg-[#F8F6F1]">
          <Search className="w-4 h-4 text-[#6B655C] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search heads, paths, ledger entries, bills, or fixed assets..."
            className="flex-1 bg-transparent text-sm text-[#1F1D1A] placeholder:text-[#968E82] focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#6B655C] hover:text-[#1F1D1A] rounded transition-colors cursor-pointer"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto divide-y divide-[#E5E0D5]">
          {matchedHeads.length > 0 && (
            <div className="p-3">
              <div className="px-2 pb-1.5 text-[11px] font-medium text-[#6B655C]">
                Accounting Heads & Paths
              </div>
              <div className="space-y-0.5">
                {matchedHeads.map(head => (
                  <button
                    key={head.path}
                    type="button"
                    onClick={() => goTo(head.path)}
                    className="w-full px-2.5 py-2 rounded-lg hover:bg-[#F2EFE9] flex items-center justify-between text-left transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="text-sm font-medium text-[#1F1D1A]">{head.label}</span>
                      <span className="ml-2 text-xs text-[#968E82]">· {head.group}</span>
                    </div>
                    <span className="font-mono text-xs text-[#6B655C] flex items-center gap-1.5">
                      {head.path}
                      <ArrowRight className="w-3 h-3 text-[#968E82]" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {matchedTransactions.length > 0 && (
            <div className="p-3">
              <div className="px-2 pb-1.5 text-[11px] font-medium text-[#6B655C]">
                Ledger Entries
              </div>
              <div className="space-y-0.5">
                {matchedTransactions.map(tx => (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => goTo('/app/daybook')}
                    className="w-full px-2.5 py-2 rounded-lg hover:bg-[#F2EFE9] flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#1F1D1A] truncate">{tx.description}</div>
                      <div className="text-xs text-[#6B655C] font-mono tabular-nums">
                        {tx.date} · {tx.reference || 'Voucher'} · {tx.debitAccount}
                      </div>
                    </div>
                    <span className="font-mono text-xs font-semibold tabular-nums text-[#1F1D1A] shrink-0">
                      {formatMoney(tx.amount)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {matchedBills.length > 0 && (
            <div className="p-3">
              <div className="px-2 pb-1.5 text-[11px] font-medium text-[#6B655C]">
                Recurring Bills
              </div>
              <div className="space-y-0.5">
                {matchedBills.map(bill => (
                  <button
                    key={bill.id}
                    type="button"
                    onClick={() => goTo('/app/bills')}
                    className="w-full px-2.5 py-2 rounded-lg hover:bg-[#F2EFE9] flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#1F1D1A] truncate">{bill.title}</div>
                      <div className="text-xs text-[#6B655C]">
                        {bill.vendor} · Due <span className="font-mono tabular-nums">{bill.nextDueDate}</span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-semibold tabular-nums text-[#1F1D1A] shrink-0">
                      {formatMoney(bill.amount)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {matchedAssets.length > 0 && (
            <div className="p-3">
              <div className="px-2 pb-1.5 text-[11px] font-medium text-[#6B655C]">
                Fixed Assets
              </div>
              <div className="space-y-0.5">
                {matchedAssets.map(asset => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => goTo('/app/assets')}
                    className="w-full px-2.5 py-2 rounded-lg hover:bg-[#F2EFE9] flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#1F1D1A] truncate">{asset.name}</div>
                      <div className="text-xs text-[#6B655C] font-mono tabular-nums">
                        Purchased {asset.purchaseDate}
                      </div>
                    </div>
                    <span className="font-mono text-xs font-semibold tabular-nums text-[#1F1D1A] shrink-0">
                      {formatMoney(asset.cost)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!hasAny && (
            <div className="py-10 px-6 text-center">
              <p className="text-sm text-[#6B655C]">No matching heads, entries, bills, or assets found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
