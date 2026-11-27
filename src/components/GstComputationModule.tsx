import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import {
  computeGstFromLedger,
  downloadGstr1Json,
  downloadGstr3bJson,
  downloadGstr1Csv,
  downloadGstr3bCsv,
  downloadGstStatementPdf,
  GST_RATES,
  INDIAN_STATE_CODES,
  getStateLabel,
  GstProfile,
  GstVoucherOverride,
  GstSupplyClass,
  GstSupplyType,
} from '../utils/gstComputation';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  SlidersHorizontal,
  Check,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

const PROFILE_STORAGE_KEY = 'tunzua_gst_profile_v1';
const OVERRIDES_STORAGE_KEY = 'tunzua_gst_overrides_v1';

type GstSubTab = 'gstr3b' | 'gstr1' | 'itc' | 'hsn';
type PeriodPreset = 'all' | 'this_month' | 'last_month' | 'q1' | 'custom';

const getMonthBounds = (offsetMonths: number) => {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const year = target.getFullYear();
  const month = target.getMonth();
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const fp = `${String(month + 1).padStart(2, '0')}${year}`;
  const label = target.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return { from, to, fp, label };
};

export const GstComputationModule: React.FC = () => {
  const { db, companySettings, formatMoney, addLedgerTransaction, triggerSync } = useStore();

  const [profile, setProfile] = useState<GstProfile>(() => {
    try {
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (saved) return JSON.parse(saved) as GstProfile;
    } catch {
      // ignore storage errors
    }
    return {
      gstin: '27AABCT1332L1Z5',
      legalName: companySettings.name || 'Tunzua',
      stateCode: '27',
      defaultRate: 18,
      defaultSupplyType: 'intra',
      priceBasis: 'exclusive',
      includeTaxableExpenses: false,
    };
  });

  const [overrides, setOverrides] = useState<Record<string, GstVoucherOverride>>(() => {
    try {
      const saved = localStorage.getItem(OVERRIDES_STORAGE_KEY);
      if (saved) return JSON.parse(saved) as Record<string, GstVoucherOverride>;
    } catch {
      // ignore storage errors
    }
    return {};
  });

  const [subTab, setSubTab] = useState<GstSubTab>('gstr3b');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('all');
  const [customFrom, setCustomFrom] = useState('2026-04-01');
  const [customTo, setCustomTo] = useState('2026-06-30');
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [confirmChallan, setConfirmChallan] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
    } catch {
      // ignore
    }
  }, [overrides]);

  const activePeriod = useMemo(() => {
    if (periodPreset === 'this_month') {
      return getMonthBounds(0);
    }
    if (periodPreset === 'last_month') {
      return getMonthBounds(-1);
    }
    if (periodPreset === 'q1') {
      return { from: '2026-04-01', to: '2026-06-30', fp: '062026', label: 'Q1 FY 2026-27' };
    }
    if (periodPreset === 'custom') {
      const parts = (customTo || new Date().toISOString().split('T')[0]).split('-');
      const fp = parts.length === 3 ? `${parts[1]}${parts[0]}` : '062026';
      return {
        from: customFrom || undefined,
        to: customTo || undefined,
        fp,
        label: `${customFrom || 'Start'} to ${customTo || 'End'}`,
      };
    }
    const now = new Date();
    const fp = `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
    return { from: undefined, to: undefined, fp, label: 'All Ledger Dates' };
  }, [periodPreset, customFrom, customTo]);

  const effectiveProfile = useMemo<GstProfile>(
    () => ({
      ...profile,
      legalName: profile.legalName.trim() || companySettings.name || 'Tunzua',
    }),
    [profile, companySettings.name]
  );

  const summary = useMemo(
    () =>
      computeGstFromLedger(db.ledger, effectiveProfile, overrides, {
        from: activePeriod.from,
        to: activePeriod.to,
      }),
    [db.ledger, effectiveProfile, overrides, activePeriod.from, activePeriod.to]
  );

  const updateVoucherOverride = (id: string, patch: Partial<GstVoucherOverride>) => {
    setOverrides(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        ...patch,
      },
    }));
  };

  const resetAllOverrides = () => {
    setOverrides({});
    toast.success('Reset voucher-level GST overrides to filing defaults.');
  };

  const handleRecordGstChallan = () => {
    if (summary.netCashPayable <= 0) {
      toast.info('Net cash GST payable is 0. No challan payment is required.');
      setConfirmChallan(false);
      return;
    }
    const res = addLedgerTransaction({
      id: `gst-pmt-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description: `GST PMT-06 Cash Challan Settlement (${activePeriod.label})`,
      type: 'tax_payment',
      debitAccount: 'GST Payable Control Account',
      creditAccount: 'Corporate Bank Account',
      amount: summary.netCashPayable,
      reference: `PMT06-${activePeriod.fp}`,
      isBankCleared: true,
    });
    if (!res.ok) {
      toast.error(res.error || 'A challan entry with this reference already exists.');
      setConfirmChallan(false);
      return;
    }
    triggerSync();
    setConfirmChallan(false);
    toast.success(`Recorded GST payment of ${formatMoney(summary.netCashPayable)} in ledger.`);
  };

  const overrideCount = Object.keys(overrides).length;

  return (
    <div className="space-y-6">
      {/* Top Section Header + Period Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E5E0D5]">
        <div>
          <h2 className="font-display text-xl font-semibold text-[#1F1D1A]">
            GST Computation & Portal Return Summary
          </h2>
          <p className="text-xs text-[#6B655C] mt-1">
            GSTIN <span className="font-mono text-[#1F1D1A]">{effectiveProfile.gstin || 'Not Set'}</span>
            {' · '}
            {getStateLabel(effectiveProfile.stateCode)}
            {' · '}
            Default {effectiveProfile.defaultRate}% ({effectiveProfile.priceBasis === 'inclusive' ? 'Tax Inclusive' : 'Tax Exclusive'})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <div className="flex items-center gap-1 p-1 bg-[#F2EFE9] border border-[#E5E0D5] rounded-lg">
            {[
              { id: 'all', label: 'All Dates' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'q1', label: 'Q1 FY26-27' },
              { id: 'custom', label: 'Custom' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodPreset(p.id as PeriodPreset)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  periodPreset === p.id
                    ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                    : 'text-[#6B655C] hover:text-[#1F1D1A]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowProfilePanel(prev => !prev)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              showProfilePanel
                ? 'bg-[#EBF3F0] border-[#C7DFD6] text-[#1B4D3E] font-semibold'
                : 'bg-[#F8F6F1] border-[#E5E0D5] text-[#1F1D1A] hover:bg-[#F2EFE9]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filing Rules
          </button>
        </div>
      </div>

      {/* Custom Date Inputs */}
      {periodPreset === 'custom' && (
        <div className="flex flex-wrap items-end gap-3 p-4 bg-[#F8F6F1] border border-[#E5E0D5] rounded-xl no-print">
          <div>
            <label htmlFor="gst-from" className="block text-xs font-medium text-[#6B655C] mb-1">
              From Date
            </label>
            <input
              id="gst-from"
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="px-3 py-1.5 bg-[#FFFDF9] border border-[#E5E0D5] rounded-lg text-xs font-mono tabular-nums text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
            />
          </div>
          <div>
            <label htmlFor="gst-to" className="block text-xs font-medium text-[#6B655C] mb-1">
              To Date
            </label>
            <input
              id="gst-to"
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="px-3 py-1.5 bg-[#FFFDF9] border border-[#E5E0D5] rounded-lg text-xs font-mono tabular-nums text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
            />
          </div>
          <span className="text-xs text-[#6B655C] pb-1.5">
            Return Period Code: <strong className="font-mono text-[#1F1D1A]">{activePeriod.fp}</strong>
          </span>
        </div>
      )}

      {/* Collapsible GST Filing Profile Settings */}
      {showProfilePanel && (
        <div className="p-5 bg-[#F8F6F1] border border-[#E5E0D5] rounded-xl space-y-4 no-print">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[#1F1D1A]">GST Taxpayer & Computation Settings</h3>
              <p className="text-xs text-[#6B655C]">
                Applied to ledger entries that do not carry an explicit GST metadata tag or row override.
              </p>
            </div>
            {overrideCount > 0 && (
              <button
                type="button"
                onClick={resetAllOverrides}
                className="px-3 py-1.5 text-xs font-medium text-[#6B655C] hover:text-[#B91C1C] bg-[#FFFDF9] border border-[#E5E0D5] rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset {overrideCount} Row Override{overrideCount > 1 ? 's' : ''}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="gstin-input" className="block text-xs font-medium text-[#6B655C] mb-1">
                Taxpayer GSTIN
              </label>
              <input
                id="gstin-input"
                type="text"
                maxLength={15}
                value={profile.gstin}
                onChange={e => setProfile(p => ({ ...p, gstin: e.target.value.toUpperCase() }))}
                placeholder="27AABCT1332L1Z5"
                className="w-full px-3 py-2 bg-[#FFFDF9] border border-[#E5E0D5] rounded-lg text-xs font-mono text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
              />
            </div>

            <div>
              <label htmlFor="gst-state-select" className="block text-xs font-medium text-[#6B655C] mb-1">
                Home State (Place of Supply)
              </label>
              <select
                id="gst-state-select"
                value={profile.stateCode}
                onChange={e => setProfile(p => ({ ...p, stateCode: e.target.value }))}
                className="w-full px-3 py-2 bg-[#FFFDF9] border border-[#E5E0D5] rounded-lg text-xs text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
              >
                {INDIAN_STATE_CODES.map(s => (
                  <option key={s.code} value={s.code}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="gst-rate-select" className="block text-xs font-medium text-[#6B655C] mb-1">
                Default GST Slab
              </label>
              <select
                id="gst-rate-select"
                value={profile.defaultRate}
                onChange={e => setProfile(p => ({ ...p, defaultRate: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-[#FFFDF9] border border-[#E5E0D5] rounded-lg text-xs font-mono text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
              >
                {GST_RATES.map(r => (
                  <option key={r} value={r}>
                    {r}% GST
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="gst-basis-select" className="block text-xs font-medium text-[#6B655C] mb-1">
                Ledger Amount Basis
              </label>
              <select
                id="gst-basis-select"
                value={profile.priceBasis}
                onChange={e =>
                  setProfile(p => ({ ...p, priceBasis: e.target.value as 'exclusive' | 'inclusive' }))
                }
                className="w-full px-3 py-2 bg-[#FFFDF9] border border-[#E5E0D5] rounded-lg text-xs text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
              >
                <option value="exclusive">Tax Exclusive (Amount + GST)</option>
                <option value="inclusive">Tax Inclusive (Back-Calculated)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#E5E0D5]">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-[#6B655C]">
                <span>Default Supply Type:</span>
                <div className="inline-flex p-0.5 bg-[#F2EFE9] border border-[#E5E0D5] rounded-md">
                  <button
                    type="button"
                    onClick={() => setProfile(p => ({ ...p, defaultSupplyType: 'intra' }))}
                    className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                      profile.defaultSupplyType === 'intra'
                        ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold'
                        : 'text-[#6B655C]'
                    }`}
                  >
                    Intra-State (CGST+SGST)
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfile(p => ({ ...p, defaultSupplyType: 'inter' }))}
                    className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                      profile.defaultSupplyType === 'inter'
                        ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold'
                        : 'text-[#6B655C]'
                    }`}
                  >
                    Inter-State (IGST)
                  </button>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-[#1F1D1A] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={profile.includeTaxableExpenses}
                  onChange={e =>
                    setProfile(p => ({ ...p, includeTaxableExpenses: e.target.checked }))
                  }
                  className="w-4 h-4 accent-[#1B4D3E] rounded cursor-pointer"
                />
                <span>Include operating expense vouchers in Inward ITC Register</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 4-Column Tax Summary Strip (flat hairline dividers, tabular-nums) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-[#E5E0D5] rounded-xl bg-[#F8F6F1]/55 divide-y sm:divide-y-0 sm:divide-x divide-[#E5E0D5]">
        <div className="p-4">
          <div className="text-xs text-[#6B655C]">Output GST (Table 3.1)</div>
          <div className="mt-1.5 font-mono tabular-nums text-xl font-semibold text-[#1F1D1A]">
            {formatMoney(summary.totalOutputGst)}
          </div>
          <div className="text-xs text-[#968E82] mt-1 font-mono tabular-nums">
            {summary.outwardRows.length} outward voucher{summary.outwardRows.length === 1 ? '' : 's'} · Taxable {formatMoney(summary.outwardTaxable.taxableValue)}
          </div>
        </div>

        <div className="p-4">
          <div className="text-xs text-[#6B655C]">Eligible ITC (Table 4A)</div>
          <div className="mt-1.5 font-mono tabular-nums text-xl font-semibold text-[#157347]">
            {formatMoney(summary.totalEligibleItc)}
          </div>
          <div className="text-xs text-[#968E82] mt-1 font-mono tabular-nums">
            {summary.inwardRows.filter(r => r.itcEligible).length} eligible bill{summary.inwardRows.filter(r => r.itcEligible).length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="p-4">
          <div className="text-xs text-[#6B655C]">Net Cash GST Payable</div>
          <div
            className={`mt-1.5 font-mono tabular-nums text-xl font-semibold ${
              summary.netCashPayable > 0 ? 'text-[#B91C1C]' : 'text-[#157347]'
            }`}
          >
            {formatMoney(summary.netCashPayable)}
          </div>
          <div className="text-xs text-[#968E82] mt-1">
            {summary.netCashPayable > 0 ? 'Due via PMT-06 challan' : 'Fully offset by ITC'}
          </div>
        </div>

        <div className="p-4">
          <div className="text-xs text-[#6B655C]">ITC Carry Forward</div>
          <div className="mt-1.5 font-mono tabular-nums text-xl font-semibold text-[#1B4D3E]">
            {formatMoney(summary.totalItcCarryForward)}
          </div>
          <div className="text-xs text-[#968E82] mt-1">
            Closing credit ledger balance
          </div>
        </div>
      </div>

      {/* GST Portal Export Bar */}
      <div className="p-4 bg-[#F8F6F1] border border-[#E5E0D5] rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-3 no-print">
        <div>
          <div className="text-xs font-semibold text-[#1F1D1A]">GST Portal Export Formats</div>
          <div className="text-xs text-[#6B655C] mt-0.5">
            Download GSTN Offline Utility JSON files, B2B/GSTR-3B spreadsheets, or an audit-ready PDF statement.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              downloadGstr1Json(summary, effectiveProfile, activePeriod.fp);
              toast.success('GSTR-1 portal JSON downloaded.');
            }}
            className="px-3 py-1.5 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <FileJson className="w-3.5 h-3.5" />
            GSTR-1 JSON
          </button>

          <button
            type="button"
            onClick={() => {
              downloadGstr3bJson(summary, effectiveProfile, activePeriod.fp);
              toast.success('GSTR-3B portal JSON downloaded.');
            }}
            className="px-3 py-1.5 bg-[#FFFDF9] hover:bg-[#EBF3F0] text-[#1B4D3E] border border-[#C7DFD6] text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <FileJson className="w-3.5 h-3.5" />
            GSTR-3B JSON
          </button>

          <button
            type="button"
            onClick={() => {
              downloadGstr1Csv(summary, effectiveProfile, activePeriod.label);
              toast.success('GSTR-1 outward CSV downloaded.');
            }}
            className="px-3 py-1.5 bg-[#FFFDF9] hover:bg-[#F2EFE9] text-[#1F1D1A] border border-[#E5E0D5] text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#6B655C]" />
            GSTR-1 CSV
          </button>

          <button
            type="button"
            onClick={() => {
              downloadGstr3bCsv(summary, effectiveProfile, activePeriod.label);
              toast.success('GSTR-3B summary CSV downloaded.');
            }}
            className="px-3 py-1.5 bg-[#FFFDF9] hover:bg-[#F2EFE9] text-[#1F1D1A] border border-[#E5E0D5] text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#6B655C]" />
            GSTR-3B CSV
          </button>

          <button
            type="button"
            onClick={() => {
              downloadGstStatementPdf(
                summary,
                effectiveProfile,
                activePeriod.label,
                companySettings.currencySymbol || '$'
              );
              toast.success('GST filing statement PDF downloaded.');
            }}
            className="px-3 py-1.5 bg-[#FFFDF9] hover:bg-[#F2EFE9] text-[#1F1D1A] border border-[#E5E0D5] text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-[#6B655C]" />
            Filing PDF
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E0D5] pb-3 no-print">
        <div className="flex flex-wrap gap-1 p-1 bg-[#F2EFE9] border border-[#E5E0D5] rounded-lg">
          {[
            { id: 'gstr3b', label: 'GSTR-3B Summary' },
            { id: 'gstr1', label: `GSTR-1 Outward (${summary.outwardRows.length})` },
            { id: 'itc', label: `Inward ITC (${summary.inwardRows.length})` },
            { id: 'hsn', label: `HSN & Rate Slabs (${summary.hsnRows.length})` },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as GstSubTab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                subTab === t.id
                  ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                  : 'text-[#6B655C] hover:text-[#1F1D1A]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {summary.netCashPayable > 0 && !confirmChallan && (
          <button
            type="button"
            onClick={() => setConfirmChallan(true)}
            className="px-3 py-1.5 text-xs font-medium text-[#1B4D3E] bg-[#EBF3F0] hover:bg-[#1B4D3E] hover:text-[#FFFDF9] border border-[#C7DFD6] rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" />
            Record GST Payment ({formatMoney(summary.netCashPayable)})
          </button>
        )}
      </div>

      {confirmChallan && (
        <div className="p-4 bg-[#FFFBF2] border border-[#E7C98B] rounded-xl flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="text-xs text-[#6B655C]">
            Post a <strong className="text-[#1F1D1A]">GST PMT-06 payment voucher</strong> of{' '}
            <strong className="font-mono text-[#1F1D1A]">{formatMoney(summary.netCashPayable)}</strong>{' '}
            (Dr GST Payable Control Account / Cr Corporate Bank Account) to your ledger?
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmChallan(false)}
              className="px-3 py-1.5 bg-[#FFFDF9] border border-[#E5E0D5] text-xs font-medium text-[#1F1D1A] rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRecordGstChallan}
              className="px-3.5 py-1.5 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Post to Ledger
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: GSTR-3B SUMMARY */}
      {subTab === 'gstr3b' && (
        <div className="space-y-6">
          {/* Table 3.1 & Table 4 */}
          <div className="border border-[#E5E0D5] rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#F8F6F1] border-b border-[#E5E0D5] flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#1F1D1A]">
                Table 3.1 & Table 4 — Outward Supplies & Input Tax Credit
              </h3>
              <span className="text-xs font-mono text-[#6B655C]">{activePeriod.label}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E5E0D5] bg-[#F8F6F1]/60 text-xs font-medium text-[#6B655C]">
                    <th className="py-2.5 px-4">Return Section</th>
                    <th className="py-2.5 px-4 text-right">Taxable Value</th>
                    <th className="py-2.5 px-4 text-right">IGST</th>
                    <th className="py-2.5 px-4 text-right">CGST</th>
                    <th className="py-2.5 px-4 text-right">SGST / UTGST</th>
                    <th className="py-2.5 px-4 text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0D5] text-xs">
                  <tr className="hover:bg-[#F8F6F1]/50">
                    <td className="py-3 px-4 font-medium text-[#1F1D1A]">
                      3.1(a) Outward Taxable Supplies
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#1F1D1A]">
                      {formatMoney(summary.outwardTaxable.taxableValue)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#1F1D1A]">
                      {formatMoney(summary.outwardTaxable.igst)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#1F1D1A]">
                      {formatMoney(summary.outwardTaxable.cgst)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#1F1D1A]">
                      {formatMoney(summary.outwardTaxable.sgst)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#1F1D1A]">
                      {formatMoney(summary.outwardTaxable.totalTax)}
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F8F6F1]/50">
                    <td className="py-3 px-4 text-[#6B655C]">
                      3.1(c) Nil Rated / Exempt Outward Supplies
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#6B655C]">
                      {formatMoney(summary.outwardExempt.taxableValue)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#968E82]">
                      {formatMoney(0)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#968E82]">
                      {formatMoney(0)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#968E82]">
                      {formatMoney(0)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#968E82]">
                      {formatMoney(0)}
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F8F6F1]/50">
                    <td className="py-3 px-4 font-medium text-[#157347]">
                      4(A) Eligible Input Tax Credit (ITC)
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#1F1D1A]">
                      {formatMoney(summary.inwardEligibleItc.taxableValue)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#157347]">
                      {formatMoney(summary.inwardEligibleItc.igst)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#157347]">
                      {formatMoney(summary.inwardEligibleItc.cgst)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#157347]">
                      {formatMoney(summary.inwardEligibleItc.sgst)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#157347]">
                      {formatMoney(summary.inwardEligibleItc.totalTax)}
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F8F6F1]/50">
                    <td className="py-3 px-4 text-[#6B655C]">
                      4(D) Ineligible / Blocked ITC
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#6B655C]">
                      {formatMoney(summary.inwardIneligibleItc.taxableValue)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#968E82]">
                      {formatMoney(summary.inwardIneligibleItc.igst)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#968E82]">
                      {formatMoney(summary.inwardIneligibleItc.cgst)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#968E82]">
                      {formatMoney(summary.inwardIneligibleItc.sgst)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#968E82]">
                      {formatMoney(summary.inwardIneligibleItc.totalTax)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 6.1 ITC Set-Off & Cash Liability */}
          <div className="border border-[#E5E0D5] rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#F8F6F1] border-b border-[#E5E0D5]">
              <h3 className="text-sm font-semibold text-[#1F1D1A]">
                Table 6.1 — Payment of Tax & Electronic Credit Ledger Set-Off
              </h3>
              <p className="text-xs text-[#6B655C] mt-0.5">
                Follows GSTN Section 49 offset order: IGST credit exhausts first (IGST → CGST → SGST), followed by CGST and SGST credits.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E5E0D5] bg-[#F8F6F1]/60 text-xs font-medium text-[#6B655C]">
                    <th className="py-2.5 px-4">Tax Head</th>
                    <th className="py-2.5 px-4 text-right">Output Liability</th>
                    <th className="py-2.5 px-4 text-right">Paid via IGST</th>
                    <th className="py-2.5 px-4 text-right">Paid via CGST</th>
                    <th className="py-2.5 px-4 text-right">Paid via SGST</th>
                    <th className="py-2.5 px-4 text-right">Cash Payable</th>
                    <th className="py-2.5 px-4 text-right">ITC Carry Forward</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0D5] text-xs">
                  {summary.setOffRows.map(row => (
                    <tr key={row.head} className="hover:bg-[#F8F6F1]/50">
                      <td className="py-3 px-4 font-semibold text-[#1F1D1A]">{row.head}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#1F1D1A]">
                        {formatMoney(row.outputLiability)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#157347]">
                        {formatMoney(row.paidViaIgst)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#157347]">
                        {formatMoney(row.paidViaCgst)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#157347]">
                        {formatMoney(row.paidViaSgst)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                          row.cashPayable > 0 ? 'text-[#B91C1C]' : 'text-[#157347]'
                        }`}
                      >
                        {formatMoney(row.cashPayable)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#1B4D3E]">
                        {formatMoney(row.itcCarryForward)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#F8F6F1] font-semibold">
                    <td className="py-3 px-4 text-[#1F1D1A]">Total</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#1F1D1A]">
                      {formatMoney(summary.totalOutputGst)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#157347]">
                      {formatMoney(summary.setOffRows.reduce((s, r) => s + r.paidViaIgst, 0))}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#157347]">
                      {formatMoney(summary.setOffRows.reduce((s, r) => s + r.paidViaCgst, 0))}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#157347]">
                      {formatMoney(summary.setOffRows.reduce((s, r) => s + r.paidViaSgst, 0))}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono tabular-nums ${
                        summary.netCashPayable > 0 ? 'text-[#B91C1C]' : 'text-[#157347]'
                      }`}
                    >
                      {formatMoney(summary.netCashPayable)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#1B4D3E]">
                      {formatMoney(summary.totalItcCarryForward)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GSTR-1 OUTWARD SUPPLIES REGISTER */}
      {subTab === 'gstr1' && (
        <div className="border border-[#E5E0D5] rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-[#F8F6F1] border-b border-[#E5E0D5] flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[#1F1D1A]">
                GSTR-1 Outward Invoices ({summary.outwardRows.length})
              </h3>
              <p className="text-xs text-[#6B655C]">
                Pulled from Sales ledger entries. Adjust Class, GSTIN, HSN, Supply Type, or Rate inline before exporting to GSTN.
              </p>
            </div>
          </div>

          {summary.outwardRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E5E0D5] bg-[#F8F6F1]/60 font-medium text-[#6B655C]">
                    <th className="py-2.5 px-3">Date & Ref</th>
                    <th className="py-2.5 px-3">Customer / Narration</th>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3">Recipient GSTIN</th>
                    <th className="py-2.5 px-3">HSN/SAC</th>
                    <th className="py-2.5 px-3">Supply</th>
                    <th className="py-2.5 px-3">Rate</th>
                    <th className="py-2.5 px-3 text-right">Taxable</th>
                    <th className="py-2.5 px-3 text-right">Tax (I/C/S)</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0D5]">
                  {summary.outwardRows.map(row => (
                    <tr key={row.id} className="hover:bg-[#F8F6F1]/50">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-mono tabular-nums text-[#1F1D1A]">{row.date}</div>
                        <div className="font-mono text-[11px] text-[#968E82]">{row.reference}</div>
                      </td>
                      <td className="py-2.5 px-3 max-w-[200px]">
                        <div className="font-medium text-[#1F1D1A] truncate" title={row.partyName}>
                          {row.partyName}
                        </div>
                        <div className="text-[11px] text-[#6B655C] truncate" title={row.description}>
                          {row.description}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          aria-label={`Supply class for ${row.reference}`}
                          value={row.supplyClass}
                          onChange={e =>
                            updateVoucherOverride(row.id, {
                              supplyClass: e.target.value as GstSupplyClass,
                              rate: e.target.value === 'EXEMPT' ? 0 : row.rate || effectiveProfile.defaultRate,
                            })
                          }
                          className="px-2 py-1 bg-[#F8F6F1] border border-[#E5E0D5] rounded text-xs font-mono text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
                        >
                          <option value="B2B">B2B</option>
                          <option value="B2C">B2C</option>
                          <option value="EXEMPT">EXEMPT</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          maxLength={15}
                          value={row.partyGstin}
                          onChange={e => {
                            const val = e.target.value.toUpperCase();
                            updateVoucherOverride(row.id, {
                              partyGstin: val,
                              supplyClass: val.length >= 15 ? 'B2B' : row.supplyClass,
                            });
                          }}
                          placeholder="Optional GSTIN"
                          className="w-32 px-2 py-1 bg-[#F8F6F1] border border-[#E5E0D5] rounded text-[11px] font-mono text-[#1F1D1A] placeholder:text-[#968E82] focus:outline-none focus:border-[#1B4D3E]"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          maxLength={8}
                          value={row.hsnCode}
                          onChange={e => updateVoucherOverride(row.id, { hsnCode: e.target.value })}
                          className="w-20 px-2 py-1 bg-[#F8F6F1] border border-[#E5E0D5] rounded text-[11px] font-mono text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          aria-label={`Supply type for ${row.reference}`}
                          value={row.supplyType}
                          onChange={e =>
                            updateVoucherOverride(row.id, { supplyType: e.target.value as GstSupplyType })
                          }
                          className="px-2 py-1 bg-[#F8F6F1] border border-[#E5E0D5] rounded text-xs text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
                        >
                          <option value="intra">Intra</option>
                          <option value="inter">Inter</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          aria-label={`GST rate for ${row.reference}`}
                          value={row.rate}
                          onChange={e =>
                            updateVoucherOverride(row.id, {
                              rate: Number(e.target.value),
                              supplyClass: Number(e.target.value) === 0 ? 'EXEMPT' : row.supplyClass === 'EXEMPT' ? 'B2C' : row.supplyClass,
                            })
                          }
                          className="px-2 py-1 bg-[#F8F6F1] border border-[#E5E0D5] rounded text-xs font-mono text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
                        >
                          {GST_RATES.map(r => (
                            <option key={r} value={r}>
                              {r}%
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#1F1D1A] whitespace-nowrap">
                        {formatMoney(row.taxableValue)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                        <div className="text-[#1F1D1A] font-medium">{formatMoney(row.totalTax)}</div>
                        <div className="text-[10.5px] text-[#968E82]">
                          {row.supplyType === 'inter'
                            ? `IGST ${formatMoney(row.igst)}`
                            : `C ${formatMoney(row.cgst)} · S ${formatMoney(row.sgst)}`}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-[#1F1D1A] whitespace-nowrap">
                        {formatMoney(row.invoiceValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center text-sm text-[#6B655C]">
              No sales or outward supply entries found for <span className="font-medium text-[#1F1D1A]">{activePeriod.label}</span>. Switch to <span className="font-medium text-[#1F1D1A]">All Dates</span> or record a sale via Quick Entry.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INWARD ITC REGISTER */}
      {subTab === 'itc' && (
        <div className="border border-[#E5E0D5] rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-[#F8F6F1] border-b border-[#E5E0D5] flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[#1F1D1A]">
                Inward Supplies & Input Tax Credit Register ({summary.inwardRows.length})
              </h3>
              <p className="text-xs text-[#6B655C]">
                Pulled from Purchase vouchers{effectiveProfile.includeTaxableExpenses ? ' and operating expenses' : ''}. Mark blocked credits as Ineligible to match GSTR-3B Table 4(D).
              </p>
            </div>
          </div>

          {summary.inwardRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E5E0D5] bg-[#F8F6F1]/60 font-medium text-[#6B655C]">
                    <th className="py-2.5 px-3">Date & Bill Ref</th>
                    <th className="py-2.5 px-3">Vendor / Description</th>
                    <th className="py-2.5 px-3">Supplier GSTIN</th>
                    <th className="py-2.5 px-3">Supply</th>
                    <th className="py-2.5 px-3">Rate</th>
                    <th className="py-2.5 px-3">ITC Status</th>
                    <th className="py-2.5 px-3 text-right">Taxable</th>
                    <th className="py-2.5 px-3 text-right">ITC Amount</th>
                    <th className="py-2.5 px-3 text-right">Bill Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0D5]">
                  {summary.inwardRows.map(row => (
                    <tr key={row.id} className="hover:bg-[#F8F6F1]/50">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-mono tabular-nums text-[#1F1D1A]">{row.date}</div>
                        <div className="font-mono text-[11px] text-[#968E82]">{row.reference}</div>
                      </td>
                      <td className="py-2.5 px-3 max-w-[210px]">
                        <div className="font-medium text-[#1F1D1A] truncate" title={row.partyName}>
                          {row.partyName}
                        </div>
                        <div className="text-[11px] text-[#6B655C] truncate" title={row.description}>
                          {row.description}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          maxLength={15}
                          value={row.partyGstin}
                          onChange={e =>
                            updateVoucherOverride(row.id, { partyGstin: e.target.value.toUpperCase() })
                          }
                          placeholder="Supplier GSTIN"
                          className="w-32 px-2 py-1 bg-[#F8F6F1] border border-[#E5E0D5] rounded text-[11px] font-mono text-[#1F1D1A] placeholder:text-[#968E82] focus:outline-none focus:border-[#1B4D3E]"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          aria-label={`Inward supply type for ${row.reference}`}
                          value={row.supplyType}
                          onChange={e =>
                            updateVoucherOverride(row.id, { supplyType: e.target.value as GstSupplyType })
                          }
                          className="px-2 py-1 bg-[#F8F6F1] border border-[#E5E0D5] rounded text-xs text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
                        >
                          <option value="intra">Intra</option>
                          <option value="inter">Inter</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          aria-label={`Inward GST rate for ${row.reference}`}
                          value={row.rate}
                          onChange={e => updateVoucherOverride(row.id, { rate: Number(e.target.value) })}
                          className="px-2 py-1 bg-[#F8F6F1] border border-[#E5E0D5] rounded text-xs font-mono text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
                        >
                          {GST_RATES.map(r => (
                            <option key={r} value={r}>
                              {r}%
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() =>
                            updateVoucherOverride(row.id, { itcEligible: !row.itcEligible })
                          }
                          className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                            row.itcEligible
                              ? 'bg-[#EBF3F0] border-[#C7DFD6] text-[#157347]'
                              : 'bg-[#F8F6F1] border-[#E5E0D5] text-[#B45309]'
                          }`}
                        >
                          {row.itcEligible ? 'Eligible' : 'Blocked'}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#1F1D1A] whitespace-nowrap">
                        {formatMoney(row.taxableValue)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap ${
                          row.itcEligible ? 'text-[#157347] font-medium' : 'text-[#968E82] line-through'
                        }`}
                      >
                        <div>{formatMoney(row.totalTax)}</div>
                        <div className="text-[10.5px] text-[#968E82] no-underline">
                          {row.supplyType === 'inter'
                            ? `IGST ${formatMoney(row.igst)}`
                            : `C ${formatMoney(row.cgst)} · S ${formatMoney(row.sgst)}`}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-[#1F1D1A] whitespace-nowrap">
                        {formatMoney(row.invoiceValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center text-sm text-[#6B655C]">
              No purchase vouchers found for <span className="font-medium text-[#1F1D1A]">{activePeriod.label}</span>.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: HSN & RATE SLAB SUMMARY */}
      {subTab === 'hsn' && (
        <div className="space-y-6">
          {/* Rate Slab Summary */}
          <div className="border border-[#E5E0D5] rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#F8F6F1] border-b border-[#E5E0D5]">
              <h3 className="text-sm font-semibold text-[#1F1D1A]">Tax Rate Slab Breakdown</h3>
            </div>
            {summary.rateSlabs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E0D5] bg-[#F8F6F1]/60 font-medium text-[#6B655C]">
                      <th className="py-2.5 px-4">GST Rate</th>
                      <th className="py-2.5 px-4 text-right">Outward Taxable</th>
                      <th className="py-2.5 px-4 text-right">Outward IGST</th>
                      <th className="py-2.5 px-4 text-right">Outward CGST</th>
                      <th className="py-2.5 px-4 text-right">Outward SGST</th>
                      <th className="py-2.5 px-4 text-right">Inward Taxable</th>
                      <th className="py-2.5 px-4 text-right">Eligible ITC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E0D5]">
                    {summary.rateSlabs.map(slab => (
                      <tr key={slab.rate} className="hover:bg-[#F8F6F1]/50">
                        <td className="py-3 px-4 font-mono font-semibold text-[#1F1D1A]">
                          {slab.rate}%
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#1F1D1A]">
                          {formatMoney(slab.outwardTaxable)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#1F1D1A]">
                          {formatMoney(slab.outwardIgst)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#1F1D1A]">
                          {formatMoney(slab.outwardCgst)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#1F1D1A]">
                          {formatMoney(slab.outwardSgst)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#6B655C]">
                          {formatMoney(slab.inwardTaxable)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-[#157347]">
                          {formatMoney(slab.inwardItc)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-[#6B655C]">
                No rate slabs populated for this period.
              </div>
            )}
          </div>

          {/* Table 12 HSN / SAC Summary */}
          <div className="border border-[#E5E0D5] rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#F8F6F1] border-b border-[#E5E0D5]">
              <h3 className="text-sm font-semibold text-[#1F1D1A]">
                GSTR-1 Table 12 — HSN / SAC-Wise Summary of Outward Supplies
              </h3>
            </div>
            {summary.hsnRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E0D5] bg-[#F8F6F1]/60 font-medium text-[#6B655C]">
                      <th className="py-2.5 px-4">HSN / SAC</th>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-4">UQC</th>
                      <th className="py-2.5 px-4 text-right">Vouchers</th>
                      <th className="py-2.5 px-4 text-right">Taxable Value</th>
                      <th className="py-2.5 px-4 text-right">IGST</th>
                      <th className="py-2.5 px-4 text-right">CGST</th>
                      <th className="py-2.5 px-4 text-right">SGST</th>
                      <th className="py-2.5 px-4 text-right">Total Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E0D5]">
                    {summary.hsnRows.map(h => (
                      <tr key={h.hsnCode} className="hover:bg-[#F8F6F1]/50">
                        <td className="py-3 px-4 font-mono font-semibold text-[#1F1D1A]">
                          {h.hsnCode}
                        </td>
                        <td className="py-3 px-4 text-[#1F1D1A] max-w-[200px] truncate">
                          {h.description}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#6B655C]">{h.uqc}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#6B655C]">
                          {h.voucherCount}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#1F1D1A]">
                          {formatMoney(h.taxableValue)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#1F1D1A]">
                          {formatMoney(h.igst)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#1F1D1A]">
                          {formatMoney(h.cgst)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#1F1D1A]">
                          {formatMoney(h.sgst)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#1F1D1A]">
                          {formatMoney(h.totalValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-[#6B655C]">
                No outward HSN/SAC rows found for this period.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
