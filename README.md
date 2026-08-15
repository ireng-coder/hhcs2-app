# Make Hope Health & Care Services installable (PWA)

This turns your live app into something people can "Add to Home Screen" /
"Install" on desktop, Android, and iPhone — using your logo as the icon.

## 1. Add these files to your project (in GitHub)

Copy this whole `pwa-files` folder's contents into your project's `public/`
folder, so you end up with:

```
public/
  manifest.json
  sw.js
  icons/
    icon-192.png
    icon-512.png
    icon-maskable-512.png
    apple-touch-icon.png
    favicon-32.png
    favicon-16.png
```

(If your project doesn't have a `public/` folder — e.g. plain HTML — put
them at the root next to `index.html` instead, and remove the leading `/`
from the paths in step 2/3 if your host needs relative paths.)

## 2. Add these tags to `index.html`, inside `<head>`

```html
<link rel="manifest" href="/manifest.json" />
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16.png" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
<meta name="theme-color" content="#0A4D8C" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Hope Health" />
```

## 3. Register the service worker

Chrome/Edge won't show the desktop "Install" button without an active
service worker, even a do-nothing one like `sw.js` here. Add this near the
top of your main entry file (e.g. `src/main.jsx`):

```js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
```

## 4. Commit, push, redeploy

```
git add public/manifest.json public/sw.js public/icons index.html src/main.jsx
git commit -m "Add PWA manifest and icons for installable app"
git push
```

Vercel will redeploy automatically from the push.

## 5. How people actually install it

- **Desktop Chrome/Edge**: a small install icon (⊕ or a monitor icon)
  appears in the address bar once the site loads — click it, then
  "Install." It then opens in its own window and shows up as a normal
  desktop app/icon.
- **Android Chrome**: menu (⋮) → "Add to Home screen" / "Install app."
- **iPhone/iPad Safari**: Share button → "Add to Home Screen." (iOS
  doesn't support the auto-install prompt Chrome has — this manual step
  is the only way on iOS, regardless of what the site does.)

## Notes

- The icon shown to you was flattened from a transparent PNG with a
  checkerboard background baked into it — I removed that and cropped it
  to just the rounded-square logo before generating these sizes, so
  there's no gray checker visible on any device.
- `icon-maskable-512.png` is a separate version with the logo scaled down
  and centered on a full-bleed navy square (no built-in rounding) —
  Android applies its own mask shape (circle, squircle, etc.), and this
  version is what keeps the logo from getting clipped when that happens.
- This is a real, standards-based PWA setup (same mechanism apps like
  Twitter/X, Spotify Web, and Gmail use) — no extra service or paid tool
  needed.
