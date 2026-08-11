-- ═══════════════════════════════════════════════════════════════
-- COMCAT University — Phase 2c: Create/promote VC and HOD accounts
-- ═══════════════════════════════════════════════════════════════
--
-- The `users.role` column is TEXT so no schema change is needed.
-- Just set the role value on any existing account.
--
-- Run these one at a time in the Supabase SQL editor. Change the emails
-- to match users that actually exist in your DB.

-- ─── Option A: Promote an existing account to VC ──────────
-- The VC has no department scope — they see the whole university.
UPDATE public.users
SET role = 'VC',
    "updatedAt" = NOW()
WHERE email = 'admin@comcat.edu.pk';   -- change this to your VC's email
-- (If you don't have a dedicated VC account yet, you can just promote
--  one of the seeded admins/teachers for demo purposes.)


-- ─── Option B: Promote a teacher to HOD ───────────────────
-- HOD is scoped to their `department` field. Make sure the account
-- already has the correct department set.
UPDATE public.users
SET role = 'HOD',
    "updatedAt" = NOW()
WHERE email = 'ahmed.hassan@comcat.edu.pk';   -- change this to your HOD's email
-- If the department is missing, set it too:
-- UPDATE public.users SET department = 'Computer Science' WHERE email = '...';


-- ─── Verify ────────────────────────────────────────────────
SELECT id, email, name, role, department
FROM public.users
WHERE role IN ('VC', 'HOD', 'ADMIN')
ORDER BY role, name;
