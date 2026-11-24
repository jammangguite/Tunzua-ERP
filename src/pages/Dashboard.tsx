import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { useAuth } from '../lib/auth';
import { getLinkedSheetForEmail } from '../lib/firebase';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowRight, Check, FileSpreadsheet, ChevronRight } from 'lucide-react';
import { ClickablePath } from '../components/ClickablePath';
import {
  DashboardDetailDrawer,
  DashboardRibbonSelection,
} from '../components/DashboardDetailDrawer';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { getBillStatusMeta } from './RecurringBills';
import { toast } from 'sonner';

interface LayoutOutletContext {
  openSheetsSync?: () => void;
  openQuickEntry?: () => void;
}

const PaperTooltip = ({ active, payload, label, formatMoney }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#FFFDF9] text-[#1F1D1A] p-3 rounded-lg border border-[#D5CEBF] shadow-sm font-sans text-xs space-y-1">
        <p className="font-semibold text-[#6B655C] border-b border-[#E5E0D5] pb-1 mb-1">
          {label} 2026
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between gap-4 items-center">
            <span className="text-[#6B655C]">{entry.name}</span>
            <span className="font-mono tabular-nums font-semibold text-[#1F1D1A]">
              {formatMoney(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC = () => {
  const { db, recurringBills, payRecurringBill, triggerSync, formatMoney, companySettings } = useStore();
  const { user } = useAuth();
  const outletCtx = useOutletContext<LayoutOutletContext>() || {};
  const [selectedRibbon, setSelectedRibbon] = useState<DashboardRibbonSelection>(null);

  const linkedSheet = useMemo(() => getLinkedSheetForEmail(user?.email), [user?.email]);

  const bankCashBalance = useMemo(() => {
    return (
      100000 +
      db.ledger
        .filter(tx => tx.debitAccount.toLowerCase().includes('bank'))
        .reduce((sum, tx) => sum + tx.amount, 0) -
      db.ledger
        .filter(tx => tx.creditAccount.toLowerCase().includes('bank'))
        .reduce((sum, tx) => sum + tx.amount, 0)
    );
  }, [db.ledger]);

  const totalSalesAmount = useMemo(
    () => db.ledger.filter(tx => tx.type === 'sales').reduce((sum, tx) => sum + tx.amount, 0),
    [db.ledger]
  );

  const netAssetBookValue = useMemo(
    () =>
      db.fixedAssets
        .filter(a => a.status === 'active')
        .reduce((sum, a) => sum + (a.currentBookValue ?? Math.max(0, a.cost - a.accumulatedDepreciation)), 0),
    [db.fixedAssets]
  );

  const upcomingBills = useMemo(() => {
    return [...recurringBills]
      .filter(b => b.status === 'active')
      .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
      .slice(0, 4);
  }, [recurringBills]);

  const attentionCount = useMemo(() => {
    return recurringBills.filter(b => {
      const m = getBillStatusMeta(b);
      return m.kind === 'overdue' || m.kind === 'due_soon';
    }).length;
  }, [recurringBills]);

  const recentTransactions = useMemo(
    () => [...db.ledger].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6),
    [db.ledger]
  );

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

  const cashFlowData = useMemo(() => {
    return months.map((monthName, index) => {
      const monthNum = index + 1;
      let inflow = [18500, 22000, 19500, 24000, 28500, 0][index];
      let outflow = [12000, 14500, 13800, 16200, 19800, 0][index];

      const txsForMonth = db.ledger.filter(tx => {
        const parts = tx.date.split('-');
        if (parts.length < 2) return false;
        return parseInt(parts[0]) === 2026 && parseInt(parts[1]) === monthNum;
      });

      const realInflow = txsForMonth
        .filter(
          tx =>
            tx.debitAccount.toLowerCase().includes('bank') ||
            tx.debitAccount.toLowerCase().includes('cash')
        )
        .reduce((sum, tx) => sum + tx.amount, 0);

      const realOutflow = txsForMonth
        .filter(
          tx =>
            tx.creditAccount.toLowerCase().includes('bank') ||
            tx.creditAccount.toLowerCase().includes('cash')
        )
        .reduce((sum, tx) => sum + tx.amount, 0);

      if (monthNum === 6) {
        inflow = realInflow;
        outflow = realOutflow;
      } else {
        inflow += realInflow;
        outflow += realOutflow;
      }

      return { name: monthName, Inflow: inflow, Outflow: outflow };
    });
  }, [db.ledger]);

  const salesVsExpenseData = useMemo(() => {
    return months.map((monthName, index) => {
      const monthNum = index + 1;
      let sales = [16000, 21000, 18500, 25000, 31000, 0][index];
      let expense = [10500, 13000, 12200, 15500, 18000, 0][index];

      const txsForMonth = db.ledger.filter(tx => {
        const parts = tx.date.split('-');
        if (parts.length < 2) return false;
        return parseInt(parts[0]) === 2026 && parseInt(parts[1]) === monthNum;
      });

      const realSales = txsForMonth
        .filter(
          tx =>
            tx.type === 'sales' ||
            tx.creditAccount.toLowerCase().includes('revenue') ||
            tx.creditAccount.toLowerCase().includes('sales')
        )
        .reduce((sum, tx) => sum + tx.amount, 0);

      const realExpense = txsForMonth
        .filter(
          tx =>
            tx.type === 'purchase' ||
            tx.type === 'other_expense' ||
            tx.type === 'salary_payment' ||
            tx.type === 'tax_payment' ||
            tx.debitAccount.toLowerCase().includes('expense')
        )
        .reduce((sum, tx) => sum + tx.amount, 0);

      if (monthNum === 6) {
        sales = realSales;
        expense = realExpense;
      } else {
        sales += realSales;
        expense += realExpense;
      }

      return { name: monthName, Sales: sales, Expense: expense };
    });
  }, [db.ledger]);

  const handlePayBill = (billId: string, billTitle: string) => {
    payRecurringBill(billId);
    triggerSync();
    toast.success(`Paid "${billTitle}" and recorded in ledger.`);
  };

  return (
    <div className="space-y-8">
      {/* Page Title + Google Sheet Sync Action */}
      <div className="pb-5 border-b border-[#E5E0D5] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <ClickablePath variant="page" />
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1F1D1A] tracking-tight">
            {companySettings.name || 'Tunzua'} Overview
          </h1>
          <p className="text-sm text-[#6B655C] mt-1">
            Click any summary ribbon, chart, bill, or entry to inspect full details.
          </p>
        </div>

        <button
          type="button"
          onClick={() => outletCtx.openSheetsSync?.()}
          className="px-3.5 py-2 bg-[#FFFDF9] hover:bg-[#EBF3F0] text-[#1B4D3E] border border-[#C7DFD6] rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap self-start sm:self-auto"
          title={
            linkedSheet
              ? `Linked to ${linkedSheet.title} (${user?.email})`
              : 'Save Tunzua data to a Google Sheet linked to your email'
          }
        >
          <FileSpreadsheet className="w-4 h-4 shrink-0" />
          <span>{linkedSheet ? 'Update Google Sheet' : 'Save to Google Sheet'}</span>
        </button>
      </div>

      {/* Top 4 Clickable Ledger Summary Ribbons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setSelectedRibbon({ kind: 'cash_bank' })}
          className="group text-left bg-[#FFFDF9] hover:border-[#1B4D3E]/60 hover:shadow-xs p-5 rounded-xl border border-[#E5E0D5] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/30"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-[#6B655C]">Cash & Bank Balance</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#968E82] group-hover:text-[#1B4D3E] group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-semibold text-[#1F1D1A]">
            {formatMoney(bankCashBalance)}
          </div>
          <div className="text-xs text-[#968E82] group-hover:text-[#1B4D3E] mt-1 transition-colors">
            Open bank register details
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRibbon({ kind: 'sales' })}
          className="group text-left bg-[#FFFDF9] hover:border-[#1B4D3E]/60 hover:shadow-xs p-5 rounded-xl border border-[#E5E0D5] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/30"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-[#6B655C]">Sales Recorded</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#968E82] group-hover:text-[#1B4D3E] group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-semibold text-[#157347]">
            {formatMoney(totalSalesAmount)}
          </div>
          <div className="text-xs text-[#968E82] group-hover:text-[#1B4D3E] mt-1 transition-colors">
            {db.ledger.filter(tx => tx.type === 'sales').length} sales vouchers · View details
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRibbon({ kind: 'bills' })}
          className="group text-left bg-[#FFFDF9] hover:border-[#1B4D3E]/60 hover:shadow-xs p-5 rounded-xl border border-[#E5E0D5] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/30"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-[#6B655C]">Bills Needing Attention</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#968E82] group-hover:text-[#1B4D3E] group-hover:translate-x-0.5 transition-all" />
          </div>
          <div
            className={`mt-2 font-mono tabular-nums text-2xl font-semibold ${
              attentionCount > 0 ? 'text-[#B45309]' : 'text-[#157347]'
            }`}
          >
            {attentionCount} {attentionCount === 1 ? 'Bill' : 'Bills'}
          </div>
          <div className="text-xs text-[#968E82] group-hover:text-[#1B4D3E] mt-1 transition-colors">
            Inspect recurring bills
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRibbon({ kind: 'assets' })}
          className="group text-left bg-[#FFFDF9] hover:border-[#1B4D3E]/60 hover:shadow-xs p-5 rounded-xl border border-[#E5E0D5] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/30"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-[#6B655C]">Net Fixed Assets</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#968E82] group-hover:text-[#1B4D3E] group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-semibold text-[#1F1D1A]">
            {formatMoney(netAssetBookValue)}
          </div>
          <div className="text-xs text-[#968E82] group-hover:text-[#1B4D3E] mt-1 transition-colors">
            {db.fixedAssets.filter(a => a.status === 'active').length} active assets · View schedule
          </div>
        </button>
      </div>

      {/* Upcoming & Overdue Bills Strip */}
      <div className="bg-[#FFFDF9] rounded-xl border border-[#E5E0D5] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E0D5] flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setSelectedRibbon({ kind: 'bills' })}
            className="text-left group cursor-pointer"
          >
            <h2 className="font-display text-base font-semibold text-[#1F1D1A] group-hover:text-[#1B4D3E] transition-colors">
              Upcoming Bills & Payment Reminders
            </h2>
            <p className="text-xs text-[#6B655C] mt-0.5">
              Click any bill for full details, or pay in one click to log the payment and advance the next due date.
            </p>
          </button>
          <Link
            to="/app/bills"
            className="text-xs font-medium text-[#1B4D3E] hover:underline flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            All Bills
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {upcomingBills.length > 0 ? (
          <div className="divide-y divide-[#E5E0D5]">
            {upcomingBills.map(bill => {
              const status = getBillStatusMeta(bill);
              return (
                <div
                  key={bill.id}
                  onClick={() => setSelectedRibbon({ kind: 'bill_item', bill })}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedRibbon({ kind: 'bill_item', bill });
                    }
                  }}
                  className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8F6F1]/80 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#1F1D1A] truncate">{bill.title}</div>
                    <div className="text-xs text-[#6B655C] mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span>{bill.vendor}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">Due {bill.nextDueDate}</span>
                      <span aria-hidden="true">·</span>
                      <span className={status.tone}>{status.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="font-mono tabular-nums text-sm font-semibold text-[#1F1D1A]">
                      {formatMoney(bill.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handlePayBill(bill.id, bill.title);
                      }}
                      className="px-3 py-1.5 bg-[#EBF3F0] hover:bg-[#1B4D3E] text-[#1B4D3E] hover:text-[#FFFDF9] border border-[#C7DFD6] text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <Check className="w-3 h-3" />
                      Pay & Log
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-[#6B655C]">
            No active recurring bills scheduled.{' '}
            <Link to="/app/bills" className="text-[#1B4D3E] font-medium hover:underline">
              Schedule a bill
            </Link>
          </div>
        )}
      </div>

      {/* Two Clickable Financial Trend Ribbons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          onClick={() => setSelectedRibbon({ kind: 'cashflow_chart' })}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSelectedRibbon({ kind: 'cashflow_chart' });
            }
          }}
          className="group bg-[#FFFDF9] hover:border-[#1B4D3E]/55 p-5 rounded-xl border border-[#E5E0D5] transition-colors cursor-pointer"
        >
          <div className="pb-3 mb-4 border-b border-[#E5E0D5] flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-semibold text-[#1F1D1A] group-hover:text-[#1B4D3E] transition-colors">
                Monthly Cash Flow
              </h2>
              <p className="text-xs text-[#6B655C] mt-0.5">Bank inflows compared with cash outflows.</p>
            </div>
            <span className="text-xs font-medium text-[#1B4D3E] inline-flex items-center gap-0.5 whitespace-nowrap">
              Details
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="h-[220px] w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={cashFlowData}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                onClick={(state: any) => {
                  if (state?.activeLabel) {
                    setSelectedRibbon({ kind: 'cashflow_chart', highlightMonth: String(state.activeLabel) });
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D5" vertical={false} />
                <XAxis dataKey="name" stroke="#968E82" fontSize={11} tickLine={false} />
                <YAxis stroke="#968E82" fontSize={11} tickLine={false} />
                <Tooltip content={<PaperTooltip formatMoney={formatMoney} />} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="Inflow"
                  stroke="#1B4D3E"
                  strokeWidth={2}
                  fill="#1B4D3E"
                  fillOpacity={0.08}
                  name="Inflow"
                />
                <Area
                  type="monotone"
                  dataKey="Outflow"
                  stroke="#B91C1C"
                  strokeWidth={1.75}
                  fill="#B91C1C"
                  fillOpacity={0.05}
                  name="Outflow"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          onClick={() => setSelectedRibbon({ kind: 'sales_expense_chart' })}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSelectedRibbon({ kind: 'sales_expense_chart' });
            }
          }}
          className="group bg-[#FFFDF9] hover:border-[#1B4D3E]/55 p-5 rounded-xl border border-[#E5E0D5] transition-colors cursor-pointer"
        >
          <div className="pb-3 mb-4 border-b border-[#E5E0D5] flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-semibold text-[#1F1D1A] group-hover:text-[#1B4D3E] transition-colors">
                Sales vs. Expenses
              </h2>
              <p className="text-xs text-[#6B655C] mt-0.5">Operating revenue against recorded expenses.</p>
            </div>
            <span className="text-xs font-medium text-[#1B4D3E] inline-flex items-center gap-0.5 whitespace-nowrap">
              Details
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="h-[220px] w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={salesVsExpenseData}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                onClick={(state: any) => {
                  if (state?.activeLabel) {
                    setSelectedRibbon({ kind: 'sales_expense_chart', highlightMonth: String(state.activeLabel) });
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D5" vertical={false} />
                <XAxis dataKey="name" stroke="#968E82" fontSize={11} tickLine={false} />
                <YAxis stroke="#968E82" fontSize={11} tickLine={false} />
                <Tooltip content={<PaperTooltip formatMoney={formatMoney} />} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="Sales" fill="#1B4D3E" radius={[3, 3, 0, 0]} name="Sales" />
                <Bar dataKey="Expense" fill="#B45309" radius={[3, 3, 0, 0]} name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Ledger Entries (Clickable Rows) */}
      <div className="bg-[#FFFDF9] rounded-xl border border-[#E5E0D5] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E0D5] flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-[#1F1D1A]">
              Recent Ledger Postings
            </h2>
            <p className="text-xs text-[#6B655C] mt-0.5">
              Click any posting to view its full double-entry voucher slip and PDF export.
            </p>
          </div>
          <Link
            to="/app/daybook"
            className="text-xs font-medium text-[#1B4D3E] hover:underline flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            Open Daybook
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E5E0D5] bg-[#F8F6F1] text-xs font-medium text-[#6B655C]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Accounts (Dr / Cr)</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E0D5]">
                {recentTransactions.map(tx => (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedRibbon({ kind: 'voucher_item', tx })}
                    className="hover:bg-[#F8F6F1]/80 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono tabular-nums text-xs text-[#6B655C] whitespace-nowrap">
                      {tx.date}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#1F1D1A]">{tx.description}</div>
                      {tx.reference && (
                        <div className="text-xs font-mono text-[#968E82] mt-0.5">{tx.reference}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div className="text-[#157347]">
                        <span className="font-mono text-[11px] mr-1.5">Dr</span>
                        {tx.debitAccount}
                      </div>
                      <div className="text-[#6B655C] mt-0.5">
                        <span className="font-mono text-[11px] mr-1.5">Cr</span>
                        {tx.creditAccount}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#1F1D1A] whitespace-nowrap">
                      {formatMoney(tx.amount)}
                    </td>
                    <td className="py-3 px-4 text-right text-xs whitespace-nowrap">
                      <span className={tx.isBankCleared ? 'text-[#157347] font-medium' : 'text-[#B45309] font-medium'}>
                        {tx.isBankCleared ? 'Cleared' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 px-4 text-center text-sm text-[#6B655C]">
            No ledger entries recorded yet. Click <span className="font-semibold text-[#1F1D1A]">Quick Entry</span> to post your first voucher.
          </div>
        )}
      </div>

      {/* Ribbon & Row Detail Slide-Over Drawer */}
      <DashboardDetailDrawer
        selection={selectedRibbon}
        onClose={() => setSelectedRibbon(null)}
        ledger={db.ledger}
        recurringBills={recurringBills}
        fixedAssets={db.fixedAssets}
        bankCashBalance={bankCashBalance}
        totalSalesAmount={totalSalesAmount}
        netAssetBookValue={netAssetBookValue}
        cashFlowData={cashFlowData}
        salesVsExpenseData={salesVsExpenseData}
        formatMoney={formatMoney}
        companyName={companySettings.name || 'Tunzua'}
        onPayBill={handlePayBill}
      />
    </div>
  );
};

export default Dashboard;
