import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useStore } from '../store';

export interface HeadLink {
  label: string;
  path: string;
  group: string;
}

export const ALL_HEADS: HeadLink[] = [
  { label: 'Dashboard', path: '/app', group: 'Overview' },
  { label: 'Recurring Bills', path: '/app/bills', group: 'Overview' },
  { label: 'Purchase', path: '/app/purchases', group: 'Transactions' },
  { label: 'Sales', path: '/app/sales', group: 'Transactions' },
  { label: 'Receipts', path: '/app/receipts', group: 'Transactions' },
  { label: 'Payments', path: '/app/payments', group: 'Transactions' },
  { label: 'Contra', path: '/app/contra', group: 'Transactions' },
  { label: 'Journal', path: '/app/journal', group: 'Transactions' },
  { label: 'Daybook', path: '/app/daybook', group: 'Transactions' },
  { label: 'Sundry Parties', path: '/app/parties', group: 'Assets & Reports' },
  { label: 'Fixed Assets', path: '/app/assets', group: 'Assets & Reports' },
  { label: 'Financial Reports', path: '/app/reports', group: 'Assets & Reports' },
  { label: 'Settings', path: '/app/settings', group: 'Workspace' },
];

interface ClickablePathProps {
  /** 'header' renders the top-bar interactive breadcrumb; 'page' renders the clickable mono path trail above a page heading */
  variant?: 'header' | 'page';
}

export const ClickablePath: React.FC<ClickablePathProps> = ({ variant = 'page' }) => {
  const location = useLocation();
  const { companySettings } = useStore();
  const [openMenu, setOpenMenu] = useState<'group' | 'head' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpenMenu(null);
  }, [location.pathname]);

  useEffect(() => {
    if (!openMenu) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [openMenu]);

  const currentHead =
    ALL_HEADS.find(h => h.path === location.pathname) || ALL_HEADS[0];
  const groupHeads = ALL_HEADS.filter(h => h.group === currentHead.group);
  const subSegment = location.pathname.replace(/^\/app\/?/, '');

  if (variant === 'page') {
    return (
      <nav
        ref={containerRef}
        aria-label="Current path"
        className="relative inline-flex items-center gap-1 font-mono text-xs text-[#6B655C] mb-1.5 no-print"
      >
        <Link
          to="/app"
          className="hover:text-[#1B4D3E] hover:underline underline-offset-2 transition-colors"
        >
          /app
        </Link>

        {subSegment && (
          <>
            <span className="text-[#968E82]" aria-hidden="true">/</span>
            <button
              type="button"
              onClick={() => setOpenMenu(prev => (prev === 'head' ? null : 'head'))}
              className="inline-flex items-center gap-1 text-[#1B4D3E] font-medium hover:underline underline-offset-2 cursor-pointer"
              title="Click to jump to another head"
            >
              <span>{subSegment}</span>
              <ChevronDown className="w-3 h-3 text-[#968E82]" />
            </button>
          </>
        )}

        {!subSegment && (
          <button
            type="button"
            onClick={() => setOpenMenu(prev => (prev === 'head' ? null : 'head'))}
            className="inline-flex items-center gap-0.5 ml-0.5 text-[#968E82] hover:text-[#1B4D3E] cursor-pointer"
            title="Jump to any head"
            aria-label="Switch head"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        )}

        {openMenu === 'head' && (
          <div className="absolute left-0 top-full mt-1.5 w-60 bg-[#FFFDF9] border border-[#D5CEBF] rounded-lg shadow-md py-1.5 z-40 font-sans">
            <div className="px-3 py-1 text-[11px] font-medium text-[#968E82] border-b border-[#E5E0D5] mb-1">
              Jump to head
            </div>
            <div className="max-h-64 overflow-y-auto">
              {ALL_HEADS.map(head => (
                <Link
                  key={head.path}
                  to={head.path}
                  onClick={() => setOpenMenu(null)}
                  className={`flex items-center justify-between gap-2 px-3 py-1.5 text-xs transition-colors ${
                    head.path === location.pathname
                      ? 'bg-[#EBF3F0] text-[#1B4D3E] font-semibold'
                      : 'text-[#1F1D1A] hover:bg-[#F2EFE9]'
                  }`}
                >
                  <span className="truncate">{head.label}</span>
                  <span className="font-mono text-[10.5px] text-[#968E82] shrink-0">
                    {head.path}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    );
  }

  return (
    <nav
      ref={containerRef}
      aria-label="Breadcrumb"
      className="relative flex items-center gap-1.5 text-xs text-[#6B655C] min-w-0"
    >
      <Link
        to="/app"
        className="font-medium text-[#1F1D1A] hover:text-[#1B4D3E] hover:underline underline-offset-2 whitespace-nowrap transition-colors"
      >
        {companySettings.name || 'Tunzua'}
      </Link>

      <span className="text-[#968E82]" aria-hidden="true">/</span>

      <div className="relative hidden sm:inline-flex items-center">
        <button
          type="button"
          onClick={() => setOpenMenu(prev => (prev === 'group' ? null : 'group'))}
          className="inline-flex items-center gap-1 hover:text-[#1B4D3E] hover:underline underline-offset-2 whitespace-nowrap cursor-pointer transition-colors"
        >
          <span>{currentHead.group}</span>
          <ChevronDown className="w-3 h-3 text-[#968E82]" />
        </button>

        {openMenu === 'group' && (
          <div className="absolute left-0 top-full mt-2 w-56 bg-[#FFFDF9] border border-[#D5CEBF] rounded-lg shadow-md py-1.5 z-40">
            <div className="px-3 py-1 text-[11px] font-medium text-[#968E82] border-b border-[#E5E0D5] mb-1">
              {currentHead.group}
            </div>
            {groupHeads.map(head => (
              <Link
                key={head.path}
                to={head.path}
                onClick={() => setOpenMenu(null)}
                className={`flex items-center justify-between gap-2 px-3 py-1.5 text-xs transition-colors ${
                  head.path === location.pathname
                    ? 'bg-[#EBF3F0] text-[#1B4D3E] font-semibold'
                    : 'text-[#1F1D1A] hover:bg-[#F2EFE9]'
                }`}
              >
                <span className="truncate">{head.label}</span>
                <span className="font-mono text-[10.5px] text-[#968E82] shrink-0">
                  {head.path}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <span className="hidden sm:inline text-[#968E82]" aria-hidden="true">/</span>

      <Link
        to={currentHead.path}
        className="font-semibold text-[#1B4D3E] hover:underline underline-offset-2 truncate transition-colors"
      >
        {currentHead.label}
      </Link>

      <div className="relative hidden md:inline-flex items-center gap-0.5 font-mono text-[11px] text-[#968E82] ml-2 pl-2 border-l border-[#E5E0D5]">
        <Link
          to="/app"
          className="hover:text-[#1B4D3E] hover:underline underline-offset-2 transition-colors"
        >
          /app
        </Link>
        {subSegment ? (
          <>
            <span>/</span>
            <button
              type="button"
              onClick={() => setOpenMenu(prev => (prev === 'head' ? null : 'head'))}
              className="inline-flex items-center gap-0.5 text-[#6B655C] hover:text-[#1B4D3E] hover:underline underline-offset-2 cursor-pointer transition-colors"
              title="Click to jump to another head"
            >
              <span>{subSegment}</span>
              <ChevronDown className="w-3 h-3 text-[#968E82]" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setOpenMenu(prev => (prev === 'head' ? null : 'head'))}
            className="inline-flex items-center ml-0.5 text-[#968E82] hover:text-[#1B4D3E] cursor-pointer"
            title="Jump to any head"
            aria-label="Switch head"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        )}

        {openMenu === 'head' && (
          <div className="absolute left-0 top-full mt-2 w-60 bg-[#FFFDF9] border border-[#D5CEBF] rounded-lg shadow-md py-1.5 z-40 font-sans">
            <div className="px-3 py-1 text-[11px] font-medium text-[#968E82] border-b border-[#E5E0D5] mb-1">
              Jump to head
            </div>
            <div className="max-h-64 overflow-y-auto">
              {ALL_HEADS.map(head => (
                <Link
                  key={head.path}
                  to={head.path}
                  onClick={() => setOpenMenu(null)}
                  className={`flex items-center justify-between gap-2 px-3 py-1.5 text-xs transition-colors ${
                    head.path === location.pathname
                      ? 'bg-[#EBF3F0] text-[#1B4D3E] font-semibold'
                      : 'text-[#1F1D1A] hover:bg-[#F2EFE9]'
                  }`}
                >
                  <span className="truncate">{head.label}</span>
                  <span className="font-mono text-[10.5px] text-[#968E82] shrink-0">
                    {head.path}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
