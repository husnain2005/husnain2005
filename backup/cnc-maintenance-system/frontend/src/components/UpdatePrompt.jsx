import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * UpdatePrompt - Listens for service worker updates and shows a notification
 * when a new version of the app is available.
 *
 * Shows: "Nuova versione disponibile" with "Aggiorna" button
 * Clicking "Aggiorna" triggers the service worker to skip waiting and reloads the page.
 */
export default function UpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    // Only check for SW updates if service workers are supported
    if (!('serviceWorker' in navigator)) return;

    const checkForUpdates = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        setRegistration(reg);

        // Listen for new service worker installation
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            // When the new worker is installed and there's an existing controller,
            // it means an update is available
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              setShowUpdate(true);
            }
          });
        });
      } catch (error) {
        console.error('[UpdatePrompt] Failed to check for updates:', error);
      }
    };

    checkForUpdates();

    // Also listen for the controlling service worker changing
    let refreshing = false;
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      // Tell the waiting service worker to skip waiting and become active
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    setShowUpdate(false);
  };

  if (!showUpdate) {
    return null;
  }

  return (
    <div
      className="bg-indigo-600 text-white px-3 py-2.5 sm:px-4 sm:py-3"
      role="alert"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-medium">
            Nuova versione disponibile
          </span>
        </div>

        <button
          onClick={handleUpdate}
          className="flex-shrink-0 bg-white text-indigo-600 text-xs sm:text-sm font-semibold
            px-2.5 py-1 sm:px-4 sm:py-1.5 rounded
            hover:bg-indigo-50 transition-colors duration-150"
        >
          Aggiorna
        </button>
      </div>
    </div>
  );
}
