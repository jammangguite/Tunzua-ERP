import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __tunzuaDeferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const standaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone =
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return standaloneMedia || iosStandalone;
}

function detectIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

function detectIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function detectDevPreviewHost(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.startsWith('ais-dev-');
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() =>
    typeof window !== 'undefined' ? window.__tunzuaDeferredPrompt || null : null
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(() => detectStandalone());
  const [isIOS] = useState<boolean>(() => detectIOS());
  const [isInIframe] = useState<boolean>(() => detectIframe());
  const [isDevPreviewHost] = useState<boolean>(() => detectDevPreviewHost());
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const syncPrompt = () => {
      if (window.__tunzuaDeferredPrompt) {
        setDeferredPrompt(window.__tunzuaDeferredPrompt);
      }
    };

    const checkStandalone = () => {
      if (detectStandalone()) {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    };

    syncPrompt();
    checkStandalone();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', checkStandalone);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__tunzuaDeferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      window.__tunzuaDeferredPrompt = null;
      setIsInstalled(true);
      setDeferredPrompt(null);
      setInstalling(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('tunzua-pwa-prompt-ready', syncPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('tunzua-pwa-installed', handleAppInstalled);

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', checkStandalone);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('tunzua-pwa-prompt-ready', syncPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('tunzua-pwa-installed', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    const promptToUse = deferredPrompt || window.__tunzuaDeferredPrompt || null;
    if (!promptToUse) return false;
    setInstalling(true);
    try {
      await promptToUse.prompt();
      const { outcome } = await promptToUse.userChoice;
      if (outcome === 'accepted') {
        window.__tunzuaDeferredPrompt = null;
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } finally {
      setInstalling(false);
    }
  }, [deferredPrompt]);

  const standaloneInstallUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?install=1`
      : '/?install=1';

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isInIframe,
    isDevPreviewHost,
    installing,
    standaloneInstallUrl,
    install,
  };
}
