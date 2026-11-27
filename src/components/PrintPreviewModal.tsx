import React, { useState, useEffect, useRef } from 'react';
import { Printer, X, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

export type PaperSize = 'A4' | 'letter';
export type PageOrientation = 'portrait' | 'landscape';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceRef: React.RefObject<HTMLElement | null>;
  documentTitle: string;
}

const SHEET_DIMENSIONS: Record<
  PaperSize,
  Record<PageOrientation, { widthPx: number; minHeightPx: number; label: string }>
> = {
  A4: {
    portrait: { widthPx: 794, minHeightPx: 1123, label: '210 × 297 mm' },
    landscape: { widthPx: 1123, minHeightPx: 794, label: '297 × 210 mm' },
  },
  letter: {
    portrait: { widthPx: 816, minHeightPx: 1056, label: '8.5 × 11 in' },
    landscape: { widthPx: 1056, minHeightPx: 816, label: '11 × 8.5 in' },
  },
};

const ZOOM_STEPS = [0.65, 0.75, 0.85, 1, 1.15];

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  sourceRef,
  documentTitle,
}) => {
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [orientation, setOrientation] = useState<PageOrientation>('portrait');
  const [zoom, setZoom] = useState<number>(0.85);
  const [includeLetterhead, setIncludeLetterhead] = useState<boolean>(true);
  const [refreshTick, setRefreshTick] = useState<number>(0);

  const previewHostRef = useRef<HTMLDivElement>(null);

  // Sync dynamic @page rule & letterhead visibility class on body so real printing matches preview
  useEffect(() => {
    if (!isOpen) return;

    const styleId = 'tunzua-dynamic-print-page';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `@page { size: ${paperSize} ${orientation}; margin: 10mm; }`;

    document.body.classList.toggle('hide-print-letterhead', !includeLetterhead);

    return () => {
      document.body.classList.remove('hide-print-letterhead');
    };
  }, [isOpen, paperSize, orientation, includeLetterhead]);

  // Clone live .workspace-content DOM safely (no raw HTML injection) into the preview sheet
  useEffect(() => {
    if (!isOpen) return;
    const host = previewHostRef.current;
    const source = sourceRef.current;
    if (!host || !source) return;

    while (host.firstChild) {
      host.removeChild(host.firstChild);
    }

    const cloned = source.cloneNode(true) as HTMLElement;

    // Strip duplicate IDs and disable interactive affordances inside the preview copy
    cloned.removeAttribute('id');
    cloned.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    cloned.querySelectorAll('a').forEach(a => {
      a.removeAttribute('href');
      a.setAttribute('tabindex', '-1');
    });

    // Replace inline select/input controls inside table cells with clean readable text so
    // editable tables (like GSTR-1/ITC registers) show their active values clearly in preview
    cloned.querySelectorAll('td select').forEach(sel => {
      const selectEl = sel as HTMLSelectElement;
      const span = document.createElement('span');
      const selectedOption = selectEl.options[selectEl.selectedIndex];
      span.textContent = selectedOption ? selectedOption.text : selectEl.value;
      span.className = 'font-mono text-[9pt] text-[#1F1D1A]';
      selectEl.replaceWith(span);
    });

    cloned.querySelectorAll('td input[type="text"], td input[type="number"]').forEach(inp => {
      const inputEl = inp as HTMLInputElement;
      const span = document.createElement('span');
      span.textContent = inputEl.value || '—';
      span.className = 'font-mono text-[9pt] text-[#1F1D1A]';
      inputEl.replaceWith(span);
    });

    host.appendChild(cloned);
  }, [isOpen, sourceRef, refreshTick]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const dims = SHEET_DIMENSIONS[paperSize][orientation];

  const handleZoomIn = () => {
    const next = ZOOM_STEPS.find(z => z > zoom);
    if (next) setZoom(next);
  };

  const handleZoomOut = () => {
    const prev = [...ZOOM_STEPS].reverse().find(z => z < zoom);
    if (prev) setZoom(prev);
  };

  const handlePrintNow = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1F1D1A]/60 backdrop-blur-[2px] flex flex-col no-print"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-preview-title"
    >
      <div
        className="flex flex-col w-full h-full max-w-[1440px] mx-auto sm:p-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col flex-1 bg-[#F2EFE9] border border-[#D5CEBF] sm:rounded-xl shadow-2xl overflow-hidden">
          {/* Top Preview Control Bar */}
          <div className="px-4 sm:px-5 py-3 bg-[#FFFDF9] border-b border-[#E5E0D5] flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#EBF3F0] border border-[#C7DFD6] text-[#1B4D3E] flex items-center justify-center shrink-0">
                <Printer className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2
                  id="print-preview-title"
                  className="font-display text-base font-semibold text-[#1F1D1A] leading-tight truncate"
                >
                  Print Preview — {documentTitle}
                </h2>
                <p className="text-xs text-[#6B655C] truncate">
                  Formatted using Tunzua archival print styles ({paperSize === 'A4' ? 'A4' : 'US Letter'} · {dims.label})
                </p>
              </div>
            </div>

            {/* Layout & Zoom Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Paper Size */}
              <div className="inline-flex p-0.5 bg-[#F2EFE9] border border-[#E5E0D5] rounded-lg">
                {(['A4', 'letter'] as PaperSize[]).map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setPaperSize(size)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      paperSize === size
                        ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                        : 'text-[#6B655C] hover:text-[#1F1D1A]'
                    }`}
                  >
                    {size === 'A4' ? 'A4' : 'Letter'}
                  </button>
                ))}
              </div>

              {/* Orientation */}
              <div className="inline-flex p-0.5 bg-[#F2EFE9] border border-[#E5E0D5] rounded-lg">
                {(['portrait', 'landscape'] as PageOrientation[]).map(orient => (
                  <button
                    key={orient}
                    type="button"
                    onClick={() => setOrientation(orient)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors cursor-pointer whitespace-nowrap ${
                      orientation === orient
                        ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                        : 'text-[#6B655C] hover:text-[#1F1D1A]'
                    }`}
                  >
                    {orient}
                  </button>
                ))}
              </div>

              {/* Zoom Controls */}
              <div className="inline-flex items-center bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoom <= ZOOM_STEPS[0]}
                  className="p-1.5 text-[#6B655C] hover:text-[#1F1D1A] disabled:opacity-35 cursor-pointer"
                  title="Zoom out"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-xs font-mono tabular-nums text-[#1F1D1A] min-w-[46px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
                  className="p-1.5 text-[#6B655C] hover:text-[#1F1D1A] disabled:opacity-35 cursor-pointer"
                  title="Zoom in"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Letterhead Toggle */}
              <label className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-xs text-[#1F1D1A] cursor-pointer select-none whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={includeLetterhead}
                  onChange={e => setIncludeLetterhead(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#1B4D3E] cursor-pointer"
                />
                <span>Letterhead</span>
              </label>

              <button
                type="button"
                onClick={() => setRefreshTick(t => t + 1)}
                className="p-2 text-[#6B655C] hover:text-[#1F1D1A] hover:bg-[#F2EFE9] border border-[#E5E0D5] rounded-lg transition-colors cursor-pointer"
                title="Refresh preview"
                aria-label="Refresh preview"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handlePrintNow}
                className="px-4 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Now
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-[#6B655C] hover:text-[#1F1D1A] hover:bg-[#EAE5DB] rounded-lg transition-colors cursor-pointer"
                aria-label="Close print preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Paper Desk Stage */}
          <div className="flex-1 overflow-auto p-6 sm:p-8 bg-[#E5E0D5]/70 flex justify-center items-start">
            <div
              style={{
                width: `${dims.widthPx * zoom}px`,
                minHeight: `${dims.minHeightPx * zoom}px`,
              }}
              className="shrink-0"
            >
              <div
                style={{
                  width: `${dims.widthPx}px`,
                  minHeight: `${dims.minHeightPx}px`,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                }}
                className={`print-preview-sheet bg-white border border-[#D5CEBF] shadow-xl rounded-xs px-10 py-9 pointer-events-none select-text ${
                  includeLetterhead ? '' : 'hide-print-letterhead'
                }`}
              >
                <div ref={previewHostRef} />
              </div>
            </div>
          </div>

          {/* Quiet Status Footer */}
          <div className="px-5 py-2.5 bg-[#FFFDF9] border-t border-[#E5E0D5] flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B655C] shrink-0">
            <span>
              Navigation, action buttons, and search bars are automatically hidden by the print stylesheet.
            </span>
            <span className="font-mono text-[11px] text-[#968E82]">
              {paperSize === 'A4' ? 'A4' : 'Letter'} · {orientation} · 10mm margins
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
