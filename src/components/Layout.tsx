import React, { useState, useEffect, useMemo, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { useAuth } from '../lib/auth';
import { PINPad } from './PINPad';
import { Logo } from './Logo';
import { QuickEntryModal, EntryPreset } from './QuickEntryModal';
import { GlobalSearchModal } from './GlobalSearchModal';
import { GoogleSheetsSyncModal } from './GoogleSheetsSyncModal';
import { PrintPreviewModal } from './PrintPreviewModal';
import { ClickablePath } from './ClickablePath';
import { PWAInstallButton } from './PWAInstallButton';
import { OneClickInstallBanner } from './OneClickInstallBanner';
import { getBillStatusMeta } from '../pages/RecurringBills';
import {
  Menu,
  Plus,
  Search,
  Settings,
  Lock,
  LogOut,
  X,
  FileSpreadsheet,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';

interface NavItem {
  path: string;
  label: string;
  end?: boolean;
  badgeText?: string;
}

const ROUTE_META: Record<string, { group: string; label: string; preset?: EntryPreset }> = {
  '/app': { group: 'Overview', label: 'Dashboard', preset: 'sales' },
  '/app/bills': { group: 'Overview', label: 'Recurring Bills', preset: 'payment' },
  '/app/purchases': { group: 'Transactions', label: 'Purchase', preset: 'purchase' },
  '/app/sales': { group: 'Transactions', label: 'Sales', preset: 'sales' },
  '/app/receipts': { group: 'Transactions', label: 'Receipts', preset: 'receipt' },
  '/app/payments': { group: 'Transactions', label: 'Payments', preset: 'payment' },
  '/app/contra': { group: 'Transactions', label: 'Contra', preset: 'contra' },
  '/app/journal': { group: 'Transactions', label: 'Journal', preset: 'journal' },
  '/app/daybook': { group: 'Transactions', label: 'Daybook', preset: 'sales' },
  '/app/parties': { group: 'Assets & Reports', label: 'Sundry Parties', preset: 'sales' },
  '/app/assets': { group: 'Assets & Reports', label: 'Fixed Assets', preset: 'purchase' },
  '/app/reports': { group: 'Assets & Reports', label: 'Financial Reports', preset: 'sales' },
  '/app/settings': { group: 'Workspace', label: 'Settings', preset: 'sales' },
};

const Layout: React.FC = () => {
  const store = useStore();
  const { user, signOut, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSheetsSync, setShowSheetsSync] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const mainContentRef = useRef<HTMLElement>(null);

  const {
    companySettings,
    recurringBills,
    hasPasscode,
    isUnlocked,
    lockNow,
    activeUser,
    activeRole,
    isPreviewingRole,
    setActingUserId,
    syncSignedInIdentity,
  } = store;

  // Sync signed-in Firebase account with workspace multi-user directory
  useEffect(() => {
    syncSignedInIdentity(user?.email || null, user?.displayName || null);
  }, [user?.email, user?.displayName]);

  // Count bills needing attention (overdue or due soon)
  const attentionBillsCount = useMemo(() => {
    return recurringBills.filter(b => {
      const m = getBillStatusMeta(b);
      return m.kind === 'overdue' || m.kind === 'due_soon';
    }).length;
  }, [recurringBills]);

  // Global keyboard shortcuts: Cmd/Ctrl+K for search, N for new entry
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearch(true);
        return;
      }
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (!isTyping && !showQuickEntry && !showSearch && !showSheetsSync && !showPrintPreview && e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setShowQuickEntry(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showQuickEntry, showSearch, showSheetsSync, showPrintPreview]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Signed out.');
      navigate('/login');
    } catch {
      toast.error('Failed to sign out.');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      toast.success('Signed in with Google.');
    } catch {
      toast.error('Google sign-in failed.');
    }
  };

  if (!isUnlocked) {
    return <PINPad />;
  }

  const currentMeta = ROUTE_META[location.pathname] || {
    group: 'Ledger',
    label: 'Workspace',
    preset: 'sales' as EntryPreset,
  };

  const navGroups: { title: string; items: NavItem[] }[] = [
    {
      title: 'Overview',
      items: [
        { path: '/app', label: 'Dashboard', end: true },
        {
          path: '/app/bills',
          label: 'Recurring Bills',
          badgeText: attentionBillsCount > 0 ? `${attentionBillsCount} due` : undefined,
        },
      ],
    },
    {
      title: 'Transactions',
      items: [
        { path: '/app/purchases', label: 'Purchase' },
        { path: '/app/sales', label: 'Sales' },
        { path: '/app/receipts', label: 'Receipts' },
        { path: '/app/payments', label: 'Payments' },
        { path: '/app/contra', label: 'Contra' },
        { path: '/app/journal', label: 'Journal' },
        { path: '/app/daybook', label: 'Daybook' },
      ],
    },
    {
      title: 'Assets & Reports',
      items: [
        { path: '/app/parties', label: 'Sundry Parties' },
        { path: '/app/assets', label: 'Fixed Assets' },
        { path: '/app/reports', label: 'Financial Reports' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F6F1] text-[#1F1D1A] flex font-sans antialiased">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-[#1F1D1A]/30 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* WARM PARCHMENT SIDEBAR */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#F2EFE9] border-r border-[#E5E0D5] flex flex-col shrink-0 z-40 transition-transform duration-200 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:-ml-64'
        }`}
      >
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-[#E5E0D5] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Logo size={30} className="shrink-0 rounded-md" />
            <div className="min-w-0">
              <div className="font-display text-lg font-semibold text-[#1F1D1A] leading-tight truncate">
                {companySettings.name || 'Tunzua'}
              </div>
              <div className="text-[11px] text-[#6B655C] truncate leading-tight mt-0.5">
                {companySettings.subtitle}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 text-[#6B655C] hover:text-[#1F1D1A] lg:hidden cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Clean Navigation Heads (no path clutter in left panel) */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Accounting heads">
          {navGroups.map(group => (
            <div key={group.title} className="space-y-1">
              <div className="px-2.5 pb-1 text-[11px] font-medium text-[#968E82]">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    onClick={() => {
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    className={({ isActive }) =>
                      `block px-2.5 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-[#FFFDF9] text-[#1B4D3E] border border-[#D5CEBF]'
                          : 'text-[#1F1D1A] hover:bg-[#EAE5DB]/70 border border-transparent'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[13px] leading-snug truncate ${
                            isActive ? 'font-semibold text-[#1B4D3E]' : 'font-medium text-[#1F1D1A]'
                          }`}
                        >
                          {item.label}
                        </span>
                        {item.badgeText && (
                          <span className="text-[11px] font-medium text-[#B45309] whitespace-nowrap shrink-0">
                            {item.badgeText}
                          </span>
                        )}
                      </div>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Quiet Sidebar Footer */}
        <div className="p-3 border-t border-[#E5E0D5] space-y-1.5 bg-[#F2EFE9]">
          <button
            type="button"
            onClick={() => setShowSheetsSync(true)}
            className="w-full px-3 py-2 text-xs font-medium text-[#1B4D3E] bg-[#EBF3F0]/80 hover:bg-[#EBF3F0] border border-[#C7DFD6] rounded-lg transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
            Save to Google Sheet
          </button>

          <button
            type="button"
            onClick={() => setShowPrintPreview(true)}
            className="w-full px-3 py-2 text-xs font-medium text-[#1F1D1A] hover:bg-[#EAE5DB] rounded-lg transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5 text-[#6B655C] shrink-0" />
            Print Preview
          </button>

          <PWAInstallButton variant="sidebar" />

          <div className="flex items-center gap-1.5">
            <NavLink
              to="/app/settings"
              onClick={() => {
                if (window.innerWidth < 1024) setIsSidebarOpen(false);
              }}
              className={({ isActive }) =>
                `flex-1 px-3 py-2 text-xs rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                    : 'font-medium text-[#1F1D1A] hover:bg-[#EAE5DB] border border-transparent'
                }`
              }
            >
              <Settings className="w-3.5 h-3.5 text-[#6B655C]" />
              Settings
            </NavLink>
            {hasPasscode && (
              <button
                type="button"
                onClick={lockNow}
                className="px-2.5 py-2 text-xs font-medium text-[#6B655C] hover:text-[#1F1D1A] hover:bg-[#EAE5DB] rounded-lg transition-colors cursor-pointer"
                title="Lock workspace"
                aria-label="Lock workspace"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isPreviewingRole && (
            <div className="px-2.5 py-2 bg-[#FFFDF9] border border-[#D5CEBF] rounded-lg space-y-1.5">
              <div className="text-[11px] text-[#B45309] font-medium leading-snug">
                Viewing as {activeUser.name} · {activeRole === 'admin' ? 'Admin' : 'User'}
              </div>
              <button
                type="button"
                onClick={() => {
                  setActingUserId(null);
                  toast.success('Returned to Admin access.');
                }}
                className="w-full px-2.5 py-1 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-[11px] font-semibold rounded-md transition-colors cursor-pointer"
              >
                Return to Admin
              </button>
            </div>
          )}

          {user ? (
            <div className="px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs text-[#6B655C]">
              <div className="min-w-0">
                <div className="truncate text-[#1F1D1A] font-medium" title={user.email || user.displayName || ''}>
                  {user.displayName || user.email}
                </div>
                <div className="text-[11px] text-[#6B655C] truncate">
                  {activeRole === 'admin' ? 'Admin' : 'User'}
                  {isPreviewingRole ? ' · Preview' : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1 text-[#6B655C] hover:text-[#B91C1C] transition-colors cursor-pointer shrink-0"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="px-2.5 py-1 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="text-xs font-medium text-[#6B655C] hover:text-[#1F1D1A] transition-colors text-left cursor-pointer"
              >
                Sign in with Google
              </button>
              <span className="text-[11px] font-medium text-[#1B4D3E]">
                {activeRole === 'admin' ? 'Admin' : 'User'}
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT SHELL */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Clean 3-Zone Top Header Bar */}
        <header className="sticky top-0 z-20 h-14 bg-[#FFFDF9]/95 backdrop-blur-xs border-b border-[#E5E0D5] px-4 sm:px-6 flex items-center justify-between gap-4 sm:gap-8 no-print">
          {/* Zone 1: Sidebar toggle + Contextual Breadcrumb Path */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className="p-2 -ml-1 text-[#6B655C] hover:text-[#1F1D1A] hover:bg-[#F2EFE9] rounded-lg transition-colors cursor-pointer shrink-0"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            <ClickablePath variant="header" />
          </div>

          {/* Zone 2: Global Search Trigger */}
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            className="hidden md:flex items-center justify-between gap-4 w-72 px-3 py-1.5 bg-[#F8F6F1] hover:bg-[#F2EFE9] border border-[#E5E0D5] rounded-lg text-xs text-[#6B655C] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-[#968E82] shrink-0" />
              <span className="truncate">Search heads, entries, bills...</span>
            </span>
            <span className="font-mono text-[10px] text-[#968E82] shrink-0">⌘K</span>
          </button>

          {/* Zone 3: Single Primary Action (+ Mobile Search Icon) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="md:hidden p-2 text-[#6B655C] hover:text-[#1F1D1A] hover:bg-[#F2EFE9] rounded-lg transition-colors cursor-pointer"
              aria-label="Search ledger"
            >
              <Search className="w-4 h-4" />
            </button>

            <PWAInstallButton variant="header" />

            <button
              type="button"
              onClick={() => setShowQuickEntry(true)}
              className="px-3.5 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              New Entry
            </button>
          </div>
        </header>

        {/* Active Route Viewport */}
        <main
          ref={mainContentRef}
          className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 workspace-content"
        >
          {/* Archival Print-Only Letterhead (rendered in Print Preview & browser print) */}
          <div className="print-only pb-3 mb-5 border-b-2 border-[#1B4D3E]">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="font-display text-xl font-semibold text-[#1F1D1A] leading-tight">
                  {companySettings.name || 'Tunzua'}
                </div>
                <div className="text-xs text-[#6B655C] mt-0.5">
                  {companySettings.subtitle || 'Simple Double-Entry Ledger'}
                </div>
              </div>
              <div className="text-right text-xs text-[#6B655C]">
                <div className="font-semibold text-[#1F1D1A]">{currentMeta.label}</div>
                <div className="font-mono tabular-nums mt-0.5">
                  Printed {new Date().toISOString().split('T')[0]} · Currency {companySettings.currencySymbol || '$'}
                </div>
              </div>
            </div>
          </div>

          <OneClickInstallBanner />

          {isPreviewingRole && (
            <div className="mb-5 px-4 py-2.5 bg-[#FFFDF9] border border-[#E5E0D5] rounded-lg flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="text-xs text-[#6B655C]">
                <span className="font-semibold text-[#B45309]">Role Preview Active</span>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span>
                  Viewing as <strong className="text-[#1F1D1A]">{activeUser.name}</strong> ({activeRole === 'admin' ? 'Admin' : 'User'}) — Delete actions are hidden.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActingUserId(null);
                  toast.success('Returned to Admin access.');
                }}
                className="px-3 py-1.5 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Return to Admin
              </button>
            </div>
          )}

          <Outlet
            context={{
              openSheetsSync: () => setShowSheetsSync(true),
              openQuickEntry: () => setShowQuickEntry(true),
              openPrintPreview: () => setShowPrintPreview(true),
            }}
          />
        </main>
      </div>

      {/* Global 'Quick Entry' Floating Action Button */}
      <button
        type="button"
        onClick={() => setShowQuickEntry(true)}
        aria-label="Open Quick Entry"
        title="Quick Entry (Sale, Purchase, Receipt, or Payment) — Shortcut: N"
        className="fixed bottom-6 right-6 z-30 no-print inline-flex items-center gap-2 px-4 py-3 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] rounded-xl shadow-lg shadow-[#1F1D1A]/20 border border-[#143B2F] text-xs font-semibold transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
      >
        <Plus className="w-4 h-4 shrink-0" />
        <span>Quick Entry</span>
      </button>

      {/* Global Overlays */}
      <QuickEntryModal
        isOpen={showQuickEntry}
        onClose={() => setShowQuickEntry(false)}
        defaultPreset={currentMeta.preset || 'sales'}
      />
      <GlobalSearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
      <GoogleSheetsSyncModal
        isOpen={showSheetsSync}
        onClose={() => setShowSheetsSync(false)}
      />
      <PrintPreviewModal
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        sourceRef={mainContentRef}
        documentTitle={currentMeta.label}
      />
    </div>
  );
};

export default Layout;
