// ─── Grading utilities ─────────────────────────────────────
// Uses the HEC-style 4.0 GPA scale common in Pakistani universities.
// If your institution uses a different scale, edit GRADE_SCALE below —
// every downstream calculation reads from it.

export interface GradeBand {
  min: number       // inclusive lower bound of percentage
  letter: string    // A, A-, B+, B, ...
  points: number    // 4.0-scale GPA points
}

// Highest → lowest. Each entry says "if pct >= min, this is the grade".
export const GRADE_SCALE: readonly GradeBand[] = [
  { min: 85, letter: 'A',  points: 4.0 },
  { min: 80, letter: 'A-', points: 3.7 },
  { min: 75, letter: 'B+', points: 3.3 },
  { min: 70, letter: 'B',  points: 3.0 },
  { min: 65, letter: 'B-', points: 2.7 },
  { min: 61, letter: 'C+', points: 2.3 },
  { min: 58, letter: 'C',  points: 2.0 },
  { min: 55, letter: 'C-', points: 1.7 },
  { min: 50, letter: 'D+', points: 1.3 },
  { min: 45, letter: 'D',  points: 1.0 },
  { min: 0,  letter: 'F',  points: 0.0 },
] as const

/** Convert a percentage (0–100) into a grade band. */
export function percentToGrade(pct: number): GradeBand {
  const clamped = Math.max(0, Math.min(100, pct))
  for (const band of GRADE_SCALE) {
    if (clamped >= band.min) return band
  }
  return GRADE_SCALE[GRADE_SCALE.length - 1]  // fallback F
}

/**
 * Compute a subject's aggregate percentage from a list of exam results.
 * Weights each exam by its `totalMarks` — a final worth 100 counts more
 * than a quiz worth 10 automatically, no explicit weightage needed.
 */
export interface ExamResult { totalMarks: number; marksObtained: number }

export function subjectPercent(results: ExamResult[]): number | null {
  if (!results || results.length === 0) return null
  const totalMax = results.reduce((s, r) => s + Number(r.totalMarks || 0), 0)
  if (totalMax <= 0) return null
  const totalGot = results.reduce((s, r) => s + Number(r.marksObtained || 0), 0)
  return (totalGot / totalMax) * 100
}

/**
 * Weighted GPA across subjects. Each subject weighted by credit hours.
 *   subjectGpa: 4.0 points for that subject
 *   credits:    credit hours (typically 3)
 */
export interface SubjectGpaEntry { subjectGpa: number; credits: number }

export function weightedGPA(subjects: SubjectGpaEntry[]): number | null {
  const withCredits = subjects.filter(s => Number(s.credits) > 0)
  if (withCredits.length === 0) return null
  const totalCredits = withCredits.reduce((s, x) => s + Number(x.credits), 0)
  const weighted = withCredits.reduce((s, x) => s + Number(x.subjectGpa) * Number(x.credits), 0)
  return totalCredits > 0 ? weighted / totalCredits : null
}

/** Round a GPA to 2 decimal places for display. */
export function roundGpa(gpa: number | null): number | null {
  if (gpa === null || gpa === undefined || Number.isNaN(gpa)) return null
  return Math.round(gpa * 100) / 100
}

/**
 * High-level: given per-subject exam results + credits, produce a full transcript.
 * Groups by semester, computes semester GPA, then CGPA across all semesters.
 */
export interface SubjectTranscriptInput {
  subjectId: string
  subjectCode: string
  subjectName: string
  credits: number
  semester: number | null
  exams: Array<{
    examId: string
    title: string
    type: string
    totalMarks: number
    marksObtained: number | null   // null = not graded yet
  }>
}

export interface SubjectTranscriptRow {
  subjectId: string
  subjectCode: string
  subjectName: string
  credits: number
  semester: number | null
  percent: number | null
  letter: string | null
  gpaPoints: number | null
  exams: SubjectTranscriptInput['exams']
}

export interface Transcript {
  subjects: SubjectTranscriptRow[]
  semesters: Array<{ semester: number; gpa: number | null; credits: number; subjects: SubjectTranscriptRow[] }>
  cgpa: number | null
  totalCredits: number
}

export function buildTranscript(subjects: SubjectTranscriptInput[]): Transcript {
  const rows: SubjectTranscriptRow[] = subjects.map(s => {
    const graded = s.exams.filter(e => e.marksObtained !== null) as ExamResult[]
    const pct = subjectPercent(graded)
    const band = pct === null ? null : percentToGrade(pct)
    return {
      subjectId: s.subjectId,
      subjectCode: s.subjectCode,
      subjectName: s.subjectName,
      credits: s.credits,
      semester: s.semester,
      percent: pct === null ? null : Math.round(pct * 100) / 100,
      letter: band?.letter ?? null,
      gpaPoints: band?.points ?? null,
      exams: s.exams,
    }
  })

  // Group by semester
  const bySem = new Map<number, SubjectTranscriptRow[]>()
  for (const r of rows) {
    const sem = r.semester ?? 0
    if (!bySem.has(sem)) bySem.set(sem, [])
    bySem.get(sem)!.push(r)
  }

  const semesters = Array.from(bySem.entries())
    .sort(([a], [b]) => a - b)
    .map(([semester, subs]) => {
      const gpaEntries = subs
        .filter(s => s.gpaPoints !== null)
        .map(s => ({ subjectGpa: s.gpaPoints!, credits: s.credits }))
      const semGpa = weightedGPA(gpaEntries)
      const semCredits = subs
        .filter(s => s.gpaPoints !== null)
        .reduce((sum, s) => sum + s.credits, 0)
      return { semester, gpa: roundGpa(semGpa), credits: semCredits, subjects: subs }
    })

  const allGraded = rows
    .filter(r => r.gpaPoints !== null)
    .map(r => ({ subjectGpa: r.gpaPoints!, credits: r.credits }))
  const cgpa = roundGpa(weightedGPA(allGraded))
  const totalCredits = allGraded.reduce((s, x) => s + x.credits, 0)

  return { subjects: rows, semesters, cgpa, totalCredits }
}
