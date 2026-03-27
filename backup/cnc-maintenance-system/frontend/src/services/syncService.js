import db from './offlineDb';
import api from './api';

// Custom event for sync status changes
const SYNC_EVENT = 'cnc-sync-status';

function dispatchSyncEvent(detail) {
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail }));
}

/**
 * Cache API response data into IndexedDB
 * @param {string} storeName - The IndexedDB table name (machines, issues, customers)
 * @param {Array|Object} data - Data from API response
 */
export async function cacheData(storeName, data) {
  try {
    const table = db[storeName];
    if (!table) {
      console.warn(`[SyncService] Unknown store: ${storeName}`);
      return;
    }

    const items = Array.isArray(data) ? data : [data];
    if (items.length === 0) return;

    // Use bulkPut to upsert records (insert or update)
    await table.bulkPut(items);

    // Update sync metadata
    await db.syncMeta.put({
      key: `${storeName}_lastSync`,
      value: new Date().toISOString(),
      count: items.length
    });
  } catch (error) {
    console.error(`[SyncService] Failed to cache data for ${storeName}:`, error);
  }
}

/**
 * Retrieve cached data from IndexedDB
 * @param {string} storeName - The IndexedDB table name
 * @param {Object} params - Optional query parameters for filtering
 * @returns {Array} Cached records
 */
export async function getCachedData(storeName, params = {}) {
  try {
    const table = db[storeName];
    if (!table) {
      console.warn(`[SyncService] Unknown store: ${storeName}`);
      return [];
    }

    let collection = table.toCollection();

    // Apply basic filters if provided
    if (params.status) {
      return await table.where('status').equals(params.status).toArray();
    }
    if (params.priority) {
      return await table.where('priority').equals(params.priority).toArray();
    }
    if (params.customer_id) {
      return await table.where('customer_id').equals(Number(params.customer_id)).toArray();
    }
    if (params.machine_id) {
      return await table.where('machine_id').equals(Number(params.machine_id)).toArray();
    }

    return await collection.toArray();
  } catch (error) {
    console.error(`[SyncService] Failed to get cached data for ${storeName}:`, error);
    return [];
  }
}

/**
 * Get a single cached record by ID
 * @param {string} storeName - The IndexedDB table name
 * @param {number|string} id - Record ID
 * @returns {Object|undefined} Cached record
 */
export async function getCachedById(storeName, id) {
  try {
    const table = db[storeName];
    if (!table) return undefined;
    return await table.get(Number(id));
  } catch (error) {
    console.error(`[SyncService] Failed to get cached record ${storeName}/${id}:`, error);
    return undefined;
  }
}

/**
 * Queue an offline write action for later sync
 * @param {string} type - Action type (e.g., 'create_machine', 'update_issue')
 * @param {string} endpoint - API endpoint path
 * @param {string} method - HTTP method (POST, PUT, DELETE)
 * @param {Object} data - Request payload
 * @returns {number} ID of the queued action
 */
export async function queueAction(type, endpoint, method, data) {
  try {
    const id = await db.pendingActions.add({
      type,
      endpoint,
      method,
      data: JSON.parse(JSON.stringify(data || {})),
      created_at: new Date().toISOString(),
      retryCount: 0
    });

    dispatchSyncEvent({
      status: 'queued',
      message: `Azione "${type}" messa in coda per la sincronizzazione`,
      pendingCount: await getPendingCount()
    });

    return id;
  } catch (error) {
    console.error('[SyncService] Failed to queue action:', error);
    throw error;
  }
}

/**
 * Process all pending offline actions
 * Executes queued writes in order and removes them on success
 * Server data wins on conflicts (last-write-wins strategy)
 */
export async function syncPendingActions() {
  const pending = await db.pendingActions.orderBy('id').toArray();

  if (pending.length === 0) {
    return { synced: 0, failed: 0, total: 0 };
  }

  dispatchSyncEvent({
    status: 'syncing',
    message: `Sincronizzazione in corso... (${pending.length} azioni in coda)`,
    pendingCount: pending.length
  });

  let synced = 0;
  let failed = 0;

  for (const action of pending) {
    try {
      const config = {
        method: action.method.toLowerCase(),
        url: action.endpoint,
      };

      // Attach data for non-GET/DELETE methods
      if (['post', 'put', 'patch'].includes(config.method)) {
        config.data = action.data;
      }

      await api(config);

      // Remove successfully synced action
      await db.pendingActions.delete(action.id);
      synced++;
    } catch (error) {
      console.error(`[SyncService] Failed to sync action ${action.id}:`, error);
      failed++;

      // Increment retry count
      await db.pendingActions.update(action.id, {
        retryCount: (action.retryCount || 0) + 1,
        lastError: error.message || 'Unknown error',
        lastAttempt: new Date().toISOString()
      });

      // Remove permanently failed actions (after 10 retries)
      if ((action.retryCount || 0) >= 10) {
        console.warn(`[SyncService] Removing action ${action.id} after 10 failed retries`);
        await db.pendingActions.delete(action.id);
      }
    }
  }

  const remainingCount = await getPendingCount();

  if (failed === 0) {
    dispatchSyncEvent({
      status: 'completed',
      message: 'Sincronizzazione completata',
      pendingCount: remainingCount
    });
  } else {
    dispatchSyncEvent({
      status: 'partial',
      message: `Sincronizzazione parziale: ${synced} riuscite, ${failed} fallite`,
      pendingCount: remainingCount
    });
  }

  return { synced, failed, total: pending.length };
}

/**
 * Check if the browser is online
 * @returns {boolean}
 */
export function getOnlineStatus() {
  return navigator.onLine;
}

/**
 * Get count of pending (unsynced) actions
 * @returns {number}
 */
export async function getPendingCount() {
  try {
    return await db.pendingActions.count();
  } catch (error) {
    console.error('[SyncService] Failed to get pending count:', error);
    return 0;
  }
}

/**
 * Get the last sync timestamp for a given store
 * @param {string} storeName
 * @returns {string|null} ISO date string or null
 */
export async function getLastSyncTime(storeName) {
  try {
    const meta = await db.syncMeta.get(`${storeName}_lastSync`);
    return meta ? meta.value : null;
  } catch (error) {
    return null;
  }
}

/**
 * Clear all cached data (useful for logout)
 */
export async function clearAllCaches() {
  try {
    await Promise.all([
      db.machines.clear(),
      db.issues.clear(),
      db.customers.clear(),
      db.syncMeta.clear()
    ]);
  } catch (error) {
    console.error('[SyncService] Failed to clear caches:', error);
  }
}

/**
 * Clear pending actions (use with caution)
 */
export async function clearPendingActions() {
  try {
    await db.pendingActions.clear();
    dispatchSyncEvent({
      status: 'cleared',
      message: 'Coda azioni in sospeso svuotata',
      pendingCount: 0
    });
  } catch (error) {
    console.error('[SyncService] Failed to clear pending actions:', error);
  }
}

export { SYNC_EVENT };
