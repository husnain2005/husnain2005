import React from 'react';
import { WifiOff, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import useNetworkStatus from '../hooks/useNetworkStatus';

/**
 * OfflineBanner - Displays sync/offline status at the top of the application
 *
 * States:
 * - Offline (yellow): "Sei offline - I dati potrebbero non essere aggiornati"
 * - Syncing (blue): "Sincronizzazione in corso... (X azioni in coda)"
 * - Completed (green): "Sincronizzazione completata" (auto-hides after 3s)
 * - Partial (orange): "Sincronizzazione parziale: X riuscite, Y fallite"
 * - Hidden: When online and no sync activity
 */
export default function OfflineBanner() {
  const { isOnline, pendingCount, syncStatus, syncMessage, triggerSync } = useNetworkStatus();

  // Don't show anything when online and idle with no pending items
  if (isOnline && syncStatus === 'idle' && pendingCount === 0) {
    return null;
  }

  // Determine banner style and content
  let bgColor, textColor, borderColor, icon, message;

  if (!isOnline) {
    // Offline state
    bgColor = 'bg-yellow-50';
    textColor = 'text-yellow-800';
    borderColor = 'border-yellow-300';
    icon = <WifiOff className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />;
    message = pendingCount > 0
      ? `Sei offline - ${pendingCount} ${pendingCount === 1 ? 'azione in sospeso' : 'azioni in sospeso'}`
      : 'Sei offline - I dati potrebbero non essere aggiornati';
  } else if (syncStatus === 'syncing') {
    // Syncing state
    bgColor = 'bg-blue-50';
    textColor = 'text-blue-800';
    borderColor = 'border-blue-300';
    icon = <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 animate-spin" />;
    message = syncMessage || `Sincronizzazione in corso... (${pendingCount} azioni in coda)`;
  } else if (syncStatus === 'completed' || syncStatus === 'cleared') {
    // Completed state
    bgColor = 'bg-green-50';
    textColor = 'text-green-800';
    borderColor = 'border-green-300';
    icon = <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />;
    message = syncMessage || 'Sincronizzazione completata';
  } else if (syncStatus === 'partial') {
    // Partial sync (some failures)
    bgColor = 'bg-orange-50';
    textColor = 'text-orange-800';
    borderColor = 'border-orange-300';
    icon = <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />;
    message = syncMessage || 'Sincronizzazione parziale';
  } else if (syncStatus === 'queued') {
    // Queued new action while online (will sync shortly)
    bgColor = 'bg-blue-50';
    textColor = 'text-blue-700';
    borderColor = 'border-blue-200';
    icon = <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />;
    message = syncMessage || `${pendingCount} ${pendingCount === 1 ? 'azione' : 'azioni'} in coda`;
  } else if (pendingCount > 0) {
    // Online but has pending items (waiting to sync)
    bgColor = 'bg-yellow-50';
    textColor = 'text-yellow-800';
    borderColor = 'border-yellow-300';
    icon = <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />;
    message = `${pendingCount} ${pendingCount === 1 ? 'azione' : 'azioni'} da sincronizzare`;
  } else {
    return null;
  }

  return (
    <div
      className={`${bgColor} ${textColor} ${borderColor} border-b px-3 py-2 sm:px-4 sm:py-2.5`}
      role="status"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {icon}
          <span className="text-xs sm:text-sm font-medium truncate">
            {message}
          </span>
        </div>

        {/* Show sync button when online and there are pending actions */}
        {isOnline && pendingCount > 0 && syncStatus !== 'syncing' && (
          <button
            onClick={triggerSync}
            className={`flex-shrink-0 text-xs sm:text-sm font-semibold px-2 py-1 sm:px-3 sm:py-1.5 rounded
              ${bgColor === 'bg-yellow-50' ? 'bg-yellow-200 hover:bg-yellow-300 text-yellow-900' : ''}
              ${bgColor === 'bg-blue-50' ? 'bg-blue-200 hover:bg-blue-300 text-blue-900' : ''}
              ${bgColor === 'bg-orange-50' ? 'bg-orange-200 hover:bg-orange-300 text-orange-900' : ''}
              transition-colors duration-150`}
          >
            Sincronizza
          </button>
        )}
      </div>
    </div>
  );
}
