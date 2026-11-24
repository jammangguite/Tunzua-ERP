import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { RecurringBill, RecurringBillCadence } from '../types';
import { DateSearchBar } from '../components/DateSearchBar';
import { ClickablePath } from '../components/ClickablePath';
import { Plus, Check, Pause, Play, Trash2, Edit3, X } from 'lucide-react';
import { toast } from 'sonner';

const CADENCE_LABELS: Record<RecurringBillCadence, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

const daysUntil = (dateStr: string): number => {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return 0;
  const due = new Date(parts[0], parts[1] - 1, parts[2]);
  return Math.round((due.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
};

const getMonthlyEquivalent = (bill: RecurringBill): number => {
  if (bill.status !== 'active') return 0;
  switch (bill.cadence) {
    case 'weekly':
      return bill.amount * 4.333;
    case 'monthly':
      return bill.amount;
    case 'quarterly':
      return bill.amount / 3;
    case 'yearly':
      return bill.amount / 12;
  }
};

export const getBillStatusMeta = (bill: RecurringBill) => {
  if (bill.status === 'paused') {
    return { label: 'Paused', tone: 'text-[#6B655C]', kind: 'paused' as const };
  }
  const diff = daysUntil(bill.nextDueDate);
  if (diff < 0) {
    return {
      label: `Overdue by ${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'}`,
      tone: 'text-[#B91C1C] font-semibold',
      kind: 'overdue' as const,
    };
  }
  if (diff === 0) {
    return {
      label: 'Due today',
      tone: 'text-[#B91C1C] font-semibold',
      kind: 'due_soon' as const,
    };
  }
  if (diff <= bill.reminderDaysBefore) {
    return {
      label: `Due in ${diff} day${diff === 1 ? '' : 's'}`,
      tone: 'text-[#B45309] font-semibold',
      kind: 'due_soon' as const,
    };
  }
  return {
    label: `Due in ${diff} days`,
    tone: 'text-[#157347]',
    kind: 'upcoming' as const,
  };
};

const RecurringBills: React.FC = () => {
  const {
    recurringBills,
    addRecurringBill,
    updateRecurringBill,
    deleteRecurringBill,
    payRecurringBill,
    formatMoney,
    companySettings,
    triggerSync,
  } = useStore();

  const [filterTab, setFilterTab] = useState<'all' | 'attention' | 'active' | 'paused'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseAccount, setExpenseAccount] = useState('Operating Expense Account');
  const [paymentAccount, setPaymentAccount] = useState('Corporate Bank Account');
  const [cadence, setCadence] = useState<RecurringBillCadence>('monthly');
  const [nextDueDate, setNextDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reminderDaysBefore, setReminderDaysBefore] = useState('5');
  const [notes, setNotes] = useState('');

  const openAddModal = () => {
    setEditingId(null);
    setTitle('');
    setVendor('');
    setAmount('');
    setExpenseAccount('Operating Expense Account');
    setPaymentAccount('Corporate Bank Account');
    setCadence('monthly');
    setNextDueDate(new Date().toISOString().split('T')[0]);
    setReminderDaysBefore('5');
    setNotes('');
    setShowModal(true);
  };

  const openEditModal = (bill: RecurringBill) => {
    setEditingId(bill.id);
    setTitle(bill.title);
    setVendor(bill.vendor);
    setAmount(String(bill.amount));
    setExpenseAccount(bill.expenseAccount);
    setPaymentAccount(bill.paymentAccount);
    setCadence(bill.cadence);
    setNextDueDate(bill.nextDueDate);
    setReminderDaysBefore(String(bill.reminderDaysBefore));
    setNotes(bill.notes || '');
    setShowModal(true);
  };

  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!title.trim() || !vendor.trim()) {
      toast.error('Please enter both a bill title and vendor name.');
      return;
    }
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Please enter a valid amount greater than 0.');
      return;
    }

    const billData = {
      title: title.trim(),
      vendor: vendor.trim(),
      amount: numericAmount,
      expenseAccount: expenseAccount.trim() || 'Operating Expense Account',
      paymentAccount: paymentAccount.trim() || 'Corporate Bank Account',
      cadence,
      nextDueDate,
      reminderDaysBefore: Math.max(0, parseInt(reminderDaysBefore) || 5),
      status: 'active' as const,
      notes: notes.trim() || undefined,
    };

    if (editingId) {
      updateRecurringBill(editingId, billData);
      toast.success('Recurring bill updated.');
    } else {
      addRecurringBill(billData);
      toast.success('Recurring bill scheduled.');
    }
    setShowModal(false);
  };

  const handlePayNow = (bill: RecurringBill) => {
    payRecurringBill(bill.id);
    triggerSync();
    toast.success(`Paid "${bill.title}" and posted entry to ledger.`);
  };

  const filteredBills = useMemo(() => {
    return [...recurringBills]
      .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
      .filter(bill => {
        const meta = getBillStatusMeta(bill);
        if (filterTab === 'attention' && meta.kind !== 'overdue' && meta.kind !== 'due_soon') {
          return false;
        }
        if (filterTab === 'active' && bill.status !== 'active') return false;
        if (filterTab === 'paused' && bill.status !== 'paused') return false;

        if (startDate && bill.nextDueDate < startDate) return false;
        if (endDate && bill.nextDueDate > endDate) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            bill.title.toLowerCase().includes(q) ||
            bill.vendor.toLowerCase().includes(q) ||
            bill.expenseAccount.toLowerCase().includes(q) ||
            bill.cadence.toLowerCase().includes(q)
          );
        }
        return true;
      });
  }, [recurringBills, filterTab, startDate, endDate, searchQuery]);

  const stats = useMemo(() => {
    let overdue = 0;
    let dueSoon = 0;
    let monthlyTotal = 0;
    recurringBills.forEach(bill => {
      const meta = getBillStatusMeta(bill);
      if (meta.kind === 'overdue') overdue++;
      if (meta.kind === 'due_soon') dueSoon++;
      monthlyTotal += getMonthlyEquivalent(bill);
    });
    return { overdue, dueSoon, monthlyTotal };
  }, [recurringBills]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#E5E0D5]">
        <div>
          <ClickablePath variant="page" />
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1F1D1A] tracking-tight">
            Recurring Bills & Reminders
          </h1>
          <p className="text-sm text-[#6B655C] mt-1">
            Track scheduled rent, utilities, subscriptions, and vendor obligations. Pay in one click to log directly into the ledger.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Recurring Bill
        </button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FFFDF9] border border-[#E5E0D5] rounded-xl p-5">
          <div className="text-xs text-[#6B655C]">Estimated Monthly Commitment</div>
          <div className="font-mono tabular-nums text-2xl font-semibold text-[#1F1D1A] mt-2">
            {formatMoney(stats.monthlyTotal)}
          </div>
          <div className="text-xs text-[#968E82] mt-1">
            Across {recurringBills.filter(b => b.status === 'active').length} active schedules
          </div>
        </div>

        <div className="bg-[#FFFDF9] border border-[#E5E0D5] rounded-xl p-5">
          <div className="text-xs text-[#6B655C]">Overdue Bills</div>
          <div
            className={`font-mono tabular-nums text-2xl font-semibold mt-2 ${
              stats.overdue > 0 ? 'text-[#B91C1C]' : 'text-[#157347]'
            }`}
          >
            {stats.overdue}
          </div>
          <div className="text-xs text-[#968E82] mt-1">
            {stats.overdue > 0 ? 'Requires immediate payment' : 'All bills up to date'}
          </div>
        </div>

        <div className="bg-[#FFFDF9] border border-[#E5E0D5] rounded-xl p-5">
          <div className="text-xs text-[#6B655C]">Due Soon Reminders</div>
          <div
            className={`font-mono tabular-nums text-2xl font-semibold mt-2 ${
              stats.dueSoon > 0 ? 'text-[#B45309]' : 'text-[#1F1D1A]'
            }`}
          >
            {stats.dueSoon}
          </div>
          <div className="text-xs text-[#968E82] mt-1">Within each bill's reminder window</div>
        </div>
      </div>

      {/* Filter Tabs + Ledger Sheet */}
      <div className="bg-[#FFFDF9] border border-[#E5E0D5] rounded-xl overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-[#E5E0D5] flex flex-wrap items-center justify-between gap-2 bg-[#FFFDF9]">
          <div className="flex items-center gap-1 p-1 bg-[#F2EFE9] border border-[#E5E0D5] rounded-lg">
            {[
              { id: 'all', label: `All (${recurringBills.length})` },
              { id: 'attention', label: `Due & Overdue (${stats.overdue + stats.dueSoon})` },
              { id: 'active', label: 'Active' },
              { id: 'paused', label: 'Paused' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id as any)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  filterTab === tab.id
                    ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                    : 'text-[#6B655C] hover:text-[#1F1D1A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <DateSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          placeholder="Search bill title, vendor, or expense account..."
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E5E0D5] bg-[#F8F6F1] text-xs font-medium text-[#6B655C]">
                <th className="py-3 px-4">Bill & Vendor</th>
                <th className="py-3 px-4">Expense Account</th>
                <th className="py-3 px-4">Schedule</th>
                <th className="py-3 px-4">Next Due</th>
                <th className="py-3 px-4">Reminder Status</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D5] text-[#1F1D1A]">
              {filteredBills.map(bill => {
                const statusMeta = getBillStatusMeta(bill);
                return (
                  <tr key={bill.id} className="hover:bg-[#F8F6F1]/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#1F1D1A]">{bill.title}</div>
                      <div className="text-xs text-[#6B655C] mt-0.5">
                        {bill.vendor}
                        {bill.lastPaidDate && (
                          <span className="text-[#968E82]">
                            {' '}
                            · Last paid <span className="font-mono tabular-nums">{bill.lastPaidDate}</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#6B655C]">{bill.expenseAccount}</td>
                    <td className="py-3.5 px-4 text-xs text-[#6B655C]">{CADENCE_LABELS[bill.cadence]}</td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-[#1F1D1A] whitespace-nowrap">
                      {bill.nextDueDate}
                    </td>
                    <td className={`py-3.5 px-4 text-xs whitespace-nowrap ${statusMeta.tone}`}>
                      {statusMeta.label}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#1F1D1A] whitespace-nowrap">
                      {formatMoney(bill.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap no-print">
                      {confirmDeleteId === bill.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              deleteRecurringBill(bill.id);
                              setConfirmDeleteId(null);
                              toast.success('Recurring bill removed.');
                            }}
                            className="px-2.5 py-1 bg-[#B91C1C] text-white text-xs font-medium rounded-md cursor-pointer"
                          >
                            Confirm
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
                        <div className="inline-flex items-center gap-1.5">
                          {bill.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => handlePayNow(bill)}
                              className="px-2.5 py-1 bg-[#EBF3F0] hover:bg-[#1B4D3E] text-[#1B4D3E] hover:text-[#FFFDF9] border border-[#C7DFD6] text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
                              title="Record payment in ledger and advance due date"
                            >
                              <Check className="w-3 h-3" />
                              Pay & Log
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditModal(bill)}
                            className="p-1.5 text-[#6B655C] hover:text-[#1F1D1A] hover:bg-[#F2EFE9] rounded-md transition-colors cursor-pointer"
                            title="Edit bill"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              updateRecurringBill(bill.id, {
                                status: bill.status === 'active' ? 'paused' : 'active',
                              });
                              toast.success(
                                bill.status === 'active' ? 'Bill paused.' : 'Bill resumed.'
                              );
                            }}
                            className="p-1.5 text-[#6B655C] hover:text-[#1F1D1A] hover:bg-[#F2EFE9] rounded-md transition-colors cursor-pointer"
                            title={bill.status === 'active' ? 'Pause reminders' : 'Resume reminders'}
                          >
                            {bill.status === 'active' ? (
                              <Pause className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(bill.id)}
                            className="p-1.5 text-[#6B655C] hover:text-[#B91C1C] hover:bg-[#FEF2F2] rounded-md transition-colors cursor-pointer"
                            title="Delete bill"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredBills.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center">
                    <p className="text-sm text-[#6B655C]">
                      No recurring bills match your current filter.
                    </p>
                    <button
                      type="button"
                      onClick={openAddModal}
                      className="mt-3 px-4 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Add First Recurring Bill
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Bill Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-[#1F1D1A]/40 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg bg-[#FFFDF9] border border-[#E5E0D5] rounded-xl shadow-lg overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#E5E0D5] flex items-center justify-between bg-[#F8F6F1]">
              <h2 className="font-display text-lg font-semibold text-[#1F1D1A]">
                {editingId ? 'Edit Recurring Bill' : 'Schedule Recurring Bill'}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-[#6B655C] hover:text-[#1F1D1A] rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBill} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#6B655C] mb-1.5">
                    Bill Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Office Rent"
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B655C] mb-1.5">
                    Vendor / Payee
                  </label>
                  <input
                    type="text"
                    required
                    value={vendor}
                    onChange={e => setVendor(e.target.value)}
                    placeholder="e.g. Meridian Properties"
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#6B655C] mb-1.5">
                    Amount ({companySettings.currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm font-mono tabular-nums text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B655C] mb-1.5">
                    Cadence
                  </label>
                  <select
                    value={cadence}
                    onChange={e => setCadence(e.target.value as RecurringBillCadence)}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B655C] mb-1.5">
                    Next Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={nextDueDate}
                    onChange={e => setNextDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm font-mono tabular-nums text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#6B655C] mb-1.5">
                    Expense Account (Dr)
                  </label>
                  <input
                    type="text"
                    required
                    value={expenseAccount}
                    onChange={e => setExpenseAccount(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B655C] mb-1.5">
                    Payment Account (Cr)
                  </label>
                  <input
                    type="text"
                    required
                    value={paymentAccount}
                    onChange={e => setPaymentAccount(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#6B655C] mb-1.5">
                    Remind (Days Before)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={reminderDaysBefore}
                    onChange={e => setReminderDaysBefore(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm font-mono tabular-nums text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#6B655C] mb-1.5">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Account number or invoice instructions"
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E0D5] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#6B655C] hover:text-[#1F1D1A] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  {editingId ? 'Save Changes' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecurringBills;
