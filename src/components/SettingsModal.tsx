import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { X, Download, Upload, Lock, RotateCcw, Check, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenGoogleSheets?: () => void;
}

type SettingsTab = 'company' | 'security' | 'backup';

const CURRENCY_OPTIONS = [
  { symbol: '$', label: 'USD ($)' },
  { symbol: '₹', label: 'INR (₹)' },
  { symbol: '€', label: 'EUR (€)' },
  { symbol: '£', label: 'GBP (£)' },
  { symbol: 'KES', label: 'KES' },
  { symbol: '₦', label: 'NGN (₦)' },
  { symbol: '¥', label: 'JPY (¥)' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onOpenGoogleSheets }) => {
  const {
    companySettings,
    updateCompanySettings,
    hasPasscode,
    setupSecurityPasscode,
    removePasscode,
    lockNow,
    exportBackup,
    importBackup,
    resetDatabase,
  } = useStore();

  const [tab, setTab] = useState<SettingsTab>('company');
  const [name, setName] = useState(companySettings.name);
  const [subtitle, setSubtitle] = useState(companySettings.subtitle);
  const [currencySymbol, setCurrencySymbol] = useState(companySettings.currencySymbol);
  const [fiscalYearStart, setFiscalYearStart] = useState(companySettings.fiscalYearStart);

  const [pinInput, setPinInput] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(companySettings.name);
      setSubtitle(companySettings.subtitle);
      setCurrencySymbol(companySettings.currencySymbol);
      setFiscalYearStart(companySettings.fiscalYearStart);
      setPinInput('');
      setConfirmReset(false);
    }
  }, [isOpen, companySettings]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanySettings({
      name: name.trim() || 'Tunzua',
      subtitle: subtitle.trim() || 'Simple Double-Entry Ledger',
      currencySymbol: currencySymbol.trim() || '$',
      fiscalYearStart,
    });
    toast.success('Company settings saved.');
  };

  const handleSetPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pinInput)) {
      toast.error('Please enter a 4-digit numeric PIN.');
      return;
    }
    setupSecurityPasscode(pinInput);
    setPinInput('');
    toast.success('4-digit workspace PIN enabled.');
  };

  const handleDownloadBackup = () => {
    const payload = exportBackup();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tunzua-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Backup JSON downloaded.');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const res = importBackup(parsed);
        if (res.ok) {
          toast.success('Backup restored cleanly.');
          onClose();
        } else {
          toast.error(res.error || 'Could not restore backup file.');
        }
      } catch {
        toast.error('Selected file is not valid JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetWorkspace = async () => {
    await resetDatabase();
    setConfirmReset(false);
    toast.success('Workspace reset to clean sample ledger.');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1F1D1A]/40 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div
        className="w-full max-w-lg bg-[#FFFDF9] border border-[#E5E0D5] rounded-xl shadow-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#E5E0D5] flex items-center justify-between bg-[#F8F6F1]">
          <div>
            <h2 id="settings-modal-title" className="font-display text-lg font-semibold text-[#1F1D1A]">
              Workspace Settings
            </h2>
            <p className="text-xs text-[#6B655C] mt-0.5">
              Company profile, optional PIN lock, and portable data backups.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#6B655C] hover:text-[#1F1D1A] hover:bg-[#EAE5DB] rounded-lg transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Clean Segmented Tabs */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#F2EFE9] border border-[#E5E0D5] rounded-lg">
            {[
              { id: 'company', label: 'Company' },
              { id: 'security', label: 'PIN Lock' },
              { id: 'backup', label: 'Backup & Reset' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id as SettingsTab)}
                className={`py-1.5 px-3 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  tab === item.id
                    ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                    : 'text-[#6B655C] hover:text-[#1F1D1A]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {tab === 'company' && (
            <form onSubmit={handleSaveCompany} className="space-y-4">
              <div>
                <label htmlFor="set-name" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                  Ledger / Company Name
                </label>
                <input
                  id="set-name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Tunzua"
                  className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                />
              </div>

              <div>
                <label htmlFor="set-sub" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                  Subtitle / Note
                </label>
                <input
                  id="set-sub"
                  type="text"
                  value={subtitle}
                  onChange={e => setSubtitle(e.target.value)}
                  placeholder="Simple Double-Entry Ledger"
                  className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="set-curr" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                    Currency Symbol
                  </label>
                  <select
                    id="set-curr"
                    value={currencySymbol}
                    onChange={e => setCurrencySymbol(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  >
                    {CURRENCY_OPTIONS.map(c => (
                      <option key={c.symbol} value={c.symbol}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="set-fy" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                    Fiscal Year Starts
                  </label>
                  <select
                    id="set-fy"
                    value={fiscalYearStart}
                    onChange={e => setFiscalYearStart(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  >
                    {MONTHS.map(m => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E0D5] flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {tab === 'security' && (
            <div className="space-y-4">
              <p className="text-sm text-[#6B655C] leading-relaxed">
                Protect your local ledger screen with an optional 4-digit PIN. When enabled, you can lock your ledger at any time.
              </p>

              {hasPasscode ? (
                <div className="p-4 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg space-y-3">
                  <div className="text-xs font-medium text-[#157347]">
                    4-digit PIN lock is currently active.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        lockNow();
                      }}
                      className="px-4 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Lock Screen Now
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        removePasscode();
                        toast.success('Workspace PIN removed.');
                      }}
                      className="px-4 py-2 bg-[#FFFDF9] hover:bg-[#FEF2F2] text-[#B91C1C] border border-[#E5E0D5] text-xs font-medium rounded-lg transition-colors cursor-pointer"
                    >
                      Remove PIN
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSetPin} className="space-y-3">
                  <div>
                    <label htmlFor="set-pin" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                      Choose a 4-Digit PIN
                    </label>
                    <input
                      id="set-pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={pinInput}
                      onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-40 px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm font-mono tracking-[0.4em] text-center text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={pinInput.length !== 4}
                    className="px-4 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] disabled:opacity-40 text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Enable PIN Lock
                  </button>
                </form>
              )}
            </div>
          )}

          {tab === 'backup' && (
            <div className="space-y-5">
              <div className="space-y-2.5">
                <h3 className="text-xs font-semibold text-[#1F1D1A]">Portable JSON Backup</h3>
                <p className="text-xs text-[#6B655C] leading-relaxed">
                  Export all ledger entries, recurring bills, fixed assets, parties, and settings into a single JSON file, or restore a previous backup.
                </p>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    className="px-4 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Backup
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-[#F8F6F1] hover:bg-[#EAE5DB] text-[#1F1D1A] border border-[#E5E0D5] text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Restore JSON File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </div>
              </div>

              {onOpenGoogleSheets && (
                <div className="pt-4 border-t border-[#E5E0D5] space-y-2.5">
                  <h3 className="text-xs font-semibold text-[#1F1D1A]">Google Sheets Cloud Backup</h3>
                  <p className="text-xs text-[#6B655C] leading-relaxed">
                    Save your ledger, recurring bills, fixed assets, and partner summary into a Google Sheet linked to your Google email.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenGoogleSheets}
                    className="px-4 py-2 bg-[#EBF3F0] hover:bg-[#1B4D3E] text-[#1B4D3E] hover:text-[#FFFDF9] border border-[#C7DFD6] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Open Google Sheet Sync
                  </button>
                </div>
              )}

              <div className="pt-4 border-t border-[#E5E0D5] space-y-2.5">
                <h3 className="text-xs font-semibold text-[#B91C1C]">Reset Local Workspace</h3>
                <p className="text-xs text-[#6B655C] leading-relaxed">
                  Clears current local entries and restores the initial sample ledger. Download a backup first if you want to keep your records.
                </p>
                {!confirmReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="px-4 py-2 bg-[#FFFDF9] hover:bg-[#FEF2F2] text-[#B91C1C] border border-[#E5E0D5] text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Workspace Data
                  </button>
                ) : (
                  <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[#B91C1C]">
                      Confirm reset? Current changes will be replaced.
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmReset(false)}
                        className="px-3 py-1.5 bg-[#FFFDF9] text-[#1F1D1A] border border-[#E5E0D5] text-xs font-medium rounded-md cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleResetWorkspace}
                        className="px-3 py-1.5 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-semibold rounded-md cursor-pointer"
                      >
                        Yes, Reset
                      </button>
                    </div>
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
