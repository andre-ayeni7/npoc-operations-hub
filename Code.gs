/**
 * NPOC Operations Hub V1.0 - Apps Script Backend
 * Security model:
 * 1. Optional API key: set Script Property NPOC_API_KEY and require x-api-key/header or payload.apiKey.
 * 2. Optional allowed users: set Script Property NPOC_ALLOWED_USERS as comma-separated emails/names.
 * 3. Every write is recorded in Backend_Audit_Log.
 * 4. Frontend roles are not treated as true security; enforce sensitive writes here.
 */
const NPOC_VERSION = 'V1.0';
const SHEETS = {
  CALLS: 'Call_List_Import',
  ADMINS: 'Settings_Admins',
  LOGS: 'Frontend_Sync_Log',
  AUDIT: 'Backend_Audit_Log',
  SESSIONS: 'Session_Log'
};

function doGet(e) {
  const action = e.parameter.action || 'ping';
  if (action === 'ping') return json_({ ok: true, version: NPOC_VERSION, message: 'NPOC backend online' });
  return json_({ ok: true, action, version: NPOC_VERSION });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const payload = JSON.parse(e.postData.contents || '{}');
    validateSecurity_(payload, e);
    if (payload.action === 'syncFrontendState') return syncFrontendState_(payload);
    if (payload.action === 'auditOnly') return writeAuditOnly_(payload);
    return json_({ ok: false, error: 'Unknown action', version: NPOC_VERSION });
  } catch (err) {
    return json_({ ok: false, error: String(err), version: NPOC_VERSION });
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

function validateSecurity_(payload, e) {
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('NPOC_API_KEY');
  if (key) {
    const supplied = payload.apiKey || (e && e.parameter && e.parameter.apiKey) || '';
    if (supplied !== key) throw new Error('Unauthorized: invalid API key');
  }
  const allowed = (props.getProperty('NPOC_ALLOWED_USERS') || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  if (allowed.length) {
    const user = String(payload.session?.name || payload.session?.admin || '').toLowerCase();
    if (!allowed.includes(user)) throw new Error('Unauthorized: user not allowed');
  }
}

function syncFrontendState_(payload) {
  const ss = payload.sheetId ? SpreadsheetApp.openById(payload.sheetId) : SpreadsheetApp.getActiveSpreadsheet();
  const state = payload.data || {};
  writeLog_(ss, payload);
  if (state.callList) writeCallList_(ss, state.callList);
  if (state.admins) writeAdmins_(ss, state.admins);
  if (state.sessions) writeSessions_(ss, state.sessions);
  if (state.auditLog) writeAuditLog_(ss, state.auditLog, payload.session);
  appendAudit_(ss, payload.session, 'syncFrontendState', `Synced ${state.callList ? state.callList.length : 0} call records`);
  return json_({ ok: true, version: NPOC_VERSION, syncedAt: new Date().toISOString() });
}

function writeAuditOnly_(payload) {
  const ss = payload.sheetId ? SpreadsheetApp.openById(payload.sheetId) : SpreadsheetApp.getActiveSpreadsheet();
  appendAudit_(ss, payload.session, payload.event || 'auditOnly', payload.details || '');
  return json_({ ok: true, version: NPOC_VERSION });
}

function writeCallList_(ss, rows) {
  const sh = getOrCreate_(ss, SHEETS.CALLS);
  const headers = ['ID','Batch','Source Sheet','S/N','Full Name','Phone Raw','Phone Clean','Email','Gender','Location','HOTR Decision','Assigned Admin','Call Status','Notes','Date Received','Registered','First Timer'];
  sh.clearContents();
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  if (!rows.length) return;
  const values = rows.map(r => [r.id, r.batch, r.sourceSheet || '', r.serial || '', r.name, r.phoneRaw, r.phoneClean, r.email, r.gender, r.location || '', r.hotrDecision || '', r.assignedAdmin, r.status, r.notes, r.dateReceived, r.registered, r.firstTimer]);
  sh.getRange(2,1,values.length,headers.length).setValues(values);
}

function writeAdmins_(ss, admins) {
  const sh = getOrCreate_(ss, SHEETS.ADMINS);
  const headers = ['Name','Role','Department','Active'];
  sh.clearContents();
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  if (!admins.length) return;
  sh.getRange(2,1,admins.length,headers.length).setValues(admins.map(a => [a.name, a.role, a.department || '', a.active !== false]));
}

function writeSessions_(ss, sessions) {
  const sh = getOrCreate_(ss, SHEETS.SESSIONS);
  const headers = ['Session ID','Admin Name','Admin Profile','Role','Login At','Logout At','Duration'];
  sh.clearContents();
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  if (!sessions.length) return;
  sh.getRange(2,1,sessions.length,headers.length).setValues(sessions.map(s => [s.id, s.name, s.admin || '', s.role, s.loginAt, s.logoutAt, s.duration]));
}

function writeAuditLog_(ss, logs, session) {
  const sh = getOrCreate_(ss, SHEETS.AUDIT);
  const headers = ['Timestamp','User','Admin','Role','Action','Details'];
  sh.clearContents();
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  if (!logs.length) return;
  sh.getRange(2,1,logs.length,headers.length).setValues(logs.map(l => [l.time, l.user, l.admin || '', l.role, l.action, l.details]));
}

function writeLog_(ss, payload) {
  const sh = getOrCreate_(ss, SHEETS.LOGS);
  if (sh.getLastRow() === 0) sh.appendRow(['Timestamp','Version','User','Role','Action','Record Count']);
  sh.appendRow([new Date(), NPOC_VERSION, payload.session?.name || '', payload.session?.role || '', payload.action || '', payload.data?.callList?.length || 0]);
}

function appendAudit_(ss, session, action, details) {
  const sh = getOrCreate_(ss, SHEETS.AUDIT);
  if (sh.getLastRow() === 0) sh.appendRow(['Timestamp','User','Admin','Role','Action','Details']);
  sh.appendRow([new Date(), session?.name || '', session?.admin || '', session?.role || '', action, details]);
}

function getOrCreate_(ss, name) { return ss.getSheetByName(name) || ss.insertSheet(name); }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
