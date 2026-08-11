'use client'

import { useEffect } from 'react'
import { SessionProvider } from 'next-auth/react'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/store/use-app-store'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { HeroSection } from '@/components/public/hero-section'
import { HomepageGrid } from '@/components/public/homepage-grid'
import { AboutSection } from '@/components/public/about-section'
import { NewsSection } from '@/components/public/news-section'
import { ContactSection } from '@/components/public/contact-section'
import { ProgramsSection } from '@/components/public/programs-section'
import { HistorySection } from '@/components/public/history-section'
import { AdmissionsSection } from '@/components/public/admissions-section'
import { LoginForm } from '@/components/auth/login-form'
import { AdminLayout } from '@/components/admin/admin-layout'
import { AdminDashboard } from '@/components/admin/admin-dashboard'
import { ManageStudents } from '@/components/admin/manage-students'
import { ManageTeachers } from '@/components/admin/manage-teachers'
import { ManageSubjects } from '@/components/admin/manage-subjects'
import { ManageAnnouncements } from '@/components/admin/manage-announcements'
import { ManageAdmissions } from '@/components/admin/manage-admissions'
import { ManageMessages } from '@/components/admin/manage-messages'
import { TeacherLayout } from '@/components/teacher/teacher-layout'
import { TeacherDashboard } from '@/components/teacher/teacher-dashboard'
import { ViewStudents } from '@/components/teacher/view-students'
import { MarkAttendance } from '@/components/teacher/mark-attendance'
import { ManageExams } from '@/components/teacher/manage-exams'
import { StudentLayout } from '@/components/student/student-layout'
import { StudentDashboard } from '@/components/student/student-dashboard'
import { MySubjects } from '@/components/student/my-subjects'
import { MyAttendance } from '@/components/student/my-attendance'
import { MyFees } from '@/components/student/my-fees'
import { MyGrades } from '@/components/student/my-grades'
import { ExecutiveLayout } from '@/components/executive/executive-layout'
import { ExecutiveDashboard } from '@/components/executive/executive-dashboard'
import { AIChatWidget } from '@/components/ai-chat-widget'

function AdminContent() {
  const { currentView } = useAppStore()

  switch (currentView) {
    case 'admin-dashboard': return <AdminDashboard />
    case 'admin-students': return <ManageStudents />
    case 'admin-teachers': return <ManageTeachers />
    case 'admin-subjects': return <ManageSubjects />
    case 'admin-announcements': return <ManageAnnouncements />
    case 'admin-admissions': return <ManageAdmissions />
    case 'admin-messages': return <ManageMessages />
    default: return <AdminDashboard />
  }
}

function TeacherContent() {
  const { currentView } = useAppStore()

  switch (currentView) {
    case 'teacher-dashboard': return <TeacherDashboard />
    case 'teacher-students': return <ViewStudents />
    case 'teacher-attendance': return <MarkAttendance />
    case 'teacher-exams': return <ManageExams />
    default: return <TeacherDashboard />
  }
}

function StudentContent() {
  const { currentView } = useAppStore()

  switch (currentView) {
    case 'student-dashboard': return <StudentDashboard />
    case 'student-subjects': return <MySubjects />
    case 'student-attendance': return <MyAttendance />
    case 'student-grades': return <MyGrades />
    case 'student-fees': return <MyFees />
    default: return <StudentDashboard />
  }
}

function AppContent() {
  const { currentView, user, setUser } = useAppStore()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const userData = {
        id: (session.user as Record<string, unknown>).id as string || '',
        email: session.user.email || '',
        name: session.user.name || '',
        role: (session.user as Record<string, unknown>).role as string || 'STUDENT',
      }
      if (!user || user.id !== userData.id) {
        setUser(userData)
      }
    }
  }, [session, status, user, setUser])

  const isAdminView   = currentView.startsWith('admin-')
  const isTeacherView = currentView.startsWith('teacher-')
  const isStudentView = currentView.startsWith('student-')
  const isVcView      = currentView === 'vc-dashboard'
  const isHodView     = currentView === 'hod-dashboard'

  const renderContent = () => {
    switch (currentView) {
      case 'home': return (<><HeroSection /><HomepageGrid /></>)
      case 'about': return <AboutSection />
      case 'news': return <NewsSection />
      case 'contact': return <ContactSection />
      case 'programs': return <ProgramsSection />
      case 'history': return <HistorySection />
      case 'admissions': return <AdmissionsSection />
      case 'login': return <LoginForm />

      case 'admin-dashboard':
      case 'admin-students':
      case 'admin-teachers':
      case 'admin-subjects':
      case 'admin-announcements':
      case 'admin-admissions':
      case 'admin-messages':
        return (<AdminLayout><AdminContent /></AdminLayout>)

      case 'teacher-dashboard':
      case 'teacher-students':
      case 'teacher-attendance':
      case 'teacher-exams':
        return (<TeacherLayout><TeacherContent /></TeacherLayout>)

      case 'student-dashboard':
      case 'student-subjects':
      case 'student-attendance':
      case 'student-grades':
      case 'student-fees':
        return (<StudentLayout><StudentContent /></StudentLayout>)

      case 'vc-dashboard':
        return (<ExecutiveLayout variant="VC"><ExecutiveDashboard /></ExecutiveLayout>)

      case 'hod-dashboard':
        return (<ExecutiveLayout variant="HOD"><ExecutiveDashboard /></ExecutiveLayout>)

      default: return (<><HeroSection /><HomepageGrid /></>)
    }
  }

  const isPublicView = ['home', 'about', 'news', 'contact', 'programs', 'history', 'admissions', 'login'].includes(currentView)

  if (isAdminView || isTeacherView || isStudentView || isVcView || isHodView) {
    return (<>{renderContent()}<AIChatWidget /></>)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{renderContent()}</main>
      {isPublicView && <Footer />}
      <AIChatWidget />
    </div>
  )
}

export default function Home() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  )
}
