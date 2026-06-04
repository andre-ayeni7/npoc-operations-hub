# NPOC Operations Hub V1.0

A HOTR/Rock Foundation School operations prototype built with HTML, vanilla CSS, and vanilla JavaScript.

## V1.0 improvements

- Church-office Excel import now detects the real call-list sheet instead of reading the Summary sheet.
- Supports columns such as Name, Local Mobile Number, Foreign Mobile Number, Email, Home Address, Residence/Location, Gender, Prayer Request, and “Would you like to join House on the Rock?”.
- Clean login splash screen styled around NPOC/HOTR.
- Logout button added.
- Admin session history added: login time, logout time, duration.
- Activity/audit log added: imports, call status changes, notes, admin changes, backend syncs.
- Footer simplified to: Rock Foundation School · NPOC Operations Hub.
- Removed unnecessary “saved locally” text from the UI.
- Mobile/desktop responsive refinements and reduced chart height.
- Backend Apps Script security improved with optional API key, allowed users, locking, and audit trail.

## Deployment

### GitHub Pages
1. Create a GitHub repository.
2. Upload all files in this folder.
3. Go to Settings → Pages.
4. Set source to main branch and root folder.
5. Open the GitHub Pages URL.

### Netlify
1. Go to Netlify.
2. Drag and drop this folder or ZIP.
3. Netlify will deploy it as a static site.

## Google Apps Script backend

1. Open your Google Sheet.
2. Go to Extensions → Apps Script.
3. Paste the contents of `backend/Code.gs`.
4. Deploy as Web App.
5. Copy the Web App URL.
6. Paste it into the app under Settings → Apps Script Web App URL.

## Recommended security setup

In Apps Script:

1. Go to Project Settings → Script Properties.
2. Add `NPOC_API_KEY` with a private random value.
3. Optional: add `NPOC_ALLOWED_USERS` as comma-separated admin names.

For full production security, connect Google Sign-In/OAuth and enforce role permissions on the backend.
