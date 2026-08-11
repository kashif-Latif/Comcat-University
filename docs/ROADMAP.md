# COMCAT University — Feature Roadmap

Your current build covers Public + Admin + Teacher + Student portals with basic CRUD, attendance, and fee viewing. To make it read as a "proper" university CMS in a portfolio, here is what's typically expected and how I'd stage it.

---

## Phase 2 — Portal completeness (highest impact per hour)

These are the pieces that make the difference between "student demo project" and "could actually run a small institution."

**Additional roles**
- **VC (Vice Chancellor)** — read-only executive dashboard: KPIs, department-wise stats, revenue, admission trends. No CRUD.
- **HOD (Head of Department)** — subset of admin, scoped to their department only. Sees only their teachers, subjects, students.
- **Registrar** — manages academic calendar, semesters, program plans, transcripts.
- **Applicant** — a lightweight logged-in view for prospective students to check their application status.

The role system is already there (`ADMIN`/`TEACHER`/`STUDENT`), so this is mostly: add role values, add layout wrappers, add view-switch cases in `page.tsx`, and add API-level role checks.

**Exams & grades**
- `exams` table (subjectId, type: quiz/mid/final, totalMarks, date).
- `grades` table (examId, studentId, marks, grade letter).
- Teacher UI to enter marks. Student UI to view marks + GPA per semester.
- Auto-calc semester GPA + CGPA on the student dashboard (you already show a placeholder).

**Assignments**
- Teacher creates assignment (subjectId, title, description, due date, max marks).
- Student submits (file upload to Supabase Storage).
- Teacher grades submissions.

**Timetable**
- `timetable` table (subjectId, dayOfWeek, startTime, endTime, roomNumber).
- Grid view for students & teachers ("Monday/Tuesday/... 8am–5pm").

**Applicant portal**
- After submitting the admission form, the applicant receives an email with a magic link.
- They log in and see: application status, missing documents, interview slot, offer letter (once accepted).

**Academic calendar**
- `academic_events` table (title, date, type: holiday/exam/registration).
- Public read-only view + admin management.

**Announcements v2**
- Target announcements to specific roles / departments / semesters.
- Add rich text (you already have `@mdxeditor/editor`), attachments, and priority.

---

## Phase 3 — Real-world features

**Fee payment**
- Integrate a payment gateway. In Pakistan that's usually Stripe (international cards), 2C2P, or JazzCash/EasyPaisa for local. Even a manual "upload payment screenshot" flow is more realistic than the current view-only fees screen.

**File uploads (Supabase Storage)**
- Profile pictures (users table gets `avatarUrl`).
- Transcripts, matric/inter certs on the admission form.
- Assignment submissions.

**Email notifications** (you already have nodemailer as a dep)
- Admission decision emails.
- Password reset emails.
- Announcement digest.

**Password reset**
- Standard flow: request → email token → set new password. Missing entirely right now.

**2FA for admin/VC accounts**
- TOTP via `otplib` — a nice portfolio touch showing security awareness.

**Audit log**
- `audit_log` table — record every admin CRUD action. Very impressive in a security review.

---

## Phase 4 — Nice-to-have modules

Any one of these is a solid portfolio talking point:

- **Library** — books catalog + issue/return tracking.
- **Hostel** — rooms, allocations, waitlist.
- **Transport** — routes, bus tracking (fake GPS pins are fine).
- **Scholarships** — application, review, award workflow.
- **Alumni portal** — separate low-privilege login for graduated students.
- **Events & clubs** — society management, event RSVPs.
- **Chatbot v2** — the AI chatbot could actually query the DB via tools ("check my attendance", "what's my next class"). This is the most impressive AI feature you could add given the code you already have.

---

## Suggested execution order for portfolio impact

1. **Phase 1 (this patch)** — chatbot works, security holes closed, Supabase stays alive.
2. **Grades + exams** — biggest missing academic feature.
3. **Assignments with file upload** — shows you can wire Supabase Storage.
4. **VC + HOD dashboards** — shows role-based architecture.
5. **Payment gateway (Stripe test mode)** — shows real integration work.
6. **AI chatbot v2 with DB tool-calling** — the standout portfolio feature.

Each of these can be a separate PR/commit so your GitHub history tells a clean story.
