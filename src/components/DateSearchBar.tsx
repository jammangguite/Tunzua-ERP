import React from 'react';
import { Search, Calendar, X } from 'lucide-react';

interface DateSearchBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  placeholder?: string;
}

export const DateSearchBar: React.FC<DateSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  placeholder = 'Search by narration, reference, or account...',
}) => {
  const hasFilters = Boolean(searchQuery || startDate || endDate);

  const applyPreset = (preset: 'all' | 'month' | '30d') => {
    if (preset === 'all') {
      onStartDateChange('');
      onEndDateChange('');
      return;
    }
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    if (preset === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      onStartDateChange(start);
      onEndDateChange(end);
    } else {
      const prev = new Date();
      prev.setDate(prev.getDate() - 30);
      onStartDateChange(prev.toISOString().split('T')[0]);
      onEndDateChange(end);
    }
  };

  return (
    <div className="px-4 py-3 border-b border-[#E5E0D5] bg-[#F8F6F1]/80 flex flex-col lg:flex-row lg:items-center gap-3 no-print">
      {/* Search Input */}
      <div className="flex-1 flex items-center gap-2 bg-[#FFFDF9] border border-[#E5E0D5] rounded-lg px-3 py-1.5 focus-within:border-[#1B4D3E]">
        <Search className="w-3.5 h-3.5 text-[#968E82] shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-xs text-[#1F1D1A] placeholder:text-[#968E82] focus:outline-none"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="text-[#968E82] hover:text-[#1F1D1A] cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Date Range Pickers */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="flex items-center gap-1.5 bg-[#FFFDF9] border border-[#E5E0D5] rounded-lg px-2.5 py-1">
          <Calendar className="w-3.5 h-3.5 text-[#968E82] shrink-0" />
          <label className="text-[11px] text-[#6B655C]">From</label>
          <input
            type="date"
            value={startDate}
            onChange={e => onStartDateChange(e.target.value)}
            className="bg-transparent font-mono tabular-nums text-xs text-[#1F1D1A] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-[#FFFDF9] border border-[#E5E0D5] rounded-lg px-2.5 py-1">
          <label className="text-[11px] text-[#6B655C]">To</label>
          <input
            type="date"
            value={endDate}
            onChange={e => onEndDateChange(e.target.value)}
            className="bg-transparent font-mono tabular-nums text-xs text-[#1F1D1A] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#F2EFE9] p-0.5 rounded-lg border border-[#E5E0D5]">
          <button
            type="button"
            onClick={() => applyPreset('all')}
            className={`px-2 py-1 text-[11px] font-medium rounded-md cursor-pointer whitespace-nowrap transition-colors ${
              !startDate && !endDate
                ? 'bg-[#FFFDF9] text-[#1B4D3E]'
                : 'text-[#6B655C] hover:text-[#1F1D1A]'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => applyPreset('month')}
            className="px-2 py-1 text-[11px] font-medium rounded-md text-[#6B655C] hover:text-[#1F1D1A] cursor-pointer whitespace-nowrap transition-colors"
          >
            This Month
          </button>
          <button
            type="button"
            onClick={() => applyPreset('30d')}
            className="px-2 py-1 text-[11px] font-medium rounded-md text-[#6B655C] hover:text-[#1F1D1A] cursor-pointer whitespace-nowrap transition-colors"
          >
            30 Days
          </button>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              onStartDateChange('');
              onEndDateChange('');
            }}
            className="px-2.5 py-1 text-[11px] font-medium text-[#B91C1C] hover:underline cursor-pointer whitespace-nowrap"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};
