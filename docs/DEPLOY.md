# COMCAT University — Deploy & Fix Guide

This guide gets your project alive on Vercel + Supabase and keeps it that way.

---

## 1. Unpause Supabase (do this first)

1. Go to https://supabase.com/dashboard.
2. Click your paused project → the big **"Restore project"** button.
3. Wait ~1–2 minutes for the DB to come back up.

Note: The Supabase free tier auto-pauses projects with **no database activity for one week**. If yours has been pausing in 3–4 days that's actually normal-adjacent — any period of no queries counts. The keep-alive workflow below fixes that permanently.

---

## 2. Set environment variables on Vercel

Vercel → Project → **Settings → Environment Variables**. Add each of these for both **Production** and **Preview**:

| Variable | Where to get it | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | Safe to expose |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | Safe to expose (RLS protects it) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | ⚠️ Server-only. Never leak. |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Random 32-byte string |
| `NEXTAUTH_URL` | your Vercel URL, e.g. `https://comcat-university.vercel.app` | |
| `GROQ_API_KEY` | https://console.groq.com | Free, primary AI provider |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey | Free, automatic fallback |
| `SEED_TOKEN` | make one up, long random string | Required to hit `/api/seed` |

After adding them: **Deployments → the latest deployment → ••• → Redeploy** (env vars only take effect on redeploy).

---

## 3. Apply RLS to Supabase (this is the real security fix)

Right now RLS is disabled in your DB, which means the anon key in the browser can read every row of every table — including all user password hashes. This must be fixed before the site can be called production-ready.

1. Supabase → **SQL Editor** → New query.
2. Paste the entire contents of `supabase/rls-setup.sql`.
3. Click **Run**.
4. At the bottom you'll see a `rowsecurity = true` for every table. Confirm all rows say `true`.

Once RLS is on, all server-side DB operations must use `SUPABASE_SERVICE_ROLE_KEY` — the patched `src/lib/supabase.ts` handles this automatically (server picks service_role, browser picks anon).

---

## 4. Verify the AI chatbot

After redeploy:

```bash
curl -X POST https://your-app.vercel.app/api/ai-chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"hello","sessionId":"test"}'
```

You should see something like:

```json
{"success":true,"response":"Hello! Welcome to COMCAT University..."}
```

If you get `The AI assistant is not configured yet`, `GROQ_API_KEY` isn't set. If you get `temporarily unavailable`, both providers failed — check your keys aren't revoked.

---

## 5. Set up the keep-alive workflow

1. Push `.github/workflows/keep-alive.yml` to your repo.
2. GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret**.
3. Name: `KEEP_ALIVE_URL`, value: `https://your-app.vercel.app/api/health`.
4. Actions tab → **Keep Supabase Alive** → **Run workflow** to test it once.

After that it runs automatically every 3 days at 04:00 UTC (09:00 PKT).

---

## 6. Seed your data (if needed)

If the DB is empty after unpause, re-seed:

```bash
curl -H "x-seed-token: <your SEED_TOKEN>" \
  https://your-app.vercel.app/api/seed
```

Without the header the endpoint refuses. After the initial seed, unset `SEED_TOKEN` in Vercel or delete `src/app/api/seed/route.ts` entirely.

---

## 7. Rotate compromised credentials

If your Groq/Gemini/Supabase keys have been in a public GitHub repo, **rotate them right now**. Old keys get scraped and abused within hours:

- Groq: console → Keys → Revoke → generate new.
- Gemini: AI Studio → Keys → Delete → Create.
- Supabase: Settings → API → **Reset service_role JWT secret** (this rotates both anon + service_role).
- Update Vercel env vars, then redeploy.
