import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useStore } from '../store';
import { LedgerTransaction } from '../types';
import { DateSearchBar } from '../components/DateSearchBar';
import { ClickablePath } from '../components/ClickablePath';
import { Plus, Pencil, Trash2, X, Printer } from 'lucide-react';
import { toast } from 'sonner';

const BASE_CONTRA_ACCOUNTS = [
  'Petty Cash Drawer',
  'Corporate Bank Account',
  'Savings Account',
];

const Contra: React.FC = () => {
  const {
    db,
    addLedgerTransaction,
    editLedgerTransaction,
    deleteLedgerTransaction,
    permissions,
    triggerSync,
    formatMoney,
    companySettings,
  } = useStore();
  const outletCtx = useOutletContext<{ openPrintPreview?: () => void }>() || {};

  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState(() => `CON-${Date.now().toString().slice(-4)}`);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [fromAccount, setFromAccount] = useState('Petty Cash Drawer');
  const [toAccount, setToAccount] = useState('Corporate Bank Account');

  const contraTransactions = useMemo(() => {
    return db.ledger
      .filter(tx => {
        const isContra =
          tx.reference?.startsWith('CON') ||
          (tx.debitAccount.toLowerCase().includes('bank') && tx.creditAccount.toLowerCase().includes('cash')) ||
          (tx.debitAccount.toLowerCase().includes('cash') && tx.creditAccount.toLowerCase().includes('bank'));

        if (!isContra) return false;
        if (startDate && tx.date < startDate) return false;
        if (endDate && tx.date > endDate) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            tx.description.toLowerCase().includes(q) ||
            tx.reference?.toLowerCase().includes(q) ||
            tx.debitAccount.toLowerCase().includes(q) ||
            tx.creditAccount.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [db.ledger, startDate, endDate, searchQuery]);

  const totalContra = contraTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  const accountOptions = useMemo(() => {
    const set = new Set(BASE_CONTRA_ACCOUNTS);
    if (fromAccount) set.add(fromAccount);
    if (toAccount) set.add(toAccount);
    return Array.from(set);
  }, [fromAccount, toAccount]);

  const duplicateRef = useMemo(() => {
    const refKey = reference.trim().toLowerCase();
    if (!refKey) return null;
    return (
      db.ledger.find(
        tx =>
          tx.id !== editingId &&
          (tx.reference || '').trim().toLowerCase() === refKey
      ) || null
    );
  }, [db.ledger, reference, editingId]);

  const openNewModal = () => {
    setEditingId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setReference(`CON-${Date.now().toString().slice(-4)}`);
    setDescription('');
    setAmount('');
    setFromAccount('Petty Cash Drawer');
    setToAccount('Corporate Bank Account');
    setShowAddModal(true);
  };

  const openEditModal = (tx: LedgerTransaction) => {
    setEditingId(tx.id);
    setDate(tx.date);
    setReference(tx.reference || `CON-${Date.now().toString().slice(-4)}`);
    setDescription(tx.description);
    setAmount(String(tx.amount));
    setFromAccount(tx.creditAccount);
    setToAccount(tx.debitAccount);
    setShowAddModal(true);
  };

  const handleCreateContra = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || !fromAccount || !toAccount) {
      toast.error('Please fill in all transfer fields.');
      return;
    }
    if (fromAccount === toAccount) {
      toast.error('Source and destination accounts must be different.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid transfer amount.');
      return;
    }

    const res = editingId
      ? editLedgerTransaction(editingId, {
          date,
          description: description.trim(),
          debitAccount: toAccount,
          creditAccount: fromAccount,
          amount: parsedAmount,
          reference: reference.trim() || `CON-${Date.now().toString().slice(-4)}`,
        })
      : addLedgerTransaction({
          id: `contra-${Date.now()}`,
          date,
          description: description.trim(),
          type: 'other_expense',
          debitAccount: toAccount,
          creditAccount: fromAccount,
          amount: parsedAmount,
          reference: reference.trim() || `CON-${Date.now().toString().slice(-4)}`,
          isBankCleared: true,
        });

    if (!res.ok) {
      toast.error(res.error || 'Duplicate reference number is not allowed.');
      return;
    }

    triggerSync();
    toast.success(editingId ? 'Contra transfer updated.' : 'Contra transfer recorded.');
    setEditingId(null);
    setShowAddModal(false);
    setDescription('');
    setAmount('');
    setReference(`CON-${Date.now().toString().slice(-4)}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#E5E0D5]">
        <div>
          <ClickablePath variant="page" />
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1F1D1A] tracking-tight">
            Contra Vouchers
          </h1>
          <p className="text-sm text-[#6B655C] mt-1">
            Cash deposits, withdrawals, and internal transfers between cash and bank accounts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto no-print">
          <button
            type="button"
            onClick={() => (outletCtx.openPrintPreview ? outletCtx.openPrintPreview() : window.print())}
            className="px-3.5 py-2 bg-[#FFFDF9] hover:bg-[#F2EFE9] text-[#1F1D1A] border border-[#E5E0D5] font-medium text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5 text-[#1B4D3E]" />
            Print Preview
          </button>

          <button
            type="button"
            onClick={openNewModal}
            className="px-4 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] font-semibold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Contra
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#FFFDF9] p-5 rounded-xl border border-[#E5E0D5]">
          <div className="text-xs text-[#6B655C]">Total Funds Transferred</div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-semibold text-[#1F1D1A]">
            {formatMoney(totalContra)}
          </div>
        </div>
        <div className="bg-[#FFFDF9] p-5 rounded-xl border border-[#E5E0D5]">
          <div className="text-xs text-[#6B655C]">Contra Vouchers</div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-semibold text-[#1F1D1A]">
            {contraTransactions.length}
          </div>
        </div>
      </div>

      <div className="bg-[#FFFDF9] rounded-xl border border-[#E5E0D5] overflow-hidden">
        <DateSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          placeholder="Search contra reference, narration, or accounts..."
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E5E0D5] bg-[#F8F6F1] text-xs font-medium text-[#6B655C]">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">From Account (Cr)</th>
                <th className="py-3 px-4">To Account (Dr)</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D5] text-[#1F1D1A]">
              {contraTransactions.map(tx => (
                <tr key={tx.id} className="hover:bg-[#F8F6F1]/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-[#6B655C] whitespace-nowrap">
                    {tx.date}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs font-medium text-[#1B4D3E] whitespace-nowrap">
                    {tx.reference}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-[#1F1D1A]">{tx.description}</td>
                  <td className="py-3.5 px-4 text-xs text-[#6B655C]">{tx.creditAccount}</td>
                  <td className="py-3.5 px-4 text-xs text-[#6B655C]">{tx.debitAccount}</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#1F1D1A] whitespace-nowrap">
                    {formatMoney(tx.amount)}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap no-print">
                    {permissions.canDelete && confirmDeleteId === tx.id ? (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            deleteLedgerTransaction(tx.id);
                            triggerSync();
                            setConfirmDeleteId(null);
                            toast.success('Contra voucher deleted.');
                          }}
                          className="px-2 py-1 bg-[#B91C1C] text-white text-xs font-medium rounded-md cursor-pointer"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 text-xs text-[#6B655C] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(tx)}
                          className="p-1.5 text-[#6B655C] hover:text-[#1B4D3E] hover:bg-[#F2EFE9] rounded-md transition-colors cursor-pointer"
                          title="Edit transfer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {permissions.canDelete && (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(tx.id)}
                            className="p-1.5 text-[#6B655C] hover:text-[#B91C1C] hover:bg-[#FEF2F2] rounded-md transition-colors cursor-pointer"
                            title="Delete transfer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {contraTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center text-sm text-[#6B655C]">
                    No contra vouchers found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div
          className="fixed inset-0 bg-[#1F1D1A]/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-[#FFFDF9] border border-[#E5E0D5] max-w-lg w-full rounded-xl shadow-lg overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#E5E0D5] flex justify-between items-center bg-[#F8F6F1]">
              <h2 className="font-display text-lg font-semibold text-[#1F1D1A]">
                {editingId ? 'Edit Contra Transfer' : 'Record Contra Transfer'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setShowAddModal(false);
                }}
                className="p-1.5 text-[#6B655C] hover:text-[#1F1D1A] rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateContra} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#6B655C] mb-1.5">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm font-mono tabular-nums text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B655C] mb-1.5">Reference</label>
                  <input
                    type="text"
                    required
                    value={reference}
                    onChange={e => setReference(e.target.value)}
                    className={`w-full px-3 py-2 bg-[#F8F6F1] border rounded-lg text-sm font-mono text-[#1F1D1A] focus:outline-none focus:bg-[#FFFDF9] ${
                      duplicateRef
                        ? 'border-[#B91C1C] focus:border-[#B91C1C]'
                        : 'border-[#E5E0D5] focus:border-[#1B4D3E]'
                    }`}
                  />
                  {duplicateRef && (
                    <p className="mt-1 text-[11px] text-[#B91C1C]">
                      Reference &ldquo;{duplicateRef.reference}&rdquo; already exists.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6B655C] mb-1.5">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cash deposit into business bank account"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#6B655C] mb-1.5">
                    From Account (Cr)
                  </label>
                  <select
                    value={fromAccount}
                    onChange={e => setFromAccount(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  >
                    {accountOptions.map(acc => (
                      <option key={`from-${acc}`} value={acc}>
                        {acc}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B655C] mb-1.5">
                    To Account (Dr)
                  </label>
                  <select
                    value={toAccount}
                    onChange={e => setToAccount(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  >
                    {accountOptions.map(acc => (
                      <option key={`to-${acc}`} value={acc}>
                        {acc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6B655C] mb-1.5">
                  Amount ({companySettings.currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm font-mono tabular-nums text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                />
              </div>

              <div className="pt-3 border-t border-[#E5E0D5] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setShowAddModal(false);
                  }}
                  className="px-4 py-2 text-xs font-medium text-[#6B655C] hover:text-[#1F1D1A] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] font-semibold text-xs rounded-lg cursor-pointer transition-colors"
                >
                  {editingId ? 'Update Transfer' : 'Save Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contra;
