'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Plus, Loader2, ClipboardList, GraduationCap, Trash2, Save,
} from 'lucide-react'

interface Subject {
  id: string
  code: string
  name: string
  credits: number
  semester: number | null
  department: string
}
interface Exam {
  id: string
  subjectId: string
  title: string
  type: 'QUIZ' | 'ASSIGNMENT' | 'MID' | 'FINAL' | 'PROJECT' | 'LAB'
  totalMarks: number
  examDate: string | null
  semester: number | null
  subject?: Subject
}
interface Student {
  id: string
  name: string
  email: string
  studentId?: string | null
  semester?: number | null
}
interface Grade {
  id: string
  examId: string
  studentId: string
  marksObtained: number
  remarks: string | null
}

const EXAM_TYPES = ['QUIZ', 'ASSIGNMENT', 'MID', 'FINAL', 'PROJECT', 'LAB'] as const

export function ManageExams() {
  // ─── State ────────────────────────────────────────────────
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  const [exams, setExams] = useState<Exam[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [loadingExams, setLoadingExams] = useState(false)

  // Create/edit exam dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [editingExamId, setEditingExamId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '', type: 'QUIZ' as Exam['type'], totalMarks: 100, examDate: '',
  })
  const [saving, setSaving] = useState(false)

  // Grades entry state
  const [gradingExamId, setGradingExamId] = useState<string | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [gradesMap, setGradesMap] = useState<Record<string, { marks: string; remarks: string }>>({})
  const [loadingGrades, setLoadingGrades] = useState(false)
  const [savingGrades, setSavingGrades] = useState(false)

  // ─── Fetchers ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/subjects')
        const data = await res.json()
        if (cancelled) return
        if (Array.isArray(data)) {
          setSubjects(data)
          if (data.length > 0 && !selectedSubjectId) setSelectedSubjectId(data[0].id)
        }
      } catch {
        toast.error("Couldn't load your subjects")
      } finally {
        if (!cancelled) setLoadingSubjects(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedSubjectId) return
    let cancelled = false
    setLoadingExams(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/exams?subjectId=${selectedSubjectId}`)
        const data = await res.json()
        if (!cancelled && Array.isArray(data)) setExams(data)
      } catch {
        if (!cancelled) toast.error("Couldn't load exams")
      } finally {
        if (!cancelled) setLoadingExams(false)
      }
    })()
    return () => { cancelled = true }
  }, [selectedSubjectId])

  const selectedSubject = useMemo(
    () => subjects.find(s => s.id === selectedSubjectId),
    [subjects, selectedSubjectId]
  )

  // ─── Exam CRUD ────────────────────────────────────────────
  const openCreate = () => {
    setDialogMode('create')
    setEditingExamId(null)
    setForm({ title: '', type: 'QUIZ', totalMarks: 100, examDate: '' })
    setDialogOpen(true)
  }

  const openEdit = (e: Exam) => {
    setDialogMode('edit')
    setEditingExamId(e.id)
    setForm({
      title: e.title,
      type: e.type,
      totalMarks: Number(e.totalMarks),
      examDate: e.examDate ? e.examDate.slice(0, 10) : '',
    })
    setDialogOpen(true)
  }

  const submitExam = async () => {
    if (!form.title.trim()) return toast.error('Title is required')
    if (!form.totalMarks || Number(form.totalMarks) <= 0) return toast.error('Total marks must be > 0')

    setSaving(true)
    try {
      const isEdit = dialogMode === 'edit'
      const res = await fetch('/api/exams', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: isEdit ? editingExamId : undefined,
          subjectId: selectedSubjectId,
          title: form.title.trim(),
          type: form.type,
          totalMarks: Number(form.totalMarks),
          examDate: form.examDate || null,
          semester: selectedSubject?.semester ?? null,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success(isEdit ? 'Exam updated' : 'Exam created')
      setDialogOpen(false)
      // Reload
      const r2 = await fetch(`/api/exams?subjectId=${selectedSubjectId}`)
      setExams(await r2.json())
    } catch (err) {
      toast.error('Failed to save exam')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const deleteExam = async (id: string) => {
    if (!confirm('Delete this exam and all its grades?')) return
    try {
      const res = await fetch(`/api/exams?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Exam deleted')
      setExams(prev => prev.filter(e => e.id !== id))
      if (gradingExamId === id) {
        setGradingExamId(null)
        setStudents([])
        setGradesMap({})
      }
    } catch {
      toast.error('Failed to delete exam')
    }
  }

  // ─── Grade entry ──────────────────────────────────────────
  const openGrading = async (exam: Exam) => {
    setGradingExamId(exam.id)
    setLoadingGrades(true)
    try {
      const [studentsRes, gradesRes] = await Promise.all([
        fetch(`/api/students?subjectId=${exam.subjectId}`),
        fetch(`/api/grades?examId=${exam.id}`),
      ])
      const studentsData: Student[] = await studentsRes.json()
      const gradesData: Grade[] = await gradesRes.json()
      const byStudent = new Map(gradesData.map(g => [g.studentId, g]))

      setStudents(Array.isArray(studentsData) ? studentsData : [])
      const initial: Record<string, { marks: string; remarks: string }> = {}
      for (const st of studentsData) {
        const g = byStudent.get(st.id)
        initial[st.id] = {
          marks: g ? String(g.marksObtained) : '',
          remarks: g?.remarks || '',
        }
      }
      setGradesMap(initial)
    } catch {
      toast.error("Couldn't load students for grading")
    } finally {
      setLoadingGrades(false)
    }
  }

  const submitGrades = async () => {
    const exam = exams.find(e => e.id === gradingExamId)
    if (!exam) return
    setSavingGrades(true)

    const entries = Object.entries(gradesMap)
      .filter(([_, v]) => v.marks.trim() !== '')
      .map(([studentId, v]) => ({
        studentId,
        marksObtained: Number(v.marks),
        remarks: v.remarks || undefined,
      }))

    if (entries.length === 0) {
      toast.error('No marks entered')
      setSavingGrades(false)
      return
    }

    // Client-side range check for friendlier error
    for (const e of entries) {
      if (Number.isNaN(e.marksObtained) || e.marksObtained < 0) {
        toast.error(`Invalid marks for one student`)
        setSavingGrades(false)
        return
      }
      if (e.marksObtained > Number(exam.totalMarks)) {
        toast.error(`Marks exceed total (${exam.totalMarks}) for one student`)
        setSavingGrades(false)
        return
      }
    }

    try {
      const res = await fetch('/api/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: exam.id, entries }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Save failed')
      }
      toast.success(`Saved ${entries.length} grade${entries.length === 1 ? '' : 's'}`)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save grades')
    } finally {
      setSavingGrades(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────
  if (loadingSubjects) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#C9A84C]" />
      </div>
    )
  }

  if (subjects.length === 0) {
    return (
      <Card className="border-gray-800 bg-[#111]">
        <CardContent className="p-8 text-center">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 text-gray-600" />
          <p className="text-gray-400">You aren&apos;t assigned to any subjects yet.</p>
          <p className="mt-1 text-sm text-gray-500">Ask an admin to assign you to a course.</p>
        </CardContent>
      </Card>
    )
  }

  const gradingExam = exams.find(e => e.id === gradingExamId)

  return (
    <div className="space-y-6">
      {/* Subject selector + create button */}
      <Card className="border-gray-800 bg-[#111]">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs text-gray-500">Select subject</Label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger className="border-gray-700 bg-[#0a0a0a] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-gray-700 bg-[#111] text-white">
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.code} — {s.name} {s.semester ? `(Sem ${s.semester})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={openCreate}
              disabled={!selectedSubjectId}
              className="bg-[#C9A84C] text-black hover:bg-[#B8963A]"
            >
              <Plus className="mr-2 h-4 w-4" /> New Exam
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Exams list */}
      <Card className="border-gray-800 bg-[#111]">
        <CardHeader>
          <CardTitle className="text-white">
            Exams {selectedSubject && <span className="text-sm font-normal text-gray-500">— {selectedSubject.code}</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingExams ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-[#C9A84C]" />
            </div>
          ) : exams.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              No exams yet. Click <span className="text-[#C9A84C]">New Exam</span> to create one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400">Title</TableHead>
                  <TableHead className="text-gray-400">Type</TableHead>
                  <TableHead className="text-gray-400">Marks</TableHead>
                  <TableHead className="text-gray-400">Date</TableHead>
                  <TableHead className="text-right text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map(e => (
                  <TableRow key={e.id} className="border-gray-800 hover:bg-white/5">
                    <TableCell className="font-medium text-white">{e.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-gray-700 text-gray-300">
                        {e.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-300">{Number(e.totalMarks)}</TableCell>
                    <TableCell className="text-gray-400">
                      {e.examDate ? new Date(e.examDate).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openGrading(e)}
                          className="border-[#C9A84C]/30 text-[#C9A84C] hover:bg-[#C9A84C]/10"
                        >
                          <GraduationCap className="mr-1 h-3.5 w-3.5" /> Grades
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(e)} className="text-gray-400 hover:text-white">
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteExam(e.id)} className="text-gray-400 hover:text-red-400">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Grading section */}
      {gradingExam && (
        <Card className="border-gray-800 bg-[#111]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Enter Grades — {gradingExam.title}</CardTitle>
                <p className="mt-1 text-xs text-gray-500">
                  Out of {Number(gradingExam.totalMarks)} marks. Blank = not graded.
                </p>
              </div>
              <Button
                onClick={submitGrades}
                disabled={savingGrades || loadingGrades || students.length === 0}
                className="bg-[#C9A84C] text-black hover:bg-[#B8963A]"
              >
                {savingGrades ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Grades
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingGrades ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-[#C9A84C]" />
              </div>
            ) : students.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                No students enrolled in this subject yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-transparent">
                    <TableHead className="text-gray-400">Student</TableHead>
                    <TableHead className="text-gray-400">Student ID</TableHead>
                    <TableHead className="w-32 text-gray-400">Marks</TableHead>
                    <TableHead className="text-gray-400">Remarks (optional)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map(s => (
                    <TableRow key={s.id} className="border-gray-800 hover:bg-white/5">
                      <TableCell className="text-white">{s.name}</TableCell>
                      <TableCell className="text-gray-400">{s.studentId || '—'}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={Number(gradingExam.totalMarks)}
                          step="0.5"
                          value={gradesMap[s.id]?.marks || ''}
                          onChange={e => setGradesMap(prev => ({
                            ...prev,
                            [s.id]: { ...prev[s.id], marks: e.target.value, remarks: prev[s.id]?.remarks || '' },
                          }))}
                          className="h-8 border-gray-700 bg-[#0a0a0a] text-white"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={gradesMap[s.id]?.remarks || ''}
                          onChange={e => setGradesMap(prev => ({
                            ...prev,
                            [s.id]: { ...prev[s.id], marks: prev[s.id]?.marks || '', remarks: e.target.value },
                          }))}
                          placeholder="—"
                          className="h-8 border-gray-700 bg-[#0a0a0a] text-white"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/edit exam dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-gray-800 bg-[#111] text-white">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'create' ? 'New Exam' : 'Edit Exam'}</DialogTitle>
            <DialogDescription className="text-gray-500">
              {selectedSubject && `For ${selectedSubject.code} — ${selectedSubject.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-gray-400">Title</Label>
              <Input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Quiz 1, Mid-term, Final"
                className="border-gray-700 bg-[#0a0a0a] text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-gray-400">Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as Exam['type'] })}>
                  <SelectTrigger className="border-gray-700 bg-[#0a0a0a] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-gray-700 bg-[#111] text-white">
                    {EXAM_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-400">Total Marks</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.totalMarks}
                  onChange={e => setForm({ ...form, totalMarks: Number(e.target.value) })}
                  className="border-gray-700 bg-[#0a0a0a] text-white"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-400">Date (optional)</Label>
              <Input
                type="date"
                value={form.examDate}
                onChange={e => setForm({ ...form, examDate: e.target.value })}
                className="border-gray-700 bg-[#0a0a0a] text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-gray-400 hover:text-white">
              Cancel
            </Button>
            <Button onClick={submitExam} disabled={saving} className="bg-[#C9A84C] text-black hover:bg-[#B8963A]">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {dialogMode === 'create' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
