import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useStore } from '../store';
import { DateSearchBar } from '../components/DateSearchBar';
import { ClickablePath } from '../components/ClickablePath';
import { Printer, Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { exportDaybookPDF, exportToCSV } from '../utils/pdfExport';

const TYPE_LABELS: Record<string, string> = {
  sales: 'Sales',
  purchase: 'Purchase',
  capital_contribution: 'Capital',
  capital_withdrawal: 'Withdrawal',
  profit_distribution: 'Distribution',
  salary_payment: 'Salary',
  tax_payment: 'Tax',
  other_expense: 'Expense',
  other_income: 'Receipt',
};

const Daybook: React.FC = () => {
  const { db, formatMoney } = useStore();
  const outletCtx = useOutletContext<{ openPrintPreview?: () => void }>() || {};

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTransactions = useMemo(() => {
    return [...db.ledger]
      .filter(tx => {
        if (startDate && tx.date < startDate) return false;
        if (endDate && tx.date > endDate) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            tx.description.toLowerCase().includes(q) ||
            (tx.reference && tx.reference.toLowerCase().includes(q)) ||
            tx.debitAccount.toLowerCase().includes(q) ||
            tx.creditAccount.toLowerCase().includes(q) ||
            tx.type.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [db.ledger, startDate, endDate, searchQuery]);

  const totalAmount = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const rangeLabel =
    startDate && endDate
      ? `${startDate} to ${endDate}`
      : startDate
      ? `From ${startDate}`
      : endDate
      ? `Through ${endDate}`
      : 'All recorded dates';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#E5E0D5]">
        <div>
          <ClickablePath variant="page" />
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1F1D1A] tracking-tight">
            Daybook
          </h1>
          <p className="text-sm text-[#6B655C] mt-1">
            Chronological log of all double-entry debits, credits, and vouchers across your ledger.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 no-print">
          <button
            type="button"
            onClick={() => {
              const headers = [
                'Date',
                'Voucher Type',
                'Reference No',
                'Description',
                'Debit Account',
                'Credit Account',
                'Amount',
                'Status',
              ];
              const data = filteredTransactions.map(tx => [
                tx.date,
                TYPE_LABELS[tx.type] || tx.type,
                tx.reference || tx.id.slice(-6).toUpperCase(),
                tx.description,
                tx.debitAccount,
                tx.creditAccount,
                tx.amount,
                tx.isBankCleared ? 'Cleared' : 'Pending',
              ]);
              exportToCSV(data, headers, `Tunzua_Daybook_${startDate || 'all'}.csv`);
              toast.success('Daybook exported to CSV.');
            }}
            className="px-3.5 py-2 bg-[#FFFDF9] hover:bg-[#F2EFE9] text-[#1F1D1A] border border-[#E5E0D5] font-medium text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#1B4D3E]" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => {
              exportDaybookPDF(filteredTransactions, rangeLabel);
              toast.success('Daybook exported to PDF.');
            }}
            className="px-3.5 py-2 bg-[#FFFDF9] hover:bg-[#F2EFE9] text-[#1F1D1A] border border-[#E5E0D5] font-medium text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#1B4D3E]" />
            Export PDF
          </button>
          <button
            type="button"
            onClick={() => (outletCtx.openPrintPreview ? outletCtx.openPrintPreview() : window.print())}
            className="px-3.5 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] font-semibold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Preview
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FFFDF9] p-5 rounded-xl border border-[#E5E0D5]">
          <div className="text-xs text-[#6B655C]">Total Activity</div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-semibold text-[#1F1D1A]">
            {formatMoney(totalAmount)}
          </div>
        </div>
        <div className="bg-[#FFFDF9] p-5 rounded-xl border border-[#E5E0D5]">
          <div className="text-xs text-[#6B655C]">Vouchers Listed</div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-semibold text-[#1F1D1A]">
            {filteredTransactions.length}
          </div>
        </div>
        <div className="bg-[#FFFDF9] p-5 rounded-xl border border-[#E5E0D5]">
          <div className="text-xs text-[#6B655C]">Date Range</div>
          <div className="mt-2 font-mono tabular-nums text-sm font-semibold text-[#1B4D3E]">
            {rangeLabel}
          </div>
        </div>
      </div>

      {/* Main Daybook Table */}
      <div className="bg-[#FFFDF9] rounded-xl border border-[#E5E0D5] overflow-hidden">
        <DateSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          placeholder="Search daybook by description, reference, type, or account..."
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E5E0D5] bg-[#F8F6F1] text-xs font-medium text-[#6B655C]">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Narration</th>
                <th className="py-3 px-4">Debit (Dr)</th>
                <th className="py-3 px-4">Credit (Cr)</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D5] text-[#1F1D1A]">
              {filteredTransactions.map(tx => (
                <tr key={tx.id} className="hover:bg-[#F8F6F1]/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-[#6B655C] whitespace-nowrap">
                    {tx.date}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium text-[#6B655C] whitespace-nowrap">
                    {TYPE_LABELS[tx.type] || tx.type}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs font-medium text-[#1B4D3E] whitespace-nowrap">
                    {tx.reference || tx.id.slice(-6).toUpperCase()}
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
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 px-4 text-center text-sm text-[#6B655C]">
                    No transactions match the selected date range or search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Daybook;
