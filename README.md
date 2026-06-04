# NPOC Operations Hub — V1.1 Backend Ready

This release keeps the V1.0.3 front-end experience and adds the production-oriented Google Apps Script backend engine.

## What is new in V1.1

- Backend sheet schema for all NPOC operations.
- Google Apps Script API in `/backend/Code.gs`.
- API contract and setup guide in `/backend`.
- Session tracking and audit log backend.
- Role validation for Super Admin, Lead Admin, Assistant Lead, Class Admin, and Ordinary Admin.
- Call list import, duplicate prevention, and fair admin distribution backend functions.
- QR attendance backend validation with cleaned `234...` phone number.
- Module 1 / Module 2 tracking.
- Admin Sunday attendance.
- Admin task schedule and evaluation.
- Faculty schedule backend endpoint.
- First-timer and second-timer email queue with Gmail sending.
- Graduation eligibility and approval backend.
- Monthly report endpoint.

## How to run front-end

Open `index.html` locally or deploy the folder contents to GitHub Pages/Netlify.

## How to connect backend

1. Create a new Google Sheet.
2. Open Extensions → Apps Script.
3. Paste `/backend/Code.gs`.
4. Add Script Properties:
   - `API_KEY`
   - `DEMO_ACCESS_CODE`
   - `FROM_NAME`
5. Run `setup()` once.
6. Deploy as a Web App.
7. Copy the Web App URL.
8. Open `backend-client.js` and set:

```js
BACKEND_URL: 'YOUR_APPS_SCRIPT_WEB_APP_URL',
API_KEY: 'YOUR_API_KEY'
```

## Production note

For leadership demo, this is strong. For live production, use Google Workspace access restrictions and keep the API key private.

Footer text remains: Rock Foundation School · NPOC Operations Hub
