import api from './api';
import {
  cacheData,
  getCachedData,
  getCachedById,
  queueAction,
  syncPendingActions,
  getOnlineStatus,
  SYNC_EVENT
} from './syncService';

/**
 * Map API endpoints to IndexedDB store names
 */
const ENDPOINT_STORE_MAP = {
  '/machines': 'machines',
  '/issues': 'issues',
  '/customers': 'customers'
};

/**
 * Resolve the store name from an API endpoint
 * e.g., '/machines/123' -> 'machines', '/issues?status=open' -> 'issues'
 */
function resolveStoreName(endpoint) {
  const cleanPath = endpoint.split('?')[0]; // remove query params
  for (const [pattern, store] of Object.entries(ENDPOINT_STORE_MAP)) {
    if (cleanPath === pattern || cleanPath.startsWith(pattern + '/')) {
      return store;
    }
  }
  return null;
}

/**
 * Extract an ID from an endpoint path
 * e.g., '/machines/42' -> 42, '/machines' -> null
 */
function extractId(endpoint) {
  const cleanPath = endpoint.split('?')[0];
  const parts = cleanPath.split('/').filter(Boolean);
  if (parts.length >= 2) {
    const potentialId = Number(parts[1]);
    if (!isNaN(potentialId) && potentialId > 0) {
      return potentialId;
    }
  }
  return null;
}

/**
 * Offline-aware GET request
 * Strategy: Network first, fallback to IndexedDB cache
 */
async function offlineGet(endpoint, config = {}) {
  const storeName = resolveStoreName(endpoint);
  const id = extractId(endpoint);

  if (getOnlineStatus()) {
    try {
      const response = await api.get(endpoint, config);

      // Cache the response data for offline use
      if (storeName && response.data) {
        const dataToCache = response.data.data || response.data;
        if (dataToCache) {
          await cacheData(storeName, dataToCache);
        }
      }

      return response;
    } catch (error) {
      // If network fails even though we think we're online, try cache
      if (storeName) {
        console.warn(`[OfflineApi] Network request failed, falling back to cache for ${endpoint}`);
        return await fallbackToCache(storeName, id, config);
      }
      throw error;
    }
  }

  // Offline: serve from cache
  if (storeName) {
    return await fallbackToCache(storeName, id, config);
  }

  throw new Error('Sei offline e i dati richiesti non sono disponibili nella cache locale.');
}

/**
 * Fallback to IndexedDB cache for GET requests
 */
async function fallbackToCache(storeName, id, config = {}) {
  if (id) {
    const record = await getCachedById(storeName, id);
    if (record) {
      return {
        data: record,
        status: 200,
        statusText: 'OK (cached)',
        _fromCache: true
      };
    }
    throw new Error(`Record non trovato nella cache locale (${storeName}/${id}).`);
  }

  const params = config.params || {};
  const records = await getCachedData(storeName, params);
  return {
    data: { data: records, total: records.length, _fromCache: true },
    status: 200,
    statusText: 'OK (cached)',
    _fromCache: true
  };
}

/**
 * Offline-aware POST request
 * If online: execute normally and cache result
 * If offline: queue for later sync
 */
async function offlinePost(endpoint, data, config = {}) {
  const storeName = resolveStoreName(endpoint);

  if (getOnlineStatus()) {
    try {
      const response = await api.post(endpoint, data, config);

      // Cache the newly created record
      if (storeName && response.data) {
        const created = response.data.data || response.data;
        if (created && created.id) {
          await cacheData(storeName, created);
        }
      }

      return response;
    } catch (error) {
      // If it's a network error (not a server validation error), queue it
      if (!error.response && storeName) {
        return await queueWrite('create', endpoint, 'POST', data, storeName);
      }
      throw error;
    }
  }

  // Offline: queue the action
  if (storeName) {
    return await queueWrite('create', endpoint, 'POST', data, storeName);
  }

  throw new Error('Sei offline. Questa operazione non puo\' essere eseguita offline.');
}

/**
 * Offline-aware PUT request
 * If online: execute normally and cache result
 * If offline: queue for later sync
 */
async function offlinePut(endpoint, data, config = {}) {
  const storeName = resolveStoreName(endpoint);

  if (getOnlineStatus()) {
    try {
      const response = await api.put(endpoint, data, config);

      // Cache the updated record
      if (storeName && response.data) {
        const updated = response.data.data || response.data;
        if (updated && updated.id) {
          await cacheData(storeName, updated);
        }
      }

      return response;
    } catch (error) {
      if (!error.response && storeName) {
        return await queueWrite('update', endpoint, 'PUT', data, storeName);
      }
      throw error;
    }
  }

  if (storeName) {
    return await queueWrite('update', endpoint, 'PUT', data, storeName);
  }

  throw new Error('Sei offline. Questa operazione non puo\' essere eseguita offline.');
}

/**
 * Offline-aware DELETE request
 * If online: execute normally and remove from cache
 * If offline: queue for later sync
 */
async function offlineDelete(endpoint, config = {}) {
  const storeName = resolveStoreName(endpoint);
  const id = extractId(endpoint);

  if (getOnlineStatus()) {
    try {
      const response = await api.delete(endpoint, config);

      // Remove from local cache
      if (storeName && id) {
        try {
          const db = (await import('./offlineDb')).default;
          await db[storeName].delete(id);
        } catch (e) {
          // Ignore cache removal errors
        }
      }

      return response;
    } catch (error) {
      if (!error.response && storeName) {
        return await queueWrite('delete', endpoint, 'DELETE', null, storeName);
      }
      throw error;
    }
  }

  if (storeName) {
    return await queueWrite('delete', endpoint, 'DELETE', null, storeName);
  }

  throw new Error('Sei offline. Questa operazione non puo\' essere eseguita offline.');
}

/**
 * Queue a write operation and return a mock response
 */
async function queueWrite(type, endpoint, method, data, storeName) {
  const actionType = `${type}_${storeName}`;
  await queueAction(actionType, endpoint, method, data);

  return {
    data: {
      message: 'Operazione salvata in locale. Verra\' sincronizzata quando tornerai online.',
      _queued: true,
      _offline: true
    },
    status: 202,
    statusText: 'Accepted (queued offline)',
    _queued: true
  };
}

/**
 * Setup automatic sync when coming back online
 */
function setupAutoSync() {
  let syncing = false;

  const handleOnline = async () => {
    if (syncing) return;
    syncing = true;

    try {
      // Small delay to ensure stable connection
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (getOnlineStatus()) {
        await syncPendingActions();
      }
    } catch (error) {
      console.error('[OfflineApi] Auto-sync failed:', error);
    } finally {
      syncing = false;
    }
  };

  window.addEventListener('online', handleOnline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
  };
}

// Initialize auto-sync
const cleanupAutoSync = setupAutoSync();

/**
 * Offline-aware API wrapper
 * Drop-in replacement for direct api calls that adds offline support
 */
const offlineApi = {
  get: offlineGet,
  post: offlinePost,
  put: offlinePut,
  delete: offlineDelete,

  // Re-export sync utilities
  syncPendingActions,
  getOnlineStatus,
  SYNC_EVENT,

  // Cleanup function for teardown
  cleanup: cleanupAutoSync
};

export default offlineApi;
