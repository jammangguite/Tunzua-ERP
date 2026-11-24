import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LedgerTransaction, RecurringBill, FixedAsset } from '../types';
import { getBillStatusMeta } from '../pages/RecurringBills';
import { exportSingleInvoicePDF, exportSingleVoucherPDF } from '../utils/pdfExport';
import { X, ArrowRight, Check, Download } from 'lucide-react';
import { toast } from 'sonner';

export type DashboardRibbonSelection =
  | { kind: 'cash_bank' }
  | { kind: 'sales' }
  | { kind: 'bills' }
  | { kind: 'assets' }
  | { kind: 'cashflow_chart'; highlightMonth?: string }
  | { kind: 'sales_expense_chart'; highlightMonth?: string }
  | { kind: 'bill_item'; bill: RecurringBill }
  | { kind: 'voucher_item'; tx: LedgerTransaction }
  | null;

interface DashboardDetailDrawerProps {
  selection: DashboardRibbonSelection;
  onClose: () => void;
  ledger: LedgerTransaction[];
  recurringBills: RecurringBill[];
  fixedAssets: FixedAsset[];
  bankCashBalance: number;
  totalSalesAmount: number;
  netAssetBookValue: number;
  cashFlowData: { name: string; Inflow: number; Outflow: number }[];
  salesVsExpenseData: { name: string; Sales: number; Expense: number }[];
  formatMoney: (n: number) => string;
  companyName: string;
  onPayBill: (billId: string, billTitle: string) => void;
}

export const DashboardDetailDrawer: React.FC<DashboardDetailDrawerProps> = ({
  selection,
  onClose,
  ledger,
  recurringBills,
  fixedAssets,
  bankCashBalance,
  totalSalesAmount,
  netAssetBookValue,
  cashFlowData,
  salesVsExpenseData,
  formatMoney,
  companyName,
  onPayBill,
}) => {
  useEffect(() => {
    if (!selection) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selection, onClose]);

  if (!selection) return null;

  const bankEntries = ledger
    .filter(
      tx =>
        tx.debitAccount.toLowerCase().includes('bank') ||
        tx.creditAccount.toLowerCase().includes('bank') ||
        tx.debitAccount.toLowerCase().includes('cash') ||
        tx.creditAccount.toLowerCase().includes('cash')
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalBankInflow = ledger
    .filter(tx => tx.debitAccount.toLowerCase().includes('bank'))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalBankOutflow = ledger
    .filter(tx => tx.creditAccount.toLowerCase().includes('bank'))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const salesEntries = ledger
    .filter(tx => tx.type === 'sales')
    .sort((a, b) => b.date.localeCompare(a.date));

  const activeAssets = fixedAssets.filter(a => a.status === 'active');
  const totalAssetCost = activeAssets.reduce((sum, a) => sum + a.cost, 0);
  const totalAssetDep = activeAssets.reduce((sum, a) => sum + a.accumulatedDepreciation, 0);

  const activeBills = [...recurringBills]
    .filter(b => b.status === 'active')
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));

  const getHeader = () => {
    switch (selection.kind) {
      case 'cash_bank':
        return {
          title: 'Cash & Bank Register',
          subtitle: 'Liquid bank and cash movements contributing to your current balance.',
          linkTo: '/app/daybook',
          linkLabel: 'Open Daybook',
        };
      case 'sales':
        return {
          title: 'Sales Ledger Breakdown',
          subtitle: 'Recorded sales invoices and customer revenue postings.',
          linkTo: '/app/sales',
          linkLabel: 'Open Sales Head',
        };
      case 'bills':
        return {
          title: 'Bills & Payment Reminders',
          subtitle: 'Upcoming and overdue scheduled payments ready to log.',
          linkTo: '/app/bills',
          linkLabel: 'Manage All Bills',
        };
      case 'assets':
        return {
          title: 'Fixed Assets Schedule',
          subtitle: 'Active capital assets, accumulated depreciation, and net book values.',
          linkTo: '/app/assets',
          linkLabel: 'Open Fixed Assets',
        };
      case 'cashflow_chart':
        return {
          title: selection.highlightMonth
            ? `Cash Flow — ${selection.highlightMonth} 2026`
            : 'Monthly Cash Flow Breakdown',
          subtitle: 'Month-by-month bank inflows, outflows, and net cash position.',
          linkTo: '/app/reports',
          linkLabel: 'Open Financial Reports',
        };
      case 'sales_expense_chart':
        return {
          title: selection.highlightMonth
            ? `Sales vs. Expenses — ${selection.highlightMonth} 2026`
            : 'Sales vs. Expenses Breakdown',
          subtitle: 'Operating revenue compared against recorded expenses and net margin.',
          linkTo: '/app/reports',
          linkLabel: 'Open Financial Reports',
        };
      case 'bill_item':
        return {
          title: selection.bill.title,
          subtitle: `Recurring bill detail · ${selection.bill.vendor}`,
          linkTo: '/app/bills',
          linkLabel: 'All Recurring Bills',
        };
      case 'voucher_item':
        return {
          title: selection.tx.reference || 'Ledger Voucher Detail',
          subtitle: `Posted on ${selection.tx.date} · Double-entry voucher slip`,
          linkTo:
            selection.tx.type === 'sales'
              ? '/app/sales'
              : selection.tx.type === 'purchase'
                ? '/app/purchases'
                : selection.tx.type === 'other_income'
                  ? '/app/receipts'
                  : '/app/daybook',
          linkLabel: 'Open Ledger Head',
        };
    }
  };

  const header = getHeader();

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1F1D1A]/40 backdrop-blur-[2px] flex justify-end"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ribbon-detail-title"
    >
      <div
        className="w-full max-w-2xl h-full bg-[#FFFDF9] border-l border-[#E5E0D5] shadow-xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 bg-[#F8F6F1] border-b border-[#E5E0D5] flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h2 id="ribbon-detail-title" className="font-display text-xl font-semibold text-[#1F1D1A] truncate">
              {header.title}
            </h2>
            <p className="text-xs text-[#6B655C] mt-0.5">{header.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#6B655C] hover:text-[#1F1D1A] hover:bg-[#EAE5DB] rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Close details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. CASH & BANK DETAILS */}
          {selection.kind === 'cash_bank' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg">
                  <div className="text-[11px] text-[#6B655C]">Opening Balance</div>
                  <div className="mt-1 font-mono tabular-nums text-sm font-semibold text-[#1F1D1A]">
                    {formatMoney(100000)}
                  </div>
                </div>
                <div className="p-3.5 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg">
                  <div className="text-[11px] text-[#6B655C]">Bank Inflows</div>
                  <div className="mt-1 font-mono tabular-nums text-sm font-semibold text-[#157347]">
                    +{formatMoney(totalBankInflow)}
                  </div>
                </div>
                <div className="p-3.5 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg">
                  <div className="text-[11px] text-[#6B655C]">Bank Outflows</div>
                  <div className="mt-1 font-mono tabular-nums text-sm font-semibold text-[#B91C1C]">
                    -{formatMoney(totalBankOutflow)}
                  </div>
                </div>
                <div className="p-3.5 bg-[#EBF3F0] border border-[#C7DFD6] rounded-lg">
                  <div className="text-[11px] text-[#1B4D3E] font-medium">Closing Balance</div>
                  <div className="mt-1 font-mono tabular-nums text-sm font-semibold text-[#1B4D3E]">
                    {formatMoney(bankCashBalance)}
                  </div>
                </div>
              </div>

              <div className="border border-[#E5E0D5] rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-[#F8F6F1] border-b border-[#E5E0D5] text-xs font-semibold text-[#1F1D1A]">
                  Bank & Cash Movements ({bankEntries.length})
                </div>
                {bankEntries.length > 0 ? (
                  <div className="divide-y divide-[#E5E0D5]">
                    {bankEntries.map(tx => {
                      const isInflow =
                        tx.debitAccount.toLowerCase().includes('bank') ||
                        tx.debitAccount.toLowerCase().includes('cash');
                      return (
                        <div key={tx.id} className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-[#F8F6F1]/60">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[#1F1D1A] truncate">
                              {tx.description}
                            </div>
                            <div className="text-xs text-[#6B655C] mt-0.5 flex flex-wrap items-center gap-1.5">
                              <span className="font-mono tabular-nums">{tx.date}</span>
                              {tx.reference && (
                                <>
                                  <span>·</span>
                                  <span className="font-mono">{tx.reference}</span>
                                </>
                              )}
                              <span>·</span>
                              <span className="truncate">
                                Dr {tx.debitAccount} / Cr {tx.creditAccount}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div
                              className={`font-mono tabular-nums text-sm font-semibold ${
                                isInflow ? 'text-[#157347]' : 'text-[#B91C1C]'
                              }`}
                            >
                              {isInflow ? '+' : '-'}
                              {formatMoney(tx.amount)}
                            </div>
                            <div className="text-[11px] text-[#968E82]">
                              {tx.isBankCleared ? 'Cleared' : 'Pending'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-[#6B655C]">
                    No bank or cash entries recorded yet.
                  </div>
                )}
              </div>
            </>
          )}

          {/* 2. SALES DETAILS */}
          {selection.kind === 'sales' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 bg-[#EBF3F0] border border-[#C7DFD6] rounded-lg">
                  <div className="text-[11px] text-[#1B4D3E] font-medium">Total Sales</div>
                  <div className="mt-1 font-mono tabular-nums text-base font-semibold text-[#157347]">
                    {formatMoney(totalSalesAmount)}
                  </div>
                </div>
                <div className="p-3.5 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg">
                  <div className="text-[11px] text-[#6B655C]">Sales Vouchers</div>
                  <div className="mt-1 font-mono tabular-nums text-base font-semibold text-[#1F1D1A]">
                    {salesEntries.length}
                  </div>
                </div>
                <div className="p-3.5 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg">
                  <div className="text-[11px] text-[#6B655C]">Average Voucher</div>
                  <div className="mt-1 font-mono tabular-nums text-base font-semibold text-[#1F1D1A]">
                    {formatMoney(salesEntries.length > 0 ? totalSalesAmount / salesEntries.length : 0)}
                  </div>
                </div>
              </div>

              <div className="border border-[#E5E0D5] rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-[#F8F6F1] border-b border-[#E5E0D5] text-xs font-semibold text-[#1F1D1A]">
                  Sales Invoices & Vouchers ({salesEntries.length})
                </div>
                {salesEntries.length > 0 ? (
                  <div className="divide-y divide-[#E5E0D5]">
                    {salesEntries.map(tx => (
                      <div key={tx.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#F8F6F1]/60">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[#1F1D1A] truncate">
                            {tx.description}
                          </div>
                          <div className="text-xs text-[#6B655C] mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span className="font-mono tabular-nums">{tx.date}</span>
                            {tx.reference && (
                              <>
                                <span>·</span>
                                <span className="font-mono">{tx.reference}</span>
                              </>
                            )}
                            <span>·</span>
                            <span>{tx.isBankCleared ? 'Cleared' : 'Pending'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono tabular-nums text-sm font-semibold text-[#157347]">
                            {formatMoney(tx.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              exportSingleInvoicePDF(tx, false);
                              toast.success('Invoice PDF downloaded.');
                            }}
                            className="p-1.5 text-[#6B655C] hover:text-[#1B4D3E] hover:bg-[#EBF3F0] rounded-md transition-colors cursor-pointer"
                            title="Download Invoice PDF"
                            aria-label="Download Invoice PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-[#6B655C]">
                    No sales vouchers recorded yet.
                  </div>
                )}
              </div>
            </>
          )}

          {/* 3. BILLS DETAILS */}
          {selection.kind === 'bills' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-lg">
                  <div className="text-[11px] text-[#B91C1C] font-medium">Overdue</div>
                  <div className="mt-1 font-mono tabular-nums text-base font-semibold text-[#B91C1C]">
                    {activeBills.filter(b => getBillStatusMeta(b).kind === 'overdue').length}
                  </div>
                </div>
                <div className="p-3.5 bg-[#FFFBF2] border border-[#E7C98B] rounded-lg">
                  <div className="text-[11px] text-[#92400E] font-medium">Due Soon</div>
                  <div className="mt-1 font-mono tabular-nums text-base font-semibold text-[#B45309]">
                    {activeBills.filter(b => getBillStatusMeta(b).kind === 'due_soon').length}
                  </div>
                </div>
                <div className="p-3.5 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg">
                  <div className="text-[11px] text-[#6B655C]">Active Schedule Total</div>
                  <div className="mt-1 font-mono tabular-nums text-base font-semibold text-[#1F1D1A]">
                    {formatMoney(activeBills.reduce((s, b) => s + b.amount, 0))}
                  </div>
                </div>
              </div>

              <div className="border border-[#E5E0D5] rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-[#F8F6F1] border-b border-[#E5E0D5] text-xs font-semibold text-[#1F1D1A]">
                  Active Recurring Bills ({activeBills.length})
                </div>
                {activeBills.length > 0 ? (
                  <div className="divide-y divide-[#E5E0D5]">
                    {activeBills.map(bill => {
                      const status = getBillStatusMeta(bill);
                      return (
                        <div key={bill.id} className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#1F1D1A] truncate">{bill.title}</div>
                            <div className="text-xs text-[#6B655C] mt-0.5 flex flex-wrap items-center gap-1.5">
                              <span>{bill.vendor}</span>
                              <span>·</span>
                              <span className="capitalize">{bill.cadence}</span>
                              <span>·</span>
                              <span className="font-mono tabular-nums">Due {bill.nextDueDate}</span>
                              <span>·</span>
                              <span className={status.tone}>{status.label}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-mono tabular-nums text-sm font-semibold text-[#1F1D1A]">
                              {formatMoney(bill.amount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => onPayBill(bill.id, bill.title)}
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
                    No active recurring bills scheduled.
                  </div>
                )}
              </div>
            </>
          )}

          {/* 4. FIXED ASSETS DETAILS */}
          {selection.kind === 'assets' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg">
                  <div className="text-[11px] text-[#6B655C]">Original Cost</div>
                  <div className="mt-1 font-mono tabular-nums text-base font-semibold text-[#1F1D1A]">
                    {formatMoney(totalAssetCost)}
                  </div>
                </div>
                <div className="p-3.5 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg">
                  <div className="text-[11px] text-[#6B655C]">Accumulated Dep.</div>
                  <div className="mt-1 font-mono tabular-nums text-base font-semibold text-[#B45309]">
                    -{formatMoney(totalAssetDep)}
                  </div>
                </div>
                <div className="p-3.5 bg-[#EBF3F0] border border-[#C7DFD6] rounded-lg">
                  <div className="text-[11px] text-[#1B4D3E] font-medium">Net Book Value</div>
                  <div className="mt-1 font-mono tabular-nums text-base font-semibold text-[#1B4D3E]">
                    {formatMoney(netAssetBookValue)}
                  </div>
                </div>
              </div>

              <div className="border border-[#E5E0D5] rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-[#F8F6F1] border-b border-[#E5E0D5] text-xs font-semibold text-[#1F1D1A]">
                  Active Fixed Assets ({activeAssets.length})
                </div>
                {activeAssets.length > 0 ? (
                  <div className="divide-y divide-[#E5E0D5]">
                    {activeAssets.map(asset => {
                      const nbv =
                        asset.currentBookValue ?? Math.max(0, asset.cost - asset.accumulatedDepreciation);
                      return (
                        <div key={asset.id} className="px-4 py-3.5 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#1F1D1A] truncate">{asset.name}</div>
                            <div className="text-xs text-[#6B655C] mt-0.5 flex flex-wrap items-center gap-1.5">
                              <span className="capitalize">{asset.depreciationMethod.replace('_', ' ')}</span>
                              <span>·</span>
                              <span className="font-mono tabular-nums">Bought {asset.purchaseDate}</span>
                              <span>·</span>
                              <span>{asset.usefulLifeYears} yrs</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-mono tabular-nums text-sm font-semibold text-[#1F1D1A]">
                              {formatMoney(nbv)}
                            </div>
                            <div className="text-[11px] font-mono tabular-nums text-[#968E82]">
                              Cost {formatMoney(asset.cost)} · Dep {formatMoney(asset.accumulatedDepreciation)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-[#6B655C]">
                    No active fixed assets registered.
                  </div>
                )}
              </div>
            </>
          )}

          {/* 5. MONTHLY CASH FLOW CHART DETAILS */}
          {selection.kind === 'cashflow_chart' && (
            <div className="border border-[#E5E0D5] rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#F8F6F1] border-b border-[#E5E0D5] text-xs font-medium text-[#6B655C]">
                    <th className="py-3 px-4">Month</th>
                    <th className="py-3 px-4 text-right">Inflow</th>
                    <th className="py-3 px-4 text-right">Outflow</th>
                    <th className="py-3 px-4 text-right">Net Cash Flow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0D5]">
                  {cashFlowData.map(row => {
                    const net = row.Inflow - row.Outflow;
                    const highlighted = selection.highlightMonth === row.name;
                    return (
                      <tr key={row.name} className={highlighted ? 'bg-[#EBF3F0]/60' : 'hover:bg-[#F8F6F1]/60'}>
                        <td className="py-3 px-4 font-medium text-[#1F1D1A]">{row.name} 2026</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#157347]">
                          {formatMoney(row.Inflow)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#B91C1C]">
                          {formatMoney(row.Outflow)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                            net >= 0 ? 'text-[#1B4D3E]' : 'text-[#B91C1C]'
                          }`}
                        >
                          {net >= 0 ? '+' : ''}
                          {formatMoney(net)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 6. SALES VS EXPENSES CHART DETAILS */}
          {selection.kind === 'sales_expense_chart' && (
            <div className="border border-[#E5E0D5] rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#F8F6F1] border-b border-[#E5E0D5] text-xs font-medium text-[#6B655C]">
                    <th className="py-3 px-4">Month</th>
                    <th className="py-3 px-4 text-right">Sales</th>
                    <th className="py-3 px-4 text-right">Expense</th>
                    <th className="py-3 px-4 text-right">Net Surplus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0D5]">
                  {salesVsExpenseData.map(row => {
                    const net = row.Sales - row.Expense;
                    const highlighted = selection.highlightMonth === row.name;
                    return (
                      <tr key={row.name} className={highlighted ? 'bg-[#EBF3F0]/60' : 'hover:bg-[#F8F6F1]/60'}>
                        <td className="py-3 px-4 font-medium text-[#1F1D1A]">{row.name} 2026</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#157347]">
                          {formatMoney(row.Sales)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#B45309]">
                          {formatMoney(row.Expense)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                            net >= 0 ? 'text-[#1B4D3E]' : 'text-[#B91C1C]'
                          }`}
                        >
                          {net >= 0 ? '+' : ''}
                          {formatMoney(net)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 7. SINGLE RECURRING BILL ITEM DETAIL */}
          {selection.kind === 'bill_item' && (() => {
            const bill = recurringBills.find(b => b.id === selection.bill.id) || selection.bill;
            const status = getBillStatusMeta(bill);
            return (
              <div className="space-y-5">
                <div className="p-5 bg-[#F8F6F1] border border-[#E5E0D5] rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-[#6B655C]">Scheduled Amount</div>
                    <div className="mt-1 font-mono tabular-nums text-2xl font-semibold text-[#1F1D1A]">
                      {formatMoney(bill.amount)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-semibold ${status.tone}`}>{status.label}</div>
                    <div className="text-xs font-mono tabular-nums text-[#6B655C] mt-0.5">
                      Next due: {bill.nextDueDate}
                    </div>
                  </div>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="p-3.5 bg-[#FFFDF9] border border-[#E5E0D5] rounded-lg">
                    <dt className="text-xs text-[#6B655C]">Vendor / Payee</dt>
                    <dd className="mt-1 font-medium text-[#1F1D1A]">{bill.vendor}</dd>
                  </div>
                  <div className="p-3.5 bg-[#FFFDF9] border border-[#E5E0D5] rounded-lg">
                    <dt className="text-xs text-[#6B655C]">Payment Account & Cadence</dt>
                    <dd className="mt-1 font-medium text-[#1F1D1A]">
                      {bill.paymentAccount} · <span className="capitalize">{bill.cadence}</span>
                    </dd>
                  </div>
                  <div className="p-3.5 bg-[#FFFDF9] border border-[#E5E0D5] rounded-lg">
                    <dt className="text-xs text-[#6B655C]">Expense Account</dt>
                    <dd className="mt-1 font-medium text-[#1F1D1A]">{bill.expenseAccount}</dd>
                  </div>
                  <div className="p-3.5 bg-[#FFFDF9] border border-[#E5E0D5] rounded-lg">
                    <dt className="text-xs text-[#6B655C]">Last Paid Date</dt>
                    <dd className="mt-1 font-mono tabular-nums text-[#1F1D1A]">
                      {bill.lastPaidDate || 'Not logged yet'}
                    </dd>
                  </div>
                </dl>

                {bill.notes && (
                  <div className="p-4 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg">
                    <div className="text-xs font-medium text-[#6B655C] mb-1">Notes</div>
                    <p className="text-sm text-[#1F1D1A]">{bill.notes}</p>
                  </div>
                )}

                {bill.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => onPayBill(bill.id, bill.title)}
                    className="w-full py-2.5 px-4 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Pay & Log Now (Advances Next Due Date)
                  </button>
                )}
              </div>
            );
          })()}

          {/* 8. SINGLE VOUCHER ITEM DETAIL */}
          {selection.kind === 'voucher_item' && (() => {
            const tx = selection.tx;
            return (
              <div className="space-y-5">
                <div className="p-5 bg-[#F8F6F1] border border-[#E5E0D5] rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-[#6B655C]">Voucher Amount</div>
                    <div className="mt-1 font-mono tabular-nums text-2xl font-semibold text-[#1F1D1A]">
                      {formatMoney(tx.amount)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-semibold ${tx.isBankCleared ? 'text-[#157347]' : 'text-[#B45309]'}`}>
                      {tx.isBankCleared ? 'Bank Cleared' : 'Pending Clearance'}
                    </div>
                    <div className="text-xs font-mono tabular-nums text-[#6B655C] mt-0.5">{tx.date}</div>
                  </div>
                </div>

                <div className="p-4 bg-[#FFFDF9] border border-[#E5E0D5] rounded-xl space-y-3">
                  <div>
                    <div className="text-xs text-[#6B655C]">Description / Narration</div>
                    <div className="text-sm font-semibold text-[#1F1D1A] mt-0.5">{tx.description}</div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E5E0D5]">
                    <div>
                      <div className="text-xs text-[#157347] font-medium">Debit Account (Dr)</div>
                      <div className="text-sm font-medium text-[#1F1D1A] mt-0.5">{tx.debitAccount}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#6B655C] font-medium">Credit Account (Cr)</div>
                      <div className="text-sm font-medium text-[#1F1D1A] mt-0.5">{tx.creditAccount}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E5E0D5] text-xs">
                    <div>
                      <span className="text-[#6B655C]">Reference: </span>
                      <span className="font-mono text-[#1F1D1A]">{tx.reference || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[#6B655C]">Category: </span>
                      <span className="capitalize text-[#1F1D1A]">{tx.type.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (tx.type === 'sales' || tx.type === 'purchase') {
                        exportSingleInvoicePDF(tx, tx.type === 'purchase');
                      } else {
                        exportSingleVoucherPDF(tx, tx.type !== 'other_income');
                      }
                      toast.success('Voucher PDF downloaded.');
                    }}
                    className="px-4 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Voucher PDF
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-3.5 bg-[#F8F6F1] border-t border-[#E5E0D5] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-[#6B655C] hover:text-[#1F1D1A] hover:bg-[#EAE5DB] rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
          <Link
            to={header.linkTo}
            onClick={onClose}
            className="px-4 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            {header.linkLabel}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
