# COMCAT University — Phase 1 Patch

Drop these files into your existing `Comcat-University-main/` repo, overwriting the originals. No `package.json` changes needed — everything uses libraries you already have.

## What's included

```
src/
  lib/
    api-guard.ts          NEW  Reusable auth + rate-limit helpers
    supabase.ts           REPLACE  Now picks service_role on server, anon in browser
  app/api/
    admissions/route.ts   REPLACE  Auth on GET/PUT/DELETE, rate limit on POST
    contact/route.ts      REPLACE  Auth on GET/PUT, rate limit + input caps on POST
    seed/route.ts         REPLACE  Requires SEED_TOKEN header
    ai-chat/route.ts      REPLACE  Rate limited, Groq→Gemini auto-fallback
    health/route.ts       NEW      Keep-alive endpoint that pings Supabase

.github/workflows/
  keep-alive.yml          NEW  Cron every 3 days → stops Supabase auto-pause

supabase/
  rls-setup.sql           NEW  Enables RLS + policies on every table

docs/
  DEPLOY.md               NEW  Step-by-step: unpause, env vars, RLS, verify
  ROADMAP.md              NEW  Feature plan for Phase 2/3/4

.env.example              REPLACE  Complete list with sources for every var
```

## What this patch fixes

1. **AI chatbot now runs on any host with just `GROQ_API_KEY` set.**
   If Groq is down or rate-limited, it falls through to Gemini automatically.
   No more `AI_PROVIDER` juggling — set the keys you have, and the route uses whichever works.

2. **Four API routes had no auth at all**  (`/api/admissions`, `/api/contact`, `/api/seed`, plus `/api/ai-chat` had no rate limit). Anyone could dump every applicant's CNIC + phone + email, mark them accepted/rejected, delete them, read every contact message, hit the seed endpoint, or burn your Groq quota with a script. All four are now hardened.

3. **RLS is the real fix.** The `NEXT_PUBLIC_SUPABASE_ANON_KEY` sits in your browser and can't be hidden — anyone hitting your site can grab it and query Supabase directly, bypassing every API route. With RLS off (as your code comment notes) that means they can read your `users` table with all the bcrypt hashes. `supabase/rls-setup.sql` closes that.

4. **The keep-alive endpoint + GitHub Action pings the DB every 3 days**, so Supabase stops auto-pausing your project.

## Order to apply

Follow `docs/DEPLOY.md` — the short version is:

1. Copy these files into your repo, commit, push.
2. Add the new env vars in Vercel (`SUPABASE_SERVICE_ROLE_KEY`, `SEED_TOKEN`, and confirm `GROQ_API_KEY` is set).
3. Run `supabase/rls-setup.sql` in the Supabase SQL editor.
4. Redeploy on Vercel.
5. Add `KEEP_ALIVE_URL` secret to GitHub, run the workflow once.
6. Test the chatbot on the live site.
