import React, { useState, useEffect } from 'react';
import { Download, ExternalLink, Loader2, Smartphone, X } from 'lucide-react';
import { toast } from 'sonner';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'login';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isInIframe,
    installing,
    standaloneInstallUrl,
    install,
  } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    if (!showGuideModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowGuideModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showGuideModal]);

  // Automatically suppress when already running as an installed standalone app
  if (isInstalled) {
    return null;
  }

  const handleOneClickInstall = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        toast.success('Tunzua installed! You can now launch it directly from your desktop or home screen.');
      }
      return;
    }
    setShowGuideModal(true);
  };

  // When embedded inside an iframe (where browsers suppress native install prompts),
  // provide a true single-click link to launch the standalone URL ready to install.
  const openInTabForOneClick = isInIframe && !isInstallable && !isIOS;

  const buttonIcon = installing ? (
    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
  ) : openInTabForOneClick ? (
    <ExternalLink className="w-3.5 h-3.5 text-[#1B4D3E] shrink-0" />
  ) : isIOS ? (
    <Smartphone className="w-3.5 h-3.5 text-[#1B4D3E] shrink-0" />
  ) : (
    <Download className="w-3.5 h-3.5 text-[#1B4D3E] shrink-0" />
  );

  const label = installing
    ? 'Installing...'
    : isInstallable
    ? 'Install App'
    : isIOS
    ? 'Install on iOS'
    : 'Install App';

  return (
    <>
      {variant === 'header' &&
        (openInTabForOneClick ? (
          <a
            href={standaloneInstallUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-[#EBF3F0] hover:bg-[#DFECE7] text-[#1B4D3E] border border-[#C7DFD6] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            title="Open in full browser tab for one-click app install"
          >
            <Download className="w-3.5 h-3.5 text-[#1B4D3E] shrink-0" />
            <span className="hidden sm:inline">Install App</span>
          </a>
        ) : (
          <button
            type="button"
            disabled={installing}
            onClick={handleOneClickInstall}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60 ${
              isInstallable
                ? 'bg-[#EBF3F0] hover:bg-[#DFECE7] text-[#1B4D3E] border border-[#C7DFD6]'
                : 'bg-[#FFFDF9] hover:bg-[#F2EFE9] text-[#1F1D1A] border border-[#E5E0D5]'
            }`}
            title={isInstallable ? 'One-click install Tunzua as a standalone app' : 'Install Tunzua app'}
          >
            {buttonIcon}
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}

      {variant === 'sidebar' &&
        (openInTabForOneClick ? (
          <a
            href={standaloneInstallUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full px-3 py-2 text-xs font-medium text-[#1F1D1A] hover:bg-[#EAE5DB] rounded-lg transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-[#1B4D3E] shrink-0" />
            Install Standalone App
          </a>
        ) : (
          <button
            type="button"
            disabled={installing}
            onClick={handleOneClickInstall}
            className="w-full px-3 py-2 text-xs font-medium text-[#1F1D1A] hover:bg-[#EAE5DB] rounded-lg transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            {buttonIcon}
            {isInstallable ? 'Install Standalone App' : label}
          </button>
        ))}

      {variant === 'login' && (
        <div className="pt-3 border-t border-[#E5E0D5]">
          {openInTabForOneClick ? (
            <a
              href={standaloneInstallUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#EBF3F0] hover:bg-[#DFECE7] text-[#1B4D3E] border border-[#C7DFD6] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              Install Standalone App (One-Click)
            </a>
          ) : (
            <button
              type="button"
              disabled={installing}
              onClick={handleOneClickInstall}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#EBF3F0] hover:bg-[#DFECE7] text-[#1B4D3E] border border-[#C7DFD6] rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
            >
              {buttonIcon}
              {isInstallable ? 'Install Standalone App (One-Click)' : label}
            </button>
          )}
        </div>
      )}

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 bg-[#1F1D1A]/40 backdrop-blur-[2px] flex items-center justify-center p-4 no-print"
          onClick={() => setShowGuideModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-guide-title"
        >
          <div
            className="w-full max-w-md bg-[#FFFDF9] border border-[#E5E0D5] rounded-xl shadow-lg overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#E5E0D5] bg-[#F8F6F1] flex items-center justify-between gap-3">
              <div>
                <h3
                  id="pwa-install-guide-title"
                  className="font-display text-base font-semibold text-[#1F1D1A]"
                >
                  {isIOS ? 'Install Tunzua on iPhone / iPad' : 'Install Tunzua Standalone App'}
                </h3>
                <p className="text-xs text-[#6B655C] mt-0.5">
                  Run Tunzua in its own window with offline ledger access.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 text-[#6B655C] hover:text-[#1F1D1A] rounded-lg cursor-pointer"
                aria-label="Close install guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-[#1F1D1A] leading-relaxed">
              {isIOS ? (
                <ol className="space-y-2.5 list-decimal list-inside text-[#4B463F]">
                  <li>
                    Tap the <strong className="text-[#1F1D1A]">Share</strong> button in the Safari toolbar.
                  </li>
                  <li>
                    Scroll down and tap <strong className="text-[#1F1D1A]">Add to Home Screen</strong>.
                  </li>
                  <li>
                    Tap <strong className="text-[#1F1D1A]">Add</strong> to launch Tunzua full-screen from your home screen.
                  </li>
                </ol>
              ) : (
                <div className="space-y-3 text-[#4B463F]">
                  <div className="space-y-1.5">
                    <div className="font-medium text-[#1F1D1A]">Desktop (Chrome / Edge / Brave)</div>
                    <p>
                      Click the install icon on the right side of your browser address bar, or open the browser menu and select <strong className="text-[#1F1D1A]">Install Tunzua</strong>.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="font-medium text-[#1F1D1A]">Mobile (Android &amp; iOS)</div>
                    <p>
                      On Android Chrome, open the menu and tap <strong className="text-[#1F1D1A]">Install app</strong>. On iPhone/iPad Safari, tap <strong className="text-[#1F1D1A]">Share → Add to Home Screen</strong>.
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-[#E5E0D5] flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="px-4 py-2 bg-[#F2EFE9] hover:bg-[#E5E0D5] text-[#1F1D1A] font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
