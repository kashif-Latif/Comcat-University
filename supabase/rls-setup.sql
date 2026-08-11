-- ═══════════════════════════════════════════════════════════════
-- COMCAT University — Row Level Security setup
-- ───────────────────────────────────────────────────────────────
-- Run this in the Supabase SQL editor once. It enables RLS on
-- every sensitive table and adds strict policies so that even if
-- the anon key is leaked (it lives in the browser, so assume it
-- is leaked), no client can bypass your Next.js API routes to
-- read or write data directly.
--
-- Model:
--   - anon role  = the NEXT_PUBLIC_SUPABASE_ANON_KEY used in the browser
--   - service_role = the SUPABASE_SERVICE_ROLE_KEY used only server-side
--
-- Policies below deny anon access entirely on sensitive tables and
-- allow anon INSERT-only on the two public-write tables (admissions,
-- contact_messages). Your Next.js API routes should use the
-- service_role key on the server for everything else.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Enable RLS on every table ──────────────────────────
ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fees               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admissions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages   ENABLE ROW LEVEL SECURITY;

-- ─── 2. Drop any legacy permissive policies ────────────────
-- (safe to re-run — DROP POLICY IF EXISTS is idempotent)
DROP POLICY IF EXISTS "anon_all_users"              ON public.users;
DROP POLICY IF EXISTS "anon_all_teachers"           ON public.teachers;
DROP POLICY IF EXISTS "anon_all_subjects"           ON public.subjects;
DROP POLICY IF EXISTS "anon_all_enrollments"        ON public.enrollments;
DROP POLICY IF EXISTS "anon_all_attendance"         ON public.attendance_records;
DROP POLICY IF EXISTS "anon_all_fees"               ON public.fees;
DROP POLICY IF EXISTS "anon_all_admissions"         ON public.admissions;
DROP POLICY IF EXISTS "anon_all_announcements"      ON public.announcements;
DROP POLICY IF EXISTS "anon_all_contact"            ON public.contact_messages;

-- ─── 3. Public write-only endpoints ────────────────────────
-- Anonymous users can INSERT into admissions and contact_messages
-- (that's how the public forms work). They CANNOT read them back.
DROP POLICY IF EXISTS "anon_insert_admissions" ON public.admissions;
CREATE POLICY "anon_insert_admissions"
  ON public.admissions
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_insert_contact" ON public.contact_messages;
CREATE POLICY "anon_insert_contact"
  ON public.contact_messages
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- ─── 4. Public read for published announcements only ───────
-- The public homepage news feed reads from this.
-- Only rows where isPublished = true are visible to anon.
DROP POLICY IF EXISTS "anon_read_published_announcements" ON public.announcements;
CREATE POLICY "anon_read_published_announcements"
  ON public.announcements
  FOR SELECT
  TO anon
  USING ("isPublished" = true);

-- ─── 5. Everything else: no anon policies at all ───────────
-- With RLS on and no policy for the anon role, SELECT/UPDATE/DELETE
-- are all denied. Your API routes must use the service_role key
-- (server-side only) to touch users / teachers / subjects / fees /
-- attendance / enrollments / etc.

-- ─── 6. service_role bypasses RLS ──────────────────────────
-- (this is automatic in Supabase — no policy needed. The
-- SUPABASE_SERVICE_ROLE_KEY has full access. Guard it carefully
-- and NEVER expose it to the browser.)

-- ─── 7. Sanity check ───────────────────────────────────────
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- Expected: rowsecurity = true for every row above.
