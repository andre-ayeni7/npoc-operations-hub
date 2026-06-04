# NPOC Operations Hub Backend API Contract — V1.1

Deploy `Code.gs` as a Google Apps Script Web App. The front-end posts JSON to the deployed URL.

## Request shape

```json
{
  "apiKey": "YOUR_API_KEY",
  "sessionId": "SESSION_ID_FROM_LOGIN",
  "action": "recordAttendance",
  "payload": {}
}
```

## Important actions

- `setup` — creates required Google Sheet tabs and headers.
- `login` — validates user and starts session.
- `logout` — closes active session.
- `bootstrap` — returns settings, admins, schedule, report snapshot.
- `importCallList` — imports cleaned church call list records.
- `distributeCalls` — evenly distributes pending calls to active admins.
- `updateCallOutcome` — ordinary admin can update own assigned calls.
- `recordAttendance` — records student QR attendance with Module 1/2 and Physical/Online.
- `recordAdminAttendance` — records Sunday admin attendance.
- `saveTask` — creates/updates admin task and evaluation item.
- `saveFacultySchedule` — adds faculty schedule entries.
- `queueEmail` — queues first-timer or second-timer email.
- `sendQueuedEmails` — sends queued email through Gmail.
- `approveGraduates` — marks eligible students graduated.
- `monthlyReport` — returns month KPI report.
- `auditLog` — returns recent audit events for leads.

## Backend tabs created

Settings, Users, Admins, Call_List, Students, Attendance, Admin_Attendance, Admin_Tasks, Faculty_Schedule, Email_Queue, Graduates, Monthly_Reports, Audit_Log, Sessions.
