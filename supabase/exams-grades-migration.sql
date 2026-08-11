-- ═══════════════════════════════════════════════════════════════
-- COMCAT University — Phase 2: Exams, Grades, CGPA
-- Run this once in the Supabase SQL editor.
-- Safe to re-run (uses IF NOT EXISTS everywhere).
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Exams table ────────────────────────────────────────
-- One exam belongs to one subject. A subject can have many exams
-- (quizzes, mids, finals, projects, etc). Marks are cumulative:
-- subject % = SUM(marksObtained) / SUM(totalMarks) × 100
CREATE TABLE IF NOT EXISTS public.exams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "subjectId" UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('QUIZ','ASSIGNMENT','MID','FINAL','PROJECT','LAB')),
  "totalMarks" NUMERIC(6,2) NOT NULL CHECK ("totalMarks" > 0),
  "examDate"  TIMESTAMPTZ,
  semester    INTEGER,
  "createdBy" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS exams_subject_idx ON public.exams("subjectId");
CREATE INDEX IF NOT EXISTS exams_semester_idx ON public.exams(semester);

-- ─── 2. Grades table ───────────────────────────────────────
-- One row = one student's marks on one exam.
CREATE TABLE IF NOT EXISTS public.grades (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "examId"        UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  "studentId"     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "marksObtained" NUMERIC(6,2) NOT NULL CHECK ("marksObtained" >= 0),
  remarks         TEXT,
  "gradedBy"      UUID,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("examId", "studentId")
);

CREATE INDEX IF NOT EXISTS grades_student_idx ON public.grades("studentId");
CREATE INDEX IF NOT EXISTS grades_exam_idx    ON public.grades("examId");

-- ─── 3. Row Level Security ─────────────────────────────────
-- No anon policies = no anon access. Only service_role (server) can read/write.
ALTER TABLE public.exams  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- ─── 4. Sanity check ───────────────────────────────────────
SELECT
  table_name,
  (SELECT rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename = table_name) AS rls_on
FROM information_schema.tables
WHERE table_schema='public' AND table_name IN ('exams','grades');
-- Expected: both tables present, rls_on = true for both.
