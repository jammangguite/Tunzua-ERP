import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useStore } from '../store';
import { LedgerTransaction, TransactionType, GstTaxMode } from '../types';
import { DateSearchBar } from '../components/DateSearchBar';
import { ClickablePath } from '../components/ClickablePath';
import { CsvImportModal } from '../components/CsvImportModal';
import { LedgerGstModule } from '../components/LedgerGstModule';
import { Plus, Pencil, Trash2, Download, X, Printer, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { exportSingleInvoicePDF, exportSingleVoucherPDF } from '../utils/pdfExport';
import { computeItemPricing } from '../utils/itemPricing';
import {
  GST_RATES,
  GstSupplyType,
  calculateEntryGst,
  formatGstTag,
  getTransactionGstDetails,
  stripGstTag,
} from '../utils/gstComputation';

interface LedgerPageProps {
  kind: 'purchases' | 'sales' | 'receipts' | 'payments';
  title: string;
  subtitle: string;
}

const LedgerPage: React.FC<LedgerPageProps> = ({ kind, title, subtitle }) => {
  const {
    db,
    ledgerItems,
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Module-level GST computation settings
  const [moduleGstRate, setModuleGstRate] = useState<number>(18);
  const [moduleGstMode, setModuleGstMode] = useState<GstTaxMode>('excluding');
  const [moduleSupplyType, setModuleSupplyType] = useState<GstSupplyType>('intra');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
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
  const [selectedMasterId, setSelectedMasterId] = useState('');

  // Modal-level GST computation state
  const [entryGstRate, setEntryGstRate] = useState<number>(0);
  const [entryCustomGstRate, setEntryCustomGstRate] = useState<string>('');
  const [entryGstMode, setEntryGstMode] = useState<GstTaxMode>('excluding');
  const [entrySupplyType, setEntrySupplyType] = useState<GstSupplyType>('intra');

  // Clear row selection when switching ledger pages (e.g. Sales -> Purchases)
  useEffect(() => {
    setSelectedIds([]);
    setConfirmDeleteId(null);
  }, [kind]);

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

  const entryGstCalc = useMemo(() => {
    const parsed = parseFloat(amount);
    const validInput = !Number.isNaN(parsed) && parsed > 0 ? parsed : 0;
    return calculateEntryGst(validInput, entryGstRate, entryGstMode, entrySupplyType);
  }, [amount, entryGstRate, entryGstMode, entrySupplyType]);

  const duplicateRef = useMemo(() => {
    const refKey = reference.trim().toLowerCase();
    if (!refKey) return null;
    return (
      db.ledger.find(
        tx =>
          tx.id !== editingTxId &&
          (tx.reference || '').trim().toLowerCase() === refKey
      ) || null
    );
  }, [db.ledger, reference, editingTxId]);

  const handleSelectMaster = (masterId: string) => {
    setSelectedMasterId(masterId);
    const chosen = ledgerItems.find(item => item.id === masterId);
    if (!chosen) return;

    const tagParts = [chosen.name];
    if (chosen.discount > 0) {
      tagParts.push(
        chosen.discountType === 'percentage'
          ? `${chosen.discount}% Disc.`
          : `${formatMoney(chosen.discount)} Disc.`
      );
    }
    setDescription(tagParts.join(' — '));

    if (chosen.accountGroup) {
      if (kind === 'sales' || kind === 'receipts') {
        setCreditAccount(chosen.accountGroup);
      } else {
        setDebitAccount(chosen.accountGroup);
      }
    }

    // Populate modal GST fields from the chosen master item
    setEntryGstRate(chosen.gstRate);
    setEntryCustomGstRate(GST_RATES.includes(chosen.gstRate) ? '' : String(chosen.gstRate));
    setEntryGstMode(chosen.gstMode);

    if (chosen.defaultPrice !== undefined && chosen.defaultPrice > 0) {
      const calc = computeItemPricing(
        chosen.defaultPrice,
        chosen.gstRate,
        chosen.gstMode,
        chosen.discount,
        chosen.discountType
      );
      // Enter pre-tax base for exclusive mode or final total for inclusive mode so modal GST doesn't double-apply
      setAmount(
        chosen.gstMode === 'excluding'
          ? calc.taxableValue.toFixed(2)
          : calc.finalTotal.toFixed(2)
      );
    }
  };

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
  const totalGstAmount = useMemo(
    () =>
      filteredTransactions.reduce((sum, tx) => {
        const details = getTransactionGstDetails(tx);
        return sum + (details ? details.gstAmount : 0);
      }, 0),
    [filteredTransactions]
  );
  const clearedCount = filteredTransactions.filter(t => t.isBankCleared).length;

  const visibleIdSet = useMemo(
    () => new Set(filteredTransactions.map(tx => tx.id)),
    [filteredTransactions]
  );
  const activeSelectedIds = useMemo(
    () => selectedIds.filter(id => visibleIdSet.has(id)),
    [selectedIds, visibleIdSet]
  );
  const allVisibleSelected =
    filteredTransactions.length > 0 &&
    activeSelectedIds.length === filteredTransactions.length;

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map(tx => tx.id));
    }
  };

  const openModalWithDefaults = (prefillGst?: {
    rate: number;
    mode: GstTaxMode;
    supplyType: GstSupplyType;
  }) => {
    setEditingTxId(null);
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
    setSelectedMasterId('');
    setIsBankCleared(true);

    const initialRate = prefillGst ? prefillGst.rate : moduleGstRate;
    const initialMode = prefillGst ? prefillGst.mode : moduleGstMode;
    const initialSupply = prefillGst ? prefillGst.supplyType : moduleSupplyType;
    setEntryGstRate(initialRate);
    setEntryCustomGstRate(GST_RATES.includes(initialRate) ? '' : String(initialRate));
    setEntryGstMode(initialMode);
    setEntrySupplyType(initialSupply);
    setShowAddModal(true);
  };

  const openEditModal = (tx: LedgerTransaction) => {
    const existingGst = getTransactionGstDetails(tx);
    setEditingTxId(tx.id);
    setDate(tx.date);
    setReference(tx.reference || '');
    setDescription(stripGstTag(tx.description));
    if (existingGst) {
      setEntryGstRate(existingGst.rate);
      setEntryCustomGstRate(GST_RATES.includes(existingGst.rate) ? '' : String(existingGst.rate));
      setEntryGstMode(existingGst.mode);
      setEntrySupplyType(existingGst.supplyType);
      setAmount(
        existingGst.mode === 'excluding'
          ? String(existingGst.taxableAmount)
          : String(existingGst.totalAmount)
      );
    } else {
      setEntryGstRate(0);
      setEntryCustomGstRate('');
      setEntryGstMode('excluding');
      setEntrySupplyType(moduleSupplyType);
      setAmount(String(tx.amount));
    }
    setDebitAccount(tx.debitAccount);
    setCreditAccount(tx.creditAccount);
    setTransactionType(tx.type);
    setIsBankCleared(tx.isBankCleared);
    setSelectedMasterId('');
    setShowAddModal(true);
  };

  const handleApplyGstToEntries = (targetIds: string[]) => {
    if (targetIds.length === 0 || moduleGstRate <= 0) return;

    let updatedCount = 0;
    let addedTaxTotal = 0;

    for (const id of targetIds) {
      const tx = db.ledger.find(entry => entry.id === id);
      if (!tx) continue;

      const existing = getTransactionGstDetails(tx);
      const baseInput =
        existing && moduleGstMode === 'excluding'
          ? existing.taxableAmount
          : tx.amount;

      const calc = calculateEntryGst(baseInput, moduleGstRate, moduleGstMode, moduleSupplyType);
      const cleanDesc = stripGstTag(tx.description);
      const gstTag = formatGstTag(calc);
      const nextDescription = gstTag ? `${cleanDesc} ${gstTag}` : cleanDesc;

      const res = editLedgerTransaction(tx.id, {
        description: nextDescription,
        amount: calc.totalAmount,
        taxableAmount: calc.taxableAmount,
        gstRate: calc.rate,
        gstAmount: calc.gstAmount,
        gstMode: calc.mode,
        gstSupplyType: calc.supplyType,
        cgstAmount: calc.cgstAmount,
        sgstAmount: calc.sgstAmount,
        igstAmount: calc.igstAmount,
      });

      if (res.ok) {
        updatedCount += 1;
        addedTaxTotal += calc.gstAmount;
      }
    }

    if (updatedCount > 0) {
      triggerSync();
      setSelectedIds([]);
      toast.success(
        `${moduleGstMode === 'excluding' ? 'Appended' : 'Computed'} ${moduleGstRate}% GST (${formatMoney(addedTaxTotal)}) on ${updatedCount} ${updatedCount === 1 ? 'entry' : 'entries'}.`
      );
    }
  };

  const handleRemoveGstFromEntries = (targetIds: string[]) => {
    if (targetIds.length === 0) return;

    let revertedCount = 0;

    for (const id of targetIds) {
      const tx = db.ledger.find(entry => entry.id === id);
      if (!tx) continue;

      const existing = getTransactionGstDetails(tx);
      if (!existing) continue;

      const revertedAmount =
        existing.mode === 'excluding' ? existing.taxableAmount : tx.amount;

      const res = editLedgerTransaction(tx.id, {
        description: stripGstTag(tx.description),
        amount: revertedAmount,
        taxableAmount: undefined,
        gstRate: undefined,
        gstAmount: undefined,
        gstMode: undefined,
        gstSupplyType: undefined,
        cgstAmount: undefined,
        sgstAmount: undefined,
        igstAmount: undefined,
      });

      if (res.ok) {
        revertedCount += 1;
      }
    }

    if (revertedCount > 0) {
      triggerSync();
      setSelectedIds([]);
      toast.success(
        `Removed GST from ${revertedCount} ${revertedCount === 1 ? 'entry' : 'entries'}.`
      );
    }
  };

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || !debitAccount.trim() || !creditAccount.trim()) {
      toast.error('Please fill in all ledger fields.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount greater than 0.');
      return;
    }

    const cleanDesc = stripGstTag(description);
    const hasGst = entryGstRate > 0;
    const calc = calculateEntryGst(parsedAmount, entryGstRate, entryGstMode, entrySupplyType);
    const gstTag = hasGst ? formatGstTag(calc) : '';
    const finalDescription = gstTag ? `${cleanDesc} ${gstTag}` : cleanDesc;

    const gstFields = hasGst
      ? {
          taxableAmount: calc.taxableAmount,
          gstRate: calc.rate,
          gstAmount: calc.gstAmount,
          gstMode: calc.mode,
          gstSupplyType: calc.supplyType,
          cgstAmount: calc.cgstAmount,
          sgstAmount: calc.sgstAmount,
          igstAmount: calc.igstAmount,
        }
      : {
          taxableAmount: undefined,
          gstRate: undefined,
          gstAmount: undefined,
          gstMode: undefined,
          gstSupplyType: undefined,
          cgstAmount: undefined,
          sgstAmount: undefined,
          igstAmount: undefined,
        };

    const res = editingTxId
      ? editLedgerTransaction(editingTxId, {
          date,
          description: finalDescription,
          type: transactionType,
          debitAccount: debitAccount.trim(),
          creditAccount: creditAccount.trim(),
          amount: calc.totalAmount,
          reference: reference.trim() || undefined,
          isBankCleared,
          ...gstFields,
        })
      : addLedgerTransaction({
          id: `${kind}-${Date.now()}`,
          date,
          description: finalDescription,
          type: transactionType,
          debitAccount: debitAccount.trim(),
          creditAccount: creditAccount.trim(),
          amount: calc.totalAmount,
          reference: reference.trim() || undefined,
          isBankCleared,
          ...gstFields,
        });

    if (!res.ok) {
      toast.error(res.error || 'Duplicate invoice / reference number is not allowed.');
      return;
    }

    triggerSync();
    toast.success(
      hasGst
        ? `${title} voucher ${editingTxId ? 'updated' : 'recorded'} with ${calc.rate}% GST (${formatMoney(calc.gstAmount)}).`
        : `${title} voucher ${editingTxId ? 'updated' : 'recorded'}.`
    );
    setEditingTxId(null);
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

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto no-print">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 bg-[#FFFDF9] hover:bg-[#F2EFE9] text-[#1F1D1A] border border-[#E5E0D5] font-medium text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-[#1B4D3E]" />
            Import CSV
          </button>

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
            onClick={() => openModalWithDefaults()}
            className="px-4 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] font-semibold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            New {title.replace(/s$/, '')}
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFDF9] p-5 rounded-xl border border-[#E5E0D5]">
          <div className="text-xs text-[#6B655C]">Filtered Total</div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-semibold text-[#1F1D1A]">
            {formatMoney(totalAmount)}
          </div>
        </div>
        <div className="bg-[#FFFDF9] p-5 rounded-xl border border-[#E5E0D5]">
          <div className="text-xs text-[#6B655C]">Total GST Computed</div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-semibold text-[#1B4D3E]">
            {formatMoney(totalGstAmount)}
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

      {/* GST Computation Module */}
      <LedgerGstModule
        title={title}
        transactions={filteredTransactions}
        selectedIds={activeSelectedIds}
        onClearSelection={() => setSelectedIds([])}
        gstRate={moduleGstRate}
        onGstRateChange={setModuleGstRate}
        gstMode={moduleGstMode}
        onGstModeChange={setModuleGstMode}
        supplyType={moduleSupplyType}
        onSupplyTypeChange={setModuleSupplyType}
        onApplyGst={handleApplyGstToEntries}
        onRemoveGst={handleRemoveGstFromEntries}
        onNewEntryWithGst={() =>
          openModalWithDefaults({
            rate: moduleGstRate,
            mode: moduleGstMode,
            supplyType: moduleSupplyType,
          })
        }
        formatMoney={formatMoney}
      />

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
                <th className="py-3 pl-4 pr-2 w-9 no-print">
                  <input
                    type="checkbox"
                    aria-label="Select all visible entries for GST computation"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    disabled={filteredTransactions.length === 0}
                    className="w-3.5 h-3.5 accent-[#1B4D3E] rounded cursor-pointer align-middle"
                  />
                </th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Narration</th>
                <th className="py-3 px-4">Debit (Dr)</th>
                <th className="py-3 px-4">Credit (Cr)</th>
                <th className="py-3 px-4 text-right">GST</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Status</th>
                <th className="py-3 px-4 text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D5] text-[#1F1D1A]">
              {filteredTransactions.map(tx => {
                const gstInfo = getTransactionGstDetails(tx);
                const isSelected = activeSelectedIds.includes(tx.id);
                const displayNarration = stripGstTag(tx.description);
                return (
                  <tr
                    key={tx.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-[#EBF3F0]/55' : 'hover:bg-[#F8F6F1]/60'
                    }`}
                  >
                    <td className="py-3.5 pl-4 pr-2 no-print">
                      <input
                        type="checkbox"
                        aria-label={`Select ${displayNarration}`}
                        checked={isSelected}
                        onChange={() => toggleSelectRow(tx.id)}
                        className="w-3.5 h-3.5 accent-[#1B4D3E] rounded cursor-pointer align-middle"
                      />
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-[#6B655C] whitespace-nowrap">
                      {tx.date}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs font-medium text-[#1B4D3E] whitespace-nowrap">
                      {tx.reference || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#1F1D1A]">
                      <div>{displayNarration}</div>
                      {gstInfo && (
                        <div className="text-[11px] font-mono tabular-nums text-[#6B655C] mt-0.5">
                          Base {formatMoney(gstInfo.taxableAmount)} ·{' '}
                          {gstInfo.supplyType === 'inter'
                            ? `IGST ${formatMoney(gstInfo.igstAmount)}`
                            : `CGST ${formatMoney(gstInfo.cgstAmount)} · SGST ${formatMoney(gstInfo.sgstAmount)}`}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#6B655C]">{tx.debitAccount}</td>
                    <td className="py-3.5 px-4 text-xs text-[#6B655C]">{tx.creditAccount}</td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                      {gstInfo ? (
                        <div>
                          <div className="text-xs font-semibold text-[#1B4D3E]">
                            {formatMoney(gstInfo.gstAmount)}
                          </div>
                          <div className="text-[10.5px] text-[#6B655C]">
                            {gstInfo.rate}% {gstInfo.supplyType === 'inter' ? 'IGST' : 'GST'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-[#968E82]">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#1F1D1A] whitespace-nowrap">
                      {formatMoney(tx.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-xs whitespace-nowrap">
                      <span className={tx.isBankCleared ? 'text-[#157347] font-medium' : 'text-[#B45309] font-medium'}>
                        {tx.isBankCleared ? 'Cleared' : 'Pending'}
                      </span>
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
                            onClick={() => openEditModal(tx)}
                            className="p-1.5 text-[#6B655C] hover:text-[#1B4D3E] hover:bg-[#F2EFE9] rounded-md transition-colors cursor-pointer"
                            title="Edit entry"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
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
                          {permissions.canDelete && (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(tx.id)}
                              className="p-1.5 text-[#6B655C] hover:text-[#B91C1C] hover:bg-[#FEF2F2] rounded-md transition-colors cursor-pointer"
                              title="Delete entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 px-4 text-center text-sm text-[#6B655C]">
                    No matching {title.toLowerCase()} entries found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warm Paper Creation / Edit Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-[#1F1D1A]/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setShowAddModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-[#FFFDF9] border border-[#E5E0D5] max-w-lg w-full rounded-xl shadow-lg overflow-hidden my-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#E5E0D5] flex justify-between items-center bg-[#F8F6F1]">
              <h2 className="font-display text-lg font-semibold text-[#1F1D1A]">
                {editingTxId ? `Edit ${title.replace(/s$/, '')} Voucher` : `Record ${title.replace(/s$/, '')} Voucher`}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setEditingTxId(null);
                  setShowAddModal(false);
                }}
                className="p-1.5 text-[#6B655C] hover:text-[#1F1D1A] rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {ledgerItems.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-[#6B655C] mb-1.5">
                    Apply Item / Ledger from Settings (Optional)
                  </label>
                  <select
                    value={selectedMasterId}
                    onChange={e => handleSelectMaster(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  >
                    <option value="">Manual entry (no preset)</option>
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
                    {entryGstRate > 0
                      ? entryGstMode === 'excluding'
                        ? `Base Amount (${companySettings.currencySymbol})`
                        : `Gross Amount incl. GST (${companySettings.currencySymbol})`
                      : `Amount (${companySettings.currencySymbol})`}
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

              {/* Entry-Level Automatic GST Computation */}
              <div className="pt-3 border-t border-[#E5E0D5] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#1F1D1A]">
                    GST Tax Computation
                  </span>
                  <span className="text-[11px] text-[#6B655C]">
                    {entryGstRate > 0
                      ? entryGstMode === 'excluding'
                        ? 'Tax auto-appended to entry total'
                        : 'Tax extracted from entry total'
                      : 'No GST applied (0%)'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1 p-1 bg-[#F2EFE9] border border-[#E5E0D5] rounded-lg">
                    {GST_RATES.map(rate => {
                      const isActive = entryGstRate === rate && entryCustomGstRate === '';
                      return (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => {
                            setEntryCustomGstRate('');
                            setEntryGstRate(rate);
                          }}
                          className={`px-2.5 py-1 text-xs font-mono tabular-nums rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                            isActive
                              ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                              : 'text-[#6B655C] hover:text-[#1F1D1A]'
                          }`}
                        >
                          {rate}%
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative w-24">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      aria-label="Custom entry GST percentage"
                      placeholder="Custom"
                      value={entryCustomGstRate}
                      onChange={e => {
                        const val = e.target.value;
                        setEntryCustomGstRate(val);
                        const parsed = parseFloat(val);
                        if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 100) {
                          setEntryGstRate(Math.round(parsed * 100) / 100);
                        } else if (val === '') {
                          setEntryGstRate(0);
                        }
                      }}
                      className="w-full pl-2.5 pr-6 py-1.5 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-xs font-mono tabular-nums text-[#1F1D1A] placeholder:text-[#968E82] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#6B655C]">
                      %
                    </span>
                  </div>
                </div>

                {entryGstRate > 0 && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        aria-label="Entry GST calculation mode"
                        value={entryGstMode}
                        onChange={e => setEntryGstMode(e.target.value as GstTaxMode)}
                        className="w-full px-3 py-1.5 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-xs text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                      >
                        <option value="excluding">Add GST on top (Exclusive)</option>
                        <option value="including">Amount includes GST (Inclusive)</option>
                      </select>

                      <select
                        aria-label="Entry GST supply type"
                        value={entrySupplyType}
                        onChange={e => setEntrySupplyType(e.target.value as GstSupplyType)}
                        className="w-full px-3 py-1.5 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-xs text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                      >
                        <option value="intra">Intra-State (CGST + SGST)</option>
                        <option value="inter">Inter-State (IGST)</option>
                      </select>
                    </div>

                    <div className="bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg px-3.5 py-2.5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[#6B655C]">
                        <span>Taxable Value</span>
                        <span className="font-mono tabular-nums text-[#1F1D1A]">
                          {formatMoney(entryGstCalc.taxableAmount)}
                        </span>
                      </div>
                      {entrySupplyType === 'inter' ? (
                        <div className="flex items-center justify-between text-[#6B655C]">
                          <span>IGST ({entryGstRate}%)</span>
                          <span className="font-mono tabular-nums text-[#1B4D3E]">
                            +{formatMoney(entryGstCalc.igstAmount)}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-[#6B655C]">
                            <span>CGST ({Math.round((entryGstRate / 2) * 100) / 100}%)</span>
                            <span className="font-mono tabular-nums text-[#1B4D3E]">
                              +{formatMoney(entryGstCalc.cgstAmount)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[#6B655C]">
                            <span>SGST ({Math.round((entryGstRate / 2) * 100) / 100}%)</span>
                            <span className="font-mono tabular-nums text-[#1B4D3E]">
                              +{formatMoney(entryGstCalc.sgstAmount)}
                            </span>
                          </div>
                        </>
                      )}
                      <div className="pt-1.5 border-t border-[#E5E0D5] flex items-center justify-between font-semibold text-[#1F1D1A]">
                        <span>Final Entry Total</span>
                        <span className="font-mono tabular-nums text-sm text-[#1B4D3E]">
                          {formatMoney(entryGstCalc.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-3 border-t border-[#E5E0D5] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTxId(null);
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
                  {editingTxId ? 'Update Voucher' : 'Save Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* CSV Bulk Import Modal */}
      <CsvImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        kind={kind}
        title={title}
      />
    </div>
  );
};

export default LedgerPage;

