# Google Apps Script Backend Setup

1. Create a fresh Google Sheet named **NPOC Operations Hub Backend**.
2. Open **Extensions → Apps Script**.
3. Paste all contents of `Code.gs`.
4. Go to **Project Settings → Script Properties** and add:
   - `API_KEY` = a long secret string.
   - `DEMO_ACCESS_CODE` = npoc2026 or your preferred temporary code.
   - `FROM_NAME` = Rock Foundation School.
5. Run the `setup()` function once and grant permissions.
6. Deploy as **Web App**.
   - Execute as: **Me**.
   - Access: choose based on your Google Workspace policy.
7. Copy the deployment URL.
8. In the front-end, set the backend URL and API key in `backend-client.js` or in the settings panel.

## Security notes

Google Apps Script is strong enough for this stage, but do not expose sensitive API keys publicly for final production. For presentation/demo, API key is fine. For live production, prefer Google Workspace-only access with backend user validation.
