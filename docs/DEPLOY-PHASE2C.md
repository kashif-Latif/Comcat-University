# COMCAT University — Phase 2c: VC + HOD Executive Dashboards

You're adding two new roles — **Vice Chancellor** and **Head of Department** — each with their own executive-style dashboard packed with KPIs and charts.

---

## What ships

- **`/api/dashboard/executive`** — one endpoint. VC sees whole-university data, HOD gets department-scoped data automatically. ADMIN can hit it too for testing.
- **VC Portal** — read-only executive dashboard: 8 KPI cards (students, faculty, subjects, departments, revenue paid/outstanding, pending admissions, enrollments) + 4 interactive charts (students by dept, admission funnel pie, students by semester, revenue by semester stacked bar) + recent admissions + recent announcements.
- **HOD Portal** — same layout, but every number and chart is scoped to their `department` field. A banner at the top makes the scope explicit.
- **Login form** — automatically routes VC accounts to `/vc-dashboard` and HOD accounts to `/hod-dashboard`.

**No new tables. No new dependencies.** Uses Recharts which is already in your `package.json`.

---

## Install

Files added / replaced:
```
src/app/api/dashboard/executive/route.ts       NEW
src/components/executive/executive-layout.tsx  NEW
src/components/executive/executive-dashboard.tsx NEW
src/components/auth/login-form.tsx             REPLACE  (VC/HOD routing)
src/store/use-app-store.ts                     REPLACE  (2 new view types)
src/app/page.tsx                               REPLACE  (VC/HOD switch cases)
supabase/vc-hod-roles.sql                      NEW      (promote users to VC/HOD)
```

1. Extract `comcat-phase2c-patch.zip` → copy into your repo → overwrite when asked.
2. `git add . && git commit -m "Phase 2c: VC and HOD dashboards" && git push`
3. Vercel auto-deploys.

---

## Step 2 — Promote users to VC / HOD

Open Supabase → SQL Editor → paste the contents of `supabase/vc-hod-roles.sql`.

Change the emails to match users that actually exist. For a quick demo:

```sql
-- Promote admin to VC (or create a dedicated vc@ account first)
UPDATE public.users SET role = 'VC' WHERE email = 'admin@comcat.edu.pk';

-- Promote one teacher (Ahmed Hassan, Computer Science) to HOD
UPDATE public.users SET role = 'HOD' WHERE email = 'ahmed.hassan@comcat.edu.pk';
```

Then run the verify query at the bottom of the file to confirm.

**Important:** for HOD, the account's `department` field must be set. The seeded teachers all have departments already — just double-check the verify query output.

---

## Step 3 — Test end-to-end

**As VC:**
1. Log in with the VC email + old password (bcrypt hash is unchanged, just the role flipped).
2. You land on the Executive Dashboard.
3. Verify KPIs match your data — total students, faculty, subjects, departments, pending admissions, revenue.
4. Charts should render: students by department (bar), admission funnel (pie), students by semester (bar), revenue by semester (stacked bar).
5. Recent admissions and announcements at the bottom.

**As HOD:**
1. Log in as the HOD (e.g. `ahmed.hassan@comcat.edu.pk`).
2. Banner at top says `Viewing data for department: Computer Science`.
3. All KPIs and charts should now show ONLY Computer Science data — student count is smaller, teachers are just the CS ones, subjects are only CS subjects.
4. This is the whole point of role-scoping — HOD has zero visibility into other departments.

**Confirm access control:** If a student tries to hit `/api/dashboard/executive` in their browser (paste URL directly), they get `403 Forbidden`. Same for a teacher. Only ADMIN/VC/HOD can call it.

---

## Portfolio talking points

- **Role-based data scoping enforced server-side** — the API decides what data each role sees, the frontend just renders. Impossible for a client to escalate privileges.
- **One endpoint, two roles, different scopes** — clean architecture: the API sees `role` on the session and adjusts filters. No duplicate endpoints for VC vs HOD.
- **Recharts-driven executive dashboard** — pie, bar, stacked bar. Real KPIs from live data, not mocked.
- **Currency formatting for Pakistani rupees** — automatic K / Lakh / Crore compaction (`formatPKR` helper).

---

## Notes

- The chatbot's role type doesn't know about VC/HOD yet. When they use the chatbot, they'll fall through to anonymous-style Q&A (no personal tools). To wire tools for them, add cases in `src/lib/chat-tools.ts` — future patch.
- HOD sees only their department's admissions by matching the applicant's program name against the department name (e.g. "BS Computer Science" contains "Computer Science"). Works with your current seed data. Adjust in the API if your programs are named differently.
- Announcements are shown to VC/HOD unchanged — university-wide news is relevant to both.
