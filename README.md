# NPOC Operations Hub V1.0.3

Presentation-ready static front-end with Google Sheets / Apps Script backend contract.

## What changed in V1.0.3
- Cleaned login splash page.
- Removed demo/instructional text from the UI.
- Added editable Faculty Schedule module using the uploaded 2026 faculty schedule.
- Added First Timer and Second Timer email templates.
- Added email queue workflow for Apps Script Gmail sending.
- Attendance now queues first-timer email on first attendance and Module 2 invitation after Module 1 attendance.
- Backend Code.gs now includes Faculty_Schedule and Email_Queue contracts plus GmailApp email sending action.

## Deployment
Upload all files to GitHub Pages or Netlify. Keep the assets folder intact.

## Backend
Paste backend/Code.gs into Apps Script and deploy as Web App. Set NPOC_API_KEY in Script Properties before production.
