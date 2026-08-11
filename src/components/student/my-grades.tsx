'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import { Loader2, Award, TrendingUp, BookOpen } from 'lucide-react'

interface Exam {
  examId: string
  title: string
  type: string
  totalMarks: number
  marksObtained: number | null
}
interface SubjectRow {
  subjectId: string
  subjectCode: string
  subjectName: string
  credits: number
  semester: number | null
  percent: number | null
  letter: string | null
  gpaPoints: number | null
  exams: Exam[]
}
interface Transcript {
  subjects: SubjectRow[]
  semesters: Array<{ semester: number; gpa: number | null; credits: number; subjects: SubjectRow[] }>
  cgpa: number | null
  totalCredits: number
}

// Map letter grade → colour for the badge
function gradeColor(letter: string | null): string {
  if (!letter) return 'bg-gray-800 text-gray-400 border-gray-700'
  if (letter.startsWith('A')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
  if (letter.startsWith('B')) return 'bg-sky-500/15 text-sky-400 border-sky-500/30'
  if (letter.startsWith('C')) return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
  if (letter.startsWith('D')) return 'bg-orange-500/15 text-orange-400 border-orange-500/30'
  return 'bg-red-500/15 text-red-400 border-red-500/30'  // F
}

export function MyGrades() {
  const [data, setData] = useState<Transcript | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/transcript')
        if (!res.ok) throw new Error(await res.text())
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Failed to load transcript')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#C9A84C]" />
      </div>
    )
  }

  if (err || !data) {
    return (
      <Card className="border-gray-800 bg-[#111]">
        <CardContent className="p-8 text-center text-gray-400">
          Couldn&apos;t load your transcript. Try refreshing.
        </CardContent>
      </Card>
    )
  }

  const noEnrollments = data.subjects.length === 0

  return (
    <div className="space-y-6">
      {/* Top: CGPA + totals */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-gray-800 bg-gradient-to-br from-[#C9A84C]/10 to-[#111]">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#C9A84C]/15">
              <Award className="h-6 w-6 text-[#C9A84C]" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">CGPA</p>
              <p className="text-3xl font-bold text-white">
                {data.cgpa !== null ? data.cgpa.toFixed(2) : '—'}
                <span className="ml-1 text-sm font-normal text-gray-500">/ 4.00</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-[#111]">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10">
              <BookOpen className="h-6 w-6 text-sky-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">Subjects</p>
              <p className="text-3xl font-bold text-white">{data.subjects.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-[#111]">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
              <TrendingUp className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">Credit hours graded</p>
              <p className="text-3xl font-bold text-white">{data.totalCredits}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty state */}
      {noEnrollments && (
        <Card className="border-gray-800 bg-[#111]">
          <CardContent className="p-8 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-gray-600" />
            <p className="text-gray-400">You&apos;re not enrolled in any subjects yet.</p>
          </CardContent>
        </Card>
      )}

      {/* Semester-wise breakdown */}
      {data.semesters.map(sem => (
        <Card key={sem.semester} className="border-gray-800 bg-[#111]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">
                {sem.semester > 0 ? `Semester ${sem.semester}` : 'Uncategorised'}
              </CardTitle>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-500">Sem GPA</span>
                <Badge className="bg-[#C9A84C]/15 text-[#C9A84C] hover:bg-[#C9A84C]/15">
                  {sem.gpa !== null ? sem.gpa.toFixed(2) : '—'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="space-y-2">
              {sem.subjects.map(sub => (
                <AccordionItem
                  key={sub.subjectId}
                  value={sub.subjectId}
                  className="rounded-lg border border-gray-800 bg-[#0a0a0a] px-3"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex w-full items-center justify-between pr-4">
                      <div className="text-left">
                        <p className="font-medium text-white">
                          <span className="text-gray-500">{sub.subjectCode}</span>
                          {' — '}
                          {sub.subjectName}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {sub.credits} credit{sub.credits === 1 ? '' : 's'}
                          {sub.exams.length > 0 && ` · ${sub.exams.length} exam${sub.exams.length === 1 ? '' : 's'}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {sub.percent !== null ? (
                          <>
                            <span className="text-sm text-gray-400">{sub.percent.toFixed(1)}%</span>
                            <Badge className={`${gradeColor(sub.letter)} font-mono`}>
                              {sub.letter}
                            </Badge>
                          </>
                        ) : (
                          <Badge className="border-gray-700 bg-gray-800 text-gray-500">Not graded</Badge>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {sub.exams.length === 0 ? (
                      <p className="py-3 text-sm text-gray-500">No exams scheduled yet.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-800 hover:bg-transparent">
                            <TableHead className="text-gray-500">Exam</TableHead>
                            <TableHead className="text-gray-500">Type</TableHead>
                            <TableHead className="text-right text-gray-500">Marks</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sub.exams.map(ex => (
                            <TableRow key={ex.examId} className="border-gray-800 hover:bg-white/5">
                              <TableCell className="text-white">{ex.title}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="border-gray-700 text-gray-400">
                                  {ex.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {ex.marksObtained !== null ? (
                                  <span className="text-white">
                                    {ex.marksObtained} <span className="text-gray-500">/ {ex.totalMarks}</span>
                                  </span>
                                ) : (
                                  <span className="text-gray-600">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
