const STORE_KEY = 'npoc_ops_v10_state';
const SETTINGS_KEY = 'npoc_ops_v10_settings';
const SESSION_KEY = 'npoc_ops_v10_session';

const DEFAULT_ADMINS = [
  { name: 'Andrew', role: 'Lead Admin', department: 'Super Admin', active: true },
  { name: 'Teece', role: 'Assistant Lead Admin', department: 'Super Admin', active: true },
  { name: 'Ebi', role: 'Class Admin', department: 'Calls', active: true },
  { name: 'Emmanuel', role: 'Class Admin', department: 'Calls', active: true },
  { name: 'Tomi', role: 'Class Admin', department: 'Attendance', active: true },
  { name: 'Gold', role: 'Class Admin', department: 'Attendance', active: true },
  { name: 'Chinonso', role: 'Class Admin', department: 'Database', active: true },
  { name: 'Success', role: 'Class Admin', department: 'Reports', active: true },
  { name: 'Chinyere', role: 'Class Admin', department: 'Follow-up', active: true },
  { name: 'Chinemeazu', role: 'Class Admin', department: 'SMS', active: true }
];

const STATUS = ['Pending','Called - Interested','Called - Not Interested','No Response','Wrong Number','Registered','Follow Up Needed','Do Not Call','Duplicate','Completed'];
const ROLE_MAP = { lead: 'Lead Admin', assistant: 'Assistant Lead Admin', class: 'Class Admin' };
const MAY_REPORT = {
  month: 'May 2026', parishioners: 340, expected: 120, actual: 48, firstTimers: 30, avgAttendance: 10, graduates: 12, classes: 5,
  weeks: ['May 3rd','May 10th','May 17th','May 24th','May 31st'],
  first: { physical: { expected:[7,19,10,6,7], actual:[6,6,6,1,6] }, online: { expected:[6,0,9,7,9], actual:[2,0,0,0,2] } },
  second: { physical: { expected:[7,6,6,8,6], actual:[1,4,4,5,1] }, online: { expected:[0,2,0,10,1], actual:[0,1,0,3,1] } },
  adminAttendance: [
    {name:'Teece',count:5},{name:'Utibe',count:3},{name:'Chinemeazu',count:5},{name:'Gold',count:4},{name:'Tomi',count:3},
    {name:'Chinyere',count:2},{name:'Success',count:4},{name:'Chinonso',count:5},{name:'Ebi',count:4},{name:'Andrew',count:5}
  ]
};

let state = loadState();
let settings = loadSettings();
let session = loadSession();
let chartRaf = null;

function $(s, root=document){ return root.querySelector(s); }
function $$(s, root=document){ return [...root.querySelectorAll(s)]; }
function activeAdmins(){ return state.admins.filter(a => a.active).map(a => a.name); }
function isSuperUser(){ return session.role === 'lead' || session.role === 'assistant'; }

function loadState(){
  const saved = localStorage.getItem(STORE_KEY);
  if(saved){
    try { const parsed = JSON.parse(saved); return normalizeState(parsed); } catch(e) {}
  }
  return normalizeState({ admins: DEFAULT_ADMINS, callList: [], firstTimers: [], emailSent: false });
}
function normalizeState(s){
  return {
    admins: Array.isArray(s.admins) && s.admins.length ? s.admins : DEFAULT_ADMINS,
    callList: Array.isArray(s.callList) ? s.callList : [],
    firstTimers: Array.isArray(s.firstTimers) ? s.firstTimers : [],
    emailSent: Boolean(s.emailSent),
    auditLog: Array.isArray(s.auditLog) ? s.auditLog : [],
    sessions: Array.isArray(s.sessions) ? s.sessions : []
  };
}
function loadSettings(){
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || { backendUrl:'', sheetId:'' }; }
  catch(e){ return { backendUrl:'', sheetId:'' }; }
}
function loadSession(){
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; }
  catch(e){ return null; }
}
function saveState(){ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function saveSettings(){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
function saveSession(){ localStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
function nowStamp(){ return new Date().toLocaleString([], {year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'}); }
function logEvent(action, details=''){
  const item = { time: new Date().toISOString(), user: session?.name || 'System', admin: session?.admin || '', role: ROLE_MAP[session?.role] || session?.role || '', action, details };
  state.auditLog.unshift(item);
  state.auditLog = state.auditLog.slice(0, 500);
  saveState();
}
function startSessionLog(){
  const id = `SES-${Date.now()}`;
  session.sessionId = id;
  session.loginAt = new Date().toISOString();
  state.sessions.unshift({ id, name: session.name, admin: session.admin, role: ROLE_MAP[session.role] || session.role, loginAt: session.loginAt, logoutAt: '', duration: '' });
  logEvent('Login', `${session.name} signed in as ${ROLE_MAP[session.role] || session.role}`);
  saveSession(); saveState();
}
function endSessionLog(){
  if(!session) return;
  const row = state.sessions.find(x => x.id === session.sessionId);
  if(row){
    row.logoutAt = new Date().toISOString();
    const mins = Math.max(1, Math.round((new Date(row.logoutAt) - new Date(row.loginAt))/60000));
    row.duration = `${mins} min`;
  }
  logEvent('Logout', `${session.name} signed out`);
  saveState();
}
function logout(){ endSessionLog(); localStorage.removeItem(SESSION_KEY); session = null; location.href = location.pathname; }

function init(){
  hydrateLoginAdmins();
  if(session) enterApp(); else $('#preloader')?.classList.add('hide');
  bindEvents();
}

function bindEvents(){
  $('#loginForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#loginName').value.trim() || $('#loginAdmin').value;
    session = { name, role: $('#loginRole').value, admin: $('#loginAdmin').value };
    startSessionLog(); enterApp();
  });
  $('#loginRole')?.addEventListener('change', hydrateLoginAdmins);
  $('#menuBtn')?.addEventListener('click', openSidebar);
  $('#closeSidebarBtn')?.addEventListener('click', closeSidebar);
  $('#sidebarBackdrop')?.addEventListener('click', closeSidebar);
  window.addEventListener('keydown', e => { if(e.key === 'Escape') closeSidebar(); });
  $$('.nav-item').forEach(btn => btn.addEventListener('click', () => showPage(btn.dataset.page)));
  $$('[data-page-link]').forEach(btn => btn.addEventListener('click', () => showPage(btn.dataset.pageLink)));
  $('#chooseFileBtn')?.addEventListener('click', () => $('#fileInput').click());
  $('#fileInput')?.addEventListener('change', e => handleFile(e.target.files[0]));
  const drop = $('#dropzone');
  if(drop){
    ['dragenter','dragover'].forEach(evt => drop.addEventListener(evt, e => { e.preventDefault(); drop.classList.add('drag'); }));
    ['dragleave','drop'].forEach(evt => drop.addEventListener(evt, e => { e.preventDefault(); drop.classList.remove('drag'); }));
    drop.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));
  }
  $('#distributeBtn')?.addEventListener('click', () => { distributeCalls(); renderAll(); toast('Calls distributed across active admins'); });
  $('#clearCallListBtn')?.addEventListener('click', () => { if(confirm('Clear imported call list?')){ state.callList = []; saveState(); renderAll(); }});
  $('#seedDemoBtn')?.addEventListener('click', seedDemo);
  $('#adminSelect')?.addEventListener('change', renderAdminView);
  $('#statusFilter')?.addEventListener('change', renderAdminView);
  $('#adminSearch')?.addEventListener('input', renderAdminCallTable);
  $('#importSearch')?.addEventListener('input', renderImportTable);
  $('#copyAdminLinkBtn')?.addEventListener('click', copyAdminLink);
  $('#exportDataBtn')?.addEventListener('click', exportJson);
  $('#simulateEmailBtn')?.addEventListener('click', () => { state.emailSent = true; saveState(); renderFirstTimers(); toast('Welcome email status updated'); });
  $('#copyReportSummaryBtn')?.addEventListener('click', copyReportSummary);
  $('#addAdminBtn')?.addEventListener('click', () => { state.admins.push({name:'New Admin',role:'Class Admin',department:'General',active:true}); logEvent('Admin added','New admin placeholder created'); saveState(); renderRoles(); renderAdminSelect(); hydrateLoginAdmins(); renderSettings(); });
  $('#saveSettingsBtn')?.addEventListener('click', saveBackendSettings);
  $('#testBackendBtn')?.addEventListener('click', testBackend);
  $('#syncBtn')?.addEventListener('click', syncBackend);
  $('#logoutBtn')?.addEventListener('click', logout);
  $('#clearLogsBtn')?.addEventListener('click', () => { if(confirm('Clear local audit logs?')){ state.auditLog=[]; state.sessions=[]; saveState(); renderActivity(); }});
  window.addEventListener('resize', debounce(() => renderAll(), 180));
}

function hydrateLoginAdmins(){
  const sel = $('#loginAdmin'); if(!sel) return;
  sel.innerHTML = activeAdmins().map(a => `<option>${escapeHtml(a)}</option>`).join('');
}
function enterApp(){
  $('#loginScreen').classList.add('is-hidden');
  $('#appShell').classList.remove('is-hidden');
  updateUserDisplay();
  renderAdminSelect();
  renderStatusFilter();
  applyAdminFromUrl();
  loadSettingsFields();
  renderAll();
  setTimeout(() => $('#preloader')?.classList.add('hide'), 250);
}
function updateUserDisplay(){
  $('#userNameDisplay').textContent = session?.name || 'Admin';
  $('#userRoleDisplay').textContent = ROLE_MAP[session?.role] || 'Class Admin';
  $('#userAvatar').textContent = (session?.name || 'A').slice(0,1).toUpperCase();
}
function openSidebar(){ $('#sidebar').classList.add('open'); $('#sidebarBackdrop').classList.add('show'); }
function closeSidebar(){ $('#sidebar').classList.remove('open'); $('#sidebarBackdrop').classList.remove('show'); }
function showPage(page){
  $$('.page').forEach(p => p.classList.remove('active'));
  $(`#${page}`)?.classList.add('active');
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  const titles = { dashboard:'Operations Overview', import:'Import Call List', calls:'Admin Calling List', attendance:'Student Attendance', firstTimers:'First Timers', roles:'Super Admin & Roles', admins:'Admin Evaluation', reports:'Monthly Reports', activity:'Activity Log', settings:'Settings' };
  $('#pageTitle').textContent = titles[page] || 'Operations Hub';
  closeSidebar();
  requestAnimationFrame(renderAll);
}

function cleanPhone(value){
  let digits = String(value || '').replace(/\D/g,'');
  if(!digits) return '';
  if(digits.startsWith('0')) return '234' + digits.slice(-10);
  if(digits.startsWith('234')) return digits;
  if(digits.length === 10) return '234' + digits;
  if(digits.length > 10) return '234' + digits.slice(-10);
  return digits;
}
function detectColumn(keys, words){
  return keys.find(k => words.some(w => String(k).toLowerCase().includes(w))) || '';
}
async function handleFile(file){
  if(!file) return;
  try{
    const buffer = await file.arrayBuffer();
    let workbook;
    if(file.name.toLowerCase().endsWith('.csv')) workbook = XLSX.read(new TextDecoder().decode(buffer), { type:'string' });
    else workbook = XLSX.read(buffer, { type:'array' });
    const parsed = extractChurchRows(workbook);
    if(!parsed.rows.length){ toast('No usable parishioner records found. Check that the sheet has Name and Mobile Number columns.'); return; }
    const batch = $('#batchName').value.trim() || file.name;
    const existingPhones = new Set(state.callList.map(r => r.phoneClean));
    const imported = [];
    parsed.rows.forEach((row, i) => {
      const phoneRaw = row.localPhone || row.foreignPhone || row.phone || '';
      const phoneClean = cleanPhone(phoneRaw);
      if(!phoneClean || phoneClean.length < 8) return;
      const isDup = existingPhones.has(phoneClean) || imported.some(r => r.phoneClean === phoneClean);
      imported.push({
        id: `CALL-${Date.now()}-${i}`,
        batch,
        sourceSheet: parsed.sheetName,
        serial: row.serial || i+1,
        name: String(row.name || `Parishioner ${i+1}`).trim(),
        phoneRaw,
        phoneClean,
        email: String(row.email || '').replace(/\s+com$/i,'.com').trim(),
        gender: String(row.gender || '').trim(),
        location: String(row.location || '').trim(),
        ageGrade: String(row.ageGrade || '').trim(),
        relationship: String(row.relationship || '').trim(),
        employment: String(row.employment || '').trim(),
        prayerRequest: String(row.prayerRequest || '').trim(),
        currentChurch: String(row.currentChurch || '').trim(),
        churchName: String(row.churchName || '').trim(),
        hotrDecision: String(row.hotrDecision || '').trim(),
        assignedAdmin: '',
        status: isDup ? 'Duplicate' : 'Pending',
        notes: '',
        dateReceived: new Date().toISOString().slice(0,10),
        registered: 'No',
        firstTimer: 'No'
      });
    });
    state.callList = [...state.callList, ...imported];
    distributeCalls(false);
    logEvent('Call list imported', `${imported.length} records from ${file.name} / ${parsed.sheetName}`);
    saveState(); renderAll(); showPage('import');
    toast(`${imported.length} records imported from ${parsed.sheetName}`);
  } catch(err){ console.error(err); toast('Import failed. Please check the Excel format and try again.'); }
}
function extractChurchRows(workbook){
  let best = { sheetName:'', rows:[], score:0 };
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header:1, defval:'' });
    for(let h=0; h<Math.min(15, matrix.length); h++){
      const headers = matrix[h].map(x => normalizeHeader(x));
      const idx = mapChurchHeaders(headers);
      const score = Object.values(idx).filter(v => v >= 0).length;
      if(idx.name >= 0 && (idx.localPhone >= 0 || idx.foreignPhone >= 0 || idx.phone >= 0) && score > best.score){
        const rows = matrix.slice(h+1).map(r => ({
          serial: getCell(r, idx.serial), name: getCell(r, idx.name), localPhone: getCell(r, idx.localPhone), foreignPhone: getCell(r, idx.foreignPhone), phone: getCell(r, idx.phone),
          email: getCell(r, idx.email), address: getCell(r, idx.address), location: getCell(r, idx.location), gender: getCell(r, idx.gender), ageGrade: getCell(r, idx.ageGrade),
          relationship: getCell(r, idx.relationship), employment: getCell(r, idx.employment), prayerRequest: getCell(r, idx.prayerRequest), currentChurch: getCell(r, idx.currentChurch),
          churchName: getCell(r, idx.churchName), hotrDecision: getCell(r, idx.hotrDecision)
        })).filter(r => r.name || r.localPhone || r.foreignPhone || r.phone);
        best = { sheetName, rows, score };
      }
    }
  });
  return best;
}
function normalizeHeader(v){ return String(v || '').toLowerCase().replace(/\s+/g,' ').trim(); }
function getCell(row, index){ return index >= 0 ? row[index] : ''; }
function findHeader(headers, tests){ return headers.findIndex(h => tests.some(t => h.includes(t))); }
function mapChurchHeaders(headers){
  return {
    serial: findHeader(headers, ['s/n','serial']),
    name: findHeader(headers, ['name','full name']),
    localPhone: findHeader(headers, ['local mobile','local phone','local number']),
    foreignPhone: findHeader(headers, ['foreign mobile','foreign phone','foreign number']),
    phone: findHeader(headers, ['mobile number','phone','telephone']),
    email: findHeader(headers, ['email','mail']),
    address: findHeader(headers, ['home address','address']),
    location: findHeader(headers, ['residence','location']),
    gender: findHeader(headers, ['gender','sex']),
    ageGrade: findHeader(headers, ['age grade','age']),
    relationship: findHeader(headers, ['relationship','marital']),
    employment: findHeader(headers, ['employment','occupation']),
    prayerRequest: findHeader(headers, ['prayer request','prayer']),
    currentChurch: findHeader(headers, ['currently belong','belong to a church']),
    churchName: findHeader(headers, ['which church','church?']),
    hotrDecision: findHeader(headers, ['join house on the rock','would you like to join','hotr'])
  };
}
function distributeCalls(shouldLog=true){
  const admins = activeAdmins();
  if(!admins.length) return toast('Add at least one active admin first');
  const mode = $('#distributionMode')?.value || 'balanced';
  let adminPool = [...admins];
  if(mode === 'random') adminPool = shuffle(adminPool);
  let counter = 0;
  state.callList.forEach(row => {
    if(row.status === 'Duplicate') return;
    row.assignedAdmin = adminPool[counter % adminPool.length];
    counter++;
  });
  if(shouldLog) logEvent('Calls distributed', `${counter} records distributed across ${admins.length} active admins`);
  saveState();
}
function shuffle(arr){ return [...arr].sort(() => Math.random() - 0.5); }

function renderAll(){
  if(!session) return;
  renderDashboard(); renderImportTable(); renderAdminView(); renderAttendance(); renderFirstTimers(); renderRoles(); renderAdminEval(); renderReports(); renderActivity(); renderSettings();
}
function renderDashboard(){
  const total = state.callList.filter(r => r.status !== 'Duplicate').length || MAY_REPORT.parishioners;
  const completed = state.callList.filter(r => r.status !== 'Pending' && r.status !== 'Duplicate').length;
  const interested = state.callList.filter(r => r.status === 'Called - Interested').length;
  const registered = state.callList.filter(r => r.status === 'Registered' || r.registered === 'Yes').length;
  const kpis = [
    ['HOTR Parishioners', total, 'Cleaned call list count'],
    ['Expected Students', MAY_REPORT.expected, 'May 2026 target'],
    ['Actual Attendance', MAY_REPORT.actual, 'Student total'],
    ['First Timers', MAY_REPORT.firstTimers, 'New attendees'],
    ['Average Attendance', MAY_REPORT.avgAttendance, 'Across 5 classes'],
    ['Graduates', MAY_REPORT.graduates, 'May graduates'],
    ['Calls Completed', completed, `${percent(completed,total)} completion`],
    ['Interested / Registered', `${interested}/${registered}`, 'Call outcome']
  ];
  $('#kpiGrid').innerHTML = kpis.map(k => `<div class="kpi-card"><p>${k[0]}</p><strong>${k[1]}</strong><span>${k[2]}</span></div>`).join('');
  renderRoleDashboard();
  drawBarChart('attendanceChart', ['Physical','Online'], [{name:'Expected', values:[76,44]}, {name:'Actual', values:[40,8]}]);
  const statusCounts = STATUS.slice(0,7).map(s => state.callList.filter(r => r.status === s).length);
  drawBarChart('statusChart', STATUS.slice(0,7).map(shortStatus), [{name:'Records', values: statusCounts}]);
  renderActions(total, completed, interested, registered);
  renderWorkloadBars();
}
function renderRoleDashboard(){
  const assigned = state.callList.filter(r => r.assignedAdmin === session.admin).length;
  const completed = state.callList.filter(r => r.assignedAdmin === session.admin && r.status !== 'Pending').length;
  const label = isSuperUser() ? 'Super admin view' : 'Class admin view';
  const cards = isSuperUser() ? [
    ['Access level', label, 'Can view all admins and reports'],
    ['Active admins', activeAdmins().length, 'Editable in Super Admin section'],
    ['Operational health', state.callList.length ? `${percent(completedCount(), state.callList.length)}` : 'Demo ready', 'Based on call progress']
  ] : [
    ['Access level', label, 'Focused on your calling list'],
    ['Your assigned calls', assigned, 'Current imported batch'],
    ['Your completion', percent(completed, assigned), 'Updated from call status']
  ];
  $('#roleDashboard').innerHTML = cards.map(c => `<div class="role-card"><span>${c[0]}</span><strong>${c[1]}</strong><small>${c[2]}</small></div>`).join('');
}
function completedCount(){ return state.callList.filter(r => r.status !== 'Pending' && r.status !== 'Duplicate').length; }
function renderActions(total, completed, interested, registered){
  const items = [];
  if(!state.callList.length) items.push(['Import church call list','Upload Excel/CSV from church office to begin workflow.','import']);
  if(state.callList.length && completed < total) items.push(['Pending calls remain',`${total-completed} records still need admin call updates.`,'calls']);
  if(interested > registered) items.push(['Convert interested parishioners',`${interested-registered} interested people need registration follow-up.`,'firstTimers']);
  items.push(['Verify monthly report','Cross-check expected, actual, first timers and graduates before upload.','reports']);
  $('#actionList').innerHTML = items.map(i => `<button class="action-item" data-page-link="${i[2]}"><span><strong>${i[0]}</strong><span>${i[1]}</span></span><b>→</b></button>`).join('');
  $$('[data-page-link]', $('#actionList')).forEach(btn => btn.addEventListener('click', () => showPage(btn.dataset.pageLink)));
}
function renderWorkloadBars(){
  const admins = activeAdmins(); const max = Math.max(1, ...admins.map(a => state.callList.filter(r => r.assignedAdmin === a).length));
  $('#workloadBars').innerHTML = admins.map(a => {
    const count = state.callList.filter(r => r.assignedAdmin === a).length;
    return `<div class="bar-row"><strong>${escapeHtml(a)}</strong><div class="bar-shell"><div class="bar-fill" style="width:${(count/max)*100}%"></div></div><span>${count}</span></div>`;
  }).join('');
}
function renderImportTable(){
  const q = ($('#importSearch')?.value || '').toLowerCase();
  const rows = state.callList.filter(r => !q || `${r.name} ${r.phoneClean} ${r.email}`.toLowerCase().includes(q)).slice(0,250);
  $('#importTable').innerHTML = tableHtml(['Name','Phone Clean','Email','Location','HOTR Decision','Assigned Admin','Status','Batch'], rows.map(r => [r.name,r.phoneClean,r.email||'—',r.location||'—',r.hotrDecision||'—',r.assignedAdmin||'—',badge(r.status),r.batch]));
}
function renderStatusFilter(){
  const el = $('#statusFilter'); if(!el) return;
  el.innerHTML = '<option value="all">All statuses</option>' + STATUS.map(s => `<option>${s}</option>`).join('');
}
function renderAdminSelect(){
  const el = $('#adminSelect'); if(!el) return;
  const admins = activeAdmins();
  el.innerHTML = admins.map(a => `<option>${escapeHtml(a)}</option>`).join('');
  if(!isSuperUser()){ el.value = session.admin; el.disabled = true; }
  else el.disabled = false;
}
function applyAdminFromUrl(){
  const admin = new URLSearchParams(location.search).get('admin');
  if(admin && activeAdmins().includes(admin)){ $('#adminSelect').value = admin; showPage('calls'); }
}
function selectedAdmin(){ return $('#adminSelect')?.value || session?.admin || activeAdmins()[0]; }
function adminRows(){
  const admin = selectedAdmin(); const q = ($('#adminSearch')?.value||'').toLowerCase(); const status = $('#statusFilter')?.value || 'all';
  return state.callList.filter(r => r.assignedAdmin === admin).filter(r => status === 'all' || r.status === status).filter(r => !q || `${r.name} ${r.phoneClean} ${r.email}`.toLowerCase().includes(q));
}
function renderAdminView(){ renderAdminMiniKpis(); renderAdminCallTable(); }
function renderAdminMiniKpis(){
  const admin = selectedAdmin(); const all = state.callList.filter(r => r.assignedAdmin === admin); const done = all.filter(r => r.status !== 'Pending'); const registered = all.filter(r => r.status === 'Registered' || r.registered === 'Yes');
  $('#adminMiniKpis').innerHTML = [['Assigned',all.length],['Completed',done.length],['Registered',registered.length],['Completion',percent(done.length, all.length)]].map(k => `<div class="mini-card"><p>${k[0]}</p><strong>${k[1]}</strong></div>`).join('');
  $('#adminListTitle').textContent = `${admin || 'Admin'}'s assigned parishioners`;
}
function renderAdminCallTable(){
  const rows = adminRows();
  $('#adminCallTable').innerHTML = tableHtml(['Name','Phone','Email','Status','Notes','Date Received'], rows.map(r => [
    r.name, `<a href="tel:${r.phoneClean}">${r.phoneClean}</a>`, r.email||'—',
    `<select data-status="${r.id}">${STATUS.map(s=>`<option ${s===r.status?'selected':''}>${s}</option>`).join('')}</select>`,
    `<input data-notes="${r.id}" value="${escapeHtml(r.notes||'')}" placeholder="Call note..." />`, r.dateReceived
  ]));
  $$('[data-status]').forEach(el => el.addEventListener('change', () => { const r=state.callList.find(x=>x.id===el.dataset.status); if(r){ const old=r.status; r.status = el.value; logEvent('Call status updated', `${r.name}: ${old} → ${el.value}`); saveState(); renderAll(); } }));
  $$('[data-notes]').forEach(el => el.addEventListener('change', () => { const r=state.callList.find(x=>x.id===el.dataset.notes); if(r){ r.notes = el.value; logEvent('Call note updated', `${r.name}: note edited`); saveState(); renderActivity(); } }));
}
function renderAttendance(){
  const firstExpected = MAY_REPORT.first.physical.expected.map((v,i)=>v + MAY_REPORT.first.online.expected[i]);
  const firstActual = MAY_REPORT.first.physical.actual.map((v,i)=>v + MAY_REPORT.first.online.actual[i]);
  const secondExpected = MAY_REPORT.second.physical.expected.map((v,i)=>v + MAY_REPORT.second.online.expected[i]);
  const secondActual = MAY_REPORT.second.physical.actual.map((v,i)=>v + MAY_REPORT.second.online.actual[i]);
  drawLineChart('firstClassChart', MAY_REPORT.weeks, [{name:'Expected', values:firstExpected}, {name:'Actual', values:firstActual}]);
  drawLineChart('secondClassChart', MAY_REPORT.weeks, [{name:'Expected', values:secondExpected}, {name:'Actual', values:secondActual}]);
  $('#attendanceTable').innerHTML = tableHtml(['Class','Expected Physical','Actual Physical','Expected Online','Actual Online','Expected Total','Actual Total','Rate'], [
    ['First Class',43,25,31,4,74,29,'39.2%'], ['Second Class',33,15,13,4,46,19,'41.3%'], ['Total',76,40,44,8,120,48,'40%']
  ]);
}
function renderFirstTimers(){
  const rows = (state.firstTimers.length ? state.firstTimers : state.callList.filter(r => r.status === 'Registered').slice(0,30).map(r => ({...r, firstAttendance:'2026-05-31', module:'Module 1'}))).slice(0,100);
  $('#firstTimerTable').innerHTML = tableHtml(['First Attendance','Name','Phone','Module','Email','Welcome Email'], rows.map(r => [r.firstAttendance||'—',r.name,r.phoneClean,r.module||'—',r.email||'—',badge(state.emailSent||r.emailSent?'Email Sent':'Pending', state.emailSent||r.emailSent?'Email Sent':'Email Pending')]));
}
function renderRoles(){
  const totalCalls = state.callList.length;
  const active = activeAdmins().length;
  const superCards = [['Lead / Assistant Access', isSuperUser() ? 'Enabled' : 'Restricted', 'Full reports and admin management'], ['Active Admins', active, 'Editable anytime'], ['Call Capacity', `${active ? Math.ceil(totalCalls/active) : 0}/admin`, 'Based on active admin count']];
  $('#superAdminCards').innerHTML = superCards.map(c => `<div class="super-card"><span>${c[0]}</span><strong>${c[1]}</strong><small>${c[2]}</small></div>`).join('');
  renderAdminEditor();
  $('#roleMatrixTable').innerHTML = tableHtml(['Role','Can import','Can edit admins','Can view all calls','Can update calls','Can view reports'], [
    ['Lead Admin','Yes','Yes','Yes','Yes','Yes'], ['Assistant Lead Admin','Yes','Yes','Yes','Yes','Yes'], ['Class Admin','No','No','Own list only','Yes','Limited']
  ]);
}
function renderAdminEditor(){
  $('#adminEditor').innerHTML = state.admins.map((a,i) => `<div class="admin-row" data-admin-row="${i}"><input value="${escapeHtml(a.name)}" data-admin-name="${i}" aria-label="Admin name" /><select data-admin-role="${i}"><option ${a.role==='Lead Admin'?'selected':''}>Lead Admin</option><option ${a.role==='Assistant Lead Admin'?'selected':''}>Assistant Lead Admin</option><option ${a.role==='Class Admin'?'selected':''}>Class Admin</option></select><input value="${escapeHtml(a.department||'General')}" data-admin-dept="${i}" aria-label="Department" /><button class="remove-admin" data-remove-admin="${i}">Remove</button></div>`).join('');
  $$('[data-admin-name]').forEach(input => input.addEventListener('change', () => { state.admins[Number(input.dataset.adminName)].name = input.value.trim() || 'Unnamed'; logEvent('Admin updated', `Admin name changed to ${input.value}`); saveState(); renderAll(); hydrateLoginAdmins(); }));
  $$('[data-admin-role]').forEach(select => select.addEventListener('change', () => { state.admins[Number(select.dataset.adminRole)].role = select.value; logEvent('Admin role updated', `${state.admins[Number(select.dataset.adminRole)].name} role changed to ${select.value}`); saveState(); renderAll(); }));
  $$('[data-admin-dept]').forEach(input => input.addEventListener('change', () => { state.admins[Number(input.dataset.adminDept)].department = input.value.trim() || 'General'; logEvent('Admin department updated', `${state.admins[Number(input.dataset.adminDept)].name}: ${input.value}`); saveState(); renderAll(); }));
  $$('[data-remove-admin]').forEach(btn => btn.addEventListener('click', () => { const i=Number(btn.dataset.removeAdmin); state.admins[i].active = false; saveState(); renderAll(); renderAdminSelect(); hydrateLoginAdmins(); logEvent('Admin removed', `${state.admins[i].name} removed from active pool`); toast('Admin removed from active pool'); }));
}
function renderAdminEval(){
  drawBarChart('adminAttendanceChart', MAY_REPORT.adminAttendance.map(a => a.name), [{name:'Attendance', values:MAY_REPORT.adminAttendance.map(a => a.count)}]);
  const rows = activeAdmins().map(a => { const assigned = state.callList.filter(r => r.assignedAdmin === a); const done = assigned.filter(r => r.status !== 'Pending'); const score = assigned.length ? Math.round((done.length/assigned.length)*70 + 25) : 0; return [a, assigned.length, done.length, percent(done.length, assigned.length), score || '—', score>=80?'Strong':score?'Needs follow-up':'No calls yet']; });
  $('#adminEvalTable').innerHTML = tableHtml(['Admin','Assigned Calls','Completed Calls','Completion','Score','Remark'], rows);
}
function renderReports(){
  const data = [['Total HOTR Parishioners',MAY_REPORT.parishioners],['Total Expected Count',MAY_REPORT.expected],['Total Attendance Count',MAY_REPORT.actual],['Total First-Time Attendance',MAY_REPORT.firstTimers],['Average Attendance',MAY_REPORT.avgAttendance],['Graduates',MAY_REPORT.graduates],['Hybrid Classes',MAY_REPORT.classes]];
  $('#reportKpis').innerHTML = data.map(k => `<div class="kpi-card"><p>${k[0]}</p><strong>${k[1]}</strong><span>May 2026</span></div>`).join('');
  $('#reportTable').innerHTML = tableHtml(['Metric','Value','Interpretation'], data.map(k => [k[0],k[1],interpretation(k[0])]));
}
function interpretation(metric){
  if(metric.includes('Attendance Count')) return 'Actual student attendance captured in May report';
  if(metric.includes('Expected')) return 'Combined expected First + Second Class';
  if(metric.includes('First-Time')) return 'New students whose first attendance fell in May';
  if(metric.includes('Average')) return 'Total attendance divided by 5 hybrid classes';
  return 'Executive KPI';
}
function renderActivity(){
  const sessions = (state.sessions || []).slice(0, 80);
  const audits = (state.auditLog || []).slice(0, 150);
  const sessionEl = $('#sessionLogTable');
  if(sessionEl){
    sessionEl.innerHTML = tableHtml(['Admin','Role','Login','Logout','Duration'], sessions.map(r => [escapeHtml(r.name||''), escapeHtml(r.role||''), formatTime(r.loginAt), r.logoutAt ? formatTime(r.logoutAt) : badge('pending','Active/Unknown'), r.duration || '—']));
  }
  const auditEl = $('#auditTable');
  if(auditEl){
    auditEl.innerHTML = tableHtml(['Time','User','Role','Action','Details'], audits.map(r => [formatTime(r.time), escapeHtml(r.user||''), escapeHtml(r.role||''), escapeHtml(r.action||''), escapeHtml(r.details||'')]));
  }
  const feed = $('#activityFeed');
  if(feed){
    feed.innerHTML = audits.slice(0, 12).map(r => `<div class="feed-item"><strong>${escapeHtml(r.action)}</strong><span>${escapeHtml(r.details||'')}</span><small>${formatTime(r.time)} · ${escapeHtml(r.user||'System')}</small></div>`).join('') || '<p class="muted">No activity yet.</p>';
  }
}
function formatTime(value){ if(!value) return '—'; const d = new Date(value); if(Number.isNaN(d.getTime())) return value; return d.toLocaleString([], {month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit'}); }
function renderSettings(){
  $('#adminSettingsList').innerHTML = state.admins.filter(a=>a.active).map(a => `<span class="pill">${escapeHtml(a.name)} · ${escapeHtml(a.role)}</span>`).join('');
  loadSettingsFields();
}
function loadSettingsFields(){ if($('#backendUrl')) $('#backendUrl').value = settings.backendUrl || ''; if($('#sheetId')) $('#sheetId').value = settings.sheetId || ''; }
function saveBackendSettings(){ settings.backendUrl = $('#backendUrl').value.trim(); settings.sheetId = $('#sheetId').value.trim(); saveSettings(); logEvent('Backend settings saved', 'Apps Script URL / Sheet ID updated'); toast('Backend settings saved'); }
async function testBackend(){
  saveBackendSettings();
  if(!settings.backendUrl) return toast('Paste Apps Script Web App URL first');
  try{ const res = await fetch(settings.backendUrl + '?action=ping'); const text = await res.text(); toast(text ? 'Backend responded' : 'Backend reachable'); }
  catch(e){ toast('Could not connect to backend yet'); }
}
async function syncBackend(){
  saveBackendSettings();
  if(!settings.backendUrl) return toast('No Apps Script URL configured');
  const payload = { action:'syncFrontendState', sheetId:settings.sheetId, data:state, session, clientVersion:'V1.0' };
  try{ await fetch(settings.backendUrl, { method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }); logEvent('Backend sync requested', `${state.callList.length} call records sent`); toast('Sync request sent to Apps Script'); }
  catch(e){ toast('Sync failed. Check Apps Script deployment.'); }
}

function tableHtml(headers, rows){ return `<thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map(row=>`<tr>${row.map(c=>`<td>${c ?? ''}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${headers.length}" class="muted">No records yet</td></tr>`}</tbody>`; }
function badge(status,label=status){ return `<span class="badge ${statusClass(status)}">${label}</span>`; }
function statusClass(status){ if(['Registered','Completed','Email Sent'].includes(status)) return 'success'; if(['Wrong Number','Do Not Call'].includes(status)) return 'danger'; if(['Called - Interested','Follow Up Needed'].includes(status)) return 'info'; if(['Pending','Duplicate'].includes(status)) return 'pending'; return 'neutral'; }
function shortStatus(s){ return s.replace('Called - ','').replace('Follow Up Needed','Follow-up').replace('Not Interested','No'); }
function percent(n,d){ return d ? Math.round((n/d)*100)+'%' : '0%'; }
function escapeHtml(str){ return String(str).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function copyAdminLink(){ const url = `${location.origin}${location.pathname}?admin=${encodeURIComponent(selectedAdmin())}`; navigator.clipboard?.writeText(url); toast('Admin link copied'); }
function copyReportSummary(){
  const text = `NPOC May Report Summary\nTotal parishioners: ${MAY_REPORT.parishioners}\nExpected count: ${MAY_REPORT.expected}\nActual attendance: ${MAY_REPORT.actual}\nFirst timers: ${MAY_REPORT.firstTimers}\nAverage attendance: ${MAY_REPORT.avgAttendance}\nGraduates: ${MAY_REPORT.graduates}`;
  navigator.clipboard?.writeText(text); toast('Report summary copied');
}
function exportJson(){ const blob = new Blob([JSON.stringify({state,settings,session},null,2)], {type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='npoc-hub-export.json'; a.click(); URL.revokeObjectURL(a.href); }
function seedDemo(){
  const sampleNames = ['Blessing Emmanuel','Daniel Okoro','Grace Adeyemi','Samuel Johnson','Ruth Nathan','David Eze','Mary Williams','Josephine Bassey','Peter Cole','Deborah James','Kemi Balogun','Victor Adams','Faith Udo','Esther Lawson','Joshua King','Peace Nelson','Michael Hart','Sarah Ojo','Caleb George','Naomi Peters','Paul Sunday','Hannah Isaac','John Mark','Martha Joel','Stephen Daniel','Lydia Moses','Philip Ray','Rachel Duke','Timothy Stone','Abigail Hope'];
  const admins = activeAdmins();
  state.callList = sampleNames.map((name,i) => ({ id:`DEMO-${i}`, batch:'May 2026 Demo', name, phoneRaw:`080${String(30000000+i).padStart(8,'0')}`, phoneClean:cleanPhone(`080${String(30000000+i).padStart(8,'0')}`), email:`${name.split(' ')[0].toLowerCase()}@example.com`, gender:i%2?'Female':'Male', assignedAdmin:admins[i%admins.length], status:i%7===0?'Registered':i%5===0?'Called - Interested':i%4===0?'No Response':'Pending', notes:'', dateReceived:'2026-05-31', registered:i%7===0?'Yes':'No', firstTimer:i%7===0?'Yes':'No' }));
  saveState(); renderAll(); toast('May demo data loaded');
}
function toast(msg){ const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('show'),2600); }
function debounce(fn, wait){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), wait); }; }

function drawBarChart(id, labels, series){ drawChart(id, labels, series, 'bar'); }
function drawLineChart(id, labels, series){ drawChart(id, labels, series, 'line'); }
function drawChart(id, labels, series, type){
  const canvas = document.getElementById(id); if(!canvas || !canvas.offsetParent) return;
  const token = Symbol(id); canvas._token = token;
  const start = performance.now();
  function frame(now){
    if(canvas._token !== token) return;
    const progress = Math.min(1, (now-start)/760);
    const ease = 1 - Math.pow(1-progress, 3);
    const ctx = setupCanvas(canvas); const w = canvas._cssWidth; const h = canvas._cssHeight;
    ctx.clearRect(0,0,w,h);
    const pad = w < 420 ? 34 : 46; const top = 26; const bottom = 38; const chartW = Math.max(10,w-pad*1.5-18); const chartH = Math.max(10,h-top-bottom);
    const all = series.flatMap(s => s.values); const max = Math.max(1, ...all)*1.18;
    drawGrid(ctx,pad,top,w,h,bottom,chartH);
    if(type === 'bar') renderBars(ctx, labels, series, pad, top, chartW, chartH, max, ease, h, bottom);
    else renderLines(ctx, labels, series, pad, top, chartW, chartH, max, ease, h, bottom);
    renderLegend(ctx, series, w);
    if(progress < 1) requestAnimationFrame(frame);
  }
  cancelAnimationFrame(chartRaf); chartRaf = requestAnimationFrame(frame);
}
function setupCanvas(canvas){
  const rect = canvas.getBoundingClientRect(); const ratio = window.devicePixelRatio || 1; const cssWidth = Math.max(260, rect.width); const cssHeight = parseFloat(getComputedStyle(canvas).height) || 220;
  canvas.width = Math.floor(cssWidth*ratio); canvas.height = Math.floor(cssHeight*ratio); canvas._cssWidth = cssWidth; canvas._cssHeight = cssHeight;
  const ctx = canvas.getContext('2d'); ctx.setTransform(ratio,0,0,ratio,0,0); return ctx;
}
function drawGrid(ctx,pad,top,w,h,bottom,chartH){
  ctx.strokeStyle = '#e7eee1'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad,h-bottom); ctx.lineTo(w-12,h-bottom); ctx.moveTo(pad,h-bottom); ctx.lineTo(pad,top); ctx.stroke();
  for(let i=1;i<=4;i++){ const y = h-bottom-(chartH/4)*i; ctx.beginPath(); ctx.moveTo(pad,y); ctx.lineTo(w-12,y); ctx.strokeStyle='#f0f5ec'; ctx.stroke(); }
}
function renderBars(ctx, labels, series, pad, top, chartW, chartH, max, ease, h, bottom){
  const groupW = chartW / labels.length; const barW = Math.max(8, Math.min(26, groupW/(series.length+1.4)));
  series.forEach((s,si)=>{ s.values.forEach((v,i)=>{ const color = si===0 ? '#4472C4' : '#ED7D31'; const x = pad+i*groupW+groupW/2-(series.length*barW)/2+si*barW; const bh = (v/max)*chartH*ease; ctx.fillStyle=color; roundRect(ctx,x,h-bottom-bh,barW-3,bh,7,true); }); });
  ctx.fillStyle = '#647064'; ctx.font = '11px system-ui'; ctx.textAlign='center'; labels.forEach((l,i)=>ctx.fillText(String(l).slice(0,11), pad+i*groupW+groupW/2, h-13));
}
function renderLines(ctx, labels, series, pad, top, chartW, chartH, max, ease, h, bottom){
  series.forEach((s,si)=>{ const color=si===0?'#4472C4':'#ED7D31'; ctx.strokeStyle=color; ctx.lineWidth=3; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.beginPath(); s.values.forEach((v,i)=>{ const x=pad+(labels.length===1?0.5:i/(labels.length-1))*chartW; const y=h-bottom-(v/max)*chartH*ease; if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.stroke(); s.values.forEach((v,i)=>{ const x=pad+(labels.length===1?0.5:i/(labels.length-1))*chartW; const y=h-bottom-(v/max)*chartH*ease; ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fill(); if(ease>.95){ ctx.fillStyle='#233323'; ctx.font='11px system-ui'; ctx.textAlign='center'; ctx.fillText(v,x,y-10); } }); });
  ctx.fillStyle='#647064'; ctx.font='11px system-ui'; ctx.textAlign='center'; labels.forEach((l,i)=>ctx.fillText(l.replace('May ',''), pad+(labels.length===1?0.5:i/(labels.length-1))*chartW, h-13));
}
function renderLegend(ctx, series, w){
  ctx.textAlign='right'; ctx.font='12px system-ui'; series.forEach((s,i)=>{ ctx.fillStyle=i===0?'#4472C4':'#ED7D31'; ctx.fillRect(w-126,10+i*17,9,9); ctx.fillStyle='#566256'; ctx.fillText(s.name,w-12,19+i*17); });
}
function roundRect(ctx,x,y,w,h,r,fill){ if(h<0) return; ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); if(fill) ctx.fill(); }

document.addEventListener('DOMContentLoaded', init);
