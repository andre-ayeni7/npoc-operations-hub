/* NPOC Operations Hub Backend Client — V1.1
 * This client connects the static front-end to the Google Apps Script backend.
 * Keep BACKEND_URL empty during local demo. Once deployed, paste your Apps Script Web App URL.
 */
window.NPOC_BACKEND = {
  BACKEND_URL: '',
  API_KEY: '',
  sessionId: localStorage.getItem('npoc_backend_session') || '',
  async request(action, payload = {}) {
    if (!this.BACKEND_URL) {
      console.warn('[NPOC_BACKEND] No backend URL configured. Running in local demo mode.');
      return { ok: false, offline: true, error: 'Backend URL not configured' };
    }
    const res = await fetch(this.BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ apiKey: this.API_KEY, sessionId: this.sessionId, action, payload })
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Backend request failed');
    return json.data;
  },
  async login(payload) {
    const data = await this.request('login', payload);
    if (data && data.sessionId) {
      this.sessionId = data.sessionId;
      localStorage.setItem('npoc_backend_session', data.sessionId);
    }
    return data;
  },
  async logout() {
    try { await this.request('logout', { sessionId: this.sessionId }); } finally {
      localStorage.removeItem('npoc_backend_session');
      this.sessionId = '';
    }
  },
  async syncLocalState(localState) {
    // Production approach: send only changed records, not full state.
    // This helper is intentionally conservative for the demo release.
    return this.request('bootstrap', { localVersion: localState?.version || 'front-end' });
  },
  async recordAttendance(attendance) { return this.request('recordAttendance', attendance); },
  async recordAdminAttendance(record) { return this.request('recordAdminAttendance', record); },
  async importCallList(records, batch) { return this.request('importCallList', { records, batch }); },
  async distributeCalls(redistribute = false) { return this.request('distributeCalls', { redistribute }); },
  async updateCallOutcome(record) { return this.request('updateCallOutcome', record); },
  async saveTask(task) { return this.request('saveTask', task); },
  async saveFacultySchedule(records) { return this.request('saveFacultySchedule', { records }); },
  async sendQueuedEmails(limit = 20) { return this.request('sendQueuedEmails', { limit }); },
  async monthlyReport(month, year) { return this.request('monthlyReport', { month, year }); },
  async auditLog(limit = 200) { return this.request('auditLog', { limit }); }
};
