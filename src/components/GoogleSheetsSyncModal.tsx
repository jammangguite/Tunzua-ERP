import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useStore } from '../store';
import {
  extractSpreadsheetId,
  getLinkedSheetForEmail,
  clearLinkedSheetForEmail,
  saveFullWorkspaceToGoogleSheet,
  LinkedGoogleSheet,
} from '../lib/firebase';
import {
  X,
  FileSpreadsheet,
  ExternalLink,
  Check,
  Loader2,
  AlertCircle,
  Link2,
  Unlink,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({ isOpen, onClose }) => {
  const { user, token, loginWithGoogle } = useAuth();
  const { db, recurringBills, companySettings } = useStore();

  const [linkedSheet, setLinkedSheet] = useState<LinkedGoogleSheet | null>(null);
  const [mode, setMode] = useState<'linked' | 'new' | 'existing'>('linked');
  const [newSheetTitle, setNewSheetTitle] = useState('');
  const [existingUrlOrId, setExistingUrlOrId] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setShowConfirm(false);

    const email = user?.email || null;
    const savedLink = getLinkedSheetForEmail(email);
    setLinkedSheet(savedLink);
    setMode(savedLink ? 'linked' : 'new');

    const dateStr = new Date().toISOString().split('T')[0];
    setNewSheetTitle(`${companySettings.name || 'Tunzua'} Ledger (${email || dateStr})`);
    setExistingUrlOrId(savedLink?.spreadsheetUrl || '');
  }, [isOpen, user?.email, companySettings.name]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  const handleGoogleConnect = async () => {
    setError(null);
    setIsSigningIn(true);
    try {
      await loginWithGoogle();
      toast.success('Connected to Google Sheets.');
    } catch (err: any) {
      setError(err?.message || 'Google sign-in was cancelled or failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleRequestSave = () => {
    setError(null);
    if (!user || !token) {
      setError('Please sign in with Google first to authorize saving to your spreadsheet.');
      return;
    }
    if (mode === 'existing' && !existingUrlOrId.trim()) {
      setError('Please paste a Google Sheet URL or Spreadsheet ID.');
      return;
    }
    if (mode === 'new' && !newSheetTitle.trim()) {
      setError('Please enter a title for the new Google Sheet.');
      return;
    }
    // Mandatory explicit user confirmation before writing data to Google Sheets
    setShowConfirm(true);
  };

  const handleConfirmedSave = async () => {
    if (!user || !token) return;
    setIsSaving(true);
    setError(null);

    try {
      const targetSpreadsheetId =
        mode === 'linked' && linkedSheet
          ? linkedSheet.spreadsheetId
          : mode === 'existing'
            ? extractSpreadsheetId(existingUrlOrId)
            : undefined;

      const targetTitle =
        mode === 'linked' && linkedSheet
          ? linkedSheet.title
          : mode === 'new'
            ? newSheetTitle.trim()
            : 'Tunzua Linked Ledger';

      const result = await saveFullWorkspaceToGoogleSheet({
        token,
        email: user.email || user.displayName || 'Google Account',
        spreadsheetId: targetSpreadsheetId,
        title: targetTitle,
        companyName: companySettings.name || 'Tunzua',
        currencySymbol: companySettings.currencySymbol || '$',
        ledger: db.ledger,
        recurringBills,
        fixedAssets: db.fixedAssets,
        partners: db.partners,
      });

      const updatedLink: LinkedGoogleSheet = {
        spreadsheetId: result.spreadsheetId,
        spreadsheetUrl: result.spreadsheetUrl,
        title: result.title,
        email: user.email || user.displayName || 'Google Account',
        lastSavedAt: result.savedAt,
      };
      setLinkedSheet(updatedLink);
      setMode('linked');
      setShowConfirm(false);
      toast.success('Saved all Tunzua data to your Google Sheet.');
    } catch (err: any) {
      setError(err?.message || 'Failed to save data to Google Sheets.');
      setShowConfirm(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnlink = () => {
    if (!user?.email) return;
    clearLinkedSheetForEmail(user.email);
    setLinkedSheet(null);
    setMode('new');
    toast.success('Unlinked spreadsheet from this browser.');
  };

  const confirmTargetSummary =
    mode === 'linked' && linkedSheet
      ? `update "${linkedSheet.title}"`
      : mode === 'existing'
        ? `update spreadsheet ${extractSpreadsheetId(existingUrlOrId)}`
        : `create a new Google Sheet named "${newSheetTitle.trim()}"`;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1F1D1A]/40 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={() => !isSaving && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gsheets-sync-title"
    >
      <div
        className="w-full max-w-lg bg-[#FFFDF9] border border-[#E5E0D5] rounded-xl shadow-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E0D5] flex items-center justify-between bg-[#F8F6F1]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#EBF3F0] border border-[#C7DFD6] text-[#1B4D3E] flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 id="gsheets-sync-title" className="font-display text-lg font-semibold text-[#1F1D1A] truncate">
                Save to Google Sheet
              </h2>
              <p className="text-xs text-[#6B655C] truncate">
                Sync your Tunzua ledger directly to a sheet linked to your Google account.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-2 text-[#6B655C] hover:text-[#1F1D1A] hover:bg-[#EAE5DB] rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Close Google Sheet sync"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Connected Google Account Bar */}
          {user && token ? (
            <div className="px-4 py-3 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-[#6B655C]">Linked Google Email</div>
                <div className="text-sm font-semibold text-[#1F1D1A] truncate">
                  {user.email || user.displayName}
                </div>
              </div>
              <button
                type="button"
                onClick={handleGoogleConnect}
                disabled={isSigningIn}
                className="px-2.5 py-1.5 text-xs font-medium text-[#1B4D3E] hover:bg-[#EBF3F0] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Switch account
              </button>
            </div>
          ) : (
            <div className="p-5 bg-[#F8F6F1] border border-[#E5E0D5] rounded-xl text-center space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-[#1F1D1A]">
                  Connect your Google Account
                </h3>
                <p className="text-xs text-[#6B655C] leading-relaxed">
                  Sign in with Google to create or update a Tunzua spreadsheet in your own Google account with your permission.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGoogleConnect}
                disabled={isSigningIn}
                className="gsi-material-button inline-flex items-center justify-center bg-white hover:bg-[#F8F6F1] text-[#1F1D1A] text-xs px-4 py-2.5 rounded-lg border border-[#D5CEBF] font-semibold cursor-pointer shadow-xs transition-colors gap-2.5"
              >
                {isSigningIn ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#1B4D3E]" />
                ) : (
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 block">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                )}
                <span>Sign in with Google</span>
              </button>
            </div>
          )}

          {user && token && (
            <>
              {/* Linked Sheet Card (if already linked for this email) */}
              {linkedSheet && (
                <div className="p-4 bg-[#EBF3F0]/60 border border-[#C7DFD6] rounded-lg space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-[#1B4D3E]">Currently Linked Sheet</div>
                      <div className="text-sm font-semibold text-[#1F1D1A] truncate">
                        {linkedSheet.title}
                      </div>
                      <div className="text-[11px] text-[#6B655C] mt-0.5 font-mono tabular-nums">
                        Last saved: {new Date(linkedSheet.lastSavedAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleUnlink}
                      className="p-1.5 text-[#6B655C] hover:text-[#B91C1C] rounded-md transition-colors cursor-pointer shrink-0"
                      title="Unlink this sheet"
                      aria-label="Unlink this sheet"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <a
                      href={linkedSheet.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B4D3E] hover:underline"
                    >
                      Open in Google Sheets
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {/* Destination Mode Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#6B655C]">Destination Sheet</label>
                <div className={`grid gap-1 p-1 bg-[#F2EFE9] border border-[#E5E0D5] rounded-lg ${linkedSheet ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {linkedSheet && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('linked');
                        setShowConfirm(false);
                      }}
                      className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        mode === 'linked'
                          ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                          : 'text-[#6B655C] hover:text-[#1F1D1A]'
                      }`}
                    >
                      Linked Sheet
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('new');
                      setShowConfirm(false);
                    }}
                    className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      mode === 'new'
                        ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                        : 'text-[#6B655C] hover:text-[#1F1D1A]'
                    }`}
                  >
                    Create New Sheet
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('existing');
                      setShowConfirm(false);
                    }}
                    className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      mode === 'existing'
                        ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                        : 'text-[#6B655C] hover:text-[#1F1D1A]'
                    }`}
                  >
                    Existing Sheet URL
                  </button>
                </div>
              </div>

              {mode === 'new' && (
                <div>
                  <label htmlFor="gs-new-title" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                    New Google Sheet Title
                  </label>
                  <input
                    id="gs-new-title"
                    type="text"
                    value={newSheetTitle}
                    onChange={e => setNewSheetTitle(e.target.value)}
                    placeholder="Tunzua Ledger"
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  />
                </div>
              )}

              {mode === 'existing' && (
                <div>
                  <label htmlFor="gs-existing-url" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                    Google Sheet URL or Spreadsheet ID
                  </label>
                  <div className="relative">
                    <Link2 className="w-3.5 h-3.5 text-[#968E82] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="gs-existing-url"
                      type="text"
                      value={existingUrlOrId}
                      onChange={e => setExistingUrlOrId(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className="w-full pl-9 pr-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-xs font-mono text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                    />
                  </div>
                </div>
              )}

              {/* Data Snapshot Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                {[
                  { label: 'Ledger', count: db.ledger.length },
                  { label: 'Bills', count: recurringBills.length },
                  { label: 'Assets', count: db.fixedAssets.length },
                  { label: 'Partners', count: db.partners.length },
                ].map(item => (
                  <div key={item.label} className="p-2.5 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg">
                    <div className="font-mono tabular-nums text-sm font-semibold text-[#1F1D1A]">
                      {item.count}
                    </div>
                    <div className="text-[11px] text-[#6B655C]">{item.label}</div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg flex items-start gap-2 text-xs text-[#B91C1C]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Mandatory Explicit Confirmation Box before mutating Google Sheet */}
              {showConfirm ? (
                <div className="p-4 bg-[#FFFBF2] border border-[#E7C98B] rounded-lg space-y-3">
                  <div className="text-xs font-semibold text-[#92400E]">
                    Confirm saving to Google Sheets
                  </div>
                  <p className="text-xs text-[#6B655C] leading-relaxed">
                    This will {confirmTargetSummary} under{' '}
                    <span className="font-semibold text-[#1F1D1A]">{user.email}</span> and replace the{' '}
                    <span className="font-mono text-[11px]">Summary</span>,{' '}
                    <span className="font-mono text-[11px]">Ledger</span> ({db.ledger.length}),{' '}
                    <span className="font-mono text-[11px]">Recurring Bills</span> ({recurringBills.length}),{' '}
                    <span className="font-mono text-[11px]">Fixed Assets</span> ({db.fixedAssets.length}), and{' '}
                    <span className="font-mono text-[11px]">Partners</span> ({db.partners.length}) tabs.
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowConfirm(false)}
                      disabled={isSaving}
                      className="px-3.5 py-1.5 bg-[#FFFDF9] border border-[#E5E0D5] text-xs font-medium text-[#1F1D1A] rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmedSave}
                      disabled={isSaving}
                      className="px-4 py-1.5 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Confirm & Save
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-[#E5E0D5] flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-medium text-[#6B655C] hover:text-[#1F1D1A] hover:bg-[#F2EFE9] rounded-lg transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestSave}
                    className="px-5 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {mode === 'linked' && linkedSheet ? 'Update Linked Google Sheet' : 'Save to Google Sheet'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
