# HHCS2 App

NDIS participant care log — staff portal for Hope Health & Care Services.

## Setup

```bash
npm install
cp .env.example .env.local
```

Open `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` —
use the exact same values as your existing NDIS Staff Portal, since this app
reuses that same Supabase project (same `participants` table).

Run `hhcs2_schema.sql` once in your Supabase project's SQL editor. It only
adds two new tables (`progress_notes`, `incidents`) — it does not touch your
existing `participants` table or any other data. Check the comment inside
the file about matching the `participant_id` column type to your existing
`participants.id` type before running it.

## Run locally

```bash
npm run dev
```

Open the localhost URL it prints — do not open `index.html` directly in the
browser, the module imports won't resolve without Vite's dev server.

## Build for deployment

```bash
npm run build
```

Outputs to `dist/`. Deploy that folder (or the whole project) to Vercel as usual.

## Project files

- `App.jsx` — the entire app: all modules (medication, food diary, sleep log,
  progress notes, incident report), the staff login/PIN screen, and the
  desktop sidebar layout.
- `supabaseClient.js` — Supabase connection, reads from `.env.local`.
- `main.jsx` / `index.html` / `vite.config.js` — standard Vite + React entry points.
- `hhcs2_schema.sql` — run once in Supabase to create the two new tables.

## Known limitation

The staff login PIN is not validated against anything yet — any 4 digits
will sign a tapped name in. It's a friendlier entry flow, not real
authentication. Ask if you'd like a real `staff` table with hashed PINs
wired up.
