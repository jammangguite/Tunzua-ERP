import React, { useState } from 'react';
import { Download, ExternalLink, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Logo } from './Logo';

const DISMISS_KEY = 'tunzua_install_banner_dismissed';

export const OneClickInstallBanner: React.FC = () => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isInIframe,
    isDevPreviewHost,
    installing,
    standaloneInstallUrl,
    install,
  } = usePWAInstall();

  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    // Always surface the banner when the user explicitly launched via ?install=1
    const params = new URLSearchParams(window.location.search);
    if (params.get('install') === '1') return false;
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  });

  if (isInstalled || dismissed) {
    return null;
  }

  // Only show the banner when one-click install is immediately ready,
  // or when inside an embedded preview where one click opens the standalone tab.
  if (!isInstallable && !isInIframe && !isIOS) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore storage restrictions
    }
  };

  const handleInstallNow = async () => {
    const accepted = await install();
    if (accepted) {
      toast.success('Tunzua installed as a standalone app.');
    }
  };

  return (
    <div className="mb-5 px-4 py-3 bg-[#FFFDF9] border border-[#C7DFD6] rounded-xl flex flex-wrap items-center justify-between gap-3 no-print">
      <div className="flex items-center gap-3 min-w-0">
        <Logo size={32} className="rounded-md shrink-0" />
        <div className="min-w-0">
          <div className="text-xs font-semibold text-[#1F1D1A]">
            Install Tunzua as a Standalone App
          </div>
          <p className="text-xs text-[#6B655C] mt-0.5">
            {isDevPreviewHost
              ? 'Note: You are on the temporary dev preview URL. For an installed app that opens without Google AI Studio, deploy/share the app first and install from the deployed link.'
              : isInstallable
              ? 'One-click install for instant launch from your desktop or home screen with offline ledger access.'
              : isInIframe
              ? 'Open Tunzua in a full browser tab to trigger one-click standalone installation.'
              : 'Tap Share → Add to Home Screen in Safari to run Tunzua full-screen offline.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isInstallable ? (
          <button
            type="button"
            disabled={installing}
            onClick={handleInstallNow}
            className="px-3.5 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            {installing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : (
              <Download className="w-3.5 h-3.5 shrink-0" />
            )}
            {installing ? 'Installing...' : 'Install Now'}
          </button>
        ) : isInIframe ? (
          <a
            href={standaloneInstallUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            Open &amp; Install
          </a>
        ) : null}

        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 text-[#6B655C] hover:text-[#1F1D1A] hover:bg-[#F2EFE9] rounded-lg transition-colors cursor-pointer"
          aria-label="Dismiss install banner"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
