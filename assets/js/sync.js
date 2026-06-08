/**
 * NPOC Sync Manager
 * Real-time data sync with polling
 * Subscribable change notifications
 * 
 * @author NPOC Engineering
 * @version 2.0
 */

const NPOC_SYNC = (() => {
  let isOnline = navigator.onLine;
  let syncInterval = null;
  let listeners = new Map();
  let lastSyncTimes = {};
  let isSyncing = false;

  // Monitor online/offline
  window.addEventListener('online', () => {
    isOnline = true;
    console.log('[SYNC] Online - initiating sync');
    sync();
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    console.log('[SYNC] Offline');
  });

  /**
   * Subscribe to changes in a collection
   */
  function subscribe(collection, callback) {
    if (!listeners.has(collection)) {
      listeners.set(collection, []);
    }

    const list = listeners.get(collection);
    list.push(callback);

    console.log(`[SYNC] Subscriber added: ${collection} (total: ${list.length})`);

    // Return unsubscribe function
    return () => {
      const index = list.indexOf(callback);
      if (index > -1) list.splice(index, 1);
      console.log(`[SYNC] Subscriber removed: ${collection}`);
    };
  }

  /**
   * Notify all listeners
   */
  function notifyListeners(collection, data) {
    const list = listeners.get(collection) || [];
    console.log(`[SYNC] Notifying ${list.length} listeners for ${collection}`);

    list.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[SYNC] Listener error (${collection}):`, error);
      }
    });
  }

  /**
   * Perform sync
   */
  async function sync() {
    if (isSyncing || !isOnline) return;

    isSyncing = true;
    console.log('[SYNC] Starting sync cycle...');

    try {
      // Sync dashboard (main KPIs)
      const dashboardResult = await NPOC_API_ENHANCED.call('GET_DASHBOARD', 'GET', null, {
        month: document.getElementById('globalMonth')?.value || 'May2026'
      });

      if (dashboardResult && !dashboardResult.queued) {
        console.log('[SYNC] Dashboard data received');
        notifyListeners('dashboard', dashboardResult);
        lastSyncTimes.dashboard = Date.now();
      }

      // Sync admins
      const adminsResult = await NPOC_API_ENHANCED.call('GET_ADMINS', 'GET');
      if (adminsResult && !adminsResult.queued) {
        console.log('[SYNC] Admins data received');
        notifyListeners('admins', adminsResult);
        lastSyncTimes.admins = Date.now();
      }

      // Sync leaderboard
      const leaderboardResult = await NPOC_API_ENHANCED.call('GET_LEADERBOARD', 'GET');
      if (leaderboardResult && !leaderboardResult.queued) {
        console.log('[SYNC] Leaderboard data received');
        notifyListeners('leaderboard', leaderboardResult);
        lastSyncTimes.leaderboard = Date.now();
      }

      console.log('[SYNC] Sync cycle completed');
    } catch (error) {
      console.warn('[SYNC] Error during sync:', error.message);
    } finally {
      isSyncing = false;
    }
  }

  /**
   * Start continuous sync
   */
  function start(intervalMs = 15000) {
    if (syncInterval) {
      console.warn('[SYNC] Already running');
      return;
    }

    console.log(`[SYNC] Starting sync loop (interval: ${intervalMs}ms)`);
    syncInterval = setInterval(() => {
      if (isOnline && !isSyncing) {
        sync();
      }
    }, intervalMs);

    // Initial sync
    sync();
  }

  /**
   * Stop sync
   */
  function stop() {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
      console.log('[SYNC] Stopped');
    }
  }

  /**
   * Get sync status
   */
  function getStatus() {
    return {
      isOnline,
      isSyncing,
      isRunning: syncInterval !== null,
      lastSyncTimes,
      listenerCount: Array.from(listeners.values()).reduce((sum, list) => sum + list.length, 0)
    };
  }

  /**
   * Trigger manual sync
   */
  async function syncNow() {
    console.log('[SYNC] Manual sync triggered');
    await sync();
  }

  return {
    start,
    stop,
    sync: syncNow,
    subscribe,
    getStatus
  };
})();

// Auto-start only when backend mode is configured.
// This prevents noisy failed polling while the app is still in local/demo mode.
function shouldAutoStartSync_(){
  try {
    const raw = localStorage.getItem('npoc-v2-settings');
    const s = raw ? JSON.parse(raw) : (window.NPOC_CONFIG || {});
    return String(s.mode || '').toLowerCase() === 'backend' && !!s.backendUrl;
  } catch(e){ return false; }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { if (shouldAutoStartSync_()) NPOC_SYNC.start(15000); });
} else if (shouldAutoStartSync_()) {
  NPOC_SYNC.start(15000);
}
