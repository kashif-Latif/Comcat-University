'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ClipboardList,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  Trash2,
  FileText,
  Loader2,
  User,
  Mail,
  Phone,
  BookOpen,
  Calendar,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Admission {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  cnic: string | null
  dateOfBirth: string | null
  gender: string
  address: string | null
  city: string | null
  program: string
  previousDegree: string | null
  previousInstitution: string | null
  previousGPA: string | null
  status: string
  createdAt: string
  updatedAt: string
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: Clock },
  UNDER_REVIEW: { label: 'Under Review', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: AlertTriangle },
  ACCEPTED: { label: 'Accepted', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle },
  REJECTED: { label: 'Rejected', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
}

export function ManageAdmissions() {
  const [admissions, setAdmissions] = useState<Admission[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    fetchAdmissions()
  }, [])

  async function fetchAdmissions() {
    setLoading(true)
    try {
      const res = await fetch('/api/admissions')
      if (res.ok) {
        const data = await res.json()
        setAdmissions(data)
      }
    } catch {
      toast.error('Failed to load admissions')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id)
    try {
      const res = await fetch('/api/admissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        toast.success(`Application ${status.toLowerCase()}`)
        setAdmissions((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status } : a))
        )
        if (selectedAdmission?.id === id) {
          setSelectedAdmission((prev) => (prev ? { ...prev, status } : null))
        }
      } else {
        toast.error('Failed to update status')
      }
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdatingId(null)
    }
  }

  async function deleteAdmission(id: string) {
    if (!confirm('Are you sure you want to delete this application?')) return
    try {
      const res = await fetch(`/api/admissions?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Application deleted')
        setAdmissions((prev) => prev.filter((a) => a.id !== id))
        setSelectedAdmission(null)
      } else {
        toast.error('Failed to delete')
      }
    } catch {
      toast.error('Failed to delete')
    }
  }

  const filtered = admissions.filter((a) => {
    const matchesSearch =
      search === '' ||
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.program.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: admissions.length,
    pending: admissions.filter((a) => a.status === 'PENDING').length,
    review: admissions.filter((a) => a.status === 'UNDER_REVIEW').length,
    accepted: admissions.filter((a) => a.status === 'ACCEPTED').length,
    rejected: admissions.filter((a) => a.status === 'REJECTED').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Admission Applications</h2>
          <p className="text-sm text-[#a3a3a3]">View and manage student admission applications</p>
        </div>
        <Button
          onClick={fetchAdmissions}
          variant="outline"
          className="border-gray-700 text-[#e5e5e5] hover:bg-[#1a1a1a]"
        >
          <ClipboardList className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: 'Total', value: stats.total, color: 'text-white', bg: 'bg-[#111] border-gray-800' },
          { label: 'Pending', value: stats.pending, color: 'text-yellow-400', bg: 'bg-yellow-500/5 border-yellow-500/20' },
          { label: 'Review', value: stats.review, color: 'text-blue-400', bg: 'bg-blue-500/5 border-blue-500/20' },
          { label: 'Accepted', value: stats.accepted, color: 'text-green-400', bg: 'bg-green-500/5 border-green-500/20' },
          { label: 'Rejected', value: stats.rejected, color: 'text-red-400', bg: 'bg-red-500/5 border-red-500/20' },
        ].map((s) => (
          <Card key={s.label} className={`border ${s.bg}`}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-[#737373]">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737373]" />
          <Input
            placeholder="Search by name, email, or program..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-gray-700 bg-[#1a1a1a] pl-10 text-white placeholder:text-[#737373]"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full border-gray-700 bg-[#1a1a1a] text-white sm:w-48">
            <Filter className="mr-2 h-4 w-4 text-[#737373]" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-gray-700 bg-[#111]">
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
            <SelectItem value="ACCEPTED">Accepted</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-gray-800 bg-[#111]">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <FileText className="mb-4 h-12 w-12 text-gray-700" />
              <p className="text-lg font-medium text-[#a3a3a3]">No applications found</p>
              <p className="text-sm text-[#525252]">
                {search || statusFilter !== 'ALL'
                  ? 'Try adjusting your search or filter'
                  : 'No admission applications have been submitted yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#737373]">
                      Applicant
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#737373] hidden sm:table-cell">
                      Program
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#737373]">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#737373] hidden md:table-cell">
                      Applied
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#737373]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((admission, idx) => {
                    const cfg = statusConfig[admission.status] || statusConfig.PENDING
                    const StatusIcon = cfg.icon
                    return (
                      <motion.tr
                        key={admission.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-b border-gray-800/50 transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-white">
                              {admission.firstName} {admission.lastName}
                            </p>
                            <p className="text-xs text-[#737373]">{admission.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-sm text-[#a3a3a3]">{admission.program}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`gap-1 text-xs ${cfg.color}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {cfg.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs text-[#737373]">
                            {new Date(admission.createdAt).toLocaleDateString('en-PK', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setSelectedAdmission(admission)}
                              className="h-8 w-8 text-[#737373] hover:text-white hover:bg-white/5"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {admission.status !== 'ACCEPTED' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => updateStatus(admission.id, 'ACCEPTED')}
                                disabled={updatingId === admission.id}
                                className="h-8 w-8 text-[#737373] hover:text-green-400 hover:bg-green-500/10"
                                title="Accept"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {admission.status !== 'REJECTED' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => updateStatus(admission.id, 'REJECTED')}
                                disabled={updatingId === admission.id}
                                className="h-8 w-8 text-[#737373] hover:text-red-400 hover:bg-red-500/10"
                                title="Reject"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteAdmission(admission.id)}
                              className="h-8 w-8 text-[#737373] hover:text-red-400 hover:bg-red-500/10"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedAdmission} onOpenChange={() => setSelectedAdmission(null)}>
        <DialogContent className="max-w-lg border-gray-800 bg-[#111] max-h-[85vh] overflow-y-auto">
          {selectedAdmission && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <User className="h-5 w-5 text-[#C9A84C]" />
                  {selectedAdmission.firstName} {selectedAdmission.lastName}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#737373]">Status:</span>
                  <Badge
                    variant="outline"
                    className={statusConfig[selectedAdmission.status]?.color}
                  >
                    {statusConfig[selectedAdmission.status]?.label}
                  </Badge>
                  {selectedAdmission.status === 'PENDING' && (
                    <div className="flex gap-2 ml-auto">
                      <Button
                        size="sm"
                        onClick={() => updateStatus(selectedAdmission.id, 'UNDER_REVIEW')}
                        disabled={updatingId === selectedAdmission.id}
                        className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-0 h-7 text-xs"
                      >
                        <Clock className="mr-1 h-3 w-3" /> Review
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateStatus(selectedAdmission.id, 'ACCEPTED')}
                        disabled={updatingId === selectedAdmission.id}
                        className="bg-green-500/10 text-green-400 hover:bg-green-500/20 border-0 h-7 text-xs"
                      >
                        <CheckCircle className="mr-1 h-3 w-3" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateStatus(selectedAdmission.id, 'REJECTED')}
                        disabled={updatingId === selectedAdmission.id}
                        className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border-0 h-7 text-xs"
                      >
                        <XCircle className="mr-1 h-3 w-3" /> Reject
                      </Button>
                    </div>
                  )}
                </div>

                {/* Personal Info */}
                <div className="rounded-lg border border-gray-800 bg-[#1a1a1a] p-4 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#C9A84C]">Personal Information</h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-[#737373]" />
                      <span className="text-[#737373] w-20">Name:</span>
                      <span className="text-white">{selectedAdmission.firstName} {selectedAdmission.lastName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[#737373]" />
                      <span className="text-[#737373] w-20">Email:</span>
                      <span className="text-white">{selectedAdmission.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-[#737373]" />
                      <span className="text-[#737373] w-20">Phone:</span>
                      <span className="text-white">{selectedAdmission.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-[#737373]" />
                      <span className="text-[#737373] w-20">CNIC:</span>
                      <span className="text-white">{selectedAdmission.cnic || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#737373]" />
                      <span className="text-[#737373] w-20">DOB:</span>
                      <span className="text-white">{selectedAdmission.dateOfBirth || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-[#737373]" />
                      <span className="text-[#737373] w-20">Gender:</span>
                      <span className="text-white">{selectedAdmission.gender}</span>
                    </div>
                  </div>
                </div>

                {/* Program */}
                <div className="rounded-lg border border-gray-800 bg-[#1a1a1a] p-4 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#C9A84C]">Program</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="h-4 w-4 text-[#737373]" />
                    <span className="text-white font-medium">{selectedAdmission.program}</span>
                  </div>
                </div>

                {/* Education */}
                <div className="rounded-lg border border-gray-800 bg-[#1a1a1a] p-4 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#C9A84C]">Academic Background</h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex gap-2">
                      <span className="text-[#737373] w-28">Degree:</span>
                      <span className="text-white">{selectedAdmission.previousDegree || '—'}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-[#737373] w-28">Institution:</span>
                      <span className="text-white">{selectedAdmission.previousInstitution || '—'}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-[#737373] w-28">GPA:</span>
                      <span className="text-white">{selectedAdmission.previousGPA || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Meta */}
                <div className="rounded-lg border border-gray-800 bg-[#1a1a1a] p-4 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#C9A84C]">Application Details</h4>
                  <div className="grid gap-1 text-xs text-[#737373]">
                    <p>ID: <span className="text-white font-mono">{selectedAdmission.id}</span></p>
                    <p>Applied: <span className="text-white">{new Date(selectedAdmission.createdAt).toLocaleString('en-PK')}</span></p>
                    <p>Updated: <span className="text-white">{new Date(selectedAdmission.updatedAt).toLocaleString('en-PK')}</span></p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
