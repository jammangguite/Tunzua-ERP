import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { TransactionType } from '../types';
import { DateSearchBar } from '../components/DateSearchBar';
import { ClickablePath } from '../components/ClickablePath';
import { Plus, Trash2, Download, X } from 'lucide-react';
import { toast } from 'sonner';
import { exportSingleInvoicePDF, exportSingleVoucherPDF } from '../utils/pdfExport';

interface LedgerPageProps {
  kind: 'purchases' | 'sales' | 'receipts' | 'payments';
  title: string;
  subtitle: string;
}

const LedgerPage: React.FC<LedgerPageProps> = ({ kind, title, subtitle }) => {
  const { db, addLedgerTransaction, deleteLedgerTransaction, triggerSync, formatMoney, companySettings } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [debitAccount, setDebitAccount] = useState('');
  const [creditAccount, setCreditAccount] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionType>(
    kind === 'purchases'
      ? 'purchase'
      : kind === 'sales'
      ? 'sales'
      : kind === 'receipts'
      ? 'capital_contribution'
      : 'other_expense'
  );
  const [isBankCleared, setIsBankCleared] = useState(true);

  const filteredTransactions = useMemo(() => {
    return db.ledger
      .filter(tx => {
        let isMatch = false;
        if (kind === 'purchases') {
          isMatch = tx.type === 'purchase';
        } else if (kind === 'sales') {
          isMatch = tx.type === 'sales';
        } else if (kind === 'receipts') {
          isMatch = tx.type === 'capital_contribution' || tx.type === 'other_income';
        } else if (kind === 'payments') {
          isMatch =
            tx.type === 'salary_payment' ||
            tx.type === 'tax_payment' ||
            tx.type === 'other_expense';
        }
        if (!isMatch) return false;

        if (startDate && tx.date < startDate) return false;
        if (endDate && tx.date > endDate) return false;

        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          return (
            tx.description.toLowerCase().includes(query) ||
            (tx.reference && tx.reference.toLowerCase().includes(query)) ||
            tx.debitAccount.toLowerCase().includes(query) ||
            tx.creditAccount.toLowerCase().includes(query)
          );
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [db.ledger, kind, startDate, endDate, searchQuery]);

  const totalAmount = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const clearedCount = filteredTransactions.filter(t => t.isBankCleared).length;

  const openModalWithDefaults = () => {
    if (kind === 'purchases') {
      setDebitAccount('Inventory Asset Account');
      setCreditAccount('Corporate Bank Account');
      setTransactionType('purchase');
      setReference(`PO-${Date.now().toString().slice(-4)}`);
    } else if (kind === 'sales') {
      setDebitAccount('Corporate Bank Account');
      setCreditAccount('Revenue Account');
      setTransactionType('sales');
      setReference(`INV-${Date.now().toString().slice(-4)}`);
    } else if (kind === 'receipts') {
      setDebitAccount('Corporate Bank Account');
      setCreditAccount('Sundry Income Account');
      setTransactionType('other_income');
      setReference(`REC-${Date.now().toString().slice(-4)}`);
    } else if (kind === 'payments') {
      setDebitAccount('Operating Expense Account');
      setCreditAccount('Corporate Bank Account');
      setTransactionType('other_expense');
      setReference(`PAY-${Date.now().toString().slice(-4)}`);
    }
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setAmount('');
    setIsBankCleared(true);
    setShowAddModal(true);
  };

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || !debitAccount.trim() || !creditAccount.trim()) {
      toast.error('Please fill in all ledger fields.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount greater than 0.');
      return;
    }

    addLedgerTransaction({
      id: `${kind}-${Date.now()}`,
      date,
      description: description.trim(),
      type: transactionType,
      debitAccount: debitAccount.trim(),
      creditAccount: creditAccount.trim(),
      amount: parsedAmount,
      reference: reference.trim() || undefined,
      isBankCleared,
    });
    triggerSync();
    toast.success(`${title} voucher recorded.`);
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#E5E0D5]">
        <div>
          <ClickablePath variant="page" />
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1F1D1A] tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-[#6B655C] mt-1">{subtitle}</p>
        </div>

        <button
          type="button"
          onClick={openModalWithDefaults}
          className="px-4 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] font-semibold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          New {title.replace(/s$/, '')}
        </button>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FFFDF9] p-5 rounded-xl border border-[#E5E0D5]">
          <div className="text-xs text-[#6B655C]">Filtered Total</div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-semibold text-[#1F1D1A]">
            {formatMoney(totalAmount)}
          </div>
        </div>
        <div className="bg-[#FFFDF9] p-5 rounded-xl border border-[#E5E0D5]">
          <div className="text-xs text-[#6B655C]">Entries Shown</div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-semibold text-[#1F1D1A]">
            {filteredTransactions.length}
          </div>
        </div>
        <div className="bg-[#FFFDF9] p-5 rounded-xl border border-[#E5E0D5]">
          <div className="text-xs text-[#6B655C]">Bank Cleared</div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-semibold text-[#157347]">
            {clearedCount} / {filteredTransactions.length}
          </div>
        </div>
      </div>

      {/* Ledger Table Card */}
      <div className="bg-[#FFFDF9] rounded-xl border border-[#E5E0D5] overflow-hidden">
        <DateSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          placeholder={`Search ${title.toLowerCase()} by reference, narration, or account...`}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E5E0D5] bg-[#F8F6F1] text-xs font-medium text-[#6B655C]">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Narration</th>
                <th className="py-3 px-4">Debit (Dr)</th>
                <th className="py-3 px-4">Credit (Cr)</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Status</th>
                <th className="py-3 px-4 text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D5] text-[#1F1D1A]">
              {filteredTransactions.map(tx => (
                <tr key={tx.id} className="hover:bg-[#F8F6F1]/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-[#6B655C] whitespace-nowrap">
                    {tx.date}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs font-medium text-[#1B4D3E] whitespace-nowrap">
                    {tx.reference || '—'}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-[#1F1D1A]">{tx.description}</td>
                  <td className="py-3.5 px-4 text-xs text-[#6B655C]">{tx.debitAccount}</td>
                  <td className="py-3.5 px-4 text-xs text-[#6B655C]">{tx.creditAccount}</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#1F1D1A] whitespace-nowrap">
                    {formatMoney(tx.amount)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-xs whitespace-nowrap">
                    <span className={tx.isBankCleared ? 'text-[#157347] font-medium' : 'text-[#B45309] font-medium'}>
                      {tx.isBankCleared ? 'Cleared' : 'Pending'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap no-print">
                    {confirmDeleteId === tx.id ? (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            deleteLedgerTransaction(tx.id);
                            triggerSync();
                            setConfirmDeleteId(null);
                            toast.success('Entry deleted.');
                          }}
                          className="px-2 py-1 bg-[#B91C1C] text-white text-xs font-medium rounded-md cursor-pointer"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 text-xs text-[#6B655C] hover:text-[#1F1D1A] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (kind === 'sales' || kind === 'purchases') {
                              exportSingleInvoicePDF(tx, kind === 'purchases');
                            } else {
                              exportSingleVoucherPDF(tx, kind === 'payments');
                            }
                            toast.success('Voucher PDF downloaded.');
                          }}
                          className="p-1.5 text-[#6B655C] hover:text-[#1B4D3E] hover:bg-[#F2EFE9] rounded-md transition-colors cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(tx.id)}
                          className="p-1.5 text-[#6B655C] hover:text-[#B91C1C] hover:bg-[#FEF2F2] rounded-md transition-colors cursor-pointer"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 px-4 text-center text-sm text-[#6B655C]">
                    No matching {title.toLowerCase()} entries found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warm Paper Creation Modal */}
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
                Record {title.replace(/s$/, '')} Voucher
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-[#6B655C] hover:text-[#1F1D1A] rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="p-6 space-y-4">
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
                  <label className="block text-xs font-medium text-[#6B655C] mb-1.5">
                    Reference No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PO-2026-004"
                    value={reference}
                    onChange={e => setReference(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm font-mono text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  />
                </div>
              </div>

              {kind === 'receipts' && (
                <div>
                  <label className="block text-xs font-medium text-[#6B655C] mb-1.5">
                    Receipt Type
                  </label>
                  <select
                    value={transactionType}
                    onChange={e => setTransactionType(e.target.value as TransactionType)}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  >
                    <option value="other_income">Sundry Receipt / Income</option>
                    <option value="capital_contribution">Partner Capital Contribution</option>
                  </select>
                </div>
              )}

              {kind === 'payments' && (
                <div>
                  <label className="block text-xs font-medium text-[#6B655C] mb-1.5">
                    Payment Category
                  </label>
                  <select
                    value={transactionType}
                    onChange={e => setTransactionType(e.target.value as TransactionType)}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  >
                    <option value="other_expense">Operating Expense</option>
                    <option value="tax_payment">Tax Payment</option>
                    <option value="salary_payment">Payroll Settlement</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#6B655C] mb-1.5">
                  Narration / Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="Short description of this transaction..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#6B655C] mb-1.5">
                    Debit Account (Dr)
                  </label>
                  <input
                    type="text"
                    required
                    value={debitAccount}
                    onChange={e => setDebitAccount(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B655C] mb-1.5">
                    Credit Account (Cr)
                  </label>
                  <input
                    type="text"
                    required
                    value={creditAccount}
                    onChange={e => setCreditAccount(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-end">
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

                <label className="flex items-center gap-2 py-2.5 px-3 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBankCleared}
                    onChange={e => setIsBankCleared(e.target.checked)}
                    className="w-4 h-4 accent-[#1B4D3E] rounded"
                  />
                  <span className="text-xs text-[#1F1D1A] font-medium">Bank cleared</span>
                </label>
              </div>

              <div className="pt-3 border-t border-[#E5E0D5] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#6B655C] hover:text-[#1F1D1A] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] font-semibold text-xs rounded-lg cursor-pointer transition-colors"
                >
                  Save Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LedgerPage;
