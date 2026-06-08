# NPOC Operations Hub V2.0 Enterprise Frontend

This is the upgraded front-end for the NPOC Operations Hub. It is built with plain HTML, vanilla CSS, and vanilla JavaScript, and is designed to connect to the Google Apps Script backend generated for Phase 2.

## What is included

- HOTR/RFS branded login splash page
- Role-based navigation
- Executive dashboard
- Call list import from CSV/XLS/XLSX
- Automatic phone cleanup to `234...`
- Round-robin call distribution among active admins
- My Calling List and status updates
- QR/manual attendance recording for Module 1 and Module 2
- Physical/Online attendance modes
- Student progression and graduation eligibility
- Admin task schedule and evaluation
- Faculty schedule
- Email automation view
- Admin Sunday attendance check-in
- Monthly report builder with charts
- Admin center for changing admins, roles, and status
- Audit and session history
- Settings page for Apps Script backend URL, API key, and Google Sheet ID

## Deployment on GitHub Pages

1. Unzip this folder.
2. Upload the contents to your GitHub repository root.
3. Ensure the following files are at the root level:
   - `index.html`
   - `assets/css/styles.css`
   - `assets/js/app.js`
   - `assets/js/api.js`
   - `assets/js/charts.js`
   - `assets/branding/hotr-logo.png`
4. In GitHub, go to **Settings → Pages**.
5. Select the branch and root folder.
6. Save and wait for the Pages URL to go live.

## Connecting to Google Apps Script

1. Deploy the Apps Script backend as a Web App.
2. Open the frontend.
3. Login.
4. Go to **Settings**.
5. Paste:
   - Apps Script Web App URL
   - API Key
   - Google Sheet ID
6. Change mode from `local` to `backend`.
7. Save settings.

If backend calls fail, the app gracefully falls back to local browser storage so you can still demo it.

## Recommended backend package

Use the Phase 2 Apps Script backend package previously generated:

- `Code.gs`
- `Database.gs`
- `Email.gs`
- `SMS.gs`
- `Tasks.gs`
- `Attendance.gs`
- `Integrations.gs`
- `Utilities.gs`
- `Triggers.gs`

## Important notes

- For Excel import, this frontend uses SheetJS from CDN. If offline, convert the church list to CSV before upload.
- For production security, replace the demo access code with Google Session verification and Apps Script role validation.
- Keep `assets/branding/hotr-logo.png` in the exact folder to avoid GitHub Pages image path issues.

Footer text remains intentionally simple:

`Rock Foundation School · NPOC Operations Hub`


## V2.0.1 UX Patch
- Reworked mobile header so month selector and report button stack correctly.
- Shortened dashboard hero copy for cleaner executive presentation.
- Improved sidebar scrolling and motion.
- Improved call-list upload: scans all workbook sheets, detects the true contact table, cleans phone numbers, and shows processing status.
- Added KPI icons and lighter card animations.

## V2.1.1 Continuity Fix
This build restores and strengthens the tabs that must remain part of the NPOC Operations Hub:
- Admin Center
- Email Automation
- My Calling List editable status/notes/timestamps
- Faculty Schedule upcoming list

This is an enhancement over V2.1, not a reset of the platform.


## V2.1.2 Claude AI Enhancement Integration

This build keeps the V2.1.1 continuity structure intact and integrates the safe parts of the Claude AI enhancement pack:

- IndexedDB cache (`assets/js/db.js`)
- Form validation engine (`assets/js/validation.js`)
- Central phone utilities (`assets/js/phone-utils.js`)
- Retry/offline API client (`assets/js/api-enhanced.js`)
- Backend-aware sync manager (`assets/js/sync.js`)
- Compatibility bridge (`assets/js/enhancement-bridge.js`)

The active UI remains `assets/js/app.js` to avoid scattering the existing tabs and workflows. See `docs/CLAUDE_AI_REVIEW_INTEGRATION_NOTES.md`.
