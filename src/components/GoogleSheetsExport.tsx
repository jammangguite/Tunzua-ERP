import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  createNewSpreadsheet,
  exportLedgerToSheet,
  extractSpreadsheetId,
  SheetExportRow,
} from '../lib/firebase';
import {
  FileSpreadsheet,
  CheckCircle,
  Loader2,
  ExternalLink,
  AlertCircle,
  LogOut,
  Check,
} from 'lucide-react';

interface GoogleSheetsExportProps {
  filteredLogs: SheetExportRow[];
  filterType: string;
}

export const GoogleSheetsExport: React.FC<GoogleSheetsExportProps> = ({ filteredLogs, filterType }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [exportMode, setExportMode] = useState<'new' | 'existing'>('new');
  const [newTitle, setNewTitle] = useState('');
  const [existingIdOrUrl, setExistingIdOrUrl] = useState('');
  const [sheetTabName, setSheetTabName] = useState('General Ledger');
  const [showConfirm, setShowConfirm] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setNewTitle(`Tunzua Ledger - ${filterType.toUpperCase()} (${today})`);
  }, [filterType, filteredLogs.length]);

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setIsAuthLoading(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setIsAuthLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSignIn = async () => {
    setIsAuthLoading(true);
    setExportError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
      }
    } catch (err: any) {
      setExportError(err.message || 'Google account sign-in failed');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsAuthLoading(true);
    try {
      await logout();
      setUser(null);
      setToken(null);
      setSuccessResult(null);
      setShowConfirm(false);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleRequestExport = () => {
    setExportError(null);
    setSuccessResult(null);

    if (!token) {
      setExportError('Please sign in to your Google account first.');
      return;
    }
    if (filteredLogs.length === 0) {
      setExportError('No entries match the current filter to export.');
      return;
    }
    if (exportMode === 'existing' && !existingIdOrUrl.trim()) {
      setExportError('Please enter a Google Spreadsheet URL or ID.');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmedExport = async () => {
    if (!token) return;
    setIsExporting(true);
    setExportError(null);

    try {
      let finalId = '';
      let sheetUrl = '';

      if (exportMode === 'new') {
        const titleToUse = newTitle.trim() || 'Tunzua Ledger';
        const sheetInfo = await createNewSpreadsheet(titleToUse, token);
        finalId = sheetInfo.id;
        sheetUrl = sheetInfo.url;
      } else {
        finalId = extractSpreadsheetId(existingIdOrUrl);
        sheetUrl = `https://docs.google.com/spreadsheets/d/${finalId}/edit`;
      }

      const rawTabName = sheetTabName.replace(/[:*?[\]\\/]/g, '').trim() || 'General Ledger';
      await exportLedgerToSheet(finalId, rawTabName, filteredLogs, token);

      setSuccessResult({
        url: sheetUrl,
        title: exportMode === 'new' ? newTitle : `Spreadsheet ${finalId.substring(0, 8)}...`,
      });
      setShowConfirm(false);
    } catch (err: any) {
      setExportError(err.message || 'Error saving ledger to Google Sheets. Try signing in again.');
      setShowConfirm(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-[#FFFDF9] border border-[#E5E0D5] rounded-xl p-5 space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-[#E5E0D5] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#EBF3F0] border border-[#C7DFD6] text-[#1B4D3E] flex items-center justify-center">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#1F1D1A]">Export Filtered Ledger to Google Sheets</h4>
            <p className="text-xs text-[#6B655C]">Write the currently filtered ledger entries directly into a Google Sheet.</p>
          </div>
        </div>

        {!isAuthLoading && user && (
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-[#1F1D1A] font-medium truncate max-w-[200px]">
              {user.email || user.displayName}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="p-1.5 bg-[#F8F6F1] hover:bg-[#EAE5DB] text-[#6B655C] hover:text-[#B91C1C] border border-[#E5E0D5] rounded-lg cursor-pointer"
              title="Sign out from Google Account"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {isAuthLoading ? (
        <div className="py-4 flex justify-center items-center gap-2 text-xs text-[#6B655C]">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1B4D3E]" />
          <span>Checking Google account...</span>
        </div>
      ) : !user ? (
        <div className="py-4 flex flex-col items-center text-center space-y-3">
          <p className="text-xs text-[#6B655C] max-w-md">
            Connect your Google account to save these ledger entries to Google Sheets with your permission.
          </p>
          <button
            type="button"
            onClick={handleSignIn}
            className="gsi-material-button inline-flex items-center justify-center bg-white hover:bg-[#F8F6F1] text-[#1F1D1A] text-xs px-4 py-2 rounded-lg border border-[#D5CEBF] font-semibold cursor-pointer gap-2.5"
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 block">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span>Sign in with Google</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#6B655C]">Destination</label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-[#F2EFE9] border border-[#E5E0D5] rounded-lg">
                <button
                  type="button"
                  onClick={() => { setExportMode('new'); setShowConfirm(false); }}
                  className={`py-1.5 px-2 rounded-md text-xs font-medium cursor-pointer ${
                    exportMode === 'new'
                      ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                      : 'text-[#6B655C]'
                  }`}
                >
                  New Sheet
                </button>
                <button
                  type="button"
                  onClick={() => { setExportMode('existing'); setShowConfirm(false); }}
                  className={`py-1.5 px-2 rounded-md text-xs font-medium cursor-pointer ${
                    exportMode === 'existing'
                      ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                      : 'text-[#6B655C]'
                  }`}
                >
                  Existing Sheet
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="sheet-tab-name-field" className="text-xs font-medium text-[#6B655C]">
                Sheet Tab Name
              </label>
              <input
                id="sheet-tab-name-field"
                type="text"
                value={sheetTabName}
                onChange={e => setSheetTabName(e.target.value)}
                className="w-full text-xs bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg py-2 px-3 text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            {exportMode === 'new' ? (
              <>
                <label htmlFor="new-sheet-title-field" className="text-xs font-medium text-[#6B655C]">
                  Spreadsheet Title
                </label>
                <input
                  id="new-sheet-title-field"
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full text-xs bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg py-2 px-3 text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
                />
              </>
            ) : (
              <>
                <label htmlFor="existing-sheet-input" className="text-xs font-medium text-[#6B655C]">
                  Google Spreadsheet URL or ID
                </label>
                <input
                  id="existing-sheet-input"
                  type="text"
                  value={existingIdOrUrl}
                  onChange={e => setExistingIdOrUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full text-xs font-mono bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg py-2 px-3 text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
                />
              </>
            )}
          </div>

          {showConfirm ? (
            <div className="p-3.5 bg-[#FFFBF2] border border-[#E7C98B] rounded-lg space-y-2.5">
              <p className="text-xs text-[#6B655C]">
                Confirm writing <strong className="text-[#1F1D1A]">{filteredLogs.length}</strong> entries to{' '}
                <strong className="text-[#1F1D1A]">
                  {exportMode === 'new' ? newTitle : extractSpreadsheetId(existingIdOrUrl)}
                </strong>{' '}
                (tab <span className="font-mono">{sheetTabName}</span>) under {user.email}?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={isExporting}
                  className="px-3 py-1.5 bg-[#FFFDF9] border border-[#E5E0D5] text-xs font-medium text-[#1F1D1A] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmedExport}
                  disabled={isExporting}
                  className="px-3.5 py-1.5 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Confirm & Save
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRequestExport}
              disabled={isExporting || filteredLogs.length === 0}
              className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold bg-[#1B4D3E] hover:bg-[#143B2F] disabled:opacity-40 text-[#FFFDF9] flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Save {filteredLogs.length} Filtered Entries to Google Sheets
            </button>
          )}
        </div>
      )}

      {exportError && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg flex items-start gap-2 text-xs text-[#B91C1C]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{exportError}</span>
        </div>
      )}

      {successResult && (
        <div className="p-3.5 bg-[#EBF3F0] border border-[#C7DFD6] rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-[#1B4D3E]">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <CheckCircle className="w-4 h-4" />
            Saved to Google Sheets successfully.
          </span>
          <a
            href={successResult.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
          >
            Open Sheet
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
};
