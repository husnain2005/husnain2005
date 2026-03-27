import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const DISMISS_KEY = 'cnc-pwa-install-dismissed';

/**
 * InstallPrompt - Catches the beforeinstallprompt event and shows a banner
 * prompting the user to install the app as a PWA.
 *
 * - Shows: "Installa Gestionale Macchine GIANA sul tuo dispositivo"
 * - Buttons: "Installa" and "Chiudi"
 * - Remembers dismissal preference in localStorage
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed the prompt
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = new Date(dismissed);
      const daysSince = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);
      // Re-show after 30 days
      if (daysSince < 30) {
        return;
      }
    }

    const handleBeforeInstall = (e) => {
      // Prevent the default browser install prompt
      e.preventDefault();
      // Store the event for triggering later
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    // Check if already installed as PWA
    const handleAppInstalled = () => {
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);

    try {
      // Show the browser's install prompt
      deferredPrompt.prompt();

      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setShowBanner(false);
      }
    } catch (error) {
      console.error('[InstallPrompt] Installation failed:', error);
    } finally {
      setDeferredPrompt(null);
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDeferredPrompt(null);
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div
      className="bg-blue-600 text-white px-3 py-2.5 sm:px-4 sm:py-3"
      role="banner"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Download className="w-5 h-5 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-medium">
            Installa Gestionale Macchine GIANA sul tuo dispositivo
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            onClick={handleInstall}
            disabled={isInstalling}
            className="bg-white text-blue-600 text-xs sm:text-sm font-semibold
              px-2.5 py-1 sm:px-4 sm:py-1.5 rounded
              hover:bg-blue-50 transition-colors duration-150
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isInstalling ? 'Installazione...' : 'Installa'}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 sm:p-1.5 rounded hover:bg-blue-700 transition-colors duration-150"
            aria-label="Chiudi"
            title="Chiudi"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
