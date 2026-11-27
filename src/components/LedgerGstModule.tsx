import React, { useState, useMemo } from 'react';
import { LedgerTransaction, GstTaxMode } from '../types';
import {
  GST_RATES,
  GstSupplyType,
  calculateEntryGst,
  getTransactionGstDetails,
} from '../utils/gstComputation';
import { Calculator, ChevronDown, ChevronUp, Plus, RotateCcw, Check } from 'lucide-react';

interface LedgerGstModuleProps {
  title: string;
  transactions: LedgerTransaction[];
  selectedIds: string[];
  onClearSelection: () => void;
  gstRate: number;
  onGstRateChange: (rate: number) => void;
  gstMode: GstTaxMode;
  onGstModeChange: (mode: GstTaxMode) => void;
  supplyType: GstSupplyType;
  onSupplyTypeChange: (type: GstSupplyType) => void;
  onApplyGst: (targetIds: string[]) => void;
  onRemoveGst: (targetIds: string[]) => void;
  onNewEntryWithGst: () => void;
  formatMoney: (amount: number) => string;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const LedgerGstModule: React.FC<LedgerGstModuleProps> = ({
  title,
  transactions,
  selectedIds,
  onClearSelection,
  gstRate,
  onGstRateChange,
  gstMode,
  onGstModeChange,
  supplyType,
  onSupplyTypeChange,
  onApplyGst,
  onRemoveGst,
  onNewEntryWithGst,
  formatMoney,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [customRateInput, setCustomRateInput] = useState<string>(() =>
    GST_RATES.includes(gstRate) ? '' : String(gstRate)
  );

  const singularTitle = title.replace(/s$/, '');

  const { taxedCount, untaxedEntries, selectedEntries, selectedTaxedIds } = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    let taxed = 0;
    const untaxed: LedgerTransaction[] = [];
    const selected: LedgerTransaction[] = [];
    const selectedTaxed: string[] = [];

    for (const tx of transactions) {
      const details = getTransactionGstDetails(tx);
      if (details) {
        taxed += 1;
        if (selectedSet.has(tx.id)) {
          selectedTaxed.push(tx.id);
        }
      } else {
        untaxed.push(tx);
      }
      if (selectedSet.has(tx.id)) {
        selected.push(tx);
      }
    }

    return {
      taxedCount: taxed,
      untaxedEntries: untaxed,
      selectedEntries: selected,
      selectedTaxedIds: selectedTaxed,
    };
  }, [transactions, selectedIds]);

  const hasSelection = selectedEntries.length > 0;
  const targetEntries = hasSelection ? selectedEntries : untaxedEntries;

  const preview = useMemo(() => {
    let taxableTotal = 0;
    let gstTotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;
    let grandTotal = 0;

    for (const tx of targetEntries) {
      const existing = getTransactionGstDetails(tx);
      // Avoid compounding tax on top of tax: when recalculating an already-taxed row,
      // start from its original taxable value (for exclusive) or current total (for inclusive).
      const baseInput =
        existing && gstMode === 'excluding'
          ? existing.taxableAmount
          : tx.amount;

      const calc = calculateEntryGst(baseInput, gstRate, gstMode, supplyType);
      taxableTotal = round2(taxableTotal + calc.taxableAmount);
      gstTotal = round2(gstTotal + calc.gstAmount);
      cgstTotal = round2(cgstTotal + calc.cgstAmount);
      sgstTotal = round2(sgstTotal + calc.sgstAmount);
      igstTotal = round2(igstTotal + calc.igstAmount);
      grandTotal = round2(grandTotal + calc.totalAmount);
    }

    return {
      taxableTotal,
      gstTotal,
      cgstTotal,
      sgstTotal,
      igstTotal,
      grandTotal,
    };
  }, [targetEntries, gstRate, gstMode, supplyType]);

  const handlePresetRate = (rate: number) => {
    setCustomRateInput('');
    onGstRateChange(rate);
  };

  const handleCustomRateChange = (val: string) => {
    setCustomRateInput(val);
    const parsed = parseFloat(val);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      onGstRateChange(round2(parsed));
    }
  };

  const halfRate = round2(gstRate / 2);
  const canApply = targetEntries.length > 0 && gstRate > 0;

  return (
    <section
      aria-label="GST Computation Module"
      className="bg-[#FFFDF9] rounded-xl border border-[#E5E0D5] overflow-hidden no-print"
    >
      {/* Header Row */}
      <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 bg-[#F8F6F1]/70">
        <div className="flex items-center gap-2.5 min-w-0">
          <Calculator className="w-4 h-4 text-[#1B4D3E] shrink-0" />
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold text-[#1F1D1A] leading-tight">
              GST Computation
            </h2>
            <p className="text-xs text-[#6B655C] mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span className="font-mono tabular-nums text-[#1F1D1A] font-medium">
                {gstRate}% GST
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {supplyType === 'inter'
                  ? `IGST ${gstRate}%`
                  : `CGST ${halfRate}% + SGST ${halfRate}%`}
              </span>
              <span aria-hidden="true">·</span>
              <span>{gstMode === 'excluding' ? 'Add tax on top' : 'Extract from amount'}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {taxedCount} of {transactions.length} taxed
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(prev => !prev)}
          className="px-3 py-1.5 text-xs font-medium text-[#6B655C] hover:text-[#1F1D1A] bg-[#FFFDF9] border border-[#E5E0D5] rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
        >
          {isExpanded ? (
            <>
              Hide
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              Configure
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {isExpanded && (
        <div>
          {/* Configuration Controls */}
          <div className="px-5 py-4 border-t border-[#E5E0D5] flex flex-wrap items-end gap-5">
            {/* Tax Percentage Selector */}
            <div>
              <span className="block text-xs font-medium text-[#6B655C] mb-1.5">
                Tax Percentage
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1 p-1 bg-[#F2EFE9] border border-[#E5E0D5] rounded-lg">
                  {GST_RATES.map(rate => {
                    const isActive = gstRate === rate && customRateInput === '';
                    return (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => handlePresetRate(rate)}
                        className={`px-2.5 py-1 text-xs font-mono tabular-nums rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
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
                    aria-label="Custom GST percentage"
                    placeholder="Custom"
                    value={customRateInput}
                    onChange={e => handleCustomRateChange(e.target.value)}
                    className="w-full pl-2.5 pr-6 py-1.5 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-xs font-mono tabular-nums text-[#1F1D1A] placeholder:text-[#968E82] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#6B655C]">
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* Calculation Mode */}
            <div>
              <span className="block text-xs font-medium text-[#6B655C] mb-1.5">
                Calculation Mode
              </span>
              <div className="inline-flex items-center gap-1 p-1 bg-[#F2EFE9] border border-[#E5E0D5] rounded-lg">
                <button
                  type="button"
                  onClick={() => onGstModeChange('excluding')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    gstMode === 'excluding'
                      ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                      : 'text-[#6B655C] hover:text-[#1F1D1A]'
                  }`}
                >
                  Add GST (Exclusive)
                </button>
                <button
                  type="button"
                  onClick={() => onGstModeChange('including')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    gstMode === 'including'
                      ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                      : 'text-[#6B655C] hover:text-[#1F1D1A]'
                  }`}
                >
                  Includes GST
                </button>
              </div>
            </div>

            {/* Supply Type */}
            <div>
              <span className="block text-xs font-medium text-[#6B655C] mb-1.5">
                Supply Type
              </span>
              <div className="inline-flex items-center gap-1 p-1 bg-[#F2EFE9] border border-[#E5E0D5] rounded-lg">
                <button
                  type="button"
                  onClick={() => onSupplyTypeChange('intra')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    supplyType === 'intra'
                      ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                      : 'text-[#6B655C] hover:text-[#1F1D1A]'
                  }`}
                >
                  Intra-State (CGST + SGST)
                </button>
                <button
                  type="button"
                  onClick={() => onSupplyTypeChange('inter')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    supplyType === 'inter'
                      ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                      : 'text-[#6B655C] hover:text-[#1F1D1A]'
                  }`}
                >
                  Inter-State (IGST)
                </button>
              </div>
            </div>
          </div>

          {/* Live Computation Preview Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-b border-[#E5E0D5] bg-[#F8F6F1]/55 divide-y sm:divide-y-0 sm:divide-x divide-[#E5E0D5]">
            <div className="px-5 py-3.5">
              <div className="text-xs text-[#6B655C]">Target Entries</div>
              <div className="mt-1 font-mono tabular-nums text-base font-semibold text-[#1F1D1A]">
                {targetEntries.length}{' '}
                <span className="font-sans text-xs font-normal text-[#6B655C]">
                  {hasSelection ? 'selected' : 'untaxed'}
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-[#968E82]">
                {hasSelection ? (
                  <button
                    type="button"
                    onClick={onClearSelection}
                    className="text-[#1B4D3E] hover:underline cursor-pointer"
                  >
                    Clear selection
                  </button>
                ) : untaxedEntries.length > 0 ? (
                  'Check rows below to target specific entries'
                ) : (
                  'All visible entries already include GST'
                )}
              </div>
            </div>

            <div className="px-5 py-3.5">
              <div className="text-xs text-[#6B655C]">Taxable Base</div>
              <div className="mt-1 font-mono tabular-nums text-base font-semibold text-[#1F1D1A]">
                {formatMoney(preview.taxableTotal)}
              </div>
              <div className="mt-0.5 text-[11px] text-[#968E82]">
                Pre-tax value of target entries
              </div>
            </div>

            <div className="px-5 py-3.5">
              <div className="text-xs text-[#6B655C]">Computed GST ({gstRate}%)</div>
              <div className="mt-1 font-mono tabular-nums text-base font-semibold text-[#1B4D3E]">
                +{formatMoney(preview.gstTotal)}
              </div>
              <div className="mt-0.5 text-[11px] font-mono tabular-nums text-[#6B655C]">
                {supplyType === 'inter'
                  ? `IGST ${formatMoney(preview.igstTotal)}`
                  : `CGST ${formatMoney(preview.cgstTotal)} · SGST ${formatMoney(preview.sgstTotal)}`}
              </div>
            </div>

            <div className="px-5 py-3.5">
              <div className="text-xs text-[#6B655C]">
                {gstMode === 'excluding' ? 'Projected Total (Base + GST)' : 'Gross Entry Total'}
              </div>
              <div className="mt-1 font-mono tabular-nums text-base font-semibold text-[#1F1D1A]">
                {formatMoney(preview.grandTotal)}
              </div>
              <div className="mt-0.5 text-[11px] text-[#968E82]">
                {gstMode === 'excluding'
                  ? 'Tax amount will be appended to entries'
                  : 'Tax breakdown will be recorded on entries'}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-[#6B655C]">
              {targetEntries.length > 0 && gstRate > 0 ? (
                <>
                  Ready to {gstMode === 'excluding' ? 'calculate and append' : 'extract and tag'}{' '}
                  <span className="font-mono tabular-nums font-semibold text-[#1F1D1A]">
                    {gstRate}% GST ({formatMoney(preview.gstTotal)})
                  </span>{' '}
                  across {targetEntries.length}{' '}
                  {hasSelection ? 'selected' : 'untaxed'}{' '}
                  {targetEntries.length === 1 ? 'entry' : 'entries'}.
                </>
              ) : gstRate <= 0 ? (
                'Select a GST percentage above 0% to calculate and append tax.'
              ) : (
                'Select existing rows in the table to change their GST slab, or create a new entry with GST.'
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedTaxedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => onRemoveGst(selectedTaxedIds)}
                  className="px-3.5 py-2 bg-[#FFFDF9] hover:bg-[#FEF2F2] text-[#B91C1C] border border-[#E5E0D5] hover:border-[#FECACA] text-xs font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Remove GST ({selectedTaxedIds.length})
                </button>
              )}

              <button
                type="button"
                onClick={onNewEntryWithGst}
                className="px-3.5 py-2 bg-[#FFFDF9] hover:bg-[#F2EFE9] text-[#1F1D1A] border border-[#E5E0D5] text-xs font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-[#1B4D3E]" />
                New {singularTitle} with {gstRate}% GST
              </button>

              <button
                type="button"
                disabled={!canApply}
                onClick={() => onApplyGst(targetEntries.map(tx => tx.id))}
                className={`px-4 py-2 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  canApply
                    ? 'bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] cursor-pointer'
                    : 'bg-[#E5E0D5] text-[#968E82] cursor-not-allowed'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                {gstMode === 'excluding' ? 'Append' : 'Apply'} {gstRate}% GST (
                {targetEntries.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
