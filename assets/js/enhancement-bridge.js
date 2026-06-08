/**
 * NPOC Enhancement Bridge v2.1.2
 * Integrates vetted Claude AI improvements without scattering the existing V2.1.1 app structure.
 * - Preserves current UI/tabs and local fallback.
 * - Adds backend retry/timeout/offline queue through NPOC_API_ENHANCED.
 * - Initializes IndexedDB for durable browser cache and migration snapshots.
 * - Keeps phone normalization centralized through PhoneUtils.
 */
(function(){
  const LEGACY_API = window.NPOC_API;
  if (!LEGACY_API) {
    console.warn('[NPOC Bridge] Legacy NPOC_API not found. Bridge skipped.');
    return;
  }

  const originalApi = LEGACY_API.api.bind(LEGACY_API);
  const originalSaveState = LEGACY_API.saveState ? LEGACY_API.saveState.bind(LEGACY_API) : null;
  const originalGetState = LEGACY_API.getState ? LEGACY_API.getState.bind(LEGACY_API) : null;

  function getSettingsSafe(){
    try { return LEGACY_API.getSettings ? LEGACY_API.getSettings() : {}; }
    catch(e){ return {}; }
  }

  function isBackendMode(settings){
    return settings && String(settings.mode || '').toLowerCase() === 'backend' && !!settings.backendUrl;
  }

  async function snapshotToIndexedDB(){
    if (!window.NPOC_DB || !originalGetState) return;
    try {
      if (!NPOC_DB.isReady) await NPOC_DB.init();
      const state = originalGetState();
      const map = {
        admins: 'admins', calls: 'calls', attendance: 'attendance', tasks: 'tasks', faculty: 'faculty',
        emailTemplates: 'email_templates', emailQueue: 'email_queue', adminAttendance: 'admin_attendance',
        audit: 'audit', sessions: 'sessions'
      };
      for (const [stateKey, storeName] of Object.entries(map)) {
        const rows = Array.isArray(state[stateKey]) ? state[stateKey] : [];
        for (const row of rows.slice(-2000)) {
          const id = row.id || row.adminID || row.contactID || row.taskID || row.scheduleID || row.emailID || row.checkedInID || row.logID || row.sessionID || `${storeName}-${Date.now()}-${Math.random()}`;
          await NPOC_DB.put(storeName, { id, ...row });
        }
      }
      const status = document.getElementById('storageStatus');
      if (status) status.textContent = 'IndexedDB ready';
    } catch (err) {
      console.warn('[NPOC Bridge] IndexedDB snapshot failed:', err.message);
    }
  }

  if (originalSaveState) {
    LEGACY_API.saveState = function(state){
      const res = originalSaveState(state);
      snapshotToIndexedDB();
      return res;
    };
  }

  LEGACY_API.api = async function(action, opts = {}){
    const settings = getSettingsSafe();
    const method = opts.method || 'GET';
    const body = opts.body || null;
    const params = opts.params || {};

    if (isBackendMode(settings) && window.NPOC_API_ENHANCED && typeof NPOC_API_ENHANCED.call === 'function') {
      try {
        return await NPOC_API_ENHANCED.call(action, method, body, params);
      } catch (err) {
        console.warn(`[NPOC Bridge] Backend failed for ${action}; using local fallback.`, err.message);
        if (window.AppToast) window.AppToast(`Backend issue: ${err.message}. Showing local fallback.`, 'warning');
      }
    }
    return originalApi(action, opts);
  };

  window.NPOC_ENHANCEMENTS = {
    version: '2.1.2',
    active: true,
    snapshotToIndexedDB,
    getStorageStatus: async () => window.NPOC_DB ? NPOC_DB.getStats() : null,
    getQueueStatus: () => window.NPOC_API_ENHANCED ? NPOC_API_ENHANCED.getQueueStatus() : null
  };

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      if (window.NPOC_DB) {
        await NPOC_DB.init();
        await snapshotToIndexedDB();
      }
    } catch (err) {
      console.warn('[NPOC Bridge] Enhancement init warning:', err.message);
    }
  });
})();
