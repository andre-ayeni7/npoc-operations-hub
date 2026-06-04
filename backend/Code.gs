/**
 * NPOC Operations Hub V1.0 Backend
 * Google Apps Script Web App + Google Sheets Engine
 * Deploy: Apps Script > Deploy > New deployment > Web app
 * Execute as: Me. Access: Anyone in your organization OR Anyone with link plus API key.
 */
const SHEETS = {
  USERS: 'Users', CALLS: 'Call_List', ATTENDANCE: 'Student_Attendance', ADMIN_ATT: 'Admin_Attendance',
  GRADUATES: 'Graduates', AUDIT: 'Audit_Log', SETTINGS: 'Settings'
};
function doPost(e){
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try{
    const body = JSON.parse(e.postData.contents || '{}');
    assertApiKey_(body.apiKey);
    const action = body.action || '';
    const user = getUser_();
    if(!isAllowedUser_(user)) throw new Error('Unauthorized user: '+user);
    const payload = body.payload || {};
    if(action === 'sync') return json_({ok:true, data: syncAll_(payload, user)});
    if(action === 'appendAttendance') return json_({ok:true, data: appendRows_(SHEETS.ATTENDANCE, payload.rows || [], user, 'APPEND_STUDENT_ATTENDANCE')});
    if(action === 'appendAdminAttendance') return json_({ok:true, data: appendRows_(SHEETS.ADMIN_ATT, payload.rows || [], user, 'APPEND_ADMIN_ATTENDANCE')});
    if(action === 'appendCalls') return json_({ok:true, data: appendRows_(SHEETS.CALLS, payload.rows || [], user, 'APPEND_CALLS')});
    return json_({ok:false, error:'Unknown action'});
  } catch(err){ return json_({ok:false,error:String(err.message || err)}); }
  finally{ lock.releaseLock(); }
}
function doGet(e){
  try{ assertApiKey_(e.parameter.apiKey); return json_({ok:true, time:new Date(), user:getUser_(), data:getDashboardData_()}); }
  catch(err){ return json_({ok:false,error:String(err.message || err)}); }
}
function syncAll_(payload, user){
  setupSheets_();
  if(payload.callList) replaceData_(SHEETS.CALLS, ['id','name','rawPhone','phone','email','gender','assignedAdmin','status','notes','registered','updated'], payload.callList);
  if(payload.attendance) replaceData_(SHEETS.ATTENDANCE, ['id','phone','name','date','module','mode','registered','first','createdAt','by'], payload.attendance);
  if(payload.adminAttendance) replaceData_(SHEETS.ADMIN_ATT, ['id','admin','mode','date','duty','by','time'], payload.adminAttendance);
  if(payload.graduates) replaceData_(SHEETS.GRADUATES, ['phone','name','date','by'], payload.graduates);
  audit_(user, 'SYNC_ALL', 'Front-end state synced to backend');
  return {syncedAt:new Date()};
}
function setupSheets_(){
  const ss = SpreadsheetApp.getActive();
  const defs = {
    [SHEETS.USERS]: ['Email','Name','Role','Active'],
    [SHEETS.CALLS]: ['id','name','rawPhone','phone','email','gender','assignedAdmin','status','notes','registered','updated'],
    [SHEETS.ATTENDANCE]: ['id','phone','name','date','module','mode','registered','first','createdAt','by'],
    [SHEETS.ADMIN_ATT]: ['id','admin','mode','date','duty','by','time'],
    [SHEETS.GRADUATES]: ['phone','name','date','by'],
    [SHEETS.AUDIT]: ['Timestamp','User','Action','Details'],
    [SHEETS.SETTINGS]: ['Key','Value']
  };
  Object.keys(defs).forEach(name=>{
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if(sh.getLastRow() === 0) sh.appendRow(defs[name]);
    else if(sh.getRange(1,1).getValue() === '') sh.getRange(1,1,1,defs[name].length).setValues([defs[name]]);
  });
}
function replaceData_(sheetName, headers, objects){
  const sh = SpreadsheetApp.getActive().getSheetByName(sheetName) || SpreadsheetApp.getActive().insertSheet(sheetName);
  sh.clearContents(); sh.getRange(1,1,1,headers.length).setValues([headers]);
  if(objects.length){ const rows = objects.map(o=>headers.map(h=>o[h] ?? '')); sh.getRange(2,1,rows.length,headers.length).setValues(rows); }
}
function appendRows_(sheetName, rows, user, action){
  setupSheets_(); const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if(rows.length) sh.getRange(sh.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows);
  audit_(user, action, rows.length+' row(s) appended'); return {count:rows.length};
}
function getDashboardData_(){ setupSheets_(); return {message:'Use frontend to render dashboard. Backend is active.'}; }
function audit_(user, action, details){
  setupSheets_(); SpreadsheetApp.getActive().getSheetByName(SHEETS.AUDIT).appendRow([new Date(), user, action, details]);
}
function assertApiKey_(key){
  const expected = PropertiesService.getScriptProperties().getProperty('NPOC_API_KEY');
  if(expected && key !== expected) throw new Error('Invalid API key');
}
function getUser_(){ return Session.getActiveUser().getEmail() || 'anonymous'; }
function isAllowedUser_(email){
  setupSheets_(); const sh = SpreadsheetApp.getActive().getSheetByName(SHEETS.USERS); const values = sh.getDataRange().getValues().slice(1);
  if(!values.length) return true; // during setup only
  return values.some(r => String(r[0]).toLowerCase() === String(email).toLowerCase() && String(r[3]).toLowerCase() !== 'no');
}
function json_(obj){ return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
