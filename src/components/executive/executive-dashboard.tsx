'use client'

import { useEffect, useState } from 'react'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  Users, GraduationCap, BookOpen, Building2, ClipboardCheck,
  DollarSign, TrendingUp, Loader2, Megaphone, UserCheck,
} from 'lucide-react'

interface DashboardData {
  role: 'VC' | 'HOD' | 'ADMIN'
  department: string | null
  kpis: {
    totalStudents: number
    totalTeachers: number
    totalSubjects: number
    totalDepartments: number
    pendingAdmissions: number
    totalEnrollments: number
    revenuePaid: number
    revenueOutstanding: number
  }
  charts: {
    studentsByDept: Array<{ name: string; count: number }>
    teachersByDept: Array<{ name: string; count: number }>
    studentsBySemester: Array<{ semester: string; count: number }>
    admissionFunnel: Array<{ name: string; value: number }>
    revenueBySemester: Array<{ semester: string; paid: number; pending: number }>
  }
  recentAdmissions: Array<{
    id: string
    name: string
    program: string
    status: string
    appliedAt: string
  }>
  recentAnnouncements: Array<{
    id: string
    title: string
    category: string
    createdAt: string
  }>
}

const CHART_COLORS = ['#C9A84C', '#34D399', '#60A5FA', '#F472B6', '#A78BFA', '#FB923C']

function formatPKR(n: number): string {
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1)} Cr`
  if (n >= 100_000)    return `${(n / 100_000).toFixed(1)} L`
  if (n >= 1_000)      return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function statusBadge(status: string) {
  const s = String(status).toUpperCase()
  if (s === 'ACCEPTED') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
  if (s === 'REJECTED') return 'bg-red-500/15 text-red-400 border-red-500/30'
  if (s === 'UNDER_REVIEW') return 'bg-sky-500/15 text-sky-400 border-sky-500/30'
  return 'bg-amber-500/15 text-amber-400 border-amber-500/30' // PENDING
}

export function ExecutiveDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/dashboard/executive')
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `HTTP ${res.status}`)
        }
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Failed to load dashboard')
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
          {err || 'Couldn\'t load the dashboard.'}
        </CardContent>
      </Card>
    )
  }

  const { role, department, kpis, charts, recentAdmissions, recentAnnouncements } = data

  return (
    <div className="space-y-6">
      {/* Scope banner for HOD */}
      {role === 'HOD' && department && (
        <div className="rounded-lg border border-[#C9A84C]/30 bg-[#C9A84C]/5 px-4 py-2 text-sm">
          <span className="text-gray-400">Viewing data for department:</span>{' '}
          <span className="font-semibold text-[#C9A84C]">{department}</span>
        </div>
      )}

      {/* KPI cards — top row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Students"       value={kpis.totalStudents}     icon={Users}          tint="sky" />
        <KpiCard label="Faculty"        value={kpis.totalTeachers}     icon={GraduationCap}  tint="emerald" />
        <KpiCard label="Subjects"       value={kpis.totalSubjects}     icon={BookOpen}       tint="violet" />
        {role === 'VC' || role === 'ADMIN' ? (
          <KpiCard label="Departments"  value={kpis.totalDepartments}  icon={Building2}      tint="rose" />
        ) : (
          <KpiCard label="Enrollments"  value={kpis.totalEnrollments}  icon={ClipboardCheck} tint="rose" />
        )}
      </div>

      {/* KPI cards — second row (financial + admissions) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Revenue collected"
          value={`PKR ${formatPKR(kpis.revenuePaid)}`}
          icon={DollarSign}
          tint="emerald"
        />
        <KpiCard
          label="Outstanding fees"
          value={`PKR ${formatPKR(kpis.revenueOutstanding)}`}
          icon={TrendingUp}
          tint="amber"
        />
        <KpiCard
          label="Pending admissions"
          value={kpis.pendingAdmissions}
          icon={UserCheck}
          tint="sky"
        />
        <KpiCard
          label="Total enrollments"
          value={kpis.totalEnrollments}
          icon={ClipboardCheck}
          tint="violet"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Students by department */}
        <Card className="border-gray-800 bg-[#111]">
          <CardHeader>
            <CardTitle className="text-white">
              {role === 'HOD' ? 'Students in this department' : 'Students by Department'}
            </CardTitle>
            <CardDescription className="text-gray-500">Head-count breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {charts.studentsByDept.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={charts.studentsByDept}>
                  <XAxis dataKey="name" tick={{ fill: '#a3a3a3', fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: '#a3a3a3', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#0a0a0a', border: '1px solid #262626', borderRadius: 8, color: '#fff' }}
                    cursor={{ fill: 'rgba(201,168,76,0.08)' }}
                  />
                  <Bar dataKey="count" fill="#C9A84C" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Admission funnel */}
        <Card className="border-gray-800 bg-[#111]">
          <CardHeader>
            <CardTitle className="text-white">Admission Funnel</CardTitle>
            <CardDescription className="text-gray-500">Applications by status</CardDescription>
          </CardHeader>
          <CardContent>
            {charts.admissionFunnel.every(x => x.value === 0) ? (
              <p className="py-8 text-center text-sm text-gray-500">No applications yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={charts.admissionFunnel.filter(x => x.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry: any) => `${entry.name}: ${entry.value}`}
                  >
                    {charts.admissionFunnel.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ color: '#a3a3a3', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: '#0a0a0a', border: '1px solid #262626', borderRadius: 8, color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Students by semester */}
        <Card className="border-gray-800 bg-[#111]">
          <CardHeader>
            <CardTitle className="text-white">Students by Semester</CardTitle>
            <CardDescription className="text-gray-500">Distribution across program semesters</CardDescription>
          </CardHeader>
          <CardContent>
            {charts.studentsBySemester.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={charts.studentsBySemester}>
                  <XAxis dataKey="semester" tick={{ fill: '#a3a3a3', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#a3a3a3', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#0a0a0a', border: '1px solid #262626', borderRadius: 8, color: '#fff' }}
                    cursor={{ fill: 'rgba(96,165,250,0.08)' }}
                  />
                  <Bar dataKey="count" fill="#60A5FA" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue by semester */}
        <Card className="border-gray-800 bg-[#111]">
          <CardHeader>
            <CardTitle className="text-white">Revenue by Semester</CardTitle>
            <CardDescription className="text-gray-500">Paid vs pending fees</CardDescription>
          </CardHeader>
          <CardContent>
            {charts.revenueBySemester.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No fee records yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={charts.revenueBySemester}>
                  <XAxis dataKey="semester" tick={{ fill: '#a3a3a3', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#a3a3a3', fontSize: 11 }} tickFormatter={(v) => formatPKR(v)} />
                  <Tooltip
                    contentStyle={{ background: '#0a0a0a', border: '1px solid #262626', borderRadius: 8, color: '#fff' }}
                    formatter={(v: number) => `PKR ${formatPKR(v)}`}
                  />
                  <Legend wrapperStyle={{ color: '#a3a3a3', fontSize: 12 }} />
                  <Bar dataKey="paid"    stackId="a" fill="#34D399" name="Paid" />
                  <Bar dataKey="pending" stackId="a" fill="#F59E0B" name="Pending" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent lists */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent admissions */}
        <Card className="border-gray-800 bg-[#111]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-[#C9A84C]" /> Recent Admissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAdmissions.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">No applications yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-transparent">
                    <TableHead className="text-gray-400">Applicant</TableHead>
                    <TableHead className="text-gray-400">Program</TableHead>
                    <TableHead className="text-right text-gray-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAdmissions.map((a) => (
                    <TableRow key={a.id} className="border-gray-800 hover:bg-white/5">
                      <TableCell className="text-white">{a.name}</TableCell>
                      <TableCell className="text-gray-400 text-xs">{a.program}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={statusBadge(a.status)}>
                          {String(a.status).replace('_', ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent announcements */}
        <Card className="border-gray-800 bg-[#111]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-[#C9A84C]" /> Recent Announcements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAnnouncements.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">No announcements posted.</p>
            ) : (
              <div className="space-y-2">
                {recentAnnouncements.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#0a0a0a] px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{a.title}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-gray-700 text-gray-400 shrink-0">
                      {a.category || 'GENERAL'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── KPI card sub-component ────────────────────────────────
function KpiCard({
  label, value, icon: Icon, tint,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  tint: 'sky' | 'emerald' | 'violet' | 'rose' | 'amber'
}) {
  const tints = {
    sky:     'from-sky-500/10 text-sky-400 bg-sky-500/10',
    emerald: 'from-emerald-500/10 text-emerald-400 bg-emerald-500/10',
    violet:  'from-violet-500/10 text-violet-400 bg-violet-500/10',
    rose:    'from-rose-500/10 text-rose-400 bg-rose-500/10',
    amber:   'from-amber-500/10 text-amber-400 bg-amber-500/10',
  }[tint]
  const [_gradient, textColor, iconBg] = tints.split(' ')

  return (
    <Card className="border-gray-800 bg-[#111] overflow-hidden">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-6 w-6 ${textColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-gray-500 truncate">{label}</p>
          <p className="text-2xl font-bold text-white truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
