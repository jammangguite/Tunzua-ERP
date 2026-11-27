import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FixedAssetsModule } from '../components/FinanceModules';
import { LinearDepreciationTable } from '../components/LinearDepreciationTable';
import { ClickablePath } from '../components/ClickablePath';
import { Printer } from 'lucide-react';

const FixedAssets: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'registry' | 'linear_projection'>('linear_projection');
  const outletCtx = useOutletContext<{ openPrintPreview?: () => void }>() || {};

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-5 border-b border-[#E5E0D5] flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <ClickablePath variant="page" />
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1F1D1A] tracking-tight">
            Fixed Assets & Depreciation
          </h1>
          <p className="text-sm text-[#6B655C] mt-1">
            Track capital property, book value, accumulated depreciation, and net value with linear schedules.
          </p>
        </div>

        {/* Actions + Clean Segmented Tabs */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto no-print">
          <button
            type="button"
            onClick={() => (outletCtx.openPrintPreview ? outletCtx.openPrintPreview() : window.print())}
            className="px-3.5 py-2 bg-[#FFFDF9] hover:bg-[#F2EFE9] text-[#1F1D1A] border border-[#E5E0D5] font-medium text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5 text-[#1B4D3E]" />
            Print Preview
          </button>

          <div className="flex bg-[#F2EFE9] p-1 rounded-lg border border-[#E5E0D5]">
            <button
              type="button"
              onClick={() => setActiveTab('linear_projection')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'linear_projection'
                  ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                  : 'text-[#6B655C] hover:text-[#1F1D1A]'
              }`}
            >
              Linear Depreciation Table
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('registry')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'registry'
                  ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                  : 'text-[#6B655C] hover:text-[#1F1D1A]'
              }`}
            >
              Asset Registry & Actions
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'registry' ? (
        <div className="bg-[#FFFDF9] rounded-xl border border-[#E5E0D5] p-5">
          <FixedAssetsModule />
        </div>
      ) : (
        <LinearDepreciationTable />
      )}
    </div>
  );
};

export default FixedAssets;
