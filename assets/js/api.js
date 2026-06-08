const NPOC_API = (() => {
  const STORE_KEY = 'npoc-v2-state';
  const SETTINGS_KEY = 'npoc-v2-settings';
  const DEFAULT_CONFIG = window.NPOC_CONFIG || {};
  let activeMonth = 'May2026';

  const seed = {
    kpis: { parishioners: 340, expected: 120, actual: 48, firstTimers: 30, avgAttendance: 10, graduates: 12, attendanceRate: 40 },
    admins: [
      {adminID:'A001', name:'Andrew', email:'andrew@rfs.org', role:'Lead Admin', status:'Active', department:'Lead Administration'},
      {adminID:'A002', name:'Teece', email:'teece@rfs.org', role:'Lead Admin', status:'Active', department:'Lead Administration'},
      {adminID:'A003', name:'Ebi', email:'ebi@rfs.org', role:'Class Admin', status:'Active', department:'Class Supervision'},
      {adminID:'A004', name:'Emmanuel', email:'emmanuel@rfs.org', role:'Class Admin', status:'Active', department:'Class Supervision'},
      {adminID:'A005', name:'Tomi', email:'tomi@rfs.org', role:'Ordinary Admin', status:'Active', department:'Database Team'},
      {adminID:'A006', name:'Gold', email:'gold@rfs.org', role:'Ordinary Admin', status:'Active', department:'Database Team'},
      {adminID:'A007', name:'Chinonso', email:'chinonso@rfs.org', role:'Class Admin', status:'Active', department:'Class Supervision'},
      {adminID:'A008', name:'Success', email:'success@rfs.org', role:'Ordinary Admin', status:'Active', department:'Database Team'},
      {adminID:'A009', name:'Chinyere', email:'chinyere@rfs.org', role:'Ordinary Admin', status:'Active', department:'Database Team'},
      {adminID:'A010', name:'Chinemeazu', email:'chinemeazu@rfs.org', role:'Class Admin', status:'Active', department:'Class Supervision'}
    ],
    calls: [],
    attendance: [
      {id:'ATT001', phone:'2348011111111', studentName:'Ayo Smith', module:1, mode:'Physical', date:'2026-05-03', checkedInByAdmin:'Teece'},
      {id:'ATT002', phone:'2348022222222', studentName:'Mary Cole', module:2, mode:'Online', date:'2026-05-10', checkedInByAdmin:'Andrew'}
    ],
    students: [],
    tasks: [
      {taskID:'T001', taskName:'Class Moderation', adminName:'Andrew', category:'ClassModeration', dueDate:'2026-06-07', priority:'High', status:'Pending', evaluationScore:'Not scored', proofLink:''},
      {taskID:'T002', taskName:'Registration Desk', adminName:'Teece', category:'StudentRegistration', dueDate:'2026-06-07', priority:'Medium', status:'InProgress', evaluationScore:'Not scored', proofLink:''}
    ],
    faculty: [],
    emailTemplates: [
      {templateID:'ET001', templateName:'FirstTimerWelcome', subject:'Welcome to Rock Foundation School', bodyHTML:'Dear {{StudentName}}, welcome to Rock Foundation School.', variables:'{{StudentName}}, {{Module}}', status:'Active'},
      {templateID:'ET002', templateName:'TaskReminder', subject:'NPOC task reminder', bodyHTML:'Dear {{AdminName}}, your task {{TaskName}} is due soon.', variables:'{{AdminName}}, {{TaskName}}', status:'Active'}
    ],
    emailQueue: [],
    adminAttendance: [
      {checkedInID:'CHK001', date:'2026-05-03', adminName:'Andrew', mode:'Physical', dutyRole:'Lead Admin', checkedByAdmin:'Andrew', timeCheckedIn:'07:20'},
      {checkedInID:'CHK002', date:'2026-05-03', adminName:'Teece', mode:'Physical', dutyRole:'Class Admin', checkedByAdmin:'Andrew', timeCheckedIn:'07:30'}
    ],
    audit: [],
    sessions: []
  };

  function getSettings(){
    const fallback = {
      backendUrl: DEFAULT_CONFIG.backendUrl || '',
      apiKey: DEFAULT_CONFIG.apiKey || '',
      sheetId: DEFAULT_CONFIG.sheetId || '',
      allowedDomain: DEFAULT_CONFIG.allowedDomain || 'rfs.org',
      mode: DEFAULT_CONFIG.mode || 'local'
    };
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return fallback;
    try { return Object.assign({}, fallback, JSON.parse(raw)); }
    catch(e){ return fallback; }
  }
  function saveSettings(settings){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
  async function syncSettings(settings, user){
    saveSettings(settings);
    if (settings.mode === 'backend' && settings.backendUrl && settings.apiKey) {
      const result = await remote('SAVE_SETTINGS', 'POST', { settings, currentUser: user || null }, {}, settings).catch(err => ({success:false, error:err.message}));
      return result || {success:true, localOnly:true};
    }
    return {success:true, localOnly:true};
  }
  async function loadSharedSettings(){
    const settings = getSettings();
    if (settings.mode !== 'backend' || !settings.backendUrl || !settings.apiKey) return settings;
    const result = await remote('GET_SETTINGS', 'GET', null, {}, settings).catch(()=>null);
    if (result && result.settings) {
      const merged = Object.assign({}, settings, result.settings, { backendUrl: settings.backendUrl, apiKey: settings.apiKey, mode: settings.mode });
      saveSettings(merged);
      return merged;
    }
    return settings;
  }
  function getState(){
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw){ localStorage.setItem(STORE_KEY, JSON.stringify(seed)); return structuredClone(seed); }
    try { return JSON.parse(raw); } catch(e){ localStorage.setItem(STORE_KEY, JSON.stringify(seed)); return structuredClone(seed); }
  }
  function saveState(state){ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  function cleanPhone(phone){
    // Single source of truth: use PhoneUtils when available.
    // Fallback keeps the app working if the utility file is missing.
    if (window.PhoneUtils && typeof PhoneUtils.normalize === 'function') {
      return PhoneUtils.normalize(phone);
    }
    const raw = String(phone || '').replace(/[^0-9]/g,'');
    if (!raw) return '';
    if (/^234\d{10}$/.test(raw)) return raw;
    if (raw.startsWith('0') && raw.length >= 11) return `234${raw.slice(-10)}`;
    if (raw.length === 10) return `234${raw}`;
    return raw.length > 10 ? `234${raw.slice(-10)}` : `234${raw}`;
  }
  function id(prefix){ return `${prefix}${String(Date.now()).slice(-6)}${Math.floor(Math.random()*90+10)}`; }
  function now(){ return new Date().toISOString(); }
  function audit(action, entity, details, user){
    const state = getState();
    state.audit.unshift({logID:id('LOG'), timestamp:now(), adminEmail:user?.email || 'local@npoc', adminName:user?.displayName || 'Local User', action, entity, entityID:details?.id || '', oldValue:'', newValue:'', details:JSON.stringify(details || {})});
    state.audit = state.audit.slice(0, 500);
    saveState(state);
  }
  async function remote(action, method='GET', body=null, params={}, overrideSettings=null){
    const settings = overrideSettings || getSettings();
    if (!settings.backendUrl || settings.mode === 'local') return null;
    const url = new URL(settings.backendUrl);
    url.searchParams.set('action', action);
    if (settings.apiKey) url.searchParams.set('api_key', settings.apiKey);
    Object.entries(params || {}).forEach(([k,v]) => url.searchParams.set(k,v));
    const options = {method, headers:{'Content-Type':'text/plain;charset=utf-8'}};
    if (body) options.body = JSON.stringify(Object.assign({}, body, { currentUser: body.currentUser || (params.currentUser || null) }));
    const res = await fetch(url.toString(), options);
    const data = await res.json();
    if (!data.success && data.error) throw new Error(data.error);
    return data;
  }
  async function api(action, {method='GET', body=null, params={}, user=null}={}){
    if (user) { params = Object.assign({}, params, { user_email: user.email }); body = body ? Object.assign({}, body, { currentUser: user }) : body; }
    const remoteResult = await remote(action, method, body, params).catch(err => {
      console.warn('Backend fallback:', err.message);
      return null;
    });
    if (remoteResult) return remoteResult;
    const state = getState();
    switch(action){
      case 'GET_DASHBOARD': activeMonth = params.month || activeMonth; return {success:true, dashboard: buildDashboard(state, activeMonth)};
      case 'GET_SETTINGS': return {success:true, settings:getSettings()};
      case 'SAVE_SETTINGS': saveSettings(body.settings || body); return {success:true};
      case 'IMPORT_CALL_LIST': return importCallList(state, body, user);
      case 'GET_ADMIN_CALLS': return {success:true, calls: state.calls.filter(c => (params.admin === 'all' || !params.admin || c.adminName === params.admin) && (params.status === 'all' || !params.status || c.status === params.status))};
      case 'UPDATE_CALL_STATUS': return updateCallStatus(state, body, user);
      case 'RECORD_ATTENDANCE': return recordAttendance(state, body, user);
      case 'GET_STUDENT_PROGRESS': return {success:true, students: deriveStudents(state, params.filter || 'all')};
      case 'MARK_GRADUATED': return markGraduated(state, body, user);
      case 'CREATE_TASK': return createTask(state, body, user);
      case 'GET_TASK_SCORECARD': return {success:true, tasks: state.tasks.filter(t => (params.admin === 'all' || !params.admin || t.adminName === params.admin) && (params.status === 'all' || !params.status || t.status === params.status))};
      case 'CREATE_FACULTY_SCHEDULE': return createFaculty(state, body, user);
      case 'GET_FACULTY_SCHEDULE': return {success:true, schedule: state.faculty};
      case 'GET_EMAIL_TEMPLATES': return {success:true, templates: state.emailTemplates};
      case 'SAVE_EMAIL_TEMPLATE': return saveEmailTemplate(state, body, user);
      case 'GET_EMAIL_QUEUE': return {success:true, queue: state.emailQueue};
      case 'ADMIN_CHECK_IN': return adminCheckIn(state, body, user);
      case 'GET_ADMIN_ATTENDANCE_TREND': return {success:true, trend: state.adminAttendance};
      case 'GET_MONTHLY_REPORT': return {success:true, report: buildReport(state, params.month || activeMonth)};
      case 'GET_ADMINS': return {success:true, admins: state.admins};
      case 'CREATE_ADMIN': return createAdmin(state, body, user);
      case 'UPDATE_ADMIN': return updateAdmin(state, body, user);
      case 'GET_AUDIT_LOG': return {success:true, logs: state.audit.slice(0, Number(params.limit || 100)), sessions: state.sessions.slice(0, 100)};
      default: return {success:false, error:`Unknown local action: ${action}`};
    }
  }
  function monthLabel(monthKey){ return String(monthKey||'May2026').replace(/(\D+)(\d{4})/,'$1 $2').trim(); }
  function monthNameFromKey(monthKey){ return String(monthKey||'May2026').replace(/\d/g,''); }
  function isDateInMonth(date, monthKey){
    if (!date) return false;
    const d = new Date(date); if (isNaN(d)) return false;
    const month = monthNameFromKey(monthKey).toLowerCase();
    return d.toLocaleString('en-US',{month:'long'}).toLowerCase() === month;
  }
  function buildDashboard(state, monthKey){
    const isMay = String(monthKey||'May2026') === 'May2026';
    const monthAttendance = state.attendance.filter(a => isDateInMonth(a.date, monthKey));
    const monthTasks = state.tasks.filter(t => isDateInMonth(t.dueDate, monthKey));
    const expected = isMay ? (state.kpis.expected || 120) : 0;
    const actual = isMay ? (monthAttendance.length ? monthAttendance.length : state.kpis.actual) : monthAttendance.length;
    const firstTimers = isMay ? state.kpis.firstTimers : monthAttendance.filter(a=>a.firstAttendance).length;
    const avgAttendance = expected || actual ? Math.round(actual / Math.max(1, (String(monthKey).startsWith('May') ? 5 : 1))) : 0;
    return {
      selectedMonth: monthLabel(monthKey),
      mayAttendanceRate: expected ? Math.round((actual / expected) * 100) : 0,
      expectedVsActual:[{month: monthLabel(monthKey), expected, actual}],
      studentsPipeline: pipeline(state),
      actionQueue: (monthTasks.length ? monthTasks : state.tasks).filter(t => t.status !== 'Completed').slice(0, 6),
      kpis:{...state.kpis, expected, actual, firstTimers, avgAttendance, attendanceRate: expected ? Math.round((actual/expected)*100) : 0, callsCompleted: state.calls.filter(c => c.status && c.status !== 'Pending').length, interested: state.calls.filter(c => c.status === 'Called - Interested').length, registered: state.calls.filter(c => c.registered).length},
      adminAttendance: state.adminAttendance,
      recentAudit: state.audit.slice(0, 8)
    };
  }
  function pipeline(state){
    const students = deriveStudents(state, 'all');
    return {
      yetToTakeModule1: students.filter(s => !s.module1Date).length,
      completedModule1: students.filter(s => s.module1Date).length,
      yetToTakeModule2: students.filter(s => s.module1Date && !s.module2Date).length,
      graduationEligible: students.filter(s => s.module1Date && s.module2Date && s.status !== 'Graduated').length,
      graduated: students.filter(s => s.status === 'Graduated').length || state.kpis.graduates
    };
  }
  function importCallList(state, body, user){
    const contacts = body?.contacts || [];
    let imported = 0, duplicatesSkipped = 0;
    contacts.forEach((row, index) => {
      const phone = cleanPhone(row.phone || row.Phone || row['Phone Number']);
      if (!phone) return;
      if (state.calls.some(c => c.phone === phone)) { duplicatesSkipped++; return; }
      const activeAdmins = state.admins.filter(a => a.status === 'Active');
      const assigned = activeAdmins[index % activeAdmins.length]?.name || 'Unassigned';
      state.calls.push({contactID:id('CL'), name: row.name || row.Name || row.fullName || row['Full Name'] || 'Unnamed', phone, email: row.email || row.Email || '', adminName: assigned, status:'Pending', notes:'', registered:false, updated:now(), fileName: body.fileName || 'Upload'});
      imported++;
    });
    saveState(state); audit('IMPORT_CALL_LIST','CALL_LIST',{imported, duplicatesSkipped},user);
    return {success:true, imported, duplicatesSkipped, distributedTo: new Set(state.calls.slice(-imported).map(c => c.adminName)).size};
  }
  function updateCallStatus(state, body, user){
    const call = state.calls.find(c => c.contactID === body.contactID);
    if (!call) return {success:false,error:'Call record not found'};
    call.status = body.newStatus || call.status; call.notes = body.notes || ''; call.updated = now(); call.registered = call.status === 'Registered' ? true : call.registered;
    saveState(state); audit('UPDATE_CALL_STATUS','CALL_LIST',{id:call.contactID,status:call.status},user); return {success:true};
  }
  function recordAttendance(state, body, user){
    const phone = cleanPhone(body.phone);
    const firstAttendance = !state.attendance.some(a => a.phone === phone);
    const rec = {id:id('ATT'), phone, studentName: body.studentName || 'Unnamed', module:Number(body.module), mode:body.mode || 'Physical', date:body.date || new Date().toISOString().slice(0,10), registeredStatus:body.registeredStatus || 'Registered', checkedInByAdmin: body.checkedInByAdmin || user?.displayName || '', createdAt:now()};
    state.attendance.push(rec);
    if (firstAttendance) state.emailQueue.push({emailID:id('EM'), type:'FirstTimerWelcome', name:rec.studentName, phone, email:body.email || '', status:'Queued', queuedTime:now()});
    saveState(state); audit('RECORD_ATTENDANCE','ATTENDANCE_LOG',{id:rec.id, firstAttendance},user); return {success:true, firstAttendance};
  }
  function deriveStudents(state, filter='all'){
    const byPhone = new Map();
    state.attendance.forEach(a => {
      if (!byPhone.has(a.phone)) byPhone.set(a.phone,{name:a.studentName, phone:a.phone, module1Date:'', module2Date:'', status:'Active', firstAttendanceDate:a.date, lastAttendanceDate:a.date, attendanceCount:0});
      const s = byPhone.get(a.phone);
      s.name = a.studentName || s.name; s.attendanceCount++; s.lastAttendanceDate = a.date > s.lastAttendanceDate ? a.date : s.lastAttendanceDate; s.firstAttendanceDate = a.date < s.firstAttendanceDate ? a.date : s.firstAttendanceDate;
      if (Number(a.module) === 1 && (!s.module1Date || a.date < s.module1Date)) s.module1Date = a.date;
      if (Number(a.module) === 2 && (!s.module2Date || a.date < s.module2Date)) s.module2Date = a.date;
    });
    state.students.forEach(saved => { if (byPhone.has(saved.phone)) byPhone.get(saved.phone).status = saved.status; });
    let students = Array.from(byPhone.values());
    if (filter === 'module1') students = students.filter(s => !s.module1Date);
    if (filter === 'module2') students = students.filter(s => s.module1Date && !s.module2Date);
    if (filter === 'eligible') students = students.filter(s => s.module1Date && s.module2Date && s.status !== 'Graduated');
    if (filter === 'graduated') students = students.filter(s => s.status === 'Graduated');
    return students;
  }
  function markGraduated(state, body, user){
    const phone = cleanPhone(body.phone); let s = state.students.find(x => x.phone === phone);
    if (!s){ s = {phone, status:'Graduated'}; state.students.push(s); } else s.status='Graduated';
    const graduationDate = new Date().toISOString().slice(0,10);
    state.emailQueue.push({emailID:id('EM'), type:'GraduationEmail', name:body.name || '', phone, email:body.email || '', status:'Queued', queuedTime:now()});
    saveState(state); audit('MARK_GRADUATED','GRADUATION_TRACKER',{phone, graduationDate},user); return {success:true, graduationDate};
  }
  function createTask(state, body, user){
    const task = {taskID:id('T'), taskName:body.taskName, adminName:body.assignedAdmin, category:body.category, priority:body.priority, dueDate:body.dueDate, status:body.status || 'Pending', proofLink:body.proofLink || '', evaluationScore:body.evaluationScore || 'Not scored', description:body.description || ''};
    state.tasks.unshift(task); state.emailQueue.push({emailID:id('EM'), type:'TaskReminder', name:task.adminName, phone:'', email:'', status:'Queued', queuedTime:now()});
    saveState(state); audit('CREATE_TASK','TASK_SCHEDULE',{id:task.taskID},user); return {success:true, taskID:task.taskID};
  }
  function createFaculty(state, body, user){ const f={scheduleID:id('FAC'),...body}; state.faculty.unshift(f); saveState(state); audit('CREATE_FACULTY_SCHEDULE','FACULTY_SCHEDULE',{id:f.scheduleID},user); return {success:true, scheduleID:f.scheduleID}; }
  function saveEmailTemplate(state, body, user){ const t=state.emailTemplates.find(x=>x.templateID===body.templateID); if(t){t.subject=body.subject;t.bodyHTML=body.bodyHTML}else state.emailTemplates.push({...body, templateName:body.templateID,status:'Active'}); saveState(state); audit('SAVE_EMAIL_TEMPLATE','EMAIL_TEMPLATES',{id:body.templateID},user); return {success:true}; }
  function adminCheckIn(state, body, user){ const rec={checkedInID:id('CHK'), ...body, checkedByAdmin:body.checkedInByAdmin || user?.displayName || '', timeCheckedIn:new Date().toLocaleTimeString()}; state.adminAttendance.unshift(rec); saveState(state); audit('ADMIN_CHECK_IN','ADMIN_ATTENDANCE',{id:rec.checkedInID},user); return {success:true, checkedInID:rec.checkedInID}; }
  function buildReport(state, monthKey){
    const isMay = String(monthKey||'May2026') === 'May2026';
    if (!isMay) return {expectedStudents:0, actualAttendance:0, firstTimers:0, graduates:0, adminAttendance: state.admins.map(a=>({adminName:a.name, attendance:0})), firstClassChart:[], secondClassChart:[]};
    return {expectedStudents:120, actualAttendance: state.kpis.actual, firstTimers:state.kpis.firstTimers, graduates:state.kpis.graduates, adminAttendance: state.admins.map(a => ({adminName:a.name, attendance:state.adminAttendance.filter(x=>x.adminName===a.name).length})), firstClassChart:[{week:'May 3',expected:13,actual:8},{week:'May 10',expected:19,actual:6},{week:'May 17',expected:19,actual:6},{week:'May 24',expected:13,actual:1},{week:'May 31',expected:16,actual:8}], secondClassChart:[{week:'May 3',expected:7,actual:1},{week:'May 10',expected:8,actual:5},{week:'May 17',expected:6,actual:4},{week:'May 24',expected:18,actual:8},{week:'May 31',expected:7,actual:2}]};
  }
  function createAdmin(state, body, user){ const admin={adminID:id('A'),...body}; state.admins.push(admin); saveState(state); audit('CREATE_ADMIN','ADMINS',{id:admin.adminID},user); return {success:true, adminID:admin.adminID}; }
  function updateAdmin(state, body, user){ const admin=state.admins.find(a=>a.adminID===body.adminID); if(!admin) return {success:false,error:'Admin not found'}; Object.assign(admin, body); saveState(state); audit('UPDATE_ADMIN','ADMINS',{id:admin.adminID},user); return {success:true}; }
  function createSession(user){ const state=getState(); const session={sessionID:id('SES'), admin:user.displayName, email:user.email, role:user.role, loginTime:now(), logoutTime:'', ipAddress:'Browser'}; state.sessions.unshift(session); saveState(state); return session.sessionID; }
  function closeSession(sessionID){ const state=getState(); const s=state.sessions.find(x=>x.sessionID===sessionID); if(s) s.logoutTime=now(); saveState(state); }
  return {api, getState, saveState, getSettings, saveSettings, syncSettings, loadSharedSettings, cleanPhone, audit, createSession, closeSession};
})();
