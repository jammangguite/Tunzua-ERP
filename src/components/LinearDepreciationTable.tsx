import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { DateSearchBar } from './DateSearchBar';
import { Download } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { toast } from 'sonner';
import { exportToCSV } from '../utils/pdfExport';

const parseDate = (dateStr: string): Date => {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
};

const calculateElapsedYears = (purchaseDateStr: string, currentDate: Date): number => {
  const pDate = parseDate(purchaseDateStr);
  const diffMs = currentDate.getTime() - pDate.getTime();
  if (diffMs <= 0) return 0;
  return diffMs / (1000 * 60 * 60 * 24 * 365.25);
};

export const LinearDepreciationTable: React.FC = () => {
  const { db, formatMoney, companySettings } = useStore();
  const currentDate = useMemo(() => new Date(), []);

  const fixedAssets = db.fixedAssets || [];

  const [useSandbox, setUseSandbox] = useState(false);
  const [sandboxCost, setSandboxCost] = useState('15000');
  const [sandboxUsefulLife, setSandboxUsefulLife] = useState('5');
  const [sandboxSalvageValue, setSandboxSalvageValue] = useState('2000');
  const [sandboxName, setSandboxName] = useState('Studio Equipment');
  const [sandboxPurchaseDate, setSandboxPurchaseDate] = useState('2024-01-15');

  const [selectedAssetId, setSelectedAssetId] = useState<string>(fixedAssets[0]?.id || '');

  // Search & Date Range filters for the registered assets comparison table
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const activeAsset = useMemo(() => {
    if (useSandbox) {
      const cost = parseFloat(sandboxCost) || 0;
      const usefulLife = Math.max(1, parseInt(sandboxUsefulLife) || 5);
      const salvageValue = parseFloat(sandboxSalvageValue) || 0;
      return {
        id: 'sandbox-asset',
        name: sandboxName || 'Simulated Asset',
        purchaseDate: sandboxPurchaseDate,
        cost,
        usefulLifeYears: usefulLife,
        salvageValue,
        depreciationMethod: 'straight_line' as const,
        status: 'active' as const,
        accumulatedDepreciation: 0,
        currentBookValue: cost,
      };
    }

    const asset = fixedAssets.find(a => a.id === selectedAssetId) || fixedAssets[0];
    if (asset) return asset;

    return {
      id: 'fallback-asset',
      name: 'Sample Equipment',
      purchaseDate: '2025-01-01',
      cost: 10000,
      usefulLifeYears: 5,
      salvageValue: 1000,
      depreciationMethod: 'straight_line' as const,
      status: 'active' as const,
      accumulatedDepreciation: 0,
      currentBookValue: 10000,
    };
  }, [
    useSandbox,
    selectedAssetId,
    fixedAssets,
    sandboxCost,
    sandboxUsefulLife,
    sandboxSalvageValue,
    sandboxName,
    sandboxPurchaseDate,
  ]);

  const straightLineSchedule = useMemo(() => {
    const cost = activeAsset.cost;
    const usefulLife = Math.max(1, activeAsset.usefulLifeYears || 5);
    const salvageValue = Math.min(cost, activeAsset.salvageValue || 0);
    const purchaseYear = parseDate(activeAsset.purchaseDate).getFullYear();

    const depreciableAmount = Math.max(0, cost - salvageValue);
    const annualDepreciation = depreciableAmount / usefulLife;

    const schedule = [];
    let remainingBookValue = cost;
    let accumulatedDep = 0;

    schedule.push({
      yearIndex: 0,
      calendarYear: purchaseYear,
      openingBookValue: cost,
      depreciationExpense: 0,
      accumulatedDepreciation: 0,
      endingBookValue: cost,
    });

    for (let i = 1; i <= usefulLife; i++) {
      const opening = remainingBookValue;
      let depExpense = annualDepreciation;
      if (remainingBookValue - depExpense < salvageValue) {
        depExpense = remainingBookValue - salvageValue;
      }
      accumulatedDep += depExpense;
      remainingBookValue -= depExpense;

      schedule.push({
        yearIndex: i,
        calendarYear: purchaseYear + i,
        openingBookValue: parseFloat(opening.toFixed(2)),
        depreciationExpense: parseFloat(depExpense.toFixed(2)),
        accumulatedDepreciation: parseFloat(accumulatedDep.toFixed(2)),
        endingBookValue: parseFloat(remainingBookValue.toFixed(2)),
      });
    }

    return {
      schedule,
      annualDepreciation: parseFloat(annualDepreciation.toFixed(2)),
      depreciableAmount: parseFloat(depreciableAmount.toFixed(2)),
    };
  }, [activeAsset]);

  const currentStraightLineMetrics = useMemo(() => {
    return fixedAssets
      .filter(asset => {
        if (startDate && asset.purchaseDate < startDate) return false;
        if (endDate && asset.purchaseDate > endDate) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            asset.name.toLowerCase().includes(q) ||
            asset.purchaseDate.includes(q) ||
            asset.status.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .map(asset => {
        const cost = asset.cost;
        const usefulLife = Math.max(1, asset.usefulLifeYears || 5);
        const salvageValue = Math.min(cost, asset.salvageValue || 0);
        const elapsedYears = calculateElapsedYears(asset.purchaseDate, currentDate);
        const annualDep = (cost - salvageValue) / usefulLife;
        const calculatedAccDep = Math.min(cost - salvageValue, annualDep * elapsedYears);
        const calculatedNetValue = cost - calculatedAccDep;

        return {
          ...asset,
          elapsedYears: parseFloat(elapsedYears.toFixed(2)),
          annualDep: parseFloat(annualDep.toFixed(2)),
          linearAccDep: parseFloat(calculatedAccDep.toFixed(2)),
          linearNetValue: parseFloat(calculatedNetValue.toFixed(2)),
        };
      });
  }, [fixedAssets, currentDate, searchQuery, startDate, endDate]);

  const handleExportScheduleCSV = () => {
    const headers = [
      'Period',
      'Calendar Year',
      'Opening Book Value',
      'Depreciation Expense',
      'Accumulated Depreciation',
      'Ending Net Value',
    ];
    const data = straightLineSchedule.schedule.map(row => [
      row.yearIndex === 0 ? 'Acquisition' : `Year ${row.yearIndex}`,
      row.calendarYear,
      row.openingBookValue,
      row.depreciationExpense,
      row.accumulatedDepreciation,
      row.endingBookValue,
    ]);
    exportToCSV(data, headers, `Linear_Depreciation_${activeAsset.name.replace(/\s+/g, '_')}.csv`);
    toast.success(`Exported schedule for ${activeAsset.name}.`);
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher */}
      <div className="bg-[#FFFDF9] p-4 rounded-xl border border-[#E5E0D5] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-[#1F1D1A]">
            Linear Depreciation Calculator
          </h2>
          <p className="text-xs text-[#6B655C] mt-0.5">
            Inspect straight-line schedules for registered assets or model a planned purchase.
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-[#F2EFE9] border border-[#E5E0D5] rounded-lg shrink-0">
          <button
            type="button"
            onClick={() => setUseSandbox(false)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors whitespace-nowrap ${
              !useSandbox
                ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                : 'text-[#6B655C] hover:text-[#1F1D1A]'
            }`}
          >
            Registered Assets
          </button>
          <button
            type="button"
            onClick={() => setUseSandbox(true)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors whitespace-nowrap ${
              useSandbox
                ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                : 'text-[#6B655C] hover:text-[#1F1D1A]'
            }`}
          >
            Sandbox Mode
          </button>
        </div>
      </div>

      {/* All Registered Assets Overview Table */}
      {!useSandbox && fixedAssets.length > 0 && (
        <div className="bg-[#FFFDF9] rounded-xl border border-[#E5E0D5] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E0D5]">
            <h3 className="font-display text-base font-semibold text-[#1F1D1A]">
              All Assets — Linear Book & Net Value Summary
            </h3>
            <p className="text-xs text-[#6B655C] mt-0.5">
              Book value, accumulated linear depreciation, and current net value for every registered asset.
            </p>
          </div>

          <DateSearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            startDate={startDate}
            onStartDateChange={setStartDate}
            endDate={endDate}
            onEndDateChange={setEndDate}
            placeholder="Filter assets by name or status..."
          />

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E5E0D5] bg-[#F8F6F1] text-xs font-medium text-[#6B655C]">
                  <th className="py-3 px-4">Asset</th>
                  <th className="py-3 px-4">Purchase Date</th>
                  <th className="py-3 px-4 text-right">Book Value (Cost)</th>
                  <th className="py-3 px-4 text-right">Annual Dep.</th>
                  <th className="py-3 px-4 text-right">Accumulated Dep.</th>
                  <th className="py-3 px-4 text-right">Net Value</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E0D5] text-[#1F1D1A]">
                {currentStraightLineMetrics.map(asset => (
                  <tr
                    key={asset.id}
                    onClick={() => setSelectedAssetId(asset.id)}
                    className={`cursor-pointer transition-colors ${
                      activeAsset.id === asset.id ? 'bg-[#EBF3F0]/50' : 'hover:bg-[#F8F6F1]/60'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-medium text-[#1F1D1A]">{asset.name}</td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-[#6B655C]">
                      {asset.purchaseDate}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs">
                      {formatMoney(asset.cost)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-[#6B655C]">
                      {formatMoney(asset.annualDep)}/yr
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-[#B91C1C]">
                      {formatMoney(asset.linearAccDep)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs font-semibold text-[#157347]">
                      {formatMoney(asset.linearNetValue)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-xs text-[#6B655C] capitalize">
                      {asset.status}
                    </td>
                  </tr>
                ))}
                {currentStraightLineMetrics.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 px-4 text-center text-sm text-[#6B655C]">
                      No assets match the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Split: Parameters + Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Controls */}
        <div className="lg:col-span-1 space-y-4">
          {!useSandbox ? (
            <div className="bg-[#FFFDF9] p-5 rounded-xl border border-[#E5E0D5] space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#6B655C] mb-1.5">
                  Selected Asset
                </label>
                <select
                  value={activeAsset.id}
                  onChange={e => setSelectedAssetId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
                >
                  {fixedAssets.map(asset => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({formatMoney(asset.cost)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-[#E5E0D5] space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6B655C]">Acquisition Date</span>
                  <span className="font-mono tabular-nums text-[#1F1D1A]">{activeAsset.purchaseDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B655C]">Initial Book Value</span>
                  <span className="font-mono tabular-nums font-medium text-[#1F1D1A]">
                    {formatMoney(activeAsset.cost)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B655C]">Salvage Value</span>
                  <span className="font-mono tabular-nums text-[#1F1D1A]">
                    {formatMoney(activeAsset.salvageValue || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B655C]">Useful Life</span>
                  <span className="font-mono tabular-nums text-[#1F1D1A]">
                    {activeAsset.usefulLifeYears} years
                  </span>
                </div>
                <div className="pt-2 border-t border-[#E5E0D5] flex justify-between font-semibold">
                  <span className="text-[#1F1D1A]">Annual Linear Expense</span>
                  <span className="font-mono tabular-nums text-[#1B4D3E]">
                    {formatMoney(straightLineSchedule.annualDepreciation)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#FFFDF9] p-5 rounded-xl border border-[#E5E0D5] space-y-4">
              <h3 className="font-display text-sm font-semibold text-[#1F1D1A]">
                Sandbox Asset Variables
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[#6B655C] mb-1">Asset Name</label>
                  <input
                    type="text"
                    value={sandboxName}
                    onChange={e => setSandboxName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#6B655C] mb-1">
                      Cost ({companySettings.currencySymbol})
                    </label>
                    <input
                      type="number"
                      value={sandboxCost}
                      onChange={e => setSandboxCost(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm font-mono tabular-nums text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#6B655C] mb-1">Purchase Date</label>
                    <input
                      type="date"
                      value={sandboxPurchaseDate}
                      onChange={e => setSandboxPurchaseDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm font-mono tabular-nums text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#6B655C] mb-1">Useful Life (Years)</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={sandboxUsefulLife}
                      onChange={e => setSandboxUsefulLife(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm font-mono tabular-nums text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#6B655C] mb-1">
                      Salvage ({companySettings.currencySymbol})
                    </label>
                    <input
                      type="number"
                      value={sandboxSalvageValue}
                      onChange={e => setSandboxSalvageValue(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm font-mono tabular-nums text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
                    />
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-[#E5E0D5] text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#6B655C]">Depreciable Base</span>
                  <span className="font-mono tabular-nums font-medium text-[#1F1D1A]">
                    {formatMoney(straightLineSchedule.depreciableAmount)}
                  </span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-[#1F1D1A]">Annual Expense</span>
                  <span className="font-mono tabular-nums text-[#1B4D3E]">
                    {formatMoney(straightLineSchedule.annualDepreciation)} / yr
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-[#F2EFE9] p-4 rounded-xl border border-[#E5E0D5] text-xs text-[#6B655C] leading-relaxed">
            Linear depreciation distributes <span className="font-mono text-[#1F1D1A]">(Cost − Salvage) ÷ Useful Life</span> evenly across each year until net value reaches salvage value.
          </div>
        </div>

        {/* Right: Chart + Schedule Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#FFFDF9] p-5 rounded-xl border border-[#E5E0D5]">
            <div className="pb-3 mb-4 border-b border-[#E5E0D5] flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-semibold text-[#1F1D1A]">
                  Depreciation Curve — {activeAsset.name}
                </h3>
                <p className="text-xs text-[#6B655C] mt-0.5">
                  Net book value decline paired with rising accumulated depreciation.
                </p>
              </div>
            </div>

            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={straightLineSchedule.schedule}
                  margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E0D5" />
                  <XAxis
                    dataKey="yearIndex"
                    tickFormatter={val => (val === 0 ? 'Start' : `Yr ${val}`)}
                    tick={{ fill: '#6B655C', fontSize: 11 }}
                    stroke="#E5E0D5"
                  />
                  <YAxis tick={{ fill: '#6B655C', fontSize: 11 }} stroke="#E5E0D5" />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      formatMoney(parseFloat(value)),
                      name === 'endingBookValue' ? 'Net Value' : 'Accumulated Depreciation',
                    ]}
                    labelFormatter={label => (label === 0 ? 'Acquisition' : `Year ${label}`)}
                    contentStyle={{
                      backgroundColor: '#FFFDF9',
                      borderColor: '#D5CEBF',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area
                    type="monotone"
                    dataKey="endingBookValue"
                    name="endingBookValue"
                    stroke="#1B4D3E"
                    strokeWidth={2}
                    fillOpacity={0.08}
                    fill="#1B4D3E"
                  />
                  <Line
                    type="monotone"
                    dataKey="accumulatedDepreciation"
                    name="accumulatedDepreciation"
                    stroke="#B91C1C"
                    strokeWidth={1.75}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#FFFDF9] rounded-xl border border-[#E5E0D5] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E0D5] flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-base font-semibold text-[#1F1D1A]">
                  Year-by-Year Schedule
                </h3>
                <p className="text-xs text-[#6B655C] mt-0.5">
                  Book value, annual expense, accumulated depreciation, and ending net value.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportScheduleCSV}
                className="px-3 py-1.5 bg-[#F8F6F1] hover:bg-[#F2EFE9] text-[#1F1D1A] border border-[#E5E0D5] text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#1B4D3E]" />
                Export CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E5E0D5] bg-[#F8F6F1] text-xs font-medium text-[#6B655C]">
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4">Year</th>
                    <th className="py-3 px-4 text-right">Opening Book Value</th>
                    <th className="py-3 px-4 text-right">Annual Expense</th>
                    <th className="py-3 px-4 text-right">Accumulated Dep.</th>
                    <th className="py-3 px-4 text-right">Ending Net Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0D5] font-mono tabular-nums text-xs text-[#1F1D1A]">
                  {straightLineSchedule.schedule.map(row => (
                    <tr
                      key={row.yearIndex}
                      className={row.yearIndex === 0 ? 'bg-[#F8F6F1]/50 text-[#6B655C]' : 'hover:bg-[#F8F6F1]/60'}
                    >
                      <td className="py-3 px-4 font-sans font-medium text-[#1F1D1A]">
                        {row.yearIndex === 0 ? 'Acquisition' : `Year ${row.yearIndex}`}
                      </td>
                      <td className="py-3 px-4">{row.calendarYear}</td>
                      <td className="py-3 px-4 text-right">{formatMoney(row.openingBookValue)}</td>
                      <td className="py-3 px-4 text-right text-[#1B4D3E] font-medium">
                        {row.yearIndex === 0 ? '—' : formatMoney(row.depreciationExpense)}
                      </td>
                      <td className="py-3 px-4 text-right text-[#B91C1C]">
                        {formatMoney(row.accumulatedDepreciation)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-[#157347]">
                        {formatMoney(row.endingBookValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
