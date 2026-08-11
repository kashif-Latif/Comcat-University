# COMCAT University — Phase 2 Deploy Guide

You're adding **Exams, Grades, and CGPA** to your working project. This is additive — no existing feature changes behaviour.

---

## What this ships

- **`/api/exams`** — teachers CRUD exams on their assigned subjects; students read exams for enrolled subjects
- **`/api/grades`** — teachers enter/update per-student marks; students read their own
- **`/api/transcript`** — one call returns a student's full transcript: subjects, per-exam marks, semester GPAs, CGPA
- **Teacher UI:** new "Exams & Grades" tab — pick a subject, create an exam, enter marks for enrolled students in a table
- **Student UI:** new "Grades & CGPA" tab — CGPA card at the top, semester-wise breakdown with subject-level letter grades, expand each subject to see individual exam marks
- **Grading library** (`src/lib/grading.ts`) — HEC-style 4.0 scale, edit `GRADE_SCALE` in one place if your institution uses different bands

---

## Step 1 — Drop the files in

Extract `comcat-phase2-patch.zip`. Copy every file into your `Comcat-University-main/` folder, overwriting when prompted. No `package.json` changes needed.

Files added/replaced:
```
src/lib/grading.ts                              NEW
src/store/use-app-store.ts                      REPLACE  (adds 2 view types)
src/app/page.tsx                                REPLACE  (adds 2 switch cases)
src/app/api/exams/route.ts                      NEW
src/app/api/grades/route.ts                     NEW
src/app/api/transcript/route.ts                 NEW
src/components/teacher/manage-exams.tsx         NEW
src/components/teacher/teacher-layout.tsx       REPLACE  (adds "Exams & Grades" nav)
src/components/student/my-grades.tsx            NEW
src/components/student/student-layout.tsx       REPLACE  (adds "Grades & CGPA" nav)
supabase/exams-grades-migration.sql             NEW
```

Commit and push:
```bash
git add .
git commit -m "Phase 2: exams, grades, transcript, CGPA"
git push
```

Vercel will auto-deploy.

---

## Step 2 — Run the DB migration

Supabase → SQL Editor → New query → paste the whole contents of `supabase/exams-grades-migration.sql` → Run.

At the bottom you should see two rows: `exams` and `grades`, both with `rls_on = true`.

---

## Step 3 — Test end-to-end

1. **As teacher** — Log in as a teacher account. Sidebar shows a new "Exams & Grades" item. Click it.
2. **Create an exam** — Pick one of your subjects from the dropdown. Click "New Exam". Fill in title (e.g. "Quiz 1"), type (QUIZ), total marks (10), optional date. Save. You should see it in the table.
3. **Enter grades** — Click the gold "Grades" button on that exam row. A table appears listing every student enrolled in that subject. Type a mark (e.g. 8, 9, 7) for a few students. Click "Save Grades". Toast shows how many were saved.
4. **As student** — Log out. Log in as a student enrolled in that subject. Sidebar shows "Grades & CGPA". Click it.
5. **Confirm the transcript** — At the top you should see the CGPA card. Below it, the semester card contains the subject with the exam you just graded. Expand the subject to see the exam row with `8 / 10`. The letter grade badge on the right (A/B/etc.) is computed from the percentage.

If any step fails, tell me exactly which step and paste the error.

---

## What the grading formulas do

**Per subject:**
```
percentage = SUM(marksObtained across all exams) / SUM(totalMarks across all exams) × 100
```
A final worth 100 marks weighs more than a quiz worth 10 automatically — no explicit weightage needed.

**Percentage → letter → GPA points** — via `GRADE_SCALE` in `src/lib/grading.ts`. Default is Pakistani HEC 4.0 scale (85+ = A, 4.0).

**Semester GPA** — average of subject GPAs *weighted by credit hours*.

**CGPA** — same formula across all subjects the student has been graded in, regardless of semester.

Not-yet-graded exams are ignored, so early-semester CGPA reflects only what has been marked.

---

## Notes

- Only exams that have graded students count toward CGPA. A subject with only a scheduled-but-not-graded final still shows "Not graded" and doesn't drag GPA down.
- Teachers can only touch exams for subjects they're assigned to via `subject_teachers` — enforced server-side on every endpoint.
- Students can only read their own grades — enforced server-side.
- Admin has full access to everything.
- The batch-grade endpoint upserts (insert if new, update if exists), so re-entering marks safely overwrites.
