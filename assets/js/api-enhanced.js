/**
 * NPOC Enhanced API Client
 * Retry logic, offline queue, error handling, timeout
 * Backward compatible with existing NPOC_API calls
 * 
 * @author NPOC Engineering
 * @version 2.0
 */

const NPOC_API_ENHANCED = (() => {
  // Configuration
  const CONFIG = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    timeout: 8000,
    pollInterval: 10000
  };

  let settings = null;
  let isOnline = navigator.onLine;
  let offlineQueue = [];
  let syncRunning = false;

  // Monitor online/offline
  window.addEventListener('online', () => {
    isOnline = true;
    console.log('[API] Online detected');
    if (offlineQueue.length > 0) {
      console.log(`[API] Draining ${offlineQueue.length} queued requests...`);
      drainOfflineQueue();
    }
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    console.log('[API] Offline detected');
  });

  /**
   * Get settings from localStorage
   */
  async function getSettings() {
    if (settings) return settings;

    const stored = localStorage.getItem('npoc-v2-settings');
    settings = stored ? JSON.parse(stored) : {
      backendUrl: '',
      apiKey: '',
      sheetId: '',
      mode: 'local'
    };

    return settings;
  }

  /**
   * Call with automatic retry
   */
  async function callWithRetry(action, method = 'GET', body = null, params = {}) {
    const config = await getSettings();

    // Check if backend is configured
    if (config.mode === 'local' || !config.backendUrl) {
      console.log(`[API] Local mode: ${action}`);
      return await callLocal(action, method, body, params);
    }

    // Check online status
    if (!isOnline) {
      console.log(`[API] Offline - queueing: ${action}`);
      offlineQueue.push({
        action,
        method,
        body,
        params,
        timestamp: Date.now(),
        retries: 0
      });
      return { queued: true, message: 'Request queued (offline)' };
    }

    let lastError;

    for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
      try {
        console.log(`[API] Attempt ${attempt}/${CONFIG.maxRetries}: ${action}`);
        const result = await callWithTimeout(action, method, body, params);
        console.log(`[API] Success: ${action}`);
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`[API] Attempt ${attempt} failed: ${error.message}`);

        if (attempt < CONFIG.maxRetries) {
          const delay = Math.min(
            CONFIG.initialDelay * Math.pow(2, attempt - 1),
            CONFIG.maxDelay
          );
          console.log(`[API] Retrying in ${delay}ms...`);
          await sleep(delay);
        }
      }
    }

    // All retries failed
    console.error(`[API] Failed after ${CONFIG.maxRetries} attempts: ${action}`);
    throw new Error(`API Error: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Call with timeout wrapper
   */
  async function callWithTimeout(action, method, body, params) {
    return Promise.race([
      callRemote(action, method, body, params),
      timeoutPromise(CONFIG.timeout)
    ]);
  }

  /**
   * Make remote HTTP request
   */
  async function callRemote(action, method, body, params) {
    const config = await getSettings();

    if (!config.backendUrl) {
      throw new Error('No backend URL configured');
    }

    const url = new URL(config.backendUrl);
    url.searchParams.set('action', action);
    if (config.apiKey) url.searchParams.set('api_key', config.apiKey);

    Object.entries(params || {}).forEach(([k, v]) => {
      url.searchParams.set(k, String(v));
    });

    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (!data.success && data.error) {
      throw new Error(data.error);
    }

    return data;
  }

  /**
   * Call local fallback (use NPOC_API for logic)
   */
  async function callLocal(action, method, body, params) {
    try {
      return await NPOC_API.api(action, { method, body, params });
    } catch (error) {
      console.error(`[API] Local call failed: ${action}`, error);
      throw error;
    }
  }

  /**
   * Timeout helper
   */
  function timeoutPromise(ms) {
    return new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`Request timeout after ${ms}ms`)),
        ms
      );
    });
  }

  /**
   * Sleep helper
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Drain offline queue
   */
  async function drainOfflineQueue() {
    if (syncRunning || !isOnline || offlineQueue.length === 0) return;

    syncRunning = true;
    console.log(`[API] Draining ${offlineQueue.length} queued items...`);

    const toProcess = [...offlineQueue];
    offlineQueue = [];

    for (const item of toProcess) {
      try {
        console.log(`[API] Processing queued: ${item.action}`);
        await callWithRetry(item.action, item.method, item.body, item.params);
        console.log(`[API] Processed: ${item.action}`);
      } catch (error) {
        console.error(`[API] Failed to process ${item.action}:`, error);
        item.retries = (item.retries || 0) + 1;

        // Re-queue if retries < 3
        if (item.retries < 3) {
          offlineQueue.push(item);
        }
      }
    }

    syncRunning = false;

    if (offlineQueue.length > 0) {
      console.warn(`[API] ${offlineQueue.length} items still in queue`);
    } else {
      console.log('[API] Queue empty');
    }
  }

  /**
   * Get queue status
   */
  function getQueueStatus() {
    return {
      isOnline,
      queuedCount: offlineQueue.length,
      syncRunning,
      queue: offlineQueue
    };
  }

  /**
   * Clear queue (careful!)
   */
  function clearQueue() {
    const cleared = offlineQueue.length;
    offlineQueue = [];
    console.log(`[API] Cleared ${cleared} queued items`);
    return cleared;
  }

  /**
   * Start polling for sync
   */
  function startAutoSync() {
    setInterval(() => {
      if (isOnline && !syncRunning && offlineQueue.length > 0) {
        drainOfflineQueue();
      }
    }, CONFIG.pollInterval);

    console.log(`[API] Auto-sync started (interval: ${CONFIG.pollInterval}ms)`);
  }

  // Start auto-sync on init
  startAutoSync();

  // Public API
  return {
    call: callWithRetry,
    getSettings,
    getQueueStatus,
    clearQueue,
    drainQueue: drainOfflineQueue,
    isOnline: () => isOnline,
    sleep
  };
})();

// Backward compatibility wrapper
const NPOC_API_CALL = (action, method, body, params) => NPOC_API_ENHANCED.call(action, method, body, params);
