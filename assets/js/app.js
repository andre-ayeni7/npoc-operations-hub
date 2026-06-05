const App = (() => {
  let user = null;
  let sessionID = null;
  let currentView = 'dashboard';
  const roleViews = {
    'Super Admin': ['dashboard','call-import','my-calls','attendance','students','tasks','faculty','email','admin-attendance','reports','admin-center','audit','settings'],
    'Lead Admin': ['dashboard','call-import','my-calls','attendance','students','tasks','faculty','email','admin-attendance','reports','admin-center','audit','settings'],
    'Assistant Lead Admin': ['dashboard','call-import','my-calls','attendance','students','tasks','faculty','admin-attendance','reports','audit','settings'],
    'Class Admin': ['dashboard','my-calls','attendance','students','tasks','admin-attendance','reports','audit','settings'],
    'Ordinary Admin': ['dashboard','my-calls','tasks','admin-attendance','audit','settings']
  };
  const nav = [
    ['dashboard','Overview','◉'], ['call-import','Call List Import','⇧'], ['my-calls','My Calling List','☎'], ['attendance','QR Attendance','▣'], ['students','Student Progress','↗'], ['tasks','Admin Tasks','✓'], ['faculty','Faculty Schedule','□'], ['email','Email Automation','✉'], ['admin-attendance','Admin Attendance','●'], ['reports','Monthly Report','▤'], ['admin-center','Admin Center','⚙'], ['audit','Audit & Sessions','⏱'], ['settings','Settings','⚙']
  ];
  const $ = (s,root=document)=>root.querySelector(s);
  const $$ = (s,root=document)=>Array.from(root.querySelectorAll(s));
  function toast(msg){ const root=$('#toastRoot'); const node=document.createElement('div'); node.className='toast'; node.textContent=msg; root.appendChild(node); setTimeout(()=>node.remove(),3800); }
  function init(){
    $('#loginForm').addEventListener('submit', handleLogin);
    $('#logoutBtn').addEventListener('click', handleLogout);
    $('#openSidebar').addEventListener('click', () => openSidebar(true));
    $('#closeSidebar').addEventListener('click', () => openSidebar(false));
    $('#scrim').addEventListener('click', () => openSidebar(false));
    $('#quickReportBtn').addEventListener('click', () => route('reports'));
    $('#syncBackendBtn').addEventListener('click', () => { refresh(); toast('Dashboard synced.'); });
    const saved = sessionStorage.getItem('npoc-user');
    if (saved) boot(JSON.parse(saved));
  }
  function handleLogin(e){
    e.preventDefault();
    if ($('#loginCode').value !== 'npoc2026'){ toast('Invalid access code.'); return; }
    boot({ displayName: $('#loginName').value.trim(), email: $('#loginEmail').value.trim(), role: $('#loginRole').value });
  }
  function boot(u){
    user = u; sessionStorage.setItem('npoc-user', JSON.stringify(user));
    sessionID = NPOC_API.createSession(user);
    $('#loginScreen').classList.add('is-hidden'); $('#appShell').classList.remove('is-hidden');
    $('#currentUserName').textContent = user.displayName; $('#currentUserRole').textContent = user.role; $('#userInitials').textContent = user.displayName.slice(0,1).toUpperCase();
    renderNav(); route('dashboard');
  }
  function handleLogout(){ NPOC_API.closeSession(sessionID); sessionStorage.removeItem('npoc-user'); location.reload(); }
  function openSidebar(open){ $('#sidebar').classList.toggle('open',open); $('#scrim').classList.toggle('show',open); }
  function renderNav(){
    const allowed = roleViews[user.role] || roleViews['Ordinary Admin'];
    $('#mainNav').innerHTML = nav.filter(([id]) => allowed.includes(id)).map(([id,label,icon]) => `<button class="nav-btn" data-route="${id}"><span>${icon}</span>${label}</button>`).join('');
    $$('.nav-btn').forEach(b => b.addEventListener('click', () => route(b.dataset.route)));
  }
  async function route(view){
    currentView = view; openSidebar(false);
    $$('.view').forEach(v=>v.classList.remove('active')); $(`#view-${view}`).classList.add('active');
    $$('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.route===view));
    const label = nav.find(([id])=>id===view)?.[1] || 'Operations'; $('#pageTitle').textContent = label;
    await render(view);
  }
  async function refresh(){ await render(currentView); }
  async function render(view){
    const map = {dashboard:renderDashboard,'call-import':renderCallImport,'my-calls':renderMyCalls,attendance:renderAttendance,students:renderStudents,tasks:renderTasks,faculty:renderFaculty,email:renderEmail,'admin-attendance':renderAdminAttendance,reports:renderReports,'admin-center':renderAdminCenter,audit:renderAudit,settings:renderSettings};
    await (map[view] || renderDashboard)();
  }
  function kpi(label,value,note){ const icons={ 'HOTR Parishioners':'👥','Expected Students':'🎯','Actual Attendance':'✅','First Timers':'✨','Average Attendance':'📊','Graduates':'🎓','Calls Completed':'☎️','Interested / Registered':'🤝' }; return `<article class="card kpi-card"><div class="kpi-icon">${icons[label]||'•'}</div><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-note">${note}</div></article>`}
  async function renderDashboard(){
    const data = await NPOC_API.api('GET_DASHBOARD',{user}); const d = data.dashboard;
    $('#view-dashboard').innerHTML = `
      <div class="hero compact-hero"><div><div class="eyebrow">Executive overview</div><h1>NPOC Operations Hub</h1><p>Import call lists, distribute admin calls, record attendance, track student progress, and generate monthly reports from one clean workspace.</p><div class="hero-actions"><button class="btn btn-primary" data-go="call-import">Import call list</button><button class="btn btn-soft" data-go="attendance">Record QR attendance</button><button class="btn btn-ghost" data-go="reports">View reports</button></div></div><div class="hero-panel"><span>May attendance rate</span><strong>${d.mayAttendanceRate}%</strong><small>Expected ${d.kpis.expected} / Actual ${d.kpis.actual}</small></div></div>
      <div class="grid kpi">${kpi('HOTR Parishioners',d.kpis.parishioners,'Cleaned call list count')}${kpi('Expected Students',d.kpis.expected,'May 2026 target')}${kpi('Actual Attendance',d.kpis.actual,'Student total')}${kpi('First Timers',d.kpis.firstTimers,'New attendees')}${kpi('Average Attendance',d.kpis.avgAttendance,'Across classes')}${kpi('Graduates',d.kpis.graduates,'May graduates')}${kpi('Calls Completed',d.kpis.callsCompleted,`${d.kpis.callsCompleted ? 'Updated call outcomes' : 'No backend calls yet'}`)}${kpi('Interested / Registered',`${d.kpis.interested}/${d.kpis.registered}`,'Call outcome')}</div>
      <div class="grid two" style="margin-top:18px"><div class="card"><div class="card-title"><h3>Expected vs Actual</h3><span>Monthly report</span></div><div id="expectedChart" class="chart-box"></div></div><div class="card"><div class="card-title"><h3>Pipeline</h3><span>Students by stage</span></div><div class="progress-list">${Object.entries(d.studentsPipeline).map(([name,val])=>`<div class="progress-row"><strong>${labelize(name)}</strong><div class="bar"><span style="--w:${Math.min(100,val*7)}%"></span></div><b>${val}</b></div>`).join('')}</div></div></div>
      <div class="grid two" style="margin-top:18px"><div class="card"><div class="card-title"><h3>Action queue</h3><span>Open tasks</span></div>${renderMobileTable(d.actionQueue.map(t=>({title:t.taskName||t.task, meta:`${t.adminName||t.assignedAdmin} · ${t.priority}`, badge:t.status||'Pending'})))}<div class="table-wrap"><table class="data-table"><thead><tr><th>Task</th><th>Admin</th><th>Due</th><th>Priority</th><th>Status</th></tr></thead><tbody>${d.actionQueue.map(t=>`<tr><td>${t.taskName||t.task}</td><td>${t.adminName||t.assignedAdmin}</td><td>${t.dueDate||''}</td><td>${t.priority}</td><td>${badge(t.status||'Pending')}</td></tr>`).join('')||'<tr><td colspan="5">No open tasks</td></tr>'}</tbody></table></div></div><div class="card"><div class="card-title"><h3>Recent activity</h3><span>Audit log</span></div><div class="audit-feed">${d.recentAudit.length?d.recentAudit.map(a=>auditItem(a)).join(''):'<div class="empty-state">No recent activity yet.</div>'}</div></div></div>`;
    $('[data-go="call-import"]').onclick=()=>route('call-import'); $('[data-go="attendance"]').onclick=()=>route('attendance'); $('[data-go="reports"]').onclick=()=>route('reports');
    NPOC_CHARTS.lineChart('#expectedChart', d.expectedVsActual.map(x=>({month:x.month,expected:x.expected,actual:x.actual})), {series:[{key:'expected',label:'Expected',color:'#4472C4'},{key:'actual',label:'Actual',color:'#ED7D31'}]});
  }
  function labelize(s){return s.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase()).replace('Yet To','Yet to')}
  function badge(status){ const s=String(status||'Pending'); const cls=s.includes('Completed')||s.includes('Registered')||s.includes('Sent')?'green':s.includes('Late')||s.includes('Missed')?'red':s.includes('Progress')||s.includes('Interested')?'gold':'blue'; return `<span class="badge ${cls}">${s}</span>`}
  function renderMobileTable(rows){ return `<div class="mobile-cards">${rows.length?rows.map(r=>`<div class="call-card"><strong>${r.title}</strong><div class="call-meta"><span>${r.meta||''}</span>${badge(r.badge||'Pending')}</div></div>`).join(''):'<div class="empty-state">No records</div>'}</div>` }
  function auditItem(a){ return `<div class="audit-item"><span class="audit-dot"></span><div><strong>${a.action}</strong><div class="call-meta"><span>${a.adminName||a.adminEmail}</span><span>${new Date(a.timestamp).toLocaleString()}</span></div><small>${a.entity} ${a.details||''}</small></div></div>` }
  async function renderCallImport(){
    const admins=(await NPOC_API.api('GET_ADMINS',{user})).admins;
    $('#view-call-import').innerHTML=`<div class="card import-card"><div class="card-title"><h3>Import church office call list</h3><span>Excel / CSV ready</span></div><p class="section-subtitle">Upload the list exactly as received from the church office. The importer scans all sheets, finds the real contact table, cleans Nigerian phone numbers into 234 format, removes duplicates, and distributes calls evenly across active admins.</p><div class="toolbar import-toolbar"><div class="field grow"><label>Church office file</label><input id="callFile" type="file" accept=".csv,.xlsx,.xls" /></div><button id="processCallFile" class="btn btn-primary">Import and distribute</button></div><div id="importStatus" class="import-status">Active admins: ${admins.map(a=>a.name).join(', ')}</div></div><div id="importResult" style="margin-top:18px"></div>`;
    $('#processCallFile').onclick = importFile;
  }
  function cleanPhoneLoose(value){
    const raw=String(value||'').trim(); if(!raw) return '';
    let digits=raw.replace(/\D/g,'');
    if(digits.length<10) return '';
    if(digits.startsWith('0') && digits.length>=11) return '234'+digits.slice(-10);
    if(digits.startsWith('234') && digits.length>=13) return '234'+digits.slice(-10);
    if(digits.length===10) return '234'+digits;
    if(digits.length>10) return '234'+digits.slice(-10);
    return '';
  }
  function looksLikeEmail(v){ return /@/.test(String(v||'')); }
  function parseCsvMatrix(text){
    const rows=[]; let row=[], cell='', q=false;
    for(let i=0;i<text.length;i++){
      const ch=text[i], nx=text[i+1];
      if(ch==='"' && q && nx==='"'){ cell+='"'; i++; }
      else if(ch==='"'){ q=!q; }
      else if(ch===',' && !q){ row.push(cell.trim()); cell=''; }
      else if((ch==='\n'||ch==='\r') && !q){ if(ch==='\r'&&nx==='\n') i++; row.push(cell.trim()); if(row.some(Boolean)) rows.push(row); row=[]; cell=''; }
      else cell+=ch;
    }
    row.push(cell.trim()); if(row.some(Boolean)) rows.push(row);
    return rows;
  }
  function contactsFromMatrix(matrix){
    const rows=(matrix||[]).filter(r=>r && r.some(c=>String(c||'').trim()!==''));
    if(!rows.length) return [];
    let best={score:-1,idx:0,cols:{}};
    rows.slice(0,25).forEach((r,idx)=>{
      const lower=r.map(c=>String(c||'').toLowerCase().trim());
      const cols={
        name: lower.findIndex(h=>/(^|\s)(name|full name|fullname|first name|surname|parishioner)/i.test(h)),
        phone: lower.findIndex(h=>/(phone|mobile|telephone|whatsapp|contact|number)/i.test(h)),
        email: lower.findIndex(h=>/(email|e-mail|mail)/i.test(h))
      };
      const phoneLike=r.findIndex(c=>cleanPhoneLoose(c)); if(cols.phone<0 && phoneLike>=0) cols.phone=phoneLike;
      const score=(cols.phone>=0?5:0)+(cols.name>=0?3:0)+(cols.email>=0?1:0)+r.filter(Boolean).length/20;
      if(score>best.score) best={score,idx,cols};
    });
    const start=best.score>=5?best.idx+1:0;
    const sampleRows=rows.slice(start);
    if(best.cols.phone<0){
      let counts={}; sampleRows.slice(0,30).forEach(r=>r.forEach((c,i)=>{ if(cleanPhoneLoose(c)) counts[i]=(counts[i]||0)+1; }));
      best.cols.phone=Number(Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? -1);
    }
    if(best.cols.name<0){ best.cols.name=0; if(best.cols.name===best.cols.phone) best.cols.name=1; }
    if(best.cols.email<0){
      let counts={}; sampleRows.slice(0,30).forEach(r=>r.forEach((c,i)=>{ if(looksLikeEmail(c)) counts[i]=(counts[i]||0)+1; }));
      best.cols.email=Number(Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? -1);
    }
    const contacts=[];
    sampleRows.forEach(r=>{
      const phone=cleanPhoneLoose(r[best.cols.phone]);
      if(!phone) return;
      const name=String(r[best.cols.name]||'').trim() || 'Unnamed';
      const email=best.cols.email>=0?String(r[best.cols.email]||'').trim():'';
      contacts.push({name, phone, email});
    });
    const unique=[]; const seen=new Set();
    contacts.forEach(c=>{ if(!seen.has(c.phone)){ seen.add(c.phone); unique.push(c); } });
    return unique;
  }
  async function importFile(){
    const file=$('#callFile').files[0]; if(!file){toast('Select a file first.');return}
    const status=$('#importStatus'); const btn=$('#processCallFile');
    status.innerHTML='<span class="spinner"></span> Reading file and detecting contact table...'; btn.disabled=true; btn.textContent='Processing...';
    try{
      let rows=[];
      if(file.name.toLowerCase().endsWith('.csv')) rows=contactsFromMatrix(parseCsvMatrix(await file.text()));
      else if(window.XLSX){
        const buf=await file.arrayBuffer(); const wb=XLSX.read(buf,{cellDates:false});
        const candidates=wb.SheetNames.map(name=>{
          const matrix=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:'',blankrows:false});
          const contacts=contactsFromMatrix(matrix);
          return {name,contacts,count:contacts.length};
        }).sort((a,b)=>b.count-a.count);
        rows=candidates[0]?.contacts||[];
        status.innerHTML=`Detected sheet: <b>${candidates[0]?.name||'N/A'}</b> · ${rows.length} contacts found.`;
      } else { toast('XLSX parser not loaded. Convert file to CSV or enable internet for SheetJS CDN.'); return; }
      if(!rows.length){ status.textContent='No valid phone-number contacts found. Check the file columns and try again.'; toast('No contacts found in file.'); return; }
      const res=await NPOC_API.api('IMPORT_CALL_LIST',{method:'POST',body:{fileName:file.name,contacts:rows},user});
      $('#importResult').innerHTML=`<div class="grid three import-results"><div class="card kpi-card"><div class="kpi-icon">📥</div><div class="kpi-label">Imported</div><div class="kpi-value">${res.imported}</div><div class="kpi-note">New contacts</div></div><div class="card kpi-card"><div class="kpi-icon">🧹</div><div class="kpi-label">Duplicates</div><div class="kpi-value">${res.duplicatesSkipped}</div><div class="kpi-note">Skipped safely</div></div><div class="card kpi-card"><div class="kpi-icon">👤</div><div class="kpi-label">Admins</div><div class="kpi-value">${res.distributedTo}</div><div class="kpi-note">Received calls</div></div></div>`;
      status.textContent=`Import complete. ${res.imported} new contacts distributed. ${res.duplicatesSkipped} duplicates skipped.`;
      toast('Call list imported and distributed.');
    }catch(err){ console.error(err); status.textContent='Import failed. See console for details.'; toast('Import failed. Please try another file.'); }
    finally{ btn.disabled=false; btn.textContent='Import and distribute'; }
  }
  async function renderMyCalls(){
    const admins=(await NPOC_API.api('GET_ADMINS',{user})).admins; const selected=user.role==='Ordinary Admin'?user.displayName:'all';
    $('#view-my-calls').innerHTML=`<div class="card"><div class="card-title"><h3>Admin calling list</h3><span>Track call outcomes</span></div><div class="toolbar"><div class="field"><label>Admin</label><select id="callsAdmin"><option value="all">All admins</option>${admins.map(a=>`<option ${a.name===selected?'selected':''}>${a.name}</option>`)}</select></div><div class="field"><label>Status</label><select id="callsStatus"><option value="all">All</option><option>Pending</option><option>Called - Interested</option><option>Called - Not Interested</option><option>No Response</option><option>Wrong Number</option><option>Registered</option></select></div><button id="loadCalls" class="btn btn-primary">Load calls</button></div><div id="callsTable"></div></div>`;
    if(user.role==='Ordinary Admin') $('#callsAdmin').disabled=true;
    $('#loadCalls').onclick=loadCalls; loadCalls();
  }
  async function loadCalls(){
    const admin=$('#callsAdmin').value, status=$('#callsStatus').value; const res=await NPOC_API.api('GET_ADMIN_CALLS',{params:{admin,status},user});
    $('#callsTable').innerHTML=`${renderMobileTable(res.calls.map(c=>({title:c.name,meta:`${c.phone} · ${c.adminName}`,badge:c.status})))}<div class="table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Phone</th><th>Admin</th><th>Status</th><th>Notes</th><th>Action</th></tr></thead><tbody>${res.calls.map(c=>`<tr><td>${c.name}</td><td>${c.phone}</td><td>${c.adminName}</td><td>${badge(c.status)}</td><td>${c.notes||''}</td><td><button class="btn btn-soft small-btn" data-update-call="${c.contactID}">Update</button></td></tr>`).join('')||'<tr><td colspan="6">No calls found. Import a call list first.</td></tr>'}</tbody></table></div>`;
    $$('[data-update-call]').forEach(btn=>btn.onclick=async()=>{ const status=prompt('Enter new status: Pending, Called - Interested, Called - Not Interested, No Response, Wrong Number, Registered','Called - Interested'); if(!status)return; const notes=prompt('Call notes',''); await NPOC_API.api('UPDATE_CALL_STATUS',{method:'POST',body:{contactID:btn.dataset.updateCall,newStatus:status,notes},user}); toast('Call updated.'); loadCalls(); });
  }
  async function renderAttendance(){
    $('#view-attendance').innerHTML=`<div class="grid two"><div class="card qr-panel"><div class="card-title"><h3>QR attendance scanner</h3><span>234 format</span></div><div class="qr-reader"><div><strong>Camera QR scanning placeholder</strong><p>Use manual paste below if browser scanner is unavailable.</p></div></div><small>QR payload should be cleaned phone number, e.g. 2348031234567.</small></div><div class="card"><div class="card-title"><h3>Record attendance</h3><span>Module 1 or Module 2</span></div><form id="attendanceForm" class="grid two"><div class="field"><label>Phone / QR payload</label><input name="phone" required placeholder="2348031234567"></div><div class="field"><label>Student name</label><input name="studentName" placeholder="Student name"></div><div class="field"><label>Module</label><select name="module"><option value="1">Module 1</option><option value="2">Module 2</option></select></div><div class="field"><label>Mode</label><select name="mode"><option>Physical</option><option>Online</option></select></div><div class="field"><label>Date</label><input name="date" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>Registered status</label><select name="registeredStatus"><option>Registered</option><option>Unregistered</option></select></div><button class="btn btn-primary" type="submit">Record attendance</button></form></div></div><div id="attendanceTrend" class="card" style="margin-top:18px"><div class="card-title"><h3>Attendance mix</h3><span>Physical vs Online</span></div><div id="attendanceChart" class="chart-box"></div></div>`;
    $('#attendanceForm').onsubmit=async(e)=>{e.preventDefault(); const body=Object.fromEntries(new FormData(e.target).entries()); body.checkedInByAdmin=user.displayName; const res=await NPOC_API.api('RECORD_ATTENDANCE',{method:'POST',body,user}); toast(res.firstAttendance?'Attendance saved. First timer queued for welcome email.':'Attendance saved.'); renderAttendance();};
    const state=NPOC_API.getState(); const phys=state.attendance.filter(a=>a.mode==='Physical').length; const online=state.attendance.filter(a=>a.mode==='Online').length; NPOC_CHARTS.doughnut('#attendanceChart',[{label:'Physical',value:phys},{label:'Online',value:online}]);
  }
  async function renderStudents(){
    $('#view-students').innerHTML=`<div class="card"><div class="card-title"><h3>Student progress & graduation</h3><span>Module intelligence</span></div><div class="toolbar"><div class="field"><label>Filter</label><select id="studentFilter"><option value="all">All</option><option value="module1">Yet to take Module 1</option><option value="module2">Yet to take Module 2</option><option value="eligible">Eligible for Graduation</option><option value="graduated">Graduated</option></select></div><button id="loadStudents" class="btn btn-primary">Apply filter</button></div><div id="studentsTable"></div></div>`;
    $('#loadStudents').onclick=loadStudents; loadStudents();
  }
  async function loadStudents(){ const res=await NPOC_API.api('GET_STUDENT_PROGRESS',{params:{filter:$('#studentFilter').value},user}); $('#studentsTable').innerHTML=`${renderMobileTable(res.students.map(s=>({title:s.name,meta:`${s.phone} · M1: ${s.module1Date||'-'} · M2: ${s.module2Date||'-'}`,badge:s.status})))}<div class="table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Phone</th><th>Module 1</th><th>Module 2</th><th>Status</th><th>First</th><th>Last</th><th></th></tr></thead><tbody>${res.students.map(s=>`<tr><td>${s.name}</td><td>${s.phone}</td><td>${s.module1Date||'-'}</td><td>${s.module2Date||'-'}</td><td>${badge(s.status)}</td><td>${s.firstAttendanceDate}</td><td>${s.lastAttendanceDate}</td><td>${s.module1Date&&s.module2Date&&s.status!=='Graduated'?`<button class="btn btn-soft small-btn" data-grad="${s.phone}">Graduate</button>`:''}</td></tr>`).join('')||'<tr><td colspan="8">No students yet. Record attendance first.</td></tr>'}</tbody></table></div>`; $$('[data-grad]').forEach(b=>b.onclick=async()=>{await NPOC_API.api('MARK_GRADUATED',{method:'POST',body:{phone:b.dataset.grad},user}); toast('Student marked as graduated.'); loadStudents();}); }
  async function renderTasks(){
    const admins=(await NPOC_API.api('GET_ADMINS',{user})).admins; $('#view-tasks').innerHTML=`<div class="grid two"><div class="card"><div class="card-title"><h3>Create admin task</h3><span>Schedule & evaluation</span></div><form id="taskForm" class="grid two"><div class="field grow"><label>Task title</label><input name="taskName" required></div><div class="field"><label>Assigned admin</label><select name="assignedAdmin">${admins.map(a=>`<option>${a.name}</option>`).join('')}</select></div><div class="field"><label>Category</label><select name="category"><option>ClassModeration</option><option>StudentRegistration</option><option>Attendance</option><option>FacultyReminder</option><option>CallFollowUp</option></select></div><div class="field"><label>Priority</label><select name="priority"><option>High</option><option>Medium</option><option>Low</option></select></div><div class="field"><label>Due date</label><input name="dueDate" type="date" required></div><div class="field"><label>Status</label><select name="status"><option>Pending</option><option>InProgress</option><option>Completed</option><option>Late</option><option>Reassigned</option><option>Missed</option></select></div><div class="field grow"><label>Proof/link</label><input name="proofLink"></div><div class="field"><label>Score</label><select name="evaluationScore"><option>Not scored</option>${Array.from({length:10},(_,i)=>`<option>${i+1}</option>`).join('')}</select></div><div class="field grow" style="grid-column:1/-1"><label>Description</label><textarea name="description" rows="3"></textarea></div><button class="btn btn-primary" type="submit">Create task</button></form></div><div class="card"><div class="card-title"><h3>Task scorecard</h3><span>Admin accountability</span></div><div id="tasksTable"></div></div></div>`; $('#taskForm').onsubmit=async(e)=>{e.preventDefault(); await NPOC_API.api('CREATE_TASK',{method:'POST',body:Object.fromEntries(new FormData(e.target).entries()),user}); toast('Task created and email queued.'); renderTasks();}; loadTasks();
  }
  async function loadTasks(){ const res=await NPOC_API.api('GET_TASK_SCORECARD',{params:{admin:'all',status:'all'},user}); $('#tasksTable').innerHTML=`${renderMobileTable(res.tasks.map(t=>({title:t.taskName,meta:`${t.adminName} · ${t.priority}`,badge:t.status})))}<div class="table-wrap"><table class="data-table"><thead><tr><th>Task</th><th>Admin</th><th>Due</th><th>Priority</th><th>Status</th><th>Score</th></tr></thead><tbody>${res.tasks.map(t=>`<tr><td>${t.taskName}</td><td>${t.adminName}</td><td>${t.dueDate}</td><td>${t.priority}</td><td>${badge(t.status)}</td><td>${t.evaluationScore}</td></tr>`).join('')}</tbody></table></div>`; }
  async function renderFaculty(){ $('#view-faculty').innerHTML=`<div class="grid two"><div class="card"><div class="card-title"><h3>Faculty schedule</h3><span>Calendar-ready</span></div><form id="facultyForm" class="grid two"><div class="field"><label>Class date</label><input name="classDate" type="date" required></div><div class="field"><label>Module</label><select name="module"><option>1</option><option>2</option></select></div><div class="field grow"><label>Faculty name</label><input name="facultyName" required></div><div class="field"><label>Status</label><select name="status"><option>Scheduled</option><option>Confirmed</option><option>ReminderSent</option><option>Completed</option><option>Rescheduled</option><option>Cancelled</option></select></div><div class="field grow" style="grid-column:1/-1"><label>Notes</label><textarea name="notes"></textarea></div><button class="btn btn-primary">Create schedule</button></form></div><div class="card"><div class="card-title"><h3>Upcoming faculty classes</h3><span>From backend</span></div><div id="facultyTable"></div></div></div>`; $('#facultyForm').onsubmit=async(e)=>{e.preventDefault(); await NPOC_API.api('CREATE_FACULTY_SCHEDULE',{method:'POST',body:Object.fromEntries(new FormData(e.target).entries()),user}); toast('Faculty schedule created.'); renderFaculty();}; const res=await NPOC_API.api('GET_FACULTY_SCHEDULE',{user}); $('#facultyTable').innerHTML=renderMobileTable(res.schedule.map(f=>({title:f.facultyName,meta:`Module ${f.module} · ${f.classDate}`,badge:f.status}))); }
  async function renderEmail(){ const t=(await NPOC_API.api('GET_EMAIL_TEMPLATES',{user})).templates; const q=(await NPOC_API.api('GET_EMAIL_QUEUE',{user})).queue; $('#view-email').innerHTML=`<div class="grid two"><div class="card"><div class="card-title"><h3>Email templates</h3><span>Editable</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Template</th><th>Subject</th><th>Status</th></tr></thead><tbody>${t.map(x=>`<tr><td>${x.templateName}</td><td>${x.subject}</td><td>${badge(x.status)}</td></tr>`).join('')}</tbody></table></div></div><div class="card"><div class="card-title"><h3>Email queue</h3><span>Scheduled automation</span></div>${renderMobileTable(q.map(x=>({title:x.type,meta:`${x.name} · ${x.queuedTime}`,badge:x.status})))}</div></div>`; }
  async function renderAdminAttendance(){ const admins=(await NPOC_API.api('GET_ADMINS',{user})).admins; $('#view-admin-attendance').innerHTML=`<div class="grid two"><div class="card"><div class="card-title"><h3>Admin Sunday check-in</h3><span>Physical / Online</span></div><form id="adminCheckForm" class="grid two"><div class="field"><label>Admin</label><select name="adminName">${admins.map(a=>`<option>${a.name}</option>`).join('')}</select></div><div class="field"><label>Mode</label><select name="mode"><option>Physical</option><option>Online</option></select></div><div class="field"><label>Date</label><input name="date" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>Duty role</label><select name="dutyRole"><option>General Admin</option><option>Class Admin</option><option>Online Admin</option><option>Registration Admin</option></select></div><button class="btn btn-primary">Check in admin</button></form></div><div class="card"><div class="card-title"><h3>Admin trend</h3><span>Recent check-ins</span></div><div id="adminTrendTable"></div></div></div>`; $('#adminCheckForm').onsubmit=async(e)=>{e.preventDefault(); const body=Object.fromEntries(new FormData(e.target).entries()); body.checkedInByAdmin=user.displayName; await NPOC_API.api('ADMIN_CHECK_IN',{method:'POST',body,user}); toast('Admin checked in.'); renderAdminAttendance();}; const res=await NPOC_API.api('GET_ADMIN_ATTENDANCE_TREND',{user}); $('#adminTrendTable').innerHTML=renderMobileTable(res.trend.map(x=>({title:x.adminName,meta:`${x.date} · ${x.dutyRole}`,badge:x.mode}))); }
  async function renderReports(){ const res=await NPOC_API.api('GET_MONTHLY_REPORT',{params:{month:$('#globalMonth').value},user}); const r=res.report; $('#view-reports').innerHTML=`<div class="grid kpi">${kpi('Expected Students',r.expectedStudents,'Monthly target')}${kpi('Actual Attendance',r.actualAttendance,'Monthly count')}${kpi('First Timers',r.firstTimers,'New attendance')}${kpi('Graduates',r.graduates,'Marked graduated')}</div><div class="grid two" style="margin-top:18px"><div class="card"><div class="card-title"><h3>First Class</h3><span>Expected vs Actual</span></div><div id="firstClassChart" class="chart-box"></div></div><div class="card"><div class="card-title"><h3>Second Class</h3><span>Expected vs Actual</span></div><div id="secondClassChart" class="chart-box"></div></div></div><div class="card" style="margin-top:18px"><div class="card-title"><h3>Admin attendance</h3><button id="copyReport" class="btn btn-soft">Copy summary</button></div><div id="adminReportChart" class="chart-box"></div></div>`; NPOC_CHARTS.lineChart('#firstClassChart', r.firstClassChart, {series:[{key:'expected',label:'Expected',color:'#4472C4'},{key:'actual',label:'Actual',color:'#ED7D31'}]}); NPOC_CHARTS.lineChart('#secondClassChart', r.secondClassChart, {series:[{key:'expected',label:'Expected',color:'#4472C4'},{key:'actual',label:'Actual',color:'#ED7D31'}]}); NPOC_CHARTS.barChart('#adminReportChart', r.adminAttendance.map(a=>({label:a.adminName,value:a.attendance}))); $('#copyReport').onclick=()=>{navigator.clipboard.writeText(`Expected: ${r.expectedStudents}\nActual: ${r.actualAttendance}\nFirst Timers: ${r.firstTimers}\nGraduates: ${r.graduates}`); toast('Report summary copied.');}; }
  async function renderAdminCenter(){ const admins=(await NPOC_API.api('GET_ADMINS',{user})).admins; $('#view-admin-center').innerHTML=`<div class="grid two"><div class="card"><div class="card-title"><h3>Add / edit admin</h3><span>Department flexibility</span></div><form id="adminForm" class="grid two"><input type="hidden" name="adminID"><div class="field"><label>Name</label><input name="name" required></div><div class="field"><label>Email</label><input name="email" type="email" required></div><div class="field"><label>Role</label><select name="role"><option>Super Admin</option><option>Lead Admin</option><option>Assistant Lead Admin</option><option>Class Admin</option><option>Ordinary Admin</option></select></div><div class="field"><label>Status</label><select name="status"><option>Active</option><option>Inactive</option></select></div><div class="field grow" style="grid-column:1/-1"><label>Department</label><input name="department" value="NPOC"></div><button class="btn btn-primary">Save admin</button></form></div><div class="card"><div class="card-title"><h3>Current admins</h3><span>${admins.length} total</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>${admins.map(a=>`<tr><td>${a.name}</td><td>${a.email}</td><td>${a.role}</td><td>${badge(a.status)}</td><td><button class="btn btn-soft small-btn" data-edit-admin='${JSON.stringify(a)}'>Edit</button></td></tr>`).join('')}</tbody></table></div>${renderMobileTable(admins.map(a=>({title:a.name,meta:`${a.email} · ${a.role}`,badge:a.status})))}</div></div>`; $('#adminForm').onsubmit=async(e)=>{e.preventDefault(); const body=Object.fromEntries(new FormData(e.target).entries()); await NPOC_API.api(body.adminID?'UPDATE_ADMIN':'CREATE_ADMIN',{method:'POST',body,user}); toast('Admin saved.'); renderAdminCenter();}; $$('[data-edit-admin]').forEach(b=>b.onclick=()=>{ const a=JSON.parse(b.dataset.editAdmin); Object.entries(a).forEach(([k,v])=>{ const f=$(`#adminForm [name="${k}"]`); if(f) f.value=v; }); }); }
  async function renderAudit(){ const res=await NPOC_API.api('GET_AUDIT_LOG',{params:{limit:100},user}); $('#view-audit').innerHTML=`<div class="grid two"><div class="card"><div class="card-title"><h3>Audit log</h3><span>Writes and updates</span></div><div class="audit-feed">${res.logs.map(auditItem).join('')||'<div class="empty-state">No audit records yet.</div>'}</div></div><div class="card"><div class="card-title"><h3>Login sessions</h3><span>Admin activity</span></div>${renderMobileTable((res.sessions||[]).map(s=>({title:s.admin,meta:`${s.loginTime} → ${s.logoutTime||'active'}`,badge:s.role})))}</div></div>`; }
  async function renderSettings(){ const s=NPOC_API.getSettings(); $('#view-settings').innerHTML=`<div class="card"><div class="card-title"><h3>Backend settings</h3><span>Apps Script + Google Sheets</span></div><form id="settingsForm"><div class="settings-row"><strong>Apps Script Web App URL</strong><input name="backendUrl" value="${s.backendUrl||''}" placeholder="https://script.google.com/macros/s/.../exec"></div><div class="settings-row"><strong>API Key</strong><input name="apiKey" value="${s.apiKey||''}"></div><div class="settings-row"><strong>Google Sheet ID</strong><input name="sheetId" value="${s.sheetId||''}"></div><div class="settings-row"><strong>Allowed domain</strong><input name="allowedDomain" value="${s.allowedDomain||'rfs.org'}"></div><div class="settings-row"><strong>Mode</strong><select name="mode"><option ${s.mode==='local'?'selected':''}>local</option><option ${s.mode==='backend'?'selected':''}>backend</option></select></div><button class="btn btn-primary" style="margin-top:18px">Save settings</button></form></div>`; $('#settingsForm').onsubmit=e=>{e.preventDefault(); NPOC_API.saveSettings(Object.fromEntries(new FormData(e.target).entries())); toast('Settings saved.');}; }
  return {init, route, refresh};
})();
document.addEventListener('DOMContentLoaded', App.init);
