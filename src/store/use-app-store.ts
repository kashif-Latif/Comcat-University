import { create } from "zustand"

export type ViewType =
  | "home"
  | "about"
  | "news"
  | "contact"
  | "programs"
  | "admissions"
  | "history"
  | "login"
  | "admin-dashboard"
  | "admin-students"
  | "admin-teachers"
  | "admin-subjects"
  | "admin-announcements"
  | "admin-admissions"
  | "admin-messages"
  | "teacher-dashboard"
  | "teacher-students"
  | "teacher-attendance"
  | "teacher-exams"
  | "student-dashboard"
  | "student-subjects"
  | "student-attendance"
  | "student-fees"
  | "student-grades"
  | "vc-dashboard"          // NEW: Vice Chancellor executive dashboard
  | "hod-dashboard"         // NEW: Head of Department scoped dashboard

interface AppState {
  currentView: ViewType
  user: {
    id: string
    email: string
    name: string
    role: string
  } | null
  isAuthenticated: boolean
  sidebarOpen: boolean
  setCurrentView: (view: ViewType) => void
  setUser: (user: { id: string; email: string; name: string; role: string } | null) => void
  setAuthenticated: (auth: boolean) => void
  setSidebarOpen: (open: boolean) => void
  logout: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: "home",
  user: null,
  isAuthenticated: false,
  sidebarOpen: false,
  setCurrentView: (view) => set({ currentView: view }),
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setAuthenticated: (auth) => set({ isAuthenticated: auth }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      currentView: "home",
      sidebarOpen: false,
    }),
}))
