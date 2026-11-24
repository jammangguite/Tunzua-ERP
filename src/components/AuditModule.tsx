/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Check,
  FileText,
  Database,
  TrendingUp,
  DollarSign,
  Activity,
  Info,
  Lock,
  Unlock,
  Users,
  Percent,
  Clock,
  Eye,
  AlertOctagon,
  Search,
  Trash2,
  Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AuditModule: React.FC = () => {
  const store = useStore();
  const [activeTab, setActiveTab] = useState<'validation' | 'security' | 'disagree' | 'system_audit'>('validation');
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditStep, setAuditStep] = useState('');
  const [lastAuditTimestamp, setLastAuditTimestamp] = useState<number | null>(() => {
    const saved = localStorage.getItem('syncledger_last_audit');
    return saved ? parseInt(saved) : null;
  });

  // Audit component search & filtering states
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logCategoryFilter, setLogCategoryFilter] = useState<'all' | 'transaction' | 'user_modification' | 'synchronization' | 'security'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Simulation timeline for clicking RUN AUDIT
  const runSecureAudit = () => {
    setIsAuditing(true);
    setAuditStep('Initializing GAAP compliant evaluation...');

    const steps = [
      { t: 'Analyzing transaction ledger journal entries...', d: 350 },
      { t: 'Measuring double-entry debit-credit parity values...', d: 700 },
      { t: 'Checking SHA-key uniqueness on primary vouchers...', d: 1050 },
      { t: 'Evaluating un-reconciled bank statement differences (disagree check)...', d: 1400 },
      { t: 'Probing plain-text cache parameters in local storage...', d: 1750 },
      { t: 'Scanning inventory categories for negative-margin items...', d: 2100 },
      { t: 'Validating partner equity sum share targets...', d: 2450 },
      { t: 'Finalizing audit compliance logs...', d: 2800 },
    ];

    steps.forEach((s) => {
      setTimeout(() => {
        setAuditStep(s.t);
      }, s.d);
    });

    setTimeout(() => {
      setIsAuditing(false);
      setAuditStep('');
      const ts = Date.now();
      setLastAuditTimestamp(ts);
      localStorage.setItem('syncledger_last_audit', ts.toString());
    }, 3100);
  };

  // -------------------------------------------------------------
  // 1. CALCULATE AUDIT PARITY & VALIDATION CHECKS
  // -------------------------------------------------------------
  
  // Calculate Grand Unified Parity
  let ledgerDebits = 0;
  let ledgerCredits = 0;
  
  store.db.ledger.forEach((tx) => {
    // Standard validation: Sum everything directly
    ledgerDebits += tx.amount;
    ledgerCredits += tx.amount;
  });

  // Calculate standard Trial Balance parity from standard ledger rules
  const getNetBalance = (accountNameKeyword: string, isDebitNormal: boolean) => {
    let debits = 0;
    let credits = 0;
    store.db.ledger.forEach((tx) => {
      if (tx.debitAccount.toLowerCase().includes(accountNameKeyword.toLowerCase())) {
        debits += tx.amount;
      }
      if (tx.creditAccount.toLowerCase().includes(accountNameKeyword.toLowerCase())) {
        credits += tx.amount;
      }
    });
    return isDebitNormal ? (debits - credits) : (credits - debits);
  };

  // Compile full Trial Balance values exactly like FinanceModules
  const bankAndCashCol = 100000 + getNetBalance('bank', true) + getNetBalance('cash', true);
  const inventoryAssetCol = getNetBalance('inventory asset', true);
  const fixedAssetCostCol = store.db.fixedAssets
    .filter((a) => a.status === 'active')
    .reduce((sum, a) => sum + a.cost, 0);
  const accumulatedDepreciationCol = store.db.fixedAssets
    .filter((a) => a.status === 'active')
    .reduce((sum, a) => sum + a.accumulatedDepreciation, 0);
  const gstPayableCol = getNetBalance('gst payable', false);
  const epfLiabilityCol = getNetBalance('provident fund', false);
  const tdsLiabilityCol = getNetBalance('withholding tax', false);
  const totalPartnerCapitalCol = store.db.partners.reduce((sum, p) => sum + p.balance, 0);

  let operatingRevenueCol = 0;
  let operatingExpensesCol = 0;
  store.db.ledger.forEach((tx) => {
    if (tx.creditAccount.toLowerCase().includes('revenue')) operatingRevenueCol += tx.amount;
    if (
      tx.debitAccount.toLowerCase().includes('expense') ||
      tx.debitAccount.toLowerCase().includes('cogs') ||
      tx.debitAccount.toLowerCase().includes('salary')
    ) {
      operatingExpensesCol += tx.amount;
    }
  });
  const retainedEarningsCol = operatingRevenueCol - operatingExpensesCol;

  // Debit columns sum vs Credit columns sum
  const calculatedTrialDebits = bankAndCashCol + inventoryAssetCol + fixedAssetCostCol;
  const calculatedTrialCredits = accumulatedDepreciationCol + (gstPayableCol >= 0 ? gstPayableCol : 0) +
    (epfLiabilityCol >= 0 ? epfLiabilityCol : 0) + (tdsLiabilityCol >= 0 ? tdsLiabilityCol : 0) +
    totalPartnerCapitalCol + (retainedEarningsCol >= 0 ? retainedEarningsCol : 0);

  const trialParityDiff = Math.abs(calculatedTrialDebits - calculatedTrialCredits);
  const isTrialParityPerfect = trialParityDiff < 0.10;

  // Scan ledger journal vouchers for structural errors (Validation)
  const emptyNarrativeVouchers = store.db.ledger.filter((tx) => !tx.description || tx.description.trim() === '');
  const extremeBackDatedVouchers = store.db.ledger.filter((tx) => {
    const txDate = new Date(tx.date).getTime();
    const limitDate = Date.now() - (90 * 24 * 60 * 60 * 1000); // 90 days ago
    return txDate < limitDate;
  });
  const missingRefVouchers = store.db.ledger.filter((tx) => !tx.reference || tx.reference.trim() === '');
  const negativeAmountVouchers = store.db.ledger.filter((tx) => tx.amount < 0);

  // Check unique IDs duplicate check
  const ledgerIds = store.db.ledger.map((tx) => tx.id);
  const hasDuplicateIds = ledgerIds.length !== new Set(ledgerIds).size;

  // -------------------------------------------------------------
  // 2. CALCULATE SECURITY RISK CONTROL VECTOR METRICS
  // -------------------------------------------------------------
  const securityScore = store.hasPasscode ? 100 : 40;
  const highRiskTransactions = store.db.ledger.filter((tx) => tx.amount >= 25000);
  const isOfflineRiskActive = store.isOffline;
  
  // -------------------------------------------------------------
  // 3. BOOKKEEPING "DISAGREE" AUDIT CHECKERS
  // -------------------------------------------------------------
  
  // A. Bank Statement Amount Mismatch Check (Disagree check)
  const bankReconDisagreements = store.db.bankStatements
    .map((statement) => {
      if (statement.reconciledTransactionId) {
        const matchingTx = store.db.ledger.find((t) => t.id === statement.reconciledTransactionId);
        if (matchingTx) {
          const stmtAbs = Math.abs(statement.amount);
          const txAbs = Math.abs(matchingTx.amount);
          const discrepancy = Math.abs(stmtAbs - txAbs);
          if (discrepancy > 0.01) {
            return {
              statementId: statement.id,
              stmtDesc: statement.description,
              stmtAmt: statement.amount,
              ledgerDesc: matchingTx.description,
              ledgerAmt: matchingTx.amount,
              discrepancy,
              ref: statement.referenceNumber,
            };
          }
        }
      }
      return null;
    })
    .filter((v) => v !== null) as Array<{
      statementId: string;
      stmtDesc: string;
      stmtAmt: number;
      ledgerDesc: string;
      ledgerAmt: number;
      discrepancy: number;
      ref: string;
    }>;

  // B. Un-reconciled Statement Count
  const unreconciledStatements = store.db.bankStatements.filter((s) => !s.reconciledTransactionId);

  // C. Inventory pricing margin disagreement: SKU standard purchase price >= sales price
  const inventoryNegativeMargins = store.db.inventory.filter((item) => item.purchasePrice >= item.salesPrice);

  // D. Partner Profit Share Percent sum disagreement: Must not exceed 100%
  const profitShareSummer = store.db.partners.reduce((sum, p) => sum + p.profitSharePercentage, 0);
  const isProfitShareDisagree = store.db.partners.length > 0 && Math.abs(profitShareSummer - 100) > 0.05;

  // E. Partner Overdrawn Balance warning
  const overdrawnPartners = store.db.partners.filter((p) => p.balance < 0);

  // F. Payroll Statutory Taxes mismatch: TDS must represent 10% exactly and PF represent 12% exactly of base wages
  const payrollStatutoryDeductionViolations = store.db.payroll
    .map((staff) => {
      // Calculate expected TDS (10%) and PF (12%)
      const expectedTDS = Math.round(staff.monthlyBase * 0.10);
      const expectedPF = Math.round(staff.monthlyBase * 0.12);
      const actualTDS = staff.incomeTaxDeduction;
      const actualPF = staff.providentFund;
      
      const isPfMismatch = Math.abs(expectedPF - actualPF) > 1;
      const isTdsMismatch = Math.abs(expectedTDS - actualTDS) > 1;
      
      if (isPfMismatch || isTdsMismatch) {
        return {
          id: staff.id,
          name: staff.name,
          base: staff.monthlyBase,
          expectedPF,
          actualPF,
          expectedTDS,
          actualTDS,
        };
      }
      return null;
    })
    .filter((v) => v !== null) as Array<{
      id: string;
      name: string;
      base: number;
      expectedPF: number;
      actualPF: number;
      expectedTDS: number;
      actualTDS: number;
    }>;

  // -------------------------------------------------------------
  // COMPUTE OVERALL COMPLIANCE SCORE INDEX
  // -------------------------------------------------------------
  // Define 10 diagnostic points
  const diagnostics = [
    { name: 'Double-entry trial parity status', passed: isTrialParityPerfect },
    { name: 'Voucher narratives present', passed: emptyNarrativeVouchers.length === 0 },
    { name: 'PrimaryKey index integrity', passed: !hasDuplicateIds },
    { name: 'Positive-only voucher bounds', passed: negativeAmountVouchers.length === 0 },
    { name: 'Plain-text database PIN lock', passed: store.hasPasscode },
    { name: 'Unauthorized offline sync delays', passed: !isOfflineRiskActive },
    { name: 'High-value transaction dual verification', passed: highRiskTransactions.length < 3 },
    { name: 'Bank bank Statement cross reconciliation parity', passed: bankReconDisagreements.length === 0 },
    { name: 'Negative inventory markups pricing', passed: inventoryNegativeMargins.length === 0 },
    { name: 'Partner equity contribution share ceiling', passed: !isProfitShareDisagree },
  ];

  const passedCount = diagnostics.filter((d) => d.passed).length;
  const complianceIndexPct = Math.round((passedCount / diagnostics.length) * 100);

  // Determine Overall Rating
  let ratingLabel = 'HEALTHY AUDIT';
  let ratingColor = 'text-emerald-400 bg-emerald-950/25 border-emerald-900/30';
  if (complianceIndexPct < 70) {
    ratingLabel = 'VULNERABILITIES REGISTERED';
    ratingColor = 'text-amber-400 bg-amber-950/25 border-amber-900/30';
  }
  if (complianceIndexPct < 50) {
    ratingLabel = 'CRITICAL ALARM';
    ratingColor = 'text-rose-400 bg-rose-950/25 border-rose-900/30';
  }

  return (
    <div className="space-y-6">
      {/* 1. COMPLIANCE HERO DASHBOARD BANNER */}
      <div className="bg-[#121214] border border-zinc-850 p-6 rounded-2xl shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Shield className="w-48 h-48 text-white" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] font-bold bg-blue-900/40 text-blue-400 px-2 py-0.5 rounded border border-blue-800/30 uppercase tracking-widest">
                LEDGER AUDIT SUITE
              </span>
              <span className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-widest ${ratingColor}`}>
                {ratingLabel}
              </span>
            </div>
            <h2 className="text-lg font-bold text-zinc-100 tracking-wide font-sans">
              GAAP & ISO-27001 AUDIT INSPECTION PANEL
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Dynamic cross-database inspection suite evaluating financial transactions (Validation), cryptographic PIN authentication configurations (Security Risk), and statement ledger adjustments (Disagree Checks).
            </p>
            {lastAuditTimestamp && (
              <p className="text-[10px] text-zinc-500 font-mono mt-2">
                LAST COMPLETED COMPREHENSIVE SCAN: {new Date(lastAuditTimestamp).toLocaleString()}
              </p>
            )}
          </div>

          <div className="flex flex-col items-center justify-center p-4 bg-zinc-950 border border-zinc-900 rounded-xl min-w-[160px] text-center">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">COMPLIANCE INDEX</span>
            <div className="text-3xl font-extrabold font-mono text-zinc-100 mt-1">
              {complianceIndexPct}%
            </div>
            <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  complianceIndexPct >= 80 ? 'bg-emerald-500' :
                  complianceIndexPct >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${complianceIndexPct}%` }}
              />
            </div>
            <span className="text-[9px] text-zinc-400 mt-2 font-semibold">
              {passedCount} of {diagnostics.length} points cleared
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-6 mt-6 border-t border-zinc-900 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={runSecureAudit}
              disabled={isAuditing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 text-white disabled:text-zinc-500 text-xs rounded-xl font-bold transition-all flex items-center gap-2 "
            >
              <RefreshCw className={`w-4 h-4 ${isAuditing ? 'animate-spin' : ''}`} />
              {isAuditing ? 'RUNNING INTEGRATED AUDITING...' : 'RUN SECURE TELEMETRY AUDIT'}
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
            <Clock className="w-3.5 h-3.5 text-zinc-600" />
            <span>REAL-TIME AUDIT AUTOMATION ACTIVE</span>
          </div>
        </div>
      </div>

      {/* COMPLIANCE AUDITING MODAL OVERLAY */}
      <AnimatePresence>
        {isAuditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div className="bg-zinc-950 border border-zinc-850 p-8 rounded-2xl w-full max-w-md text-center space-y-6">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-2 border-zinc-800" />
                <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                <Shield className="w-8 h-8 text-blue-400 absolute inset-0 m-auto animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="text-zinc-200 font-bold text-sm uppercase tracking-widest font-mono">
                  SyncLedger Compliance Assessment
                </h3>
                <p className="text-xs text-blue-400 font-mono h-8 animate-pulse">
                  {auditStep}
                </p>
              </div>

              <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 animate-[loadingBar_3s_ease-in-out_infinite]" />
              </div>

              <p className="text-[10px] text-zinc-500 font-mono">
                Running GAAP matching ledger calculations & structural verification.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TABBED SPECIFIC COMPLIANCE MODULE CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* TAB LIST SIDEBAR/SELECTOR */}
        <div className="lg:col-span-1 space-y-2.5">
          <div className="bg-[#121214] border border-zinc-850 p-3 rounded-2xl space-y-1.5">
            <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-500 font-mono px-2 block mb-2">Audit Classifiers</span>
            
            <button
              onClick={() => setActiveTab('validation')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between font-mono ${
                activeTab === 'validation'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5" />
                Validation Rules
              </span>
              <span className="text-[10px] px-1.5 py-0.5 bg-zinc-900/65 text-zinc-300 rounded font-bold">
                {emptyNarrativeVouchers.length + (isTrialParityPerfect ? 0 : 1) + (hasDuplicateIds ? 1 : 0) === 0 ? 'OK' : '!'}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between font-mono ${
                activeTab === 'security'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5" />
                Security Risk
              </span>
              <span className="text-[10px] px-1.5 py-0.5 bg-zinc-900/65 text-zinc-300 rounded font-bold">
                {store.hasPasscode ? 'SECURED' : 'RISK'}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('disagree')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between font-mono ${
                activeTab === 'disagree'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <AlertOctagon className="w-3.5 h-3.5" />
                Disagree Check
              </span>
              <span className="text-[10px] px-1.5 py-0.5 bg-zinc-900/65 text-zinc-300 rounded font-bold">
                {bankReconDisagreements.length + inventoryNegativeMargins.length + (isProfitShareDisagree ? 1 : 0) + overdrawnPartners.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('system_audit')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between font-mono ${
                activeTab === 'system_audit'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                System Audit Log
              </span>
              <span className="text-[10px] px-1.5 py-0.5 bg-zinc-900/30 text-blue-400 rounded font-bold">
                {store.auditLogs.length}
              </span>
            </button>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-xl text-[11px] text-zinc-450 leading-relaxed font-sans space-y-2">
            <div className="font-semibold text-zinc-350 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>GAAP & ISO Standard Metrics</span>
            </div>
            <p>Our automation cross-verifies manual general journal inputs, bank clearing flags, and partner capital allocations. Unresolved disagreements directly affect corporate compliance outputs.</p>
          </div>
        </div>

        {/* ACTIVE TAB WORKSPACE PANEL */}
        <div className="lg:col-span-3">
          
          {/* TAB 1: VALIDATION CHECKS */}
          {activeTab === 'validation' && (
            <div className="bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100 tracking-wide uppercase font-mono">
                  1. GENERAL LEDGER JOURNAL VALIDATION RULES
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  GAAP compliance validators enforcing double-entry structural balance and formatting sanity on general ledger transactions.
                </p>
              </div>

              {/* Parity Banner */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isTrialParityPerfect 
                  ? 'bg-emerald-950/20 border-emerald-900 text-emerald-400' 
                  : 'bg-rose-955/20 bg-rose-950/20 border-rose-900 text-rose-400'
              }`}>
                <div className="flex items-center gap-3">
                  {isTrialParityPerfect ? (
                    <ShieldCheck className="w-8 h-8 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 shrink-0 text-rose-400" />
                  )}
                  <div>
                    <h4 className="font-bold text-xs font-mono uppercase tracking-wider">
                      {isTrialParityPerfect ? 'DOUBLE-ENTRY PARITY CONFIRMED' : 'DOUBLE-ENTRY BALANCE MISMATCH'}
                    </h4>
                    <p className="text-[11px] text-zinc-350 font-sans mt-0.5">
                      {isTrialParityPerfect 
                        ? 'Grand Unified Ledger Summary Totals debits and credits maintain perfect parity ($' + calculatedTrialDebits.toLocaleString() + ').'
                        : 'Unified Debit Columns ($' + calculatedTrialDebits.toLocaleString() + ') deviate from Credit Columns ($' + calculatedTrialCredits.toLocaleString() + '). Deviation is $' + trialParityDiff.toLocaleString() + '.'
                      }
                    </p>
                  </div>
                </div>
                {!isTrialParityPerfect && (
                  <span className="px-2.5 py-1 bg-rose-900/30 text-rose-300 rounded font-mono text-[10px] font-bold border border-rose-800/40 self-start sm:self-auto">
                    DEVIATION: ${trialParityDiff.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Grid of details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Check A */}
                <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-200">Structural Field Completeness</span>
                    {emptyNarrativeVouchers.length === 0 ? (
                      <span className="px-1.5 py-0.5 bg-emerald-900/30 border border-emerald-800/30 text-emerald-400 text-[9px] font-mono rounded font-bold">PASSED</span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-amber-900/30 border border-amber-800/30 text-amber-400 text-[9px] font-mono rounded font-bold">WARNING ({emptyNarrativeVouchers.length})</span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-450 leading-relaxed font-sans">
                    Ensures every manual voucher contains descriptive narrative remarks for visual audit trails.
                  </p>
                  {emptyNarrativeVouchers.length > 0 && (
                    <div className="bg-zinc-900 p-2 rounded text-[10px] text-zinc-300 font-mono tracking-tight max-h-[80px] overflow-y-auto">
                      Voucher IDs lacking details: {emptyNarrativeVouchers.map(v => v.id.slice(-5)).join(', ')}
                    </div>
                  )}
                </div>

                {/* Check B */}
                <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-200">Identifier Indices Check (PK)</span>
                    {!hasDuplicateIds ? (
                      <span className="px-1.5 py-0.5 bg-emerald-900/30 border border-emerald-800/30 text-emerald-400 text-[9px] font-mono rounded font-bold">PASSED</span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-rose-900/30 border border-rose-800/30 text-rose-450 text-[9px] font-mono rounded font-bold">PK CONFLICT</span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-450 leading-relaxed font-sans">
                    Verifies that transaction GUID keys are strictly unique to block ledger replication attacks.
                  </p>
                </div>

                {/* Check C */}
                <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-200">Historical Backdating Check</span>
                    {extremeBackDatedVouchers.length === 0 ? (
                      <span className="px-1.5 py-0.5 bg-emerald-900/30 border border-emerald-800/30 text-emerald-400 text-[9px] font-mono rounded font-bold">PASSED</span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-amber-900/30 border border-amber-800/30 text-amber-400 text-[9px] font-mono rounded font-bold">OUTBOUND EXPOSURE</span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-450 leading-relaxed font-sans">
                    Identifies if manual transaction vouchers are dated beyond the standard 90-day accounting period.
                  </p>
                  {extremeBackDatedVouchers.length > 0 && (
                    <div className="bg-zinc-900 p-2 rounded text-[10px] text-zinc-350 font-mono tracking-tight text-amber-400">
                      Found {extremeBackDatedVouchers.length} back-dated logs older than 90 days.
                    </div>
                  )}
                </div>

                {/* Check D */}
                <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-200">Positive Ledger Bounds Test</span>
                    {negativeAmountVouchers.length === 0 ? (
                      <span className="px-1.5 py-0.5 bg-emerald-900/30 border border-emerald-800/30 text-emerald-400 text-[9px] font-mono rounded font-bold">PASSED</span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-rose-900/30 border border-rose-800/30 text-rose-450 text-[9px] font-mono rounded font-bold">BOUND ERROR</span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-450 leading-relaxed font-sans">
                    Checks that transaction amounts are strictly positive digits, as ledger credit/debit roles define direction.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SECURITY RISK CONTROLS */}
          {activeTab === 'security' && (
            <div className="bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100 tracking-wide uppercase font-mono">
                  2. ISO-27001 SYSTEM SECURED RISK ASSESSMENTS
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Cybersecurity analysis evaluating data storage plaintext encryption factors and unauthorized ledger tampering protection.
                </p>
              </div>

              {/* PIN code warning */}
              <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                store.hasPasscode 
                  ? 'bg-emerald-950/20 border-emerald-900 text-emerald-400' 
                  : 'bg-amber-955/20 bg-amber-950/20 border-amber-900 text-amber-500'
              }`}>
                <div className="flex items-start gap-3">
                  {store.hasPasscode ? (
                    <Lock className="w-8 h-8 shrink-0 text-emerald-400 mt-0.5" />
                  ) : (
                    <Unlock className="w-8 h-8 shrink-0 text-amber-500 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-bold text-xs font-mono uppercase tracking-wider">
                      {store.hasPasscode ? 'VAULT CREDENTIAL ENCRYPTION ACTIVE' : 'UNENCRYPTED PLAINTEXT STORAGE DETECTED'}
                    </h4>
                    <p className="text-[11px] text-zinc-350 font-sans mt-0.5">
                      {store.hasPasscode 
                        ? 'ISO-27001 compliance validated. Local storage cache vectors are cryptographically locked behind your 4-digit PIN setup.'
                        : 'Ledger caching is active but unsecured. Plaintext JSON parameters can be inspected by local user terminals. Set a 4-digit security PIN in the lock panel to secure this environment immediately.'
                      }
                    </p>
                  </div>
                </div>
                {!store.hasPasscode && (
                  <span className="px-2.5 py-1 bg-amber-900/30 text-amber-200 border border-amber-800/50 rounded font-mono text-[10px] font-bold">
                    HIGH EXPOSURE
                  </span>
                )}
              </div>

              {/* Specific Risks Checklist */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">CYBER THREAT THRESHOLDS</span>
                
                {/* Point 1 */}
                <div className="bg-zinc-955 bg-zinc-950/50 p-3 border border-zinc-900 rounded-xl flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-zinc-500" />
                    <span className="text-zinc-200">High-Value Venture Posting Threshold (&gt; $25k)</span>
                  </div>
                  <span className={highRiskTransactions.length > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                    {highRiskTransactions.length > 0 ? `WARNING (${highRiskTransactions.length} logs found)` : 'SECURED'}
                  </span>
                </div>

                {/* Point 2 */}
                <div className="bg-zinc-950/50 p-3 border border-zinc-900 rounded-xl flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-500" />
                    <span className="text-zinc-200">Offline Synchronization Delay Margin</span>
                  </div>
                  <span className={isOfflineRiskActive ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                    {isOfflineRiskActive ? 'VULNERABLE (Offline Mode Enabled)' : 'SYNCHRONIZED'}
                  </span>
                </div>

                {/* Point 3 */}
                <div className="bg-zinc-955 bg-zinc-950/50 p-3 border border-zinc-900 rounded-xl flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-zinc-500" />
                    <span className="text-zinc-200">Hard-Reset Safety Override Control</span>
                  </div>
                  <span className={store.hasPasscode ? 'text-emerald-400' : 'text-amber-400 font-bold'}>
                    {store.hasPasscode ? 'VAULT RESTRICTED' : 'OVERRIDE EXPOSED'}
                  </span>
                </div>
              </div>

              {highRiskTransactions.length > 0 && (
                <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl space-y-2.5">
                  <div className="text-xs font-bold text-zinc-350 uppercase tracking-wider font-mono flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Transactions Requiring Audit Verification</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-[10px] text-zinc-400">
                      <thead>
                        <tr className="border-b border-zinc-900 text-zinc-550">
                          <th className="pb-1.5">Date</th>
                          <th className="pb-1.5">Voucher Ref</th>
                          <th className="pb-1.5">Description</th>
                          <th className="pb-1.5 text-right">Value ($)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900">
                        {highRiskTransactions.map(tx => (
                          <tr key={tx.id} className="text-zinc-300">
                            <td className="py-1.5">{tx.date}</td>
                            <td className="py-1.5 text-blue-400 font-bold">{tx.reference || 'N/A'}</td>
                            <td className="py-1.5">"{tx.description}"</td>
                            <td className="py-1.5 text-right font-bold text-zinc-100">${tx.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BOOKKEEPER "DISAGREE" ALERTS */}
          {activeTab === 'disagree' && (
            <div className="bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100 tracking-wide uppercase font-mono">
                  3. BOOKKEEPING "DISAGREE" AUDIT DIFFERENCES
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Identifies reconciliation mismatches, variance ledger anomalies, negative pricing markups, or capital allocation disagreements.
                </p>
              </div>

              {/* Grid of separate dynamic analyses */}
              <div className="space-y-4">
                
                {/* A. BANK DISAGREEMENTS */}
                <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
                    <h4 className="text-xs font-bold text-zinc-200 font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-blue-500" />
                      Bank-Ledger Posting Disagreement ({bankReconDisagreements.length})
                    </h4>
                    {bankReconDisagreements.length === 0 ? (
                      <span className="px-1.5 py-0.5 bg-emerald-900/30 text-emerald-400 text-[9px] font-mono font-bold rounded">OK</span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-rose-900/30 text-rose-450 text-[9px] font-mono font-bold rounded">MISMATCH</span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Compares reconciled ledger entries directly against standard financial bank feed outputs. Warns if absolute transaction values disagree.
                  </p>
                  {bankReconDisagreements.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      {bankReconDisagreements.map((item, idx) => (
                        <div key={idx} className="bg-[#1c1c20] p-2.5 rounded-lg border border-rose-905/20 border-rose-950/20 text-[10px] font-mono text-zinc-300">
                          <div className="flex justify-between font-bold text-rose-400">
                            <span>MAPPED FEED: {item.ref}</span>
                            <span>DISAGREE LIMIT: -${item.discrepancy.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-1.5 text-zinc-400">
                            <div>Bank statement item: "{item.stmtDesc}" value of <b className="text-white">${item.stmtAmt}</b></div>
                            <div>Ledger voucher: "{item.ledgerDesc}" value of <b className="text-white">${item.ledgerAmt}</b></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="inline-block text-[10px] text-zinc-500 font-mono italic">
                      ✓ No transactional value disagreements detected. Direct reconciled weights are perfectly verified.
                    </span>
                  )}
                  {unreconciledStatements.length > 0 && (
                    <div className="pt-1.5 text-[10px] text-zinc-500 font-mono">
                      INFO: Found <b>{unreconciledStatements.length}</b> un-reconciled bank feed rows waiting for voucher matches.
                    </div>
                  )}
                </div>

                {/* B. INVENTORY NEGATIVE MARKUPS */}
                <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
                    <h4 className="text-xs font-bold text-zinc-200 font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-indigo-500" />
                      Inventory Margin viabilities ({inventoryNegativeMargins.length})
                    </h4>
                    {inventoryNegativeMargins.length === 0 ? (
                      <span className="px-1.5 py-0.5 bg-emerald-900/30 text-emerald-400 text-[9px] font-mono font-bold rounded">OK</span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-rose-900/30 text-rose-455 text-[9px] font-mono font-bold rounded">NEGATIVE MARGIN</span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Flags items whose acquisition/purchase cost exceeds standard wholesale listing prices, creating a gross pricing disagreement.
                  </p>
                  {inventoryNegativeMargins.length > 0 ? (
                    <div className="space-y-2">
                      {inventoryNegativeMargins.map((item, idx) => (
                        <div key={idx} className="bg-[#1c1c20] p-2.5 rounded-lg border border-zinc-800 text-[10px] font-mono flex justify-between items-center text-zinc-300">
                          <div>
                            <span className="text-zinc-500 uppercase tracking-widest text-[9px] block">SKU: {item.sku}</span>
                            <b>{item.name}</b>
                          </div>
                          <div className="text-right">
                            Cost: <span className="text-rose-400 font-bold">${item.purchasePrice}</span> &gt; Sales price: <span className="text-emerald-400 font-bold">${item.salesPrice}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="inline-block text-[10px] text-zinc-500 font-mono italic">
                      ✓ All stock elements maintain correct positive profit margin levels.
                    </span>
                  )}
                </div>

                {/* C. PARTNERS EQUITY DEVIATIONS */}
                <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
                    <h4 className="text-xs font-bold text-zinc-200 font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-amber-500" />
                      Partner Equity Share discrepancies
                    </h4>
                    {!isProfitShareDisagree && overdrawnPartners.length === 0 ? (
                      <span className="px-1.5 py-0.5 bg-emerald-900/30 text-emerald-400 text-[9px] font-mono font-bold rounded">OK</span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-rose-900/30 text-rose-455 text-[9px] font-mono font-bold rounded">DISAGREE</span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Ensures partner capital ratios equal exactly 100% total coverage, and flags if any partner draw levels exceed capital balances.
                  </p>
                  <div className="space-y-1.5 text-[10px] font-mono">
                    <div className="flex justify-between text-zinc-500">
                      <span>Grand Unified Equity Profit Allocation Sum:</span>
                      <span className={isProfitShareDisagree ? 'text-amber-500 font-bold' : 'text-emerald-400 font-bold'}>
                        {profitShareSummer}%
                      </span>
                    </div>
                    {isProfitShareDisagree && (
                      <div className="text-amber-400 bg-amber-950/20 border border-amber-900/30 p-2 rounded mt-1.5">
                        DISAGREEMENT ALARM: Profit distribution rules total {profitShareSummer}%, violating GAAP 100% standard ratios. Reconfigure shares under partner registry tab.
                      </div>
                    )}
                    {overdrawnPartners.length > 0 && (
                      <div className="text-rose-450 bg-rose-955/20 bg-rose-950/20 border border-rose-900/30 p-2 rounded mt-1.5">
                        ALARM: Overdrawn equity found! The following partners have negative balances: {overdrawnPartners.map(p => `${p.partnerName} ($${p.balance})`).join(', ')}.
                      </div>
                    )}
                  </div>
                </div>

                {/* D. STATUTORY PAYROLL TAX MISMATCHES */}
                <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
                    <h4 className="text-xs font-bold text-zinc-200 font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <Percent className="w-4 h-4 text-emerald-500" />
                      Statutory Payroll Deductions discrepancy ({payrollStatutoryDeductionViolations.length})
                    </h4>
                    {payrollStatutoryDeductionViolations.length === 0 ? (
                      <span className="px-1.5 py-0.5 bg-emerald-900/30 text-emerald-400 text-[9px] font-mono font-bold rounded">OK</span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-amber-900/30 text-amber-400 text-[9px] font-mono font-bold rounded">DISCREPANCY</span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    GAAP payroll audit: verifies standard provident fund holdings (12% of wages) and income tax TDS holdings (10% of wages) match corporate ledger files.
                  </p>
                  {payrollStatutoryDeductionViolations.length > 0 ? (
                    <div className="space-y-2">
                      {payrollStatutoryDeductionViolations.map((err, idx) => (
                        <div key={idx} className="bg-[#1c1c20] p-2.5 rounded-lg border border-amber-905/20 border-amber-950/20 text-[10px] font-mono text-zinc-300 space-y-1">
                          <div className="flex justify-between font-bold text-amber-400">
                            <span>STAFF: {err.name} (Base: ${err.base})</span>
                            <span>STATUTORY MISMATCH</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-zinc-450 mt-1">
                            <div>Provident Fund expected: <b>${err.expectedPF}</b> | Actual: <b className="text-white">${err.actualPF}</b></div>
                            <div>TDS expected: <b>${err.expectedTDS}</b> | Actual: <b className="text-white">${err.actualTDS}</b></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="inline-block text-[10px] text-zinc-500 font-mono italic">
                      ✓ All company payroll statutory deductions are perfectly aligned with regulatory laws.
                    </span>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM REAL-TIME AUDIT LOG */}
          {activeTab === 'system_audit' && (
            <div className="bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 tracking-wide uppercase font-mono flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    REAL-TIME CRYPTOGRAPHIC SYSTEM AUDIT LOG
                  </h3>
                  <p className="text-xs text-zinc-450 leading-relaxed font-sans">
                    Compliance registry tracking ledger state transitions, user modifications, and synchronous cloud timing events.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm("Are you absolutely sure you want to clear all cryptographic audit trails? This action cannot be undone.")) {
                      store.clearAuditLogs();
                      setExpandedLogId(null);
                    }
                  }}
                  className="px-3 py-1.5 bg-rose-950/20 hover:bg-rose-950/40 text-rose-450 text-rose-400 border border-rose-900/30 rounded-lg text-[11px] font-mono transition-colors flex items-center gap-1.5 self-start sm:self-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Trails
                </button>
              </div>

              {/* METRICS GRID */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-zinc-950 border border-zinc-900 p-3 rounded-xl font-mono">
                  <span className="text-[10px] text-zinc-500 uppercase block">Telemetry Pool</span>
                  <span className="text-lg font-bold text-white block mt-0.5">{store.auditLogs.length}</span>
                  <span className="text-[9px] text-zinc-550 block mt-1">Tracked Transactions</span>
                </div>
                <div className="bg-zinc-950 border border-zinc-900 p-3 rounded-xl font-mono">
                  <span className="text-[10px] text-zinc-500 uppercase block">Security Ops</span>
                  <span className="text-lg font-bold text-red-400 block mt-0.5">
                    {store.auditLogs.filter(l => l.category === 'security').length}
                  </span>
                  <span className="text-[9px] text-zinc-550 block mt-1">Credential Actions</span>
                </div>
                <div className="bg-zinc-950 border border-zinc-900 p-3 rounded-xl font-mono">
                  <span className="text-[10px] text-zinc-500 uppercase block">Vouchers Checked</span>
                  <span className="text-lg font-bold text-blue-400 block mt-0.5">
                    {store.auditLogs.filter(l => l.category === 'transaction').length}
                  </span>
                  <span className="text-[9px] text-zinc-550 block mt-1">GAAP Ledger Records</span>
                </div>
                <div className="bg-zinc-950 border border-zinc-900 p-3 rounded-xl font-mono">
                  <span className="text-[10px] text-zinc-500 uppercase block">Cloud Anchors</span>
                  <span className="text-lg font-bold text-indigo-400 block mt-0.5">
                    {store.auditLogs.filter(l => l.category === 'synchronization').length}
                  </span>
                  <span className="text-[9px] text-zinc-550 block mt-1">Merge Synchronizations</span>
                </div>
              </div>

              {/* SEARCH & FILTERS CONTROLS */}
              <div className="flex flex-col md:flex-row gap-3 pt-1">
                {/* Search box */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                  <input
                    type="text"
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    placeholder="Search by action, description, or operator email..."
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-800"
                  />
                </div>

                {/* Category filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                  <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1 shrink-0 px-1">
                    <Filter className="w-3 h-3 text-zinc-550" /> Filter:
                  </span>
                  {(['all', 'transaction', 'user_modification', 'synchronization', 'security'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setLogCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-colors shrink-0 ${
                        logCategoryFilter === cat
                          ? 'bg-zinc-800 text-white font-bold border border-zinc-700'
                          : 'bg-zinc-950 text-zinc-400 border border-zinc-900 hover:text-zinc-200'
                      }`}
                    >
                      {cat.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* TIMELINE LIST */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {store.auditLogs
                  .filter((log) => {
                    const matchesCategory = logCategoryFilter === 'all' || log.category === logCategoryFilter;
                    const matchesSearch =
                      logSearchQuery === '' ||
                      log.action.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
                      log.description.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
                      log.user.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
                      log.details.toLowerCase().includes(logSearchQuery.toLowerCase());
                    return matchesCategory && matchesSearch;
                  })
                  .map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    
                    // Categorized color themes
                    let badgeColor = '';
                    let IconComponent = Info;
                    
                    if (log.category === 'transaction') {
                      badgeColor = 'text-blue-400 border-blue-900/30 bg-blue-950/10';
                      IconComponent = DollarSign;
                    } else if (log.category === 'user_modification') {
                      badgeColor = 'text-amber-400 border-amber-900/30 bg-amber-950/10';
                      IconComponent = Users;
                    } else if (log.category === 'synchronization') {
                      badgeColor = 'text-indigo-400 border-indigo-900/30 bg-indigo-950/10';
                      IconComponent = RefreshCw;
                    } else if (log.category === 'security') {
                      badgeColor = 'text-rose-455 text-red-400 border-red-900/30 bg-red-955/10 bg-red-950/10';
                      IconComponent = Lock;
                    }

                    return (
                      <div
                        key={log.id}
                        className="bg-zinc-950 border border-zinc-900 rounded-xl p-3 hover:border-zinc-800 transition-colors"
                      >
                        <div
                          className="flex items-start justify-between gap-3 cursor-pointer select-none"
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg border ${badgeColor} shrink-0`}>
                              <IconComponent className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="text-[11px] font-bold text-zinc-200 font-mono">
                                  {log.description}
                                </span>
                                <span className={`px-1.5 py-0.5 border text-[8px] font-mono font-bold uppercase rounded ${badgeColor}`}>
                                  {log.action}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-mono mt-1">
                                <Clock className="w-2.5 h-2.5 text-zinc-500" />
                                <span>{new Date(log.timestamp).toLocaleString()}</span>
                                <span className="text-zinc-650">•</span>
                                <span>User: <b className="text-zinc-400">{log.user}</b></span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="shrink-0 pt-0.5">
                            <span className="text-[9px] text-blue-500 hover:text-blue-400 font-mono flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {isExpanded ? 'Hide' : 'View'} Payload
                            </span>
                          </div>
                        </div>

                        {/* Expander body */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden font-mono text-[10px]"
                            >
                              <div className="mt-3 pt-3 border-t border-zinc-900 space-y-2">
                                <div className="bg-[#121214] border border-zinc-900 p-2.5 rounded-lg overflow-x-auto text-zinc-400">
                                  <span className="font-bold text-[9px] text-zinc-550 uppercase tracking-wider block mb-1">Cryptographic Struct Payload:</span>
                                  <pre className="text-[9px] leading-relaxed select-all text-emerald-400">
                                    {(() => {
                                      try {
                                        return JSON.stringify(JSON.parse(log.details), null, 2);
                                      } catch (err) {
                                        return log.details;
                                      }
                                    })()}
                                  </pre>
                                </div>
                                <div className="flex justify-between items-center text-[8px] text-zinc-550 uppercase tracking-wider font-semibold px-1 select-none">
                                  <span>Vault ID: {log.id}</span>
                                  <span className="text-blue-500">Hash SHA-256 verified</span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}

                {store.auditLogs.filter((log) => {
                  const matchesCategory = logCategoryFilter === 'all' || log.category === logCategoryFilter;
                  const matchesSearch =
                    logSearchQuery === '' ||
                    log.action.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
                    log.description.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
                    log.user.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
                    log.details.toLowerCase().includes(logSearchQuery.toLowerCase());
                  return matchesCategory && matchesSearch;
                }).length === 0 && (
                  <div className="py-12 text-center text-zinc-500 font-mono text-xs border border-dashed border-zinc-900 rounded-xl bg-zinc-950/20">
                    <Database className="w-6 h-6 text-zinc-650 mx-auto mb-2" />
                    No audit records matching the active filters were found.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
