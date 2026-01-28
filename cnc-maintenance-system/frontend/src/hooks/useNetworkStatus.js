import { useState, useEffect, useCallback } from 'react';
import { getPendingCount, syncPendingActions, getOnlineStatus, SYNC_EVENT } from '../services/syncService';

/**
 * React hook for tracking network status and offline sync state
 *
 * @returns {{
 *   isOnline: boolean,
 *   pendingCount: number,
 *   syncStatus: 'idle' | 'syncing' | 'completed' | 'partial' | 'queued' | 'cleared',
 *   syncMessage: string,
 *   triggerSync: () => Promise<void>
 * }}
 */
export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(getOnlineStatus());
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [syncMessage, setSyncMessage] = useState('');

  // Load initial pending count
  useEffect(() => {
    getPendingCount().then(setPendingCount);
  }, []);

  // Listen to online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('idle');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen to sync status events
  useEffect(() => {
    const handleSyncEvent = (event) => {
      const { status, message, pendingCount: count } = event.detail;
      setSyncStatus(status);
      setSyncMessage(message || '');

      if (typeof count === 'number') {
        setPendingCount(count);
      }

      // Auto-clear completed status after 3 seconds
      if (status === 'completed' || status === 'cleared') {
        setTimeout(() => {
          setSyncStatus('idle');
          setSyncMessage('');
        }, 3000);
      }
    };

    window.addEventListener(SYNC_EVENT, handleSyncEvent);

    return () => {
      window.removeEventListener(SYNC_EVENT, handleSyncEvent);
    };
  }, []);

  // Auto-trigger sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0 && syncStatus === 'idle') {
      // Delay slightly to avoid racing with the auto-sync in offlineApi
      const timer = setTimeout(async () => {
        try {
          const count = await getPendingCount();
          if (count > 0) {
            await syncPendingActions();
          }
        } catch (error) {
          console.error('[useNetworkStatus] Sync failed:', error);
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingCount, syncStatus]);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (!getOnlineStatus()) {
      setSyncStatus('idle');
      setSyncMessage('Impossibile sincronizzare: sei offline');
      return;
    }

    try {
      await syncPendingActions();
    } catch (error) {
      console.error('[useNetworkStatus] Manual sync failed:', error);
      setSyncStatus('partial');
      setSyncMessage('Errore durante la sincronizzazione');
    }
  }, []);

  return {
    isOnline,
    pendingCount,
    syncStatus,
    syncMessage,
    triggerSync
  };
}
