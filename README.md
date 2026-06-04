# NPOC Operations Hub — V1.0.1 Splash/Layout Fix

This package fixes the V1.0 rebuilt layout issue where the splash/login screen and sidebar logo could appear oversized or scattered on GitHub Pages.

## What changed
- Removed heavy embedded logo data from `index.html`.
- Added optimized `assets/hotr-logo-fit.png` for reliable GitHub Pages rendering.
- Rebuilt responsive CSS for login, sidebar, dashboard, forms, tables, and chart cards.
- Fixed card widths, logo sizing, viewport overflow, and mobile layout behavior.

## GitHub Pages setup
Upload the full folder contents, including:

```txt
index.html
styles.css
app.js
assets/hotr-logo.png
assets/hotr-logo-fit.png
backend/Code.gs
```

The logo path in the app is:

```html
./assets/hotr-logo-fit.png
```

Do not rename the assets folder or logo file unless you also update the HTML.

## Demo access
Access code: `npoc2026`
