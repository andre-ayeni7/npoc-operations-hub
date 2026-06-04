# NPOC Operations Hub V1.0 — Rebuilt

A presentation-ready static front-end for Rock Foundation School / NPOC operations, designed to connect to Google Sheets through Google Apps Script.

## What is implemented

- HOTR logo included locally in `assets/hotr-logo.png` and embedded fallback inside `index.html` so GitHub Pages image paths do not break.
- Role-based login simulation: Super Admin, Lead Admin, Assistant Lead Admin, Class Admin, Ordinary Admin.
- Church call-list Excel/CSV upload with smart column detection.
- Phone cleaning into `234...` format.
- Automatic call distribution across active admins.
- Admin-specific calling list and status updates.
- QR attendance workflow using cleaned phone number or QR payload.
- Module 1 / Module 2 attendance records.
- Physical / Online attendance mode.
- Student progress engine: yet to take Module 1, yet to take Module 2, eligible for graduation, graduated.
- Graduation marking.
- Admin Sunday attendance: physical / online.
- Monthly report dashboard and chart widgets.
- Audit log and login/logout session history.
- Editable admin list.
- Google Apps Script backend contract in `/backend/Code.gs`.
- Clean footer: `Rock Foundation School · NPOC Operations Hub`.

## GitHub Pages deployment

1. Create a GitHub repository.
2. Upload all files in this folder, not the folder itself.
3. Confirm these files exist at repository root:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `assets/hotr-logo.png`
4. Go to Repository Settings → Pages.
5. Source: Deploy from branch.
6. Branch: `main`, folder: `/root`.
7. Wait for GitHub Pages URL.

## Logo fix

The app uses:

```html
<img src="./assets/hotr-logo.png" onerror="this.src=window.HOTR_LOGO_DATA">
```

This means the logo should show even if GitHub path resolution fails. Keep the `assets` folder in the repository.

## Backend setup

1. Open your Google Sheet.
2. Go to Extensions → Apps Script.
3. Paste `/backend/Code.gs`.
4. Set Script Property:
   - Key: `NPOC_API_KEY`
   - Value: any secure random key.
5. Deploy as Web App.
6. Copy Web App URL into the app Settings screen.
7. Paste the same API key into the app Settings screen.

## Production note

The front-end login is a demo login. For real production, login and permission checks must be enforced by Apps Script using the `Users` sheet and Google account email.
