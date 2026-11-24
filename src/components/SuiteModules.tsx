/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useStore } from '../store';
import { EmployeeSalary, BankStatementItem, LedgerTransaction } from '../types';
import {
  Percent,
  Calculator,
  UserCheck,
  CreditCard,
  RefreshCw,
  TrendingUp,
  Sliders,
  DollarSign,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Calendar,
  ArrowRight,
  Upload,
  FileSpreadsheet,
  Sparkles,
  Undo2,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Check,
  CheckSquare,
  FileText,
  ChevronRight,
  Plus,
  Trash2,
  Edit,
  Users,
  Printer,
  Eye,
  Settings,
  UserPlus,
} from 'lucide-react';
import { motion } from 'motion/react';

// ==========================================
// GST INTERACTIVE COMPUTATOR COMPONENT
// ==========================================
export const GstComputator: React.FC = () => {
  const [amountStr, setAmountStr] = useState('1000');
  const [calculationType, setCalculationType] = useState<'exclusive' | 'inclusive'>('exclusive');
  const [taxRate, setTaxRate] = useState<number>(0.18);
  const [isCustomRate, setIsCustomRate] = useState(false);
  const [customRateStr, setCustomRateStr] = useState('18');
  const [supplyType, setSupplyType] = useState<'intra' | 'inter'>('intra');
  const [copied, setCopied] = useState(false);

  const amount = parseFloat(amountStr) || 0;
  const activeRate = isCustomRate ? (parseFloat(customRateStr) || 0) / 100 : taxRate;

  // Live Calculations
  let baseValue = 0;
  let totalGst = 0;
  let grossValue = 0;

  if (calculationType === 'inclusive') {
    baseValue = amount / (1 + activeRate);
    totalGst = amount - baseValue;
    grossValue = amount;
  } else {
    baseValue = amount;
    totalGst = amount * activeRate;
    grossValue = amount + totalGst;
  }

  const cgst = supplyType === 'intra' ? totalGst / 2 : 0;
  const sgst = supplyType === 'intra' ? totalGst / 2 : 0;
  const igst = supplyType === 'inter' ? totalGst : 0;

  const handleCopyReport = () => {
    const reportText = `--- GST COMPUTATION REPORT ---
Input Value: $${amount.toFixed(2)} (${calculationType === 'inclusive' ? 'Tax Inclusive' : 'Tax Exclusive'})
Tax Rate: ${(activeRate * 100).toFixed(2)}%
Supply Type: ${supplyType === 'intra' ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'}

----------------------------
Base Taxable Value: $${baseValue.toFixed(2)}
Central GST (CGST): $${cgst.toFixed(2)}
State GST (SGST):   $${sgst.toFixed(2)}
Integrated GST (IGST): $${igst.toFixed(2)}
----------------------------
Total GST Amount:   $${totalGst.toFixed(2)}
Gross Invoice Total: $${grossValue.toFixed(2)}
----------------------------`;
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const gstPercentage = activeRate * 100;

  const presets = [
    { name: 'Essential Commodities', rate: 0.05, desc: 'Food grains, raw materials' },
    { name: 'Standard Goods & Services', rate: 0.12, desc: 'Processed foods, hardware' },
    { name: 'Standard Service Rate', rate: 0.18, desc: 'IT consulting, software, telecom' },
    { name: 'Luxury / Demerit Goods', rate: 0.28, desc: 'Motor vehicles, high-end tech' }
  ];

  return (
    <div className="bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-sm space-y-5 col-span-1 xl:col-span-2">
      <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 tracking-wide uppercase flex items-center gap-2">
            <Calculator className="w-4 h-4 text-indigo-400" />
            Interactive GST Computator
          </h3>
          <p className="text-xs text-zinc-455">Real-time simulator to compute Central (CGST), State (SGST), and Integrated (IGST) liabilities.</p>
        </div>
        <Percent className="w-5 h-5 text-indigo-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Parameters Form */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap gap-4">
            
            {/* Amount Input */}
            <div className="flex-1 min-w-[180px] space-y-1.5">
              <label className="text-[10px] font-bold font-mono text-zinc-450 uppercase tracking-widest block">Transaction Value</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-500 text-xs font-semibold">$</span>
                <input
                  type="number"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs font-semibold rounded-xl pl-7 pr-3 py-2.5 focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Tax Rate Dropdown */}
            <div className="w-full sm:w-48 space-y-1.5">
              <label className="text-[10px] font-bold font-mono text-zinc-450 uppercase tracking-widest block">GST Tax Rate</label>
              <select
                value={isCustomRate ? 'custom' : taxRate.toString()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'custom') {
                    setIsCustomRate(true);
                  } else {
                    setIsCustomRate(false);
                    setTaxRate(parseFloat(val));
                  }
                }}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-mono cursor-pointer"
              >
                <option value="0.05">5% (Essential)</option>
                <option value="0.12">12% (Standard I)</option>
                <option value="0.18">18% (Standard II)</option>
                <option value="0.28">28% (Luxury / Sin)</option>
                <option value="custom">Custom Rate %</option>
              </select>
            </div>

            {/* Custom Rate Input (Conditional) */}
            {isCustomRate && (
              <div className="w-32 space-y-1.5 animate-fade-in">
                <label className="text-[10px] font-bold font-mono text-zinc-450 uppercase tracking-widest block">Custom rate %</label>
                <div className="relative">
                  <input
                    type="number"
                    value={customRateStr}
                    onChange={(e) => setCustomRateStr(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs font-semibold rounded-xl pl-3 pr-7 py-2.5 focus:outline-none focus:border-indigo-500 font-mono"
                    placeholder="18"
                    min="0"
                    max="100"
                  />
                  <span className="absolute right-3 top-2.5 text-zinc-500 text-xs font-semibold">%</span>
                </div>
              </div>
            )}

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Calculation Type Toggle */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold font-mono text-zinc-450 uppercase tracking-widest block">Calculation Mode</label>
              <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 gap-1">
                <button
                  type="button"
                  onClick={() => setCalculationType('exclusive')}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg cursor-pointer transition-all ${
                    calculationType === 'exclusive' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Tax Exclusive
                </button>
                <button
                  type="button"
                  onClick={() => setCalculationType('inclusive')}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg cursor-pointer transition-all ${
                    calculationType === 'inclusive' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Tax Inclusive
                </button>
              </div>
            </div>

            {/* Supply Classification */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold font-mono text-zinc-450 uppercase tracking-widest block">Supply Classification</label>
              <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 gap-1">
                <button
                  type="button"
                  onClick={() => setSupplyType('intra')}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg cursor-pointer transition-all ${
                    supplyType === 'intra' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Intra-State (Local)
                </button>
                <button
                  type="button"
                  onClick={() => setSupplyType('inter')}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg cursor-pointer transition-all ${
                    supplyType === 'inter' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Inter-State (IGST)
                </button>
              </div>
            </div>

          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-wider block">Standard Rate Presets</span>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => {
                const isSelected = !isCustomRate && taxRate === preset.rate;
                return (
                  <button
                    key={preset.rate}
                    type="button"
                    onClick={() => {
                      setTaxRate(preset.rate);
                      setIsCustomRate(false);
                    }}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/70 shadow-[0_0_10px_rgba(79,70,229,0.1)]'
                        : 'bg-zinc-900/40 border-zinc-850 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-zinc-200">{preset.name}</span>
                      <span className="text-[11px] font-mono font-extrabold text-indigo-400">{preset.rate * 100}%</span>
                    </div>
                    <p className="text-[9px] text-zinc-500 mt-0.5 truncate">{preset.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Calculation Invoice Breakdown Receipt */}
        <div className="lg:col-span-5 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between space-y-4 font-mono">
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-zinc-850 pb-2 text-[10px] text-zinc-500 tracking-wider">
              <span className="uppercase font-bold">Calculation Breakdown</span>
              <span className="uppercase">Real-Time Quote</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-zinc-455">
                <span>Calculated Mode:</span>
                <span className="text-zinc-300 font-semibold uppercase text-[10px]">
                  {calculationType === 'inclusive' ? 'Tax Inclusive' : 'Tax Exclusive'}
                </span>
              </div>
              <div className="flex justify-between text-zinc-455">
                <span>GST Tax Rate:</span>
                <span className="text-zinc-300 font-bold">{gstPercentage.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-zinc-455">
                <span>Supply Classification:</span>
                <span className="text-zinc-300 font-semibold text-[10px] uppercase">
                  {supplyType === 'intra' ? 'Intra-State (Local)' : 'Inter-State (IGST)'}
                </span>
              </div>

              <div className="border-t border-zinc-900 my-2 pt-2 space-y-1.5">
                <div className="flex justify-between text-zinc-400">
                  <span>Base Taxable Value:</span>
                  <span className="text-zinc-200 font-semibold">${baseValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                {supplyType === 'intra' ? (
                  <>
                    <div className="flex justify-between text-zinc-550 pl-3">
                      <span>Central GST (CGST {((gstPercentage / 2).toFixed(1))}%):</span>
                      <span>${cgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-zinc-550 pl-3">
                      <span>State GST (SGST {((gstPercentage / 2).toFixed(1))}%):</span>
                      <span>${sgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-zinc-550 pl-3">
                    <span>Integrated GST (IGST {(gstPercentage.toFixed(1))}%):</span>
                    <span>${igst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="flex justify-between text-indigo-400 font-bold border-t border-zinc-900 pt-1.5 mt-1.5">
                  <span>Total Tax Accrued:</span>
                  <span>${totalGst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-zinc-850">
            {/* Value proportions visualizer bar */}
            <div className="space-y-1 text-[9px]">
              <div className="flex justify-between text-zinc-500">
                <span>Base Value ({grossValue > 0 ? ((baseValue / grossValue) * 100).toFixed(0) : '0'}%)</span>
                <span>GST Tax ({grossValue > 0 ? ((totalGst / grossValue) * 100).toFixed(0) : '0'}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-900 overflow-hidden flex">
                <div 
                  className="bg-zinc-700 h-full transition-all duration-300" 
                  style={{ width: `${grossValue > 0 ? (baseValue / grossValue) * 100 : 0}%` }}
                />
                <div 
                  className="bg-indigo-500 h-full transition-all duration-300" 
                  style={{ width: `${grossValue > 0 ? (totalGst / grossValue) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center bg-zinc-900/60 p-3 rounded-xl border border-zinc-850/40">
              <span className="font-sans font-extrabold text-xs text-zinc-300 uppercase">Gross Invoice Total</span>
              <span className="text-base font-extrabold text-emerald-400">
                ${grossValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyReport}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-zinc-100 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-[0.98]"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  Calculations Copied!
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Copy Tax Calculation Report
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

// ==========================================
// 1. GST & TAX COMPUTATION PORTAL TOOL
// ==========================================
export const TaxModule: React.FC = () => {
  const store = useStore();
  const [isInterState, setIsInterState] = useState(false);

  // Calculate gross sales and purchases from ledger logs to compute GST Output vs ITC (Input Tax Credit)
  const totalSalesAmount = store.db.ledger
    .filter(tx => tx.type === 'sales')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalPurchasesAmount = store.db.ledger
    .filter(tx => tx.type === 'purchase')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Standard GST Rate: 18%
  const rateLimit = 0.18;
  const outputGst = totalSalesAmount * rateLimit;
  const inputTaxCredit = totalPurchasesAmount * rateLimit;
  const netGstLiability = Math.max(0, outputGst - inputTaxCredit);

  // Divide into SGST / CGST for Intra-state or IGST for Inter-state
  const cgst = isInterState ? 0 : outputGst / 2;
  const sgst = isInterState ? 0 : outputGst / 2;
  const igst = isInterState ? outputGst : 0;

  // Income Tax Projection
  const estimatedRevenue = totalSalesAmount;
  const estimatedExpense = store.db.ledger
    .filter(tx => tx.type === 'other_expense' || tx.type === 'salary_payment')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const netCorporateProfit = Math.max(0, estimatedRevenue - estimatedExpense);
  const corporateTaxRate = 0.25; // 25% Tax Bracket
  const projectedIncomeTax = netCorporateProfit * corporateTaxRate;

  // Real-time GST custom parser for registered sundry partners
  const gstTransactions = store.db.ledger.filter(tx => tx.description.includes('[GST Rule Compliant:'));
  
  const gstDetailsList = gstTransactions.map(tx => {
    try {
      const desc = tx.description;
      const gstPart = desc.split('[GST Rule Compliant:')[1]?.split(']')[0] || '';
      
      const isInter = gstPart.includes('Inter-State');
      const gstInMatch = gstPart.match(/GSTIN=([A-Z0-9]+)/);
      const gstIn = gstInMatch ? gstInMatch[1] : 'N/A';
      
      const taxableMatch = gstPart.match(/Taxable=([\d.]+)/);
      const taxable = taxableMatch ? parseFloat(taxableMatch[1]) : tx.amount / 1.18;
      
      const cgstMatch = gstPart.match(/CGST=([\d.]+)/);
      const cgst = cgstMatch ? parseFloat(cgstMatch[1]) : 0;
      
      const sgstMatch = gstPart.match(/SGST=([\d.]+)/);
      const sgst = sgstMatch ? parseFloat(sgstMatch[1]) : 0;
      
      const igstMatch = gstPart.match(/IGST=([\d.]+)/);
      const igst = igstMatch ? parseFloat(igstMatch[1]) : 0;
      
      const totalGst = cgst + sgst + igst || (tx.amount - taxable);
      
      return {
        id: tx.id,
        date: tx.date,
        originalDesc: desc.split('[GST Rule Compliant:')[0].trim(),
        reference: tx.reference || 'N/A',
        type: tx.type,
        partnerName: tx.debitAccount || tx.creditAccount || 'N/A',
        gstIn,
        isInter,
        taxable,
        cgst,
        sgst,
        igst,
        totalGst,
        amount: tx.amount
      };
    } catch (e) {
      return null;
    }
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

      {/* GST computation panel */}
      <div className="bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 tracking-wide">GST PORTAL COMPLIANCE TOOL</h3>
            <p className="text-xs text-zinc-455">Monthly GST tax liability computations, including Input Tax Credit (ITC) reconciliation.</p>
          </div>
          <Percent className="w-5 h-5 text-indigo-400" />
        </div>

        {/* GST Filing Configurations Toggle */}
        <div className="flex items-center justify-between bg-zinc-950 p-2.5 rounded-lg border border-zinc-900">
          <span className="text-xs text-zinc-350 font-medium">Filing Category: {isInterState ? "Inter-State (IGST 18%)" : "Intra-State (CGST 9% + SGST 9%)"}</span>
          <button
            onClick={() => setIsInterState(!isInterState)}
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-semibold font-mono rounded"
          >
            Toggle Filing Status
          </button>
        </div>

        <div className="space-y-3 font-mono text-xs">
          <div className="flex justify-between text-zinc-400 pb-1 border-b border-zinc-900">
            <span>Corporate Net Taxable Sales Value</span>
            <span className="text-zinc-150">${totalSalesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3 space-y-1.5 text-[11px]">
            <div className="flex justify-between text-zinc-550">
              <span>Output SGST liability (State 9%)</span>
              <span>${sgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-zinc-550">
              <span>Output CGST liability (Central 9%)</span>
              <span>${cgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-zinc-550">
              <span>Output IGST liability (Interstate 18%)</span>
              <span>${igst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-850 pt-1.5 font-bold text-zinc-300">
              <span>Total Output GST Accrued (A)</span>
              <span>${outputGst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="flex justify-between text-zinc-400 pb-1 border-b border-zinc-900 pt-2">
            <span>Taxable Refilling Purchases Value</span>
            <span className="text-zinc-150">${totalPurchasesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="flex justify-between text-zinc-400 pl-3">
            <span>Input Tax Credit (ITC Claims on cost) (B)</span>
            <span className="text-emerald-400">-${inputTaxCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex justify-between items-center bg-zinc-900/40 p-3 rounded-xl">
            <span className="font-bold text-xs text-zinc-200 uppercase font-sans">Net GST Portal Liability Due (A - B)</span>
            <span className="text-sm font-bold text-emerald-400">${netGstLiability.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <button
          onClick={() => {
            alert("Drafting GSTR-1 Portal Manifest. Copying parameters to clipboard!");
          }}
          className="w-full py-2 bg-indigo-600 hover:bg-emerald-600 transition-colors text-zinc-100 text-xs font-semibold rounded-lg flex items-center justify-center gap-1"
        >
          <Calculator className="w-4 h-4" />
          Export GSTR-3B Compliant JSON Manifest
        </button>
      </div>

      {/* Income tax projection screen */}
      <div className="bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="pb-2 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-100 tracking-wide">ESTIMATED INCOME TAX WORKSPACE</h3>
          <p className="text-xs text-zinc-455">Annualized operating margins projections, tax brackets, and estimated schedules.</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3 font-mono text-xs">
          <div className="flex justify-between text-zinc-400">
            <span>YTD Gross Revenues (Sales)</span>
            <span className="text-zinc-200">${estimatedRevenue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>YTD Deductible OpEx & Wages</span>
            <span className="text-zinc-200">(${estimatedExpense.toLocaleString()})</span>
          </div>
          <div className="flex justify-between border-b border-zinc-850 pb-2 font-semibold text-zinc-350">
            <span>Projected Annual Net Earnings</span>
            <span>${netCorporateProfit.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-zinc-400 pt-1">
            <span>Applicable Corporate Tax rate</span>
            <span>25.00%</span>
          </div>
          <div className="flex justify-between text-zinc-200 font-bold border-t border-zinc-800 pt-2 text-sm font-sans uppercase">
            <span>Projected Annual Income Tax</span>
            <span className="text-indigo-400 font-mono">${projectedIncomeTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Estimated Tax Payment Scheduler */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">Estimated Quarterly Deadlines Payment Scheduler</span>
          
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between p-2 bg-zinc-900 border border-zinc-850 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-500" />
                <span>Q1 Deadline: June 15, 2026</span>
              </div>
              <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-400">Disbursed</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-zinc-900 border border-zinc-850 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-500" />
                <span>Q2 Deadline: Sept 15, 2026</span>
              </div>
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-900/20 text-amber-500">Upcoming</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-zinc-900 border border-zinc-850 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-500" />
                <span>Q3 Deadline: Dec 15, 2026</span>
              </div>
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">Scheduled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gst Interactive Computator Section */}
      <GstComputator />

      {/* Dynamic Registered Sundry GST Transactions Log */}
      {gstDetailsList.length > 0 && (
        <div className="col-span-1 xl:col-span-2 bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 tracking-wide uppercase font-mono flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              🇮🇳 Registered Sundry GST Compliance Ledger Logs
            </h3>
            <p className="text-xs text-zinc-400">
              Goods &amp; Services Tax (GST) sub-ledger lines extracted directly from active registered creditor and debtor transaction records to claim Input Tax Credit (ITC).
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-[9px] text-zinc-550 uppercase tracking-widest text-left">
                  <th className="pb-2.5 text-left">Date</th>
                  <th className="pb-2.5 text-left">Invoice Ref</th>
                  <th className="pb-2.5 text-left">Sundry Partner</th>
                  <th className="pb-2.5 text-left">GSTIN</th>
                  <th className="pb-2.5 text-left">Classification</th>
                  <th className="pb-2.5 text-right">Taxable base</th>
                  <th className="pb-2.5 text-right">SGST / CGST / IGST (18%)</th>
                  <th className="pb-2.5 text-right">Invoice Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850 text-zinc-300">
                {gstDetailsList.map(item => (
                  <tr key={item.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-2.5 text-zinc-450">{item.date}</td>
                    <td className="py-2.5 text-indigo-400 font-bold">{item.reference}</td>
                    <td className="py-2.5 font-sans font-medium text-zinc-200">{item.partnerName}</td>
                    <td className="py-2.5 text-zinc-450">
                      <span className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-300/90 font-semibold">{item.gstIn}</span>
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        item.type === 'sales' ? 'bg-blue-900/10 text-blue-400 border border-blue-900/30' : 'bg-emerald-950/20 text-emerald-450 border border-emerald-900/30'
                      }`}>
                        {item.type === 'sales' ? 'GST Output (Debtor)' : 'GST Input (Creditor)'}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono text-zinc-350">${item.taxable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-2.5 text-right font-mono text-indigo-300">
                      {item.isInter ? (
                        <span>${item.igst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (IGST 18%)</span>
                      ) : (
                        <span>
                          CGST: ${(item.cgst).toFixed(2)} + SGST: ${(item.sgst).toFixed(2)} (9%+9%)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-zinc-150">${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

// ==========================================
// 2. STATUTORY PAYROLL BOARD
// ==========================================
export const PayrollModule: React.FC = () => {
  const store = useStore();
  const [activeTab, setActiveTab] = useState<'registry' | 'add_employee' | 'guidelines'>('registry');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayslipStaff, setSelectedPayslipStaff] = useState<EmployeeSalary | null>(null);

  // Form states for Add / Edit
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formMonthlyBase, setFormMonthlyBase] = useState('5000');
  const [formAllowances, setFormAllowances] = useState('400');
  const [basicPct, setBasicPct] = useState(50); // standard 50%
  const [hraPct, setHraPct] = useState(40); // 40% for non-metro, 50% for metro
  const [pfPct, setPfPct] = useState(12); // statutory 12% of basic
  const [useTdsSlabs, setUseTdsSlabs] = useState(true);
  const [flatTdsPct, setFlatTdsPct] = useState(10);

  // Reset form
  const resetForm = () => {
    setFormName('');
    setFormRole('');
    setFormMonthlyBase('5000');
    setFormAllowances('400');
    setBasicPct(50);
    setHraPct(40);
    setPfPct(12);
    setUseTdsSlabs(true);
    setFlatTdsPct(10);
    setEditingStaffId(null);
  };

  // Live Calculations for the form
  const parsedMonthlyBase = parseFloat(formMonthlyBase) || 0;
  const parsedAllowances = parseFloat(formAllowances) || 0;
  const calculatedBasic = Math.round(parsedMonthlyBase * (basicPct / 100));
  const calculatedHra = Math.round(calculatedBasic * (hraPct / 100));
  const calculatedSpecialAllowance = Math.max(0, parsedMonthlyBase - calculatedBasic - calculatedHra);

  // Provident Fund (Statutory 12% of basic salary)
  const calculatedPf = Math.round(calculatedBasic * (pfPct / 100));

  // TDS Deduction
  let calculatedTds = 0;
  if (useTdsSlabs) {
    const totalGross = parsedMonthlyBase + parsedAllowances;
    if (totalGross <= 2500) {
      calculatedTds = 0;
    } else if (totalGross <= 5000) {
      calculatedTds = Math.round((totalGross - 2500) * 0.05);
    } else if (totalGross <= 10000) {
      calculatedTds = Math.round(125 + (totalGross - 5000) * 0.10);
    } else {
      calculatedTds = Math.round(625 + (totalGross - 10000) * 0.20);
    }
  } else {
    calculatedTds = Math.round((parsedMonthlyBase + parsedAllowances) * (flatTdsPct / 100));
  }

  const calculatedNetPayout = (parsedMonthlyBase + parsedAllowances) - calculatedPf - calculatedTds;

  // Handle Save (Add or Update)
  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formRole) return;

    const employeeData: EmployeeSalary = {
      id: editingStaffId || `staff-${Date.now()}`,
      name: formName,
      role: formRole,
      monthlyBase: parsedMonthlyBase,
      allowances: parsedAllowances,
      providentFund: calculatedPf,
      incomeTaxDeduction: calculatedTds,
      status: editingStaffId
        ? (store.db.payroll.find(p => p.id === editingStaffId)?.status || 'pending')
        : 'pending',
      disbursedAt: editingStaffId
        ? store.db.payroll.find(p => p.id === editingStaffId)?.disbursedAt
        : undefined,
    };

    if (editingStaffId) {
      store.editEmployee(editingStaffId, employeeData);
    } else {
      store.addEmployee(employeeData);
    }

    resetForm();
    setActiveTab('registry');
  };

  const startEditEmployee = (staff: EmployeeSalary) => {
    setEditingStaffId(staff.id);
    setFormName(staff.name);
    setFormRole(staff.role);
    setFormMonthlyBase(staff.monthlyBase.toString());
    setFormAllowances(staff.allowances.toString());
    
    // Reverse engineer percentages if possible, or use standard defaults
    const estimatedBasicPct = staff.monthlyBase > 0 ? Math.round((staff.providentFund / 0.12) / staff.monthlyBase * 100) : 50;
    if (estimatedBasicPct > 10 && estimatedBasicPct < 90) {
      setBasicPct(estimatedBasicPct);
    } else {
      setBasicPct(50);
    }
    setHraPct(40);
    setPfPct(12);
    setUseTdsSlabs(true);
    
    setActiveTab('add_employee');
  };

  const handleDisbursePayroll = (id: string) => {
    store.disburseSalary(id);
    store.triggerSync();
  };

  // Filtered payroll
  const filteredRoster = store.db.payroll.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Roster Totals (Statutory Summary)
  const totalEmployees = store.db.payroll.length;
  const totalBaseCTC = store.db.payroll.reduce((sum, p) => sum + p.monthlyBase, 0);
  const totalAllowances = store.db.payroll.reduce((sum, p) => sum + p.allowances, 0);
  const totalPFWithheld = store.db.payroll.reduce((sum, p) => sum + p.providentFund, 0);
  const totalTDSWithheld = store.db.payroll.reduce((sum, p) => sum + p.incomeTaxDeduction, 0);
  const totalGrossDisbursements = totalBaseCTC + totalAllowances;
  const totalNetPayoutSum = totalGrossDisbursements - totalPFWithheld - totalTDSWithheld;

  return (
    <div className="bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-sm space-y-6">
      {/* Module Title Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-450" />
            <h3 className="text-sm font-semibold text-zinc-100 tracking-wide uppercase">STATUTORY PAYROLL COMPILATION ENGINE</h3>
          </div>
          <p className="text-xs text-zinc-455 mt-1">
            Compliant employee master payroll computations: Automatic Basic, House Rent Allowance (HRA) allocations, Provident Fund (EPF 12%), and Tax Deducted at Source (TDS).
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => { setActiveTab('registry'); resetForm(); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'registry'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Roster & Disbursement
          </button>
          <button
            onClick={() => { setActiveTab('add_employee'); resetForm(); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
              activeTab === 'add_employee'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UserPlus className="w-3 h-3" />
            {editingStaffId ? 'Edit Profile' : 'Add Employee'}
          </button>
          <button
            onClick={() => setActiveTab('guidelines')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'guidelines'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Statutory Guidelines
          </button>
        </div>
      </div>

      {/* STATUTORY SUMMARY METRICS BAR */}
      {activeTab === 'registry' && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div className="bg-zinc-900/40 border border-zinc-850 p-3.5 rounded-xl space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Active Roster Size</span>
            <div className="text-lg font-bold text-zinc-200 font-mono">{totalEmployees} Members</div>
            <div className="text-[9px] text-zinc-550">Registered staff profiles</div>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-850 p-3.5 rounded-xl space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Gross Payroll Booked</span>
            <div className="text-lg font-bold text-zinc-150 font-mono">${totalGrossDisbursements.toLocaleString()}</div>
            <div className="text-[9px] text-emerald-450/80">Base CTC + Performance allowances</div>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-850 p-3.5 rounded-xl space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">EPF Witheld</span>
            <div className="text-lg font-bold text-red-400 font-mono">${totalPFWithheld.toLocaleString()}</div>
            <div className="text-[9px] text-zinc-500">Statutory 12% Basic savings</div>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-850 p-3.5 rounded-xl space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">TDS Liabilities Held</span>
            <div className="text-lg font-bold text-red-400 font-mono">${totalTDSWithheld.toLocaleString()}</div>
            <div className="text-[9px] text-zinc-500">Statutory slab income taxes</div>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-850 p-3.5 rounded-xl space-y-1 col-span-2 md:col-span-1">
            <span className="text-[10px] text-emerald-450 uppercase font-mono tracking-wider">Est. Net Bank Outflow</span>
            <div className="text-lg font-bold text-emerald-400 font-mono">${totalNetPayoutSum.toLocaleString()}</div>
            <div className="text-[9px] text-emerald-500">Paid out via direct bank credits</div>
          </div>
        </div>
      )}

      {/* TAB 1: REGISTRY & DISBURSEMENT */}
      {activeTab === 'registry' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-850 px-3 py-2 rounded-lg max-w-sm">
            <span className="text-zinc-550 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Search employee by name or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none w-full font-sans"
            />
          </div>

          <div className="overflow-x-auto border border-zinc-850 rounded-xl bg-zinc-900/10">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50 text-[10px] text-zinc-500 uppercase tracking-widest">
                  <th className="p-3.5 text-left">Staff Member</th>
                  <th className="p-3.5 text-right">Gross CTC</th>
                  <th className="p-3.5 text-right">Basic (50%)</th>
                  <th className="p-3.5 text-right">HRA (40%)</th>
                  <th className="p-3.5 text-right">EPF (12% basic)</th>
                  <th className="p-3.5 text-right">TDS Witheld</th>
                  <th className="p-3.5 text-right">Net Payout</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850 text-zinc-350">
                {filteredRoster.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-zinc-500 font-sans">
                      No matching employee records located in statutory system. Add a new profile above.
                    </td>
                  </tr>
                ) : (
                  filteredRoster.map(staff => {
                    // Standard statutory structural breakdown for the screen
                    const basicSalary = Math.round(staff.monthlyBase * 0.5);
                    const hraSalary = Math.round(basicSalary * 0.4);
                    const netPayout = staff.monthlyBase + staff.allowances - staff.providentFund - staff.incomeTaxDeduction;

                    return (
                      <tr key={staff.id} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="p-3.5 font-sans">
                          <div className="text-zinc-200 font-medium text-xs">{staff.name}</div>
                          <div className="text-[10px] font-mono text-zinc-500">{staff.role}</div>
                        </td>
                        <td className="p-3.5 text-right text-zinc-250">${(staff.monthlyBase + staff.allowances).toLocaleString()}</td>
                        <td className="p-3.5 text-right text-zinc-400">${basicSalary.toLocaleString()}</td>
                        <td className="p-3.5 text-right text-zinc-400">${hraSalary.toLocaleString()}</td>
                        <td className="p-3.5 text-right text-red-400/80">-${staff.providentFund.toLocaleString()}</td>
                        <td className="p-3.5 text-right text-red-400/80">-${staff.incomeTaxDeduction.toLocaleString()}</td>
                        <td className="p-3.5 text-right text-emerald-400 font-semibold font-mono">${netPayout.toLocaleString()}</td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            staff.status === 'disbursed'
                              ? 'bg-emerald-950 border border-emerald-900/60 text-emerald-400'
                              : 'bg-amber-950 border border-amber-900/50 text-amber-500 animate-pulse'
                          }`}>
                            {staff.status === 'disbursed' ? `Paid (${staff.disbursedAt})` : 'Pending'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View Payslip Button */}
                            <button
                              onClick={() => setSelectedPayslipStaff(staff)}
                              title="Generate Statutory Payslip"
                              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            
                            {/* Edit Button */}
                            <button
                              onClick={() => startEditEmployee(staff)}
                              title="Edit Employee Structure"
                              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => {
                                if (confirm(`Remove ${staff.name} from active payroll registry?`)) {
                                  store.deleteEmployee(staff.id);
                                }
                              }}
                              title="Delete Employee Profile"
                              className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Disburse Release Button */}
                            {staff.status !== 'disbursed' ? (
                              <button
                                onClick={() => handleDisbursePayroll(staff.id)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-zinc-100 text-[10px] font-semibold font-sans rounded transition-colors"
                              >
                                Disburse
                              </button>
                            ) : (
                              <span className="text-[10px] text-zinc-600 italic px-2">Disbursed</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ADD / EDIT EMPLOYEE STRUCTURE FORM */}
      {activeTab === 'add_employee' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form */}
          <form onSubmit={handleSaveEmployee} className="lg:col-span-7 bg-zinc-900/40 border border-zinc-850 p-5 rounded-xl space-y-4">
            <h4 className="text-xs font-semibold text-zinc-200 tracking-wide uppercase border-b border-zinc-800 pb-2 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              {editingStaffId ? 'AMEND STATUTORY SALARY COMPOSITION' : 'ESTABLISH NEW COMPLIANT PROFILE'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] text-zinc-450 uppercase font-mono">Employee Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg p-2 text-xs text-zinc-100 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-zinc-455 uppercase font-mono">Designation / Role</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Ledger Specialist"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg p-2 text-xs text-zinc-100 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-zinc-900 pt-4">
              <div className="space-y-1.5">
                <label className="text-[11px] text-zinc-455 uppercase font-mono">Gross Base Base (Monthly)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-zinc-500 text-xs">$</span>
                  <input
                    type="number"
                    min="100"
                    required
                    value={formMonthlyBase}
                    onChange={(e) => setFormMonthlyBase(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg p-2 pl-6 text-xs font-mono text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-zinc-455 uppercase font-mono">Performance & Travel Allowances</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-zinc-500 text-xs">$</span>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formAllowances}
                    onChange={(e) => setFormAllowances(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg p-2 pl-6 text-xs font-mono text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Config Slabs Adjuster */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 space-y-3">
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono font-bold flex items-center gap-1">
                <Sliders className="w-3 h-3 text-emerald-450" />
                Statutory Slabs & Ratios Configurations
              </span>
              
              <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 block">Basic Salary Ratio (% of Gross)</label>
                  <select
                    value={basicPct}
                    onChange={(e) => setBasicPct(parseInt(e.target.value))}
                    className="bg-zinc-900 border border-zinc-800 rounded p-1.5 text-zinc-200 text-xs w-full focus:outline-none"
                  >
                    <option value={40}>40% (Minimum statutory)</option>
                    <option value={50}>50% (Standard Corporate)</option>
                    <option value={60}>60% (High Base Savings)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 block">HRA Allowance (% of Basic)</label>
                  <select
                    value={hraPct}
                    onChange={(e) => setHraPct(parseInt(e.target.value))}
                    className="bg-zinc-900 border border-zinc-800 rounded p-1.5 text-zinc-200 text-xs w-full focus:outline-none"
                  >
                    <option value={40}>40% (Non-Metro statutory)</option>
                    <option value={50}>50% (Metro tier statutory)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 block">Provident Fund (EPF % of Basic)</label>
                  <select
                    value={pfPct}
                    onChange={(e) => setPfPct(parseInt(e.target.value))}
                    className="bg-zinc-900 border border-zinc-800 rounded p-1.5 text-zinc-200 text-xs w-full focus:outline-none"
                  >
                    <option value={12}>12% (Standard EPF Law)</option>
                    <option value={10}>10% (Reduced Liability Slab)</option>
                    <option value={0}>0% (Exempted Category)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 block">Income Tax TDS Deduction</label>
                  <div className="flex items-center gap-2 mt-1">
                    <label className="flex items-center gap-1 text-[11px] text-zinc-350 select-none cursor-pointer">
                      <input
                        type="radio"
                        checked={useTdsSlabs}
                        onChange={() => setUseTdsSlabs(true)}
                        className="accent-emerald-500"
                      />
                      Statutory Slabs
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-zinc-350 select-none cursor-pointer">
                      <input
                        type="radio"
                        checked={!useTdsSlabs}
                        onChange={() => setUseTdsSlabs(false)}
                        className="accent-emerald-500"
                      />
                      Flat {flatTdsPct}%
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg text-xs"
              >
                Clear Settings
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-zinc-100 font-semibold rounded-lg text-xs"
              >
                {editingStaffId ? 'Apply Amendments' : 'Secure Salary Profile'}
              </button>
            </div>
          </form>

          {/* Real-time Calculator Sandbox Preview Card */}
          <div className="lg:col-span-5 bg-zinc-900/60 border border-zinc-800/80 p-5 rounded-xl space-y-4">
            <h4 className="text-xs font-semibold text-zinc-300 tracking-wide uppercase flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-emerald-450 animate-pulse" />
              STATUTORY CALCULATOR PREVIEW
            </h4>

            <div className="space-y-3 font-mono text-[11px] divide-y divide-zinc-850">
              <div className="pb-3 flex justify-between text-zinc-400">
                <span>Monthly Base Gross CTC</span>
                <span className="text-zinc-100 font-bold">${parsedMonthlyBase.toLocaleString()}</span>
              </div>

              <div className="py-3 space-y-2">
                <div className="flex justify-between text-zinc-450">
                  <span>Basic Salary ({basicPct}%)</span>
                  <span className="text-zinc-200 font-medium">${calculatedBasic.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-zinc-450">
                  <span>HRA Allowance ({hraPct}% basic)</span>
                  <span className="text-zinc-200 font-medium">${calculatedHra.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-zinc-455">
                  <span>Balancing Allowance</span>
                  <span className="text-zinc-250">${calculatedSpecialAllowance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-zinc-455">
                  <span>Addl. Performance Perks</span>
                  <span className="text-emerald-450">+${parsedAllowances.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-zinc-300 font-bold border-t border-zinc-800/40 pt-1.5">
                  <span>Total Earnings Stream</span>
                  <span className="text-zinc-100">${(parsedMonthlyBase + parsedAllowances).toLocaleString()}</span>
                </div>
              </div>

              <div className="py-3 space-y-2">
                <div className="flex justify-between text-zinc-450">
                  <span>Provident Fund (EPF {pfPct}% Basic)</span>
                  <span className="text-red-400">-${calculatedPf.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-zinc-450">
                  <span>Income Tax (TDS {useTdsSlabs ? 'Slabs' : `${flatTdsPct}%`})</span>
                  <span className="text-red-400">-${calculatedTds.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-400 font-bold border-t border-zinc-800/40 pt-1.5">
                  <span>Total Deductions Held</span>
                  <span>-${(calculatedPf + calculatedTds).toLocaleString()}</span>
                </div>
              </div>

              <div className="py-3 flex justify-between items-center text-xs font-bold border-t-2 border-zinc-850 pt-3">
                <span className="text-emerald-450 uppercase tracking-wider">Estimated Net Paycheck</span>
                <span className="text-emerald-400 text-sm font-sans font-bold">${calculatedNetPayout.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-3 text-[10px] text-zinc-500 leading-relaxed font-sans">
              💡 <strong>Compliance Note:</strong> EPF contributions must match the standard 12% rate under the EPFO code to bypass GAAP/IFRS audit warning flags during reconciliation.
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STATUTORY GUIDELINES & EDUCATION SECTION */}
      {activeTab === 'guidelines' && (
        <div className="space-y-6">
          <div className="bg-zinc-950 rounded-xl border border-zinc-900 p-5 space-y-4">
            <h4 className="text-sm font-semibold text-zinc-200 tracking-wide uppercase flex items-center gap-1.5">
              <Percent className="w-4 h-4 text-emerald-450" />
              STATUTORY EXPLANATION & TAX COMPLIANCE CODES
            </h4>
            
            <p className="text-xs text-zinc-400 leading-relaxed">
              Statutory payroll compliance requires corporate ledgers to implement precise formulas for employee pay structure components. Under federal tax guidelines, salaries must be structured to optimize legal tax withholding (TDS) and provident fund (EPF) requirements:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-zinc-900/30 border border-zinc-850 p-4 rounded-xl space-y-2">
                <span className="text-xs font-bold text-zinc-300 block uppercase font-mono">1. Basic Salary (40% - 50%)</span>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                  The core component of the employee salary stack. Provident Fund contributions (12%) are computed exclusively based on Basic Salary. Federal audit rules suggest keeping Basic at 50% of the gross CTC to maintain general accounting transparency.
                </p>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-850 p-4 rounded-xl space-y-2">
                <span className="text-xs font-bold text-zinc-300 block uppercase font-mono">2. House Rent Allowance (HRA)</span>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                  Typically, HRA constitutes 40% of Basic Salary for non-metro cities and 50% of Basic Salary for metro cities. HRA acts as an eligible deduction, meaning that employees can claim complete exemptions from tax liability upon presenting valid rent receipts.
                </p>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-850 p-4 rounded-xl space-y-2">
                <span className="text-xs font-bold text-zinc-300 block uppercase font-mono">3. Provident Fund (EPF 12%)</span>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                  A mandatory retirements saving scheme requiring 12% deduction from basic salary by both employer and employee. Ledgers must hold these in a dedicated EPF Suspense or Liability Ledger Account for monthly government treasury postings.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-950 rounded-xl border border-zinc-900 p-5 space-y-3">
            <h5 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono">Corporate TDS Tax slabs (Monthly Scale)</h5>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-zinc-850 text-zinc-500 text-[10px] uppercase">
                    <th className="pb-2">Monthly Gross Earnings Bracket</th>
                    <th className="pb-2 text-center">TDS Statutory Rate</th>
                    <th className="pb-2 text-right">Withholding Equation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-zinc-400">
                  <tr>
                    <td className="py-2.5">Up to $2,500 / month</td>
                    <td className="py-2.5 text-center text-emerald-450 font-bold">0%</td>
                    <td className="py-2.5 text-right">No TDS Deduction</td>
                  </tr>
                  <tr>
                    <td className="py-2.5">$2,501 to $5,000 / month</td>
                    <td className="py-2.5 text-center text-amber-500 font-bold">5%</td>
                    <td className="py-2.5 text-right">5% of amount above $2,500</td>
                  </tr>
                  <tr>
                    <td className="py-2.5">$5,001 to $10,000 / month</td>
                    <td className="py-2.5 text-center text-amber-500 font-bold">10%</td>
                    <td className="py-2.5 text-right">$125 + 10% of amount above $5,000</td>
                  </tr>
                  <tr>
                    <td className="py-2.5">Above $10,000 / month</td>
                    <td className="py-2.5 text-center text-red-400 font-bold">20%</td>
                    <td className="py-2.5 text-right">$625 + 20% of amount above $10,000</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STATUTORY PAYSLIP INTERACTIVE OVERLAY */}
      {selectedPayslipStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white text-zinc-900 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative border border-slate-300">
            {/* Close button */}
            <button
              onClick={() => setSelectedPayslipStaff(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Payslip Format */}
            <div className="space-y-6">
              {/* Slip Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                  <h4 className="text-base font-bold text-slate-900 uppercase tracking-wide">COMPLIANT ENTERPRISE LEDGER INC.</h4>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">Corporate HQ: Suite 500, Antigravity Tech Plaza</p>
                  <p className="text-[10px] text-slate-500 font-mono">PAN: AAAFC1029R | TAN: DELA20192B | EPFO ID: DL/RPM/90102</p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-slate-900 text-white font-mono text-[10px] font-bold uppercase rounded">
                    OFFICIAL PAYSLIP
                  </span>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">Salary Month: June, 2026</p>
                </div>
              </div>

              {/* Employee Master Section */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-sans">
                <div className="space-y-1">
                  <div className="text-slate-500 uppercase text-[9px] font-mono">Employee Name</div>
                  <div className="font-bold text-slate-850 text-sm">{selectedPayslipStaff.name}</div>
                  
                  <div className="text-slate-500 uppercase text-[9px] font-mono pt-1">Designation</div>
                  <div className="font-medium text-slate-700">{selectedPayslipStaff.role}</div>
                </div>

                <div className="space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-[9px]">EMPLOYEE ID:</span>
                    <span className="font-bold text-slate-800">{selectedPayslipStaff.id.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-[9px]">BANK ACCOUNT:</span>
                    <span className="text-slate-700">**********2910</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-[9px]">DISBURSE DATE:</span>
                    <span className="text-slate-700">{selectedPayslipStaff.status === 'disbursed' ? (selectedPayslipStaff.disbursedAt || '2026-06') : 'PENDING RELEASE'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-[9px]">PAYMENT STATUS:</span>
                    <span className={`font-bold ${selectedPayslipStaff.status === 'disbursed' ? 'text-emerald-700' : 'text-amber-600 animate-pulse'}`}>
                      {selectedPayslipStaff.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detailed Earnings and Deductions Columns */}
              <div className="grid grid-cols-2 border border-slate-300 rounded-xl overflow-hidden font-mono text-xs">
                {/* Earnings */}
                <div className="border-r border-slate-300">
                  <div className="bg-slate-100 p-2 font-bold text-slate-800 border-b border-slate-300 uppercase text-[10px]">Earnings Stack</div>
                  <div className="p-3.5 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Basic Salary (50%)</span>
                      <span className="text-slate-850 font-bold">${Math.round(selectedPayslipStaff.monthlyBase * 0.5).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">HRA Allowance (40%)</span>
                      <span className="text-slate-850 font-bold">${Math.round(selectedPayslipStaff.monthlyBase * 0.2).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Special Allowance</span>
                      <span className="text-slate-850 font-bold">${Math.max(0, selectedPayslipStaff.monthlyBase - Math.round(selectedPayslipStaff.monthlyBase * 0.5) - Math.round(selectedPayslipStaff.monthlyBase * 0.2)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>Performance Perks</span>
                      <span className="font-bold">+${selectedPayslipStaff.allowances.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <div className="bg-slate-100 p-2 font-bold text-slate-800 border-b border-slate-300 uppercase text-[10px]">Statutory Deductions</div>
                  <div className="p-3.5 space-y-2">
                    <div className="flex justify-between text-red-600">
                      <span className="text-slate-500">Provident Fund (EPF)</span>
                      <span>-${selectedPayslipStaff.providentFund.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span className="text-slate-500">Income Tax (TDS)</span>
                      <span>-${selectedPayslipStaff.incomeTaxDeduction.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Professional Tax</span>
                      <span>-$0</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net pay / signature footer */}
              <div className="border-t border-slate-200 pt-4 space-y-4">
                <div className="flex justify-between items-center bg-slate-900 text-white p-3.5 rounded-xl">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">NET BANK CREDIT AMOUNT</span>
                    <div className="text-lg font-bold">
                      ${(selectedPayslipStaff.monthlyBase + selectedPayslipStaff.allowances - selectedPayslipStaff.providentFund - selectedPayslipStaff.incomeTaxDeduction).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right text-[10px] font-mono text-slate-300">
                    <div>Ref Code: PAY-2026-{selectedPayslipStaff.id.slice(-3).toUpperCase()}</div>
                    <div>Statutory Class A Payee</div>
                  </div>
                </div>

                <div className="flex justify-between items-end pt-2 text-[9px] text-slate-400 font-sans">
                  <div className="space-y-1">
                    <p>Computer-generated pay stub. No physical signature required.</p>
                    <p className="font-mono">IP Address: 192.168.1.144 | Audit Hash: s2a319fd9x09</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => alert('Dispatching payslip printer spool. PDF generated successfully!')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium font-sans rounded border border-slate-300 flex items-center gap-1 transition-colors"
                    >
                      <Printer className="w-3 h-3" />
                      Print Slip
                    </button>
                    <button
                      onClick={() => setSelectedPayslipStaff(null)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium font-sans rounded transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 3. BANK RECONCILIATION RADAR
// ==========================================
export const BankReconciliation: React.FC = () => {
  const store = useStore();
  const { reconcileBankStatement, bulkClearLedgerTransactions, importBankStatements, triggerSync } = store;

  // Active Tab within Reconciliation Module
  type ReconSubTab = 'workspace' | 'auto_suggest' | 'import_suite' | 'history';
  const [activeSubTab, setActiveSubTab] = useState<ReconSubTab>('workspace');

  // Manual workstation selection state
  const [selectedStatementId, setSelectedStatementId] = useState('');
  const [selectedLedgerId, setSelectedLedgerId] = useState('');
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
  
  // Search and filter states
  const [stmtSearch, setStmtSearch] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Pasted data & parser states
  const [pastedData, setPastedData] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'parsed' | 'success' | 'error'>('idle');
  const [parsedItems, setParsedItems] = useState<BankStatementItem[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Unreconciled Feed statement items (reconciledTransactionId is undefined)
  const unmatchedStatements = store.db.bankStatements.filter(s => !s.reconciledTransactionId);

  // Uncleared General Ledger rows (isBankCleared is false)
  const unclearedLedgerRows = store.db.ledger.filter(tx => !tx.isBankCleared);

  // Reconciled statement logs (reconciledTransactionId is present)
  const reconciledStatements = store.db.bankStatements.filter(s => !!s.reconciledTransactionId);

  // 1. MATCHING INTELLIGENCE ENGINE
  const getAutomatedMatches = () => {
    const suggestions: {
      statement: BankStatementItem;
      ledger: LedgerTransaction;
      score: number;
      confidence: 'Perfect' | 'High' | 'Medium';
      reason: string;
    }[] = [];

    unmatchedStatements.forEach(stmt => {
      // Find candidate general ledger vouchers that exactly match the absolute amount
      const candidates = unclearedLedgerRows.filter(tx => {
        return Math.abs(tx.amount) === Math.abs(stmt.amount);
      });

      candidates.forEach(tx => {
        let score = 70; // Base matching score for exact amount match
        let reason = 'Exact amount matches book ledger';

        const stmtDate = new Date(stmt.date);
        const txDate = new Date(tx.date);
        const diffTime = Math.abs(stmtDate.getTime() - txDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          score += 30;
          reason = 'Exact date and amount match';
        } else if (diffDays <= 3) {
          score += 25;
          reason = `Amount matches & date difference is only ${diffDays} day(s)`;
        } else if (diffDays <= 7) {
          score += 20;
          reason = `Amount matches & date difference is only ${diffDays} day(s)`;
        } else if (diffDays <= 15) {
          score += 15;
          reason = `Amount matches & date is within ${diffDays} days`;
        }

        // Compare references
        if (stmt.referenceNumber && tx.reference) {
          const stmtRefClean = stmt.referenceNumber.toLowerCase().trim();
          const txRefClean = tx.reference.toLowerCase().trim();
          if (stmtRefClean.includes(txRefClean) || txRefClean.includes(stmtRefClean)) {
            score = Math.min(100, score + 20);
            reason += ' (Reference document IDs correspond)';
          }
        }

        // Compare description keywords
        const stmtDescWords = stmt.description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const txDescWords = tx.description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const commonWords = stmtDescWords.filter(w => txDescWords.includes(w));
        if (commonWords.length > 0) {
          score = Math.min(100, score + 10);
          reason += ` (Matching narration: "${commonWords.join(', ')}")`;
        }

        let confidence: 'Perfect' | 'High' | 'Medium' = 'Medium';
        if (score >= 95) confidence = 'Perfect';
        else if (score >= 85) confidence = 'High';

        suggestions.push({
          statement: stmt,
          ledger: tx,
          score,
          confidence,
          reason,
        });
      });
    });

    // Sort by highest matching confidence score first
    return suggestions.sort((a, b) => b.score - a.score);
  };

  const suggestions = getAutomatedMatches();

  // 2. PARSING PASTED OR IMPORTED STATEMENTS
  const handleParsePastedData = (textToParse: string) => {
    if (!textToParse.trim()) return;

    const lines = textToParse.split(/\r?\n/);
    const parsed: BankStatementItem[] = [];

    lines.forEach((line, index) => {
      // Skip empty lines or possible CSV header rows
      const lowerLine = line.toLowerCase();
      if (!line.trim() || lowerLine.includes('date') || lowerLine.includes('description') || lowerLine.includes('amount')) {
        return;
      }

      // Split by tab, comma, or semicolon
      let cols = line.split('\t');
      if (cols.length < 2) cols = line.split(',');
      if (cols.length < 2) cols = line.split(';');

      if (cols.length >= 2) {
        const dateStr = cols[0]?.trim() || new Date().toISOString().split('T')[0];
        const desc = cols[1]?.trim() || `Pasted row #${index + 1}`;
        
        let amtStr = cols[2]?.trim() || '0';
        let isNegative = false;
        if (amtStr.startsWith('(') && amtStr.endsWith(')')) {
          isNegative = true;
          amtStr = amtStr.slice(1, -1);
        }
        amtStr = amtStr.replace(/[$\s,]/g, '');
        let parsedAmt = parseFloat(amtStr);
        if (isNaN(parsedAmt)) parsedAmt = 0;
        if (isNegative) parsedAmt = -parsedAmt;

        const ref = cols[3]?.trim() || `REF-${Math.floor(1000 + Math.random() * 9000)}`;

        parsed.push({
          id: `stmt-pasted-${Date.now()}-${index}`,
          date: dateStr,
          description: desc,
          amount: parsedAmt,
          referenceNumber: ref,
        });
      }
    });

    if (parsed.length > 0) {
      setParsedItems(parsed);
      setImportStatus('parsed');
    } else {
      setImportStatus('error');
    }
  };

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleParsePastedData(text);
      };
      reader.readAsText(file);
    }
  };

  const loadMockChaseStatement = () => {
    const mockChaseData = `2026-06-18\tE-Payment Stripe Solutions Payout\t4500.00\tSTR-00182
2026-06-19\tAmazon Web Services Hosting Charge\t-180.00\tAWS-99120
2026-06-21\tGoogle Cloud Workspace Invoicing\t-99.50\tGCP-91823
2026-06-22\tCustomer Wire Payment Tunzua Logistics\t3750.00\tWIRE-01123
2026-06-23\tRent Payment Commercial Office Suite\t-2400.00\tRENT-JUNE
2026-06-24\tRefund of Depreciated Equipment Scrap\t850.00\tSCR-98831`;
    setPastedData(mockChaseData);
    handleParsePastedData(mockChaseData);
  };

  const executeBulkImport = () => {
    if (parsedItems.length === 0) return;
    importBankStatements(parsedItems);
    setImportStatus('success');
    setParsedItems([]);
    setPastedData('');
    setTimeout(() => {
      setActiveSubTab('workspace');
      setImportStatus('idle');
    }, 1500);
    triggerSync();
  };

  const handleMatchBridge = () => {
    if (!selectedStatementId || !selectedLedgerId) return;
    reconcileBankStatement(selectedStatementId, selectedLedgerId);
    setSelectedStatementId('');
    setSelectedLedgerId('');
    triggerSync();
  };

  const handleBulkClear = () => {
    if (bulkSelectedIds.length === 0) return;
    bulkClearLedgerTransactions(bulkSelectedIds);
    setBulkSelectedIds([]);
    triggerSync();
  };

  // Filter lists based on searches
  const filteredUnmatchedStmts = unmatchedStatements.filter(s => {
    if (!stmtSearch) return true;
    const q = stmtSearch.toLowerCase();
    return s.description.toLowerCase().includes(q) || s.referenceNumber.toLowerCase().includes(q);
  });

  const filteredUnclearedLedger = unclearedLedgerRows.filter(l => {
    if (!ledgerSearch) return true;
    const q = ledgerSearch.toLowerCase();
    return l.description.toLowerCase().includes(q) || (l.reference && l.reference.toLowerCase().includes(q));
  });

  return (
    <div className="bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-sm space-y-6">
      
      {/* Paths and Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-850 pb-4 gap-4">
        <div>
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <span>Paths:</span>
            <span className="text-zinc-400">/app</span>
            <ChevronRight className="w-2.5 h-2.5" />
            <span className="text-zinc-400">reports</span>
            <ChevronRight className="w-2.5 h-2.5" />
            <span className="text-indigo-400 font-bold">bank-statement-reconcile</span>
          </div>
          <h3 className="text-base font-extrabold text-zinc-100 tracking-wide uppercase flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            Advanced Bank Statement Reconciliation Panel
          </h3>
          <p className="text-xs text-zinc-450 mt-1">
            Reconcile external uploaded bank statement row entries with internal general ledger transaction records.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 gap-1 self-stretch sm:self-auto">
          <button
            onClick={() => setActiveSubTab('workspace')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer transition-all ${
              activeSubTab === 'workspace' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Manual Station
          </button>
          <button
            onClick={() => setActiveSubTab('auto_suggest')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1 ${
              activeSubTab === 'auto_suggest' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            Auto-Suggestions ({suggestions.length})
          </button>
          <button
            onClick={() => setActiveSubTab('import_suite')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1 ${
              activeSubTab === 'import_suite' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Upload className="w-3 h-3" />
            Import Statements
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer transition-all ${
              activeSubTab === 'history' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            History ({reconciledStatements.length})
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}
      
      {/* TAB 1: WORKSPACE (Manual Matching) */}
      {activeSubTab === 'workspace' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column: Bank Statement feeds */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-850">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-[10px] font-bold font-mono uppercase text-zinc-400 tracking-wider">
                    Bank Statement Feeds ({filteredUnmatchedStmts.length})
                  </h4>
                </div>
                <input
                  type="text"
                  placeholder="Filter feeds..."
                  value={stmtSearch}
                  onChange={e => setStmtSearch(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-[10px] rounded px-2 py-0.5 w-32 focus:outline-none focus:border-indigo-500 font-mono text-zinc-300"
                />
              </div>

              <div className="space-y-2 h-72 overflow-y-auto pr-1 scrollbar">
                {filteredUnmatchedStmts.map(stmt => {
                  const hasSug = suggestions.some(sug => sug.statement.id === stmt.id);
                  return (
                    <div
                      key={stmt.id}
                      onClick={() => setSelectedStatementId(stmt.id)}
                      className={`p-3 rounded-xl border text-xs font-mono flex justify-between items-center cursor-pointer transition-all ${
                        selectedStatementId === stmt.id
                          ? 'bg-indigo-950/80 border-indigo-500 shadow-[0_0_12px_rgba(79,70,229,0.2)]'
                          : 'bg-zinc-900/60 border-zinc-850 hover:border-zinc-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-zinc-200 font-sans truncate">{stmt.description}</span>
                          {hasSug && (
                            <span className="bg-amber-950/80 text-amber-400 text-[8px] font-bold uppercase px-1 rounded border border-amber-800/50">
                              Suggest
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          Date: {stmt.date} <span className="text-zinc-650">|</span> Ref: {stmt.referenceNumber}
                        </div>
                      </div>
                      <div className={`font-bold text-sm shrink-0 ${stmt.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {stmt.amount >= 0 ? '+' : ''}${stmt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  );
                })}
                {filteredUnmatchedStmts.length === 0 && (
                  <div className="text-center py-16 text-zinc-550 text-xs italic">
                    No unmatched bank statement items found.
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Uncleared General Ledger rows */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-850">
                <div className="flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-[10px] font-bold font-mono uppercase text-zinc-400 tracking-wider">
                    General Ledger Entries ({filteredUnclearedLedger.length})
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Filter ledger..."
                    value={ledgerSearch}
                    onChange={e => setLedgerSearch(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-[10px] rounded px-2 py-0.5 w-32 focus:outline-none focus:border-indigo-500 font-mono text-zinc-300"
                  />
                  {unclearedLedgerRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (bulkSelectedIds.length === unclearedLedgerRows.length) {
                          setBulkSelectedIds([]);
                        } else {
                          setBulkSelectedIds(unclearedLedgerRows.map(tx => tx.id));
                        }
                      }}
                      className="text-[9px] font-bold font-mono uppercase text-indigo-400 hover:text-indigo-300 cursor-pointer transition-colors bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800"
                    >
                      {bulkSelectedIds.length === unclearedLedgerRows.length ? 'None' : 'All'}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 h-72 overflow-y-auto pr-1 scrollbar">
                {filteredUnclearedLedger.map(tx => {
                  const isSelectedForBulk = bulkSelectedIds.includes(tx.id);
                  return (
                    <div
                      key={tx.id}
                      onClick={() => setSelectedLedgerId(tx.id)}
                      className={`p-3 rounded-xl border text-xs font-mono flex justify-between items-center cursor-pointer transition-all ${
                        selectedLedgerId === tx.id
                          ? 'bg-emerald-950/80 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                          : isSelectedForBulk
                          ? 'bg-zinc-900 border-zinc-700/80 shadow-[0_0_8px_rgba(16,185,129,0.05)]'
                          : 'bg-zinc-900/60 border-zinc-850 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isSelectedForBulk) {
                              setBulkSelectedIds(prev => prev.filter(id => id !== tx.id));
                            } else {
                              setBulkSelectedIds(prev => [...prev, tx.id]);
                            }
                          }}
                          className="p-1 -ml-1 rounded hover:bg-zinc-850 transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                            isSelectedForBulk
                              ? 'bg-emerald-600 border-emerald-500 text-white'
                              : 'border-zinc-750 hover:border-zinc-600 bg-zinc-950'
                          }`}>
                            {isSelectedForBulk && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-zinc-200 font-sans truncate">{tx.description}</div>
                          <div className="text-[10px] text-zinc-550 mt-0.5 truncate">
                            Date: {tx.date} <span className="text-zinc-700">|</span> DR: {tx.debitAccount} <span className="text-zinc-700">|</span> CR: {tx.creditAccount}
                          </div>
                        </div>
                      </div>
                      <div className="font-bold text-zinc-100 text-sm shrink-0">
                        ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  );
                })}
                {filteredUnclearedLedger.length === 0 && (
                  <div className="text-center py-16 text-zinc-550 text-xs italic">
                    All book ledger entries are fully bank-cleared.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Bulk Clear Toolbar */}
          {bulkSelectedIds.length > 0 && (
            <div className="bg-emerald-950/20 border border-emerald-900/40 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-zinc-200">Bulk Verification Mode</span>
                <span className="text-zinc-700">|</span>
                <span className="text-emerald-400 font-bold">{bulkSelectedIds.length} General Ledger transaction{bulkSelectedIds.length > 1 ? 's' : ''} targeted</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setBulkSelectedIds([])}
                  className="flex-1 sm:flex-none px-3 py-1.5 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-300 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                >
                  Clear Selection
                </button>
                <button
                  onClick={handleBulkClear}
                  className="flex-1 sm:flex-none px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-100 font-extrabold rounded-lg flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-colors cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  Bulk Clear ({bulkSelectedIds.length})
                </button>
              </div>
            </div>
          )}

          {/* Manual Bridge Reconcile Submission Panel */}
          {selectedStatementId && selectedLedgerId && (
            <div className="bg-indigo-950/40 border border-indigo-800/40 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs animate-fade-in">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6 w-full">
                <div className="flex-1">
                  <span className="text-[9px] uppercase tracking-widest text-indigo-400 block font-bold mb-1">Selected Statement Item</span>
                  <p className="font-sans text-zinc-200 font-semibold truncate">
                    {store.db.bankStatements.find(s => s.id === selectedStatementId)?.description}
                  </p>
                  <span className="text-zinc-550 text-[10px]">
                    ${store.db.bankStatements.find(s => s.id === selectedStatementId)?.amount.toLocaleString()}
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 text-indigo-500 shrink-0 hidden md:block" />
                <div className="flex-1">
                  <span className="text-[9px] uppercase tracking-widest text-emerald-400 block font-bold mb-1">Target Ledger Entry</span>
                  <p className="font-sans text-zinc-200 font-semibold truncate">
                    {store.db.ledger.find(t => t.id === selectedLedgerId)?.description}
                  </p>
                  <span className="text-zinc-550 text-[10px]">
                    ${store.db.ledger.find(t => t.id === selectedLedgerId)?.amount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto shrink-0 mt-2 md:mt-0">
                <button
                  onClick={() => {
                    setSelectedStatementId('');
                    setSelectedLedgerId('');
                  }}
                  className="px-3 py-2 border border-zinc-800 hover:border-zinc-700 text-zinc-400 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMatchBridge}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <CheckCircle className="w-4 h-4" />
                  Bridge Connection
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AUTO SUGGESTIONS ENGINE */}
      {activeSubTab === 'auto_suggest' && (
        <div className="space-y-4">
          <div className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-850 flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-indigo-400 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-zinc-200">Reconciliation Intelligence Engine</h4>
              <p className="text-xs text-zinc-455">
                We matched date variance, reference codes, and exact values to find bookkeeping candidates.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {suggestions.map((match, idx) => {
              let confColor = 'bg-emerald-950/80 border-emerald-800/60 text-emerald-400';
              if (match.confidence === 'High') confColor = 'bg-indigo-950/80 border-indigo-800/60 text-indigo-400';
              if (match.confidence === 'Medium') confColor = 'bg-amber-950/80 border-amber-800/60 text-amber-400';

              return (
                <div key={`${match.statement.id}-${match.ledger.id}-${idx}`} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-zinc-700 transition-colors">
                  <div className="space-y-2 flex-1">
                    {/* Confidence score badge */}
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${confColor}`}>
                        {match.confidence} Match ({match.score}%)
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500">{match.reason}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                      {/* Statement Row */}
                      <div className="bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-850/60">
                        <span className="text-[9px] text-zinc-500 uppercase font-bold block">Statement Log</span>
                        <div className="font-semibold text-zinc-200 font-sans mt-0.5 truncate">{match.statement.description}</div>
                        <div className="text-[10px] text-zinc-500 mt-1">Date: {match.statement.date} | Ref: {match.statement.referenceNumber}</div>
                        <div className="text-zinc-200 font-bold mt-1">${match.statement.amount.toLocaleString()}</div>
                      </div>

                      {/* Ledger Row */}
                      <div className="bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-850/60">
                        <span className="text-[9px] text-zinc-500 uppercase font-bold block">Book Voucher</span>
                        <div className="font-semibold text-zinc-200 font-sans mt-0.5 truncate">{match.ledger.description}</div>
                        <div className="text-[10px] text-zinc-500 mt-1">Date: {match.ledger.date} | Ref: {match.ledger.reference || 'N/A'}</div>
                        <div className="text-zinc-200 font-bold mt-1">${match.ledger.amount.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>

                  {/* Accept action button */}
                  <button
                    onClick={() => {
                      reconcileBankStatement(match.statement.id, match.ledger.id);
                      triggerSync();
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 self-end md:self-center"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept Match
                  </button>
                </div>
              );
            })}

            {suggestions.length === 0 && (
              <div className="text-center py-16 text-zinc-550 text-xs italic bg-zinc-950 rounded-xl border border-zinc-850">
                No matching automated suggestions found. Reconcile entries manually in the Manual Station.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: IMPORT SUITE (CSV File / Paste Text) */}
      {activeSubTab === 'import_suite' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left side: Upload area & configuration */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-zinc-400 font-mono uppercase tracking-wider">Statement Source</h4>
                <button
                  onClick={loadMockChaseStatement}
                  className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 font-sans border border-emerald-900/50 bg-emerald-950/25 px-2 py-1 rounded cursor-pointer"
                >
                  Load June Chase Mock Statement
                </button>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all flex flex-col items-center justify-center gap-3 cursor-pointer ${
                  dragActive ? 'border-emerald-500 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 shadow-sm">
                  <Upload className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-200 font-sans">Drag and drop bank statement (.csv, .tsv, .txt)</p>
                  <p className="text-[10px] text-zinc-500 font-mono mt-1">Accepts standard exports with Date, Description, and Amount columns.</p>
                </div>
                <div className="text-zinc-600 font-mono text-[9px]">- OR -</div>
                <label className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-300 rounded text-[11px] font-bold cursor-pointer transition-colors">
                  Browse Files
                  <input
                    type="file"
                    accept=".csv,.txt,.tsv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const text = ev.target?.result as string;
                          handleParsePastedData(text);
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                </label>
              </div>

              {/* Textarea Paste input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold">Or Paste Tab/CSV Rows Here</label>
                <textarea
                  value={pastedData}
                  onChange={e => setPastedData(e.target.value)}
                  placeholder="2026-06-18&#9;Stripe Solutions Payout&#9;4500.00&#9;STR-00182&#10;2026-06-19&#9;AWS Invoicing&#9;-180.00&#9;AWS-99120"
                  className="w-full h-32 bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs font-mono text-zinc-300 focus:outline-none focus:border-indigo-500 placeholder-zinc-700 scrollbar"
                />
                <button
                  type="button"
                  onClick={() => handleParsePastedData(pastedData)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                >
                  Parse Paste Records
                </button>
              </div>
            </div>

            {/* Right side: Parsed Statement Entries Preview */}
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-850">
                <h4 className="text-[10px] font-bold font-mono uppercase text-zinc-400 tracking-wider">
                  Parsed statement Preview ({parsedItems.length})
                </h4>
                {parsedItems.length > 0 && (
                  <button
                    onClick={() => {
                      setParsedItems([]);
                      setImportStatus('idle');
                    }}
                    className="text-[10px] text-red-400 hover:text-red-300 font-sans cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 scrollbar font-mono text-[11px]">
                {parsedItems.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-lg flex justify-between items-center">
                    <div>
                      <div className="font-bold text-zinc-200 font-sans">{item.description}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Date: {item.date} | Ref: {item.referenceNumber}</div>
                    </div>
                    <div className={`font-bold ${item.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {item.amount >= 0 ? '+' : ''}${item.amount.toLocaleString()}
                    </div>
                  </div>
                ))}

                {parsedItems.length === 0 && (
                  <div className="text-center py-24 text-zinc-600 italic border border-zinc-850/60 rounded-xl bg-zinc-950/20">
                    Paste raw text rows or load the Chase mock statement to preview entries here.
                  </div>
                )}
              </div>

              {/* Complete execution panel */}
              {parsedItems.length > 0 && (
                <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex items-center justify-between animate-fade-in">
                  <div>
                    <span className="text-[9px] font-mono uppercase text-zinc-500 block">System Verification Status</span>
                    <span className="text-emerald-400 text-xs font-bold font-sans flex items-center gap-1.5 mt-0.5">
                      <CheckCircle className="w-4 h-4" /> Ready to Import
                    </span>
                  </div>
                  <button
                    onClick={executeBulkImport}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-lg transition-colors shadow-lg shadow-emerald-950/30 cursor-pointer"
                  >
                    Execute Statement Import ({parsedItems.length} rows)
                  </button>
                </div>
              )}

              {importStatus === 'success' && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-lg text-emerald-400 text-xs font-semibold text-center animate-pulse">
                  Bank Statements synchronized successfully to workspace ledger!
                </div>
              )}

              {importStatus === 'error' && (
                <div className="p-3 bg-red-950/30 border border-red-800/45 rounded-lg text-red-400 text-xs font-semibold text-center">
                  Error: Could not parse columns correctly. Ensure data is separated by tabs or commas.
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* TAB 4: RECONCILED HISTORY */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-850">
            <h4 className="text-[10px] font-bold font-mono uppercase text-zinc-400 tracking-wider">
              Audit-trail of Reconciled Connections ({reconciledStatements.length})
            </h4>
          </div>

          <div className="space-y-2 h-96 overflow-y-auto pr-1 scrollbar">
            {reconciledStatements.map(stmt => {
              const matchedTx = store.db.ledger.find(t => t.id === stmt.reconciledTransactionId);
              return (
                <div key={stmt.id} className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-750 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">
                        Statement Ref: {stmt.referenceNumber}
                      </span>
                      <span className="text-zinc-550 text-xs font-mono">Matched on: {stmt.date}</span>
                    </div>
                    <h5 className="font-sans font-bold text-zinc-200 text-sm mt-1">{stmt.description}</h5>
                    {matchedTx && (
                      <p className="text-xs text-zinc-500 font-sans">
                        Linked General Ledger description: <span className="text-indigo-400 font-mono">"{matchedTx.description}"</span> on {matchedTx.date}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 self-stretch md:self-center justify-between md:justify-end">
                    <span className="font-extrabold text-emerald-400 text-sm font-mono">
                      ${stmt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      onClick={() => {
                        // Undo reconciliation: reset the statement's reconciledTransactionId and the ledger's isBankCleared
                        store.setDb(prev => ({
                          ...prev,
                          bankStatements: prev.bankStatements.map(s => s.id === stmt.id ? { ...s, reconciledTransactionId: undefined } : s),
                          ledger: prev.ledger.map(t => t.id === stmt.reconciledTransactionId ? { ...t, isBankCleared: false } : t),
                        }));
                        store.addAuditLog({
                          action: 'unreconcile_bank_statement',
                          category: 'transaction',
                          description: `Reconciliation manually undone for bank statement row ID ${stmt.id}`,
                          details: { statementId: stmt.id, transactionId: stmt.reconciledTransactionId },
                        });
                        triggerSync();
                      }}
                      className="text-[10px] text-red-400 hover:text-red-300 font-bold font-sans px-2.5 py-1.5 rounded-lg border border-red-950 bg-red-950/20 hover:bg-red-950/40 cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      <Undo2 className="w-3 h-3" />
                      Unlink Match
                    </button>
                  </div>
                </div>
              );
            })}

            {reconciledStatements.length === 0 && (
              <div className="text-center py-20 text-zinc-650 italic bg-zinc-950 border border-zinc-850/60 rounded-xl">
                No statement reconciliation logs recorded yet.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

// ==========================================
// 4. FORECASTING & VARIANCE COCKPIT
// ==========================================
export const ForecastingModule: React.FC = () => {
  const store = useStore();
  const [expectedGrowth, setExpectedGrowth] = useState(15); // Revenue expected growth percentage
  const [expenseGrowth, setExpenseGrowth] = useState(5); // Expense expected growth percentage

  // General ledger operating indicators calculation
  const salesRevenues = store.db.ledger
    .filter(tx => tx.type === 'sales')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const parsedExpensesCost = store.db.ledger
    .filter(tx => tx.type === 'other_expense' || tx.type === 'salary_payment' || tx.type === 'purchase')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const startingBank = 100000;
  const currentActualRevenue = salesRevenues;
  const currentActualExpense = parsedExpensesCost;
  const currentActualCash = startingBank + currentActualRevenue - currentActualExpense;

  // Let's build a simple 12-month metrics list based on sliders simulation!
  const monthsList = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  // Running dynamic simulations
  const simulate12Months = () => {
    let cashSim = currentActualCash;
    let baseRev = currentActualRevenue > 0 ? currentActualRevenue / 6 : 5000; // Base estimate monthly
    let baseExp = currentActualExpense > 0 ? currentActualExpense / 6 : 3000;

    return monthsList.map((m, i) => {
      // Apply monthly compounding projection based on simulation growth sliders
      const monthlyRev = baseRev * (1 + (expectedGrowth / 100) * (i / 11));
      const monthlyExp = baseExp * (1 + (expenseGrowth / 100) * (i / 11));
      cashSim = cashSim + monthlyRev - monthlyExp;

      return {
        month: m,
        revenueSim: parseFloat(monthlyRev.toFixed(0)),
        expenseSim: parseFloat(monthlyExp.toFixed(0)),
        cashSim: parseFloat(cashSim.toFixed(0))
      };
    });
  };

  const sims = simulate12Months();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

      {/* Simulator Sliders Panel */}
      <div className="bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-sm space-y-5 h-fit">
        <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
          <Sliders className="w-5 h-5 text-emerald-400" />
          <h3 className="text-xs font-semibold text-zinc-150 uppercase tracking-widest">Growth Scenario Simulator</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-300 font-medium">Expected Annual Revenue Growth</span>
              <span className="font-mono text-emerald-400 font-bold">+{expectedGrowth}%</span>
            </div>
            <input
              type="range"
              min="-10"
              max="100"
              value={expectedGrowth}
              onChange={e => setExpectedGrowth(parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-300 font-medium">Expected Operating Expenses Growth</span>
              <span className="font-mono text-indigo-400 font-bold">+{expenseGrowth}%</span>
            </div>
            <input
              type="range"
              min="-10"
              max="50"
              value={expenseGrowth}
              onChange={e => setExpenseGrowth(parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>

        {/* Forecasted Summary Metric widgets */}
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-3 font-mono text-xs">
          <div className="text-[10px] uppercase font-bold text-zinc-550 border-b border-zinc-900 pb-1.5 font-sans">12-Month Year-End Targets</div>
          <div className="flex justify-between">
            <span className="text-zinc-450">Projected Run-rate Cash</span>
            <span className="text-emerald-400">${sims[sims.length - 1].cashSim.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-450">Projected Monthly Revenue</span>
            <span className="text-zinc-200">${sims[sims.length - 1].revenueSim.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-450">Projected Monthly OpEx</span>
            <span className="text-zinc-200">${sims[sims.length - 1].expenseSim.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Projected Chart Visualization */}
      <div className="xl:col-span-2 bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 tracking-wide">12-MONTH CASH-FLOW METRIC GRAPH</h3>
          <p className="text-xs text-zinc-455">Compounded operations projection timeline based on active scenario sliders configuration.</p>
        </div>

        <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl space-y-3">
          {/* Custom micro horizontal bars graph */}
          <div className="space-y-2">
            {sims.map((sim, i) => {
              // Calculate percent of maximum simulated cash balance to scale width nicely
              const maxCash = Math.max(...sims.map(s => s.cashSim));
              const percent = (sim.cashSim / maxCash) * 100;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-8 text-[11px] font-mono text-zinc-400">{sim.month}</span>
                  <div className="flex-1 bg-zinc-900 rounded h-3 overflow-hidden border border-zinc-850">
                    <div
                      style={{ width: `${percent}%` }}
                      className="bg-emerald-500 h-full rounded transition-all duration-300 shadow-[0_0_5px_rgba(52,211,153,0.3)]"
                    />
                  </div>
                  <span className="w-16 text-[10px] text-right font-mono text-zinc-300">${sim.cashSim.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
};
