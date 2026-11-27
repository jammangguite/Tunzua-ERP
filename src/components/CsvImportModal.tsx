import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../store';
import { TransactionType } from '../types';
import {
  LedgerKind,
  LedgerFieldKey,
  ColumnMapping,
  CsvDefaults,
  LEDGER_FIELDS,
  parseCsvText,
  autoMapHeaders,
  validateMappedRows,
  getDefaultValuesForKind,
  buildSampleCsvTemplate,
} from '../utils/csvImport';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  kind: LedgerKind;
  title: string;
}

type ImportStep = 'upload' | 'map' | 'review';
type InputMode = 'file' | 'paste';
type ReviewFilter = 'all' | 'valid' | 'errors';

const EMPTY_MAPPING: ColumnMapping = {
  date: null,
  description: null,
  amount: null,
  reference: null,
  debitAccount: null,
  creditAccount: null,
  type: null,
  isBankCleared: null,
};

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  kind,
  title,
}) => {
  const { db, addBulkLedgerTransactions, triggerSync, formatMoney } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportStep>('upload');
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [isDragging, setIsDragging] = useState(false);

  const [fileName, setFileName] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const [parseError, setParseError] = useState<string | null>(null);

  const [mapping, setMapping] = useState<ColumnMapping>(EMPTY_MAPPING);
  const [defaults, setDefaults] = useState<CsvDefaults>(() => getDefaultValuesForKind(kind));
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');

  // Reset modal state whenever opened or ledger kind changes
  useEffect(() => {
    if (isOpen) {
      setStep('upload');
      setInputMode('file');
      setIsDragging(false);
      setFileName('');
      setPasteText('');
      setRawRows([]);
      setHasHeaderRow(true);
      setParseError(null);
      setMapping(EMPTY_MAPPING);
      setDefaults(getDefaultValuesForKind(kind));
      setReviewFilter('all');
    }
  }, [isOpen, kind]);

  // Escape key dismissal
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const maxColumns = useMemo(
    () => rawRows.reduce((max, row) => Math.max(max, row.length), 0),
    [rawRows]
  );

  const columnHeaders = useMemo(() => {
    if (rawRows.length === 0) return [];
    if (hasHeaderRow) {
      return Array.from({ length: maxColumns }, (_, i) => {
        const val = (rawRows[0][i] || '').trim();
        return val || `Column ${i + 1}`;
      });
    }
    return Array.from({ length: maxColumns }, (_, i) => `Column ${i + 1}`);
  }, [rawRows, hasHeaderRow, maxColumns]);

  const dataRows = useMemo(() => {
    if (rawRows.length === 0) return [];
    return hasHeaderRow ? rawRows.slice(1) : rawRows;
  }, [rawRows, hasHeaderRow]);

  // First non-empty sample value for each column to help users identify columns during mapping
  const columnSamples = useMemo(() => {
    return Array.from({ length: maxColumns }, (_, colIdx) => {
      for (const row of dataRows) {
        const val = (row[colIdx] || '').trim();
        if (val) return val;
      }
      return '';
    });
  }, [dataRows, maxColumns]);

  // Only show the Entry Sub-Type mapping field on Receipts and Payments where sub-types exist
  const visibleFields = useMemo(() => {
    return LEDGER_FIELDS.filter(field => {
      if (field.key === 'type') {
        return kind === 'receipts' || kind === 'payments';
      }
      return true;
    });
  }, [kind]);

  const requiredFieldsMapped =
    mapping.date !== null && mapping.description !== null && mapping.amount !== null;

  const existingReferences = useMemo(
    () => db.ledger.map(tx => tx.reference || '').filter(Boolean),
    [db.ledger]
  );

  const validatedRows = useMemo(() => {
    if (dataRows.length === 0) return [];
    return validateMappedRows(dataRows, mapping, kind, defaults, existingReferences);
  }, [dataRows, mapping, kind, defaults, existingReferences]);

  const validRows = useMemo(
    () => validatedRows.filter(r => r.transaction !== null),
    [validatedRows]
  );

  const errorRows = useMemo(
    () => validatedRows.filter(r => r.transaction === null),
    [validatedRows]
  );

  const totalImportAmount = useMemo(
    () => validRows.reduce((sum, r) => sum + (r.transaction?.amount || 0), 0),
    [validRows]
  );

  const displayedReviewRows = useMemo(() => {
    if (reviewFilter === 'valid') return validRows;
    if (reviewFilter === 'errors') return errorRows;
    return validatedRows;
  }, [reviewFilter, validRows, errorRows, validatedRows]);

  if (!isOpen) return null;

  const ingestCsvText = (text: string, sourceLabel: string) => {
    setParseError(null);
    const { rawRows: parsed } = parseCsvText(text);

    if (parsed.length === 0) {
      setParseError('The CSV source appears to be empty. Please check the file and try again.');
      return;
    }

    const firstRowLooksLikeHeader = parsed.length > 1;
    setRawRows(parsed);
    setFileName(sourceLabel);
    setHasHeaderRow(firstRowLooksLikeHeader);

    if (firstRowLooksLikeHeader) {
      setMapping(autoMapHeaders(parsed[0]));
    } else {
      setMapping(EMPTY_MAPPING);
    }
    setStep('map');
  };

  const handleFileSelected = (file: File | null | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const content = typeof e.target?.result === 'string' ? e.target.result : '';
      ingestCsvText(content, file.name);
    };
    reader.onerror = () => {
      setParseError('Could not read the selected file. Please try again.');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    handleFileSelected(droppedFile);
  };

  const handleToggleHeaderRow = (checked: boolean) => {
    setHasHeaderRow(checked);
    if (checked && rawRows.length > 0) {
      setMapping(autoMapHeaders(rawRows[0]));
    }
  };

  const handleFieldMappingChange = (field: LedgerFieldKey, value: string) => {
    const colIndex = value === '' ? null : Number(value);
    setMapping(prev => ({
      ...prev,
      [field]: colIndex,
    }));
  };

  const handleAutoMatch = () => {
    if (columnHeaders.length === 0) return;
    setMapping(autoMapHeaders(columnHeaders));
    toast.success('Columns matched automatically.');
  };

  const handleDownloadSample = () => {
    const csv = buildSampleCsvTemplate(kind);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tunzua-${kind}-sample.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Sample ${title.toLowerCase()} CSV downloaded.`);
  };

  const handleLoadSampleIntoMapper = () => {
    const sample = buildSampleCsvTemplate(kind);
    ingestCsvText(sample, `tunzua-${kind}-sample.csv`);
  };

  const handleConfirmImport = () => {
    const transactionsToInsert = validRows
      .map(r => r.transaction)
      .filter((tx): tx is NonNullable<typeof tx> => tx !== null);

    if (transactionsToInsert.length === 0) {
      toast.error('No valid rows available to import.');
      return;
    }

    const { insertedCount, skippedDuplicates } = addBulkLedgerTransactions(transactionsToInsert);
    if (insertedCount === 0) {
      toast.error('No entries imported — all selected rows have duplicate invoice/reference numbers.');
      return;
    }

    triggerSync();

    const totalSkipped = errorRows.length + skippedDuplicates.length;
    const skippedNote =
      totalSkipped > 0
        ? ` (${totalSkipped} invalid or duplicate row${totalSkipped === 1 ? '' : 's'} skipped)`
        : '';
    toast.success(
      `Imported ${insertedCount} ${title.toLowerCase()} ${
        insertedCount === 1 ? 'entry' : 'entries'
      }${skippedNote}.`
    );
    onClose();
  };

  const stepItems: { id: ImportStep; num: string; label: string; enabled: boolean }[] = [
    { id: 'upload', num: '01', label: 'Upload CSV', enabled: true },
    { id: 'map', num: '02', label: 'Map Fields', enabled: rawRows.length > 0 },
    {
      id: 'review',
      num: '03',
      label: 'Review & Import',
      enabled: rawRows.length > 0 && requiredFieldsMapped,
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-[#1F1D1A]/45 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 no-print"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-import-modal-title"
    >
      <div
        className="bg-[#FFFDF9] border border-[#E5E0D5] w-full max-w-4xl max-h-[90vh] rounded-xl shadow-xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E0D5] bg-[#F8F6F1] flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2
              id="csv-import-modal-title"
              className="font-display text-lg font-semibold text-[#1F1D1A]"
            >
              Import {title} from CSV
            </h2>
            <p className="text-xs text-[#6B655C] mt-0.5">
              Bulk-enter transactions by mapping your spreadsheet columns to Tunzua ledger fields.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#6B655C] hover:text-[#1F1D1A] hover:bg-[#EFECE4] rounded-lg transition-colors cursor-pointer"
            aria-label="Close CSV import modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="px-6 py-3 border-b border-[#E5E0D5] bg-[#FFFDF9] flex items-center justify-between gap-4 flex-wrap shrink-0">
          <div className="flex items-center gap-6">
            {stepItems.map((item, idx) => {
              const isActive = step === item.id;
              return (
                <React.Fragment key={item.id}>
                  <button
                    type="button"
                    disabled={!item.enabled}
                    onClick={() => item.enabled && setStep(item.id)}
                    className={`flex items-center gap-2 text-xs transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'text-[#1B4D3E] font-semibold'
                        : item.enabled
                        ? 'text-[#6B655C] hover:text-[#1F1D1A] cursor-pointer'
                        : 'text-[#A8A095] cursor-not-allowed'
                    }`}
                  >
                    <span className="font-mono tabular-nums">{item.num}.</span>
                    <span>{item.label}</span>
                  </button>
                  {idx < stepItems.length - 1 && (
                    <span className="text-[#D4CEC2] text-xs select-none" aria-hidden="true">
                      /
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {fileName && (
            <div className="flex items-center gap-2 text-xs text-[#6B655C] truncate max-w-[260px]">
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#1B4D3E] shrink-0" />
              <span className="truncate font-medium text-[#1F1D1A]">{fileName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums shrink-0">{dataRows.length} rows</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: UPLOAD OR PASTE */}
          {step === 'upload' && (
            <div className="space-y-5">
              {/* Mode Switch + Template Action */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-1 p-1 bg-[#F2EFE9] rounded-lg border border-[#E5E0D5]">
                  <button
                    type="button"
                    onClick={() => setInputMode('file')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      inputMode === 'file'
                        ? 'bg-[#FFFDF9] text-[#1F1D1A] shadow-xs'
                        : 'text-[#6B655C] hover:text-[#1F1D1A]'
                    }`}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('paste')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      inputMode === 'paste'
                        ? 'bg-[#FFFDF9] text-[#1F1D1A] shadow-xs'
                        : 'text-[#6B655C] hover:text-[#1F1D1A]'
                    }`}
                  >
                    Paste CSV / TSV
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleLoadSampleIntoMapper}
                    className="text-xs font-medium text-[#1B4D3E] hover:underline cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Try Sample Data
                  </button>
                  <span className="text-[#D4CEC2]" aria-hidden="true">
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadSample}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B655C] hover:text-[#1F1D1A] cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Sample CSV
                  </button>
                </div>
              </div>

              {inputMode === 'file' ? (
                <div
                  onDragOver={e => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
                    isDragging
                      ? 'border-[#1B4D3E] bg-[#1B4D3E]/5'
                      : 'border-[#CFC8BA] bg-[#F8F6F1] hover:border-[#1B4D3E]/60 hover:bg-[#F4F0E8]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
                    className="hidden"
                    onChange={e => {
                      handleFileSelected(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                  <div className="w-11 h-11 rounded-lg bg-[#FFFDF9] border border-[#E5E0D5] flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-5 h-5 text-[#1B4D3E]" />
                  </div>
                  <p className="text-sm font-medium text-[#1F1D1A]">
                    Drop your CSV file here, or click to browse
                  </p>
                  <p className="text-xs text-[#6B655C] mt-1">
                    Supports comma, semicolon, or tab-separated files (.csv, .tsv, .txt)
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-[#6B655C]">
                    Paste rows copied from Excel, Google Sheets, or any CSV file
                  </label>
                  <textarea
                    rows={8}
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    placeholder={`Date,Reference,Narration,Debit Account,Credit Account,Amount,Status\n2026-07-02,INV-101,Client Retainer,Corporate Bank Account,Revenue Account,2450.00,Cleared`}
                    className="w-full p-3.5 bg-[#F8F6F1] border border-[#E5E0D5] rounded-xl font-mono text-xs text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={!pasteText.trim()}
                      onClick={() => ingestCsvText(pasteText, 'Pasted CSV Data')}
                      className="px-4 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] disabled:opacity-45 disabled:cursor-not-allowed text-[#FFFDF9] font-semibold text-xs rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      Continue to Field Mapping
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {parseError && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-lg border border-[#F5C2C7] bg-[#FEF2F2] text-xs text-[#991B1B]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Quiet Guidance Footer */}
              <div className="pt-4 border-t border-[#E5E0D5] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[#6B655C]">
                <div>
                  <div className="font-medium text-[#1F1D1A]">Required Fields</div>
                  <p className="mt-0.5">
                    Date, Narration / Description, and Amount must be mapped to import rows.
                  </p>
                </div>
                <div>
                  <div className="font-medium text-[#1F1D1A]">Smart Account Defaults</div>
                  <p className="mt-0.5">
                    Leave Debit, Credit, Reference, or Status unmapped to auto-fill ledger defaults.
                  </p>
                </div>
                <div>
                  <div className="font-medium text-[#1F1D1A]">Pre-Import Validation</div>
                  <p className="mt-0.5">
                    Review every parsed row and skip formatting errors before posting to your books.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: FIELD MAPPING */}
          {step === 'map' && (
            <div className="space-y-6">
              {/* Top Controls Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E5E0D5]">
                <label className="inline-flex items-center gap-2 text-xs text-[#1F1D1A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasHeaderRow}
                    onChange={e => handleToggleHeaderRow(e.target.checked)}
                    className="w-4 h-4 accent-[#1B4D3E] rounded"
                  />
                  <span className="font-medium">First row contains column headers</span>
                </label>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleAutoMatch}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1B4D3E] bg-[#F8F6F1] hover:bg-[#EFECE4] border border-[#E5E0D5] rounded-lg cursor-pointer transition-colors whitespace-nowrap shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Auto-Match Columns
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapping(EMPTY_MAPPING)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6B655C] hover:text-[#1F1D1A] cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Clear
                  </button>
                </div>
              </div>

              {/* Column Mapping Table */}
              <div className="border border-[#E5E0D5] rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E0D5] bg-[#F8F6F1] text-[#6B655C] font-medium">
                      <th className="py-2.5 px-4 w-[34%]">Ledger Field</th>
                      <th className="py-2.5 px-4 w-[36%]">CSV Column</th>
                      <th className="py-2.5 px-4 w-[30%]">First Row Sample</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E0D5] bg-[#FFFDF9]">
                    {visibleFields.map(field => {
                      const selectedCol = mapping[field.key];
                      const sampleVal =
                        selectedCol !== null ? columnSamples[selectedCol] || '—' : '';

                      return (
                        <tr key={field.key} className="hover:bg-[#F8F6F1]/50">
                          <td className="py-3 px-4 align-middle">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[#1F1D1A]">{field.label}</span>
                              <span aria-hidden="true" className="text-[#D4CEC2]">
                                ·
                              </span>
                              <span
                                className={
                                  field.required
                                    ? 'text-[#B45309] font-medium'
                                    : 'text-[#8C8479]'
                                }
                              >
                                {field.required ? 'Required' : 'Optional'}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#8C8479] mt-0.5">{field.hint}</div>
                          </td>

                          <td className="py-3 px-4 align-middle">
                            <select
                              value={selectedCol === null ? '' : String(selectedCol)}
                              onChange={e => handleFieldMappingChange(field.key, e.target.value)}
                              aria-label={`Map ${field.label} to CSV column`}
                              className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-[#1B4D3E] ${
                                selectedCol !== null
                                  ? 'bg-[#FFFDF9] border-[#CFC8BA] text-[#1F1D1A] font-medium'
                                  : field.required
                                  ? 'bg-[#FFFBEB] border-[#E8D5A3] text-[#6B655C]'
                                  : 'bg-[#F8F6F1] border-[#E5E0D5] text-[#6B655C]'
                              }`}
                            >
                              <option value="">
                                {field.required
                                  ? 'Select CSV column...'
                                  : 'Do not map (use default)'}
                              </option>
                              {columnHeaders.map((header, idx) => {
                                const preview = columnSamples[idx];
                                const shortPreview =
                                  preview.length > 26 ? `${preview.slice(0, 26)}…` : preview;
                                return (
                                  <option key={idx} value={String(idx)}>
                                    {header}
                                    {shortPreview ? ` — e.g. "${shortPreview}"` : ''}
                                  </option>
                                );
                              })}
                            </select>
                          </td>

                          <td className="py-3 px-4 align-middle font-mono text-[11px] text-[#6B655C]">
                            {selectedCol !== null ? (
                              <span className="text-[#1F1D1A] break-all">{sampleVal}</span>
                            ) : (
                              <span className="italic text-[#9C9488]">
                                {field.key === 'debitAccount'
                                  ? `Default: ${defaults.debitAccount || '—'}`
                                  : field.key === 'creditAccount'
                                  ? `Default: ${defaults.creditAccount || '—'}`
                                  : field.key === 'isBankCleared'
                                  ? `Default: ${defaults.isBankCleared ? 'Cleared' : 'Pending'}`
                                  : field.key === 'reference'
                                  ? 'Auto-numbered'
                                  : field.key === 'type'
                                  ? `Default: ${defaults.transactionType.replace(/_/g, ' ')}`
                                  : 'Not mapped'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Fallback Defaults for Unmapped or Blank Cells */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-[#1F1D1A]">
                    Fallback Defaults for Unmapped or Blank Values
                  </h3>
                  <span className="text-[11px] text-[#8C8479]">
                    Applied whenever an optional column is left unmapped or empty
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#6B655C] mb-1">
                      Default Debit Account (Dr)
                    </label>
                    <input
                      type="text"
                      value={defaults.debitAccount}
                      onChange={e =>
                        setDefaults(prev => ({ ...prev, debitAccount: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-xs text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#6B655C] mb-1">
                      Default Credit Account (Cr)
                    </label>
                    <input
                      type="text"
                      value={defaults.creditAccount}
                      onChange={e =>
                        setDefaults(prev => ({ ...prev, creditAccount: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-xs text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                    />
                  </div>

                  {kind === 'receipts' && (
                    <div>
                      <label className="block text-[11px] font-medium text-[#6B655C] mb-1">
                        Default Receipt Sub-Type
                      </label>
                      <select
                        value={defaults.transactionType}
                        onChange={e =>
                          setDefaults(prev => ({
                            ...prev,
                            transactionType: e.target.value as TransactionType,
                          }))
                        }
                        className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-xs text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                      >
                        <option value="other_income">Sundry Receipt / Income</option>
                        <option value="capital_contribution">Partner Capital Contribution</option>
                      </select>
                    </div>
                  )}

                  {kind === 'payments' && (
                    <div>
                      <label className="block text-[11px] font-medium text-[#6B655C] mb-1">
                        Default Payment Category
                      </label>
                      <select
                        value={defaults.transactionType}
                        onChange={e =>
                          setDefaults(prev => ({
                            ...prev,
                            transactionType: e.target.value as TransactionType,
                          }))
                        }
                        className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-xs text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                      >
                        <option value="other_expense">Operating Expense</option>
                        <option value="tax_payment">Tax Payment</option>
                        <option value="salary_payment">Payroll Settlement</option>
                      </select>
                    </div>
                  )}

                  <div className="flex items-end">
                    <label className="w-full flex items-center gap-2 px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={defaults.isBankCleared}
                        onChange={e =>
                          setDefaults(prev => ({ ...prev, isBankCleared: e.target.checked }))
                        }
                        className="w-4 h-4 accent-[#1B4D3E] rounded"
                      />
                      <span className="text-xs text-[#1F1D1A] font-medium">
                        Mark bank cleared by default
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & IMPORT */}
          {step === 'review' && (
            <div className="space-y-5">
              {/* Summary Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#F8F6F1] border border-[#E5E0D5]">
                  <div className="text-xs text-[#6B655C]">Valid Entries Ready</div>
                  <div className="mt-1.5 font-mono tabular-nums text-xl font-semibold text-[#157347]">
                    {validRows.length}{' '}
                    <span className="text-xs font-sans font-normal text-[#6B655C]">
                      of {validatedRows.length} rows
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F8F6F1] border border-[#E5E0D5]">
                  <div className="text-xs text-[#6B655C]">Rows with Issues</div>
                  <div
                    className={`mt-1.5 font-mono tabular-nums text-xl font-semibold ${
                      errorRows.length > 0 ? 'text-[#B91C1C]' : 'text-[#1F1D1A]'
                    }`}
                  >
                    {errorRows.length}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F8F6F1] border border-[#E5E0D5]">
                  <div className="text-xs text-[#6B655C]">Total Import Value</div>
                  <div className="mt-1.5 font-mono tabular-nums text-xl font-semibold text-[#1F1D1A]">
                    {formatMoney(totalImportAmount)}
                  </div>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-1 p-1 bg-[#F2EFE9] rounded-lg border border-[#E5E0D5]">
                  <button
                    type="button"
                    onClick={() => setReviewFilter('all')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      reviewFilter === 'all'
                        ? 'bg-[#FFFDF9] text-[#1F1D1A] shadow-xs'
                        : 'text-[#6B655C] hover:text-[#1F1D1A]'
                    }`}
                  >
                    All ({validatedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewFilter('valid')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      reviewFilter === 'valid'
                        ? 'bg-[#FFFDF9] text-[#1F1D1A] shadow-xs'
                        : 'text-[#6B655C] hover:text-[#1F1D1A]'
                    }`}
                  >
                    Valid ({validRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewFilter('errors')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      reviewFilter === 'errors'
                        ? 'bg-[#FFFDF9] text-[#1F1D1A] shadow-xs'
                        : 'text-[#6B655C] hover:text-[#1F1D1A]'
                    }`}
                  >
                    Issues ({errorRows.length})
                  </button>
                </div>

                {errorRows.length > 0 && (
                  <p className="text-xs text-[#6B655C]">
                    Rows with issues will be skipped on import. You can go back to adjust column
                    mappings.
                  </p>
                )}
              </div>

              {/* Preview Table */}
              <div className="border border-[#E5E0D5] rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-[#E5E0D5] bg-[#F8F6F1] text-[#6B655C] font-medium">
                        <th className="py-2.5 px-3">Row</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Reference</th>
                        <th className="py-2.5 px-3">Narration</th>
                        <th className="py-2.5 px-3">Dr / Cr Accounts</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                        <th className="py-2.5 px-3">Check</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E0D5] bg-[#FFFDF9]">
                      {displayedReviewRows.map(row => {
                        const tx = row.transaction;
                        return (
                          <tr
                            key={row.rowIndex}
                            className={tx ? 'hover:bg-[#F8F6F1]/60' : 'bg-[#FEF2F2]/50'}
                          >
                            <td className="py-2.5 px-3 font-mono tabular-nums text-[#8C8479] whitespace-nowrap">
                              {row.rowIndex}
                            </td>
                            <td className="py-2.5 px-3 font-mono tabular-nums text-[#1F1D1A] whitespace-nowrap">
                              {tx ? tx.date : mapping.date !== null ? row.rawValues[mapping.date] || '—' : '—'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[#1B4D3E] whitespace-nowrap">
                              {tx ? tx.reference : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-[#1F1D1A] max-w-[220px] truncate">
                              {tx
                                ? tx.description
                                : mapping.description !== null
                                ? row.rawValues[mapping.description] || '—'
                                : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-[#6B655C]">
                              {tx ? (
                                <div className="leading-tight">
                                  <div className="text-[#1F1D1A]">Dr: {tx.debitAccount}</div>
                                  <div className="text-[11px] text-[#8C8479]">
                                    Cr: {tx.creditAccount}
                                  </div>
                                </div>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-[#1F1D1A] whitespace-nowrap">
                              {tx
                                ? formatMoney(tx.amount)
                                : mapping.amount !== null
                                ? row.rawValues[mapping.amount] || '—'
                                : '—'}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {tx ? (
                                <span className="inline-flex items-center gap-1 text-[#157347] font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  Ready
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[#B91C1C] font-medium">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  {row.errors.join(', ')}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {displayedReviewRows.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 px-4 text-center text-[#6B655C]">
                            No rows match this filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E5E0D5] bg-[#F8F6F1] flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#6B655C]">
            {step === 'map' && !requiredFieldsMapped && (
              <span className="text-[#B45309] font-medium">
                Map Date, Narration, and Amount to continue.
              </span>
            )}
            {step === 'map' && requiredFieldsMapped && (
              <span>
                <span className="font-mono tabular-nums font-semibold text-[#157347]">
                  {validRows.length}
                </span>{' '}
                valid{' '}
                {errorRows.length > 0 && (
                  <>
                    ·{' '}
                    <span className="font-mono tabular-nums font-semibold text-[#B91C1C]">
                      {errorRows.length}
                    </span>{' '}
                    with issues
                  </>
                )}
              </span>
            )}
            {step === 'review' && (
              <span>
                Importing into <span className="font-medium text-[#1F1D1A]">{title}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === 'upload' && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#6B655C] hover:text-[#1F1D1A] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
            )}

            {step === 'map' && (
              <>
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-3.5 py-2 text-xs font-medium text-[#6B655C] hover:text-[#1F1D1A] rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
                <button
                  type="button"
                  disabled={!requiredFieldsMapped || dataRows.length === 0}
                  onClick={() => setStep('review')}
                  className="px-4 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] disabled:opacity-45 disabled:cursor-not-allowed text-[#FFFDF9] font-semibold text-xs rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                >
                  Review Rows
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {step === 'review' && (
              <>
                <button
                  type="button"
                  onClick={() => setStep('map')}
                  className="px-3.5 py-2 text-xs font-medium text-[#6B655C] hover:text-[#1F1D1A] rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Edit Mapping
                </button>
                <button
                  type="button"
                  disabled={validRows.length === 0}
                  onClick={handleConfirmImport}
                  className="px-5 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] disabled:opacity-45 disabled:cursor-not-allowed text-[#FFFDF9] font-semibold text-xs rounded-lg cursor-pointer transition-colors whitespace-nowrap shrink-0"
                >
                  Import {validRows.length} {validRows.length === 1 ? 'Entry' : 'Entries'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
