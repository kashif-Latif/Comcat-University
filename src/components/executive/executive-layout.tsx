'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { useAppStore } from '@/store/use-app-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import {
  LayoutDashboard, LogOut, Menu, GraduationCap, ChevronLeft, Crown, Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'VC' | 'HOD'

interface Props {
  variant: Variant
  children: React.ReactNode
}

const config = {
  VC: {
    title: 'Vice Chancellor',
    subtitle: 'Executive Portal',
    badge: 'VC',
    icon: Crown,
    heading: 'Executive Dashboard',
  },
  HOD: {
    title: 'Head of Department',
    subtitle: 'Department Portal',
    badge: 'HOD',
    icon: Building2,
    heading: 'Department Dashboard',
  },
} as const

export function ExecutiveLayout({ variant, children }: Props) {
  const { user, logout } = useAppStore()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const c = config[variant]
  const Icon = c.icon

  const handleLogout = async () => {
    logout()
    await signOut({ redirect: false })
  }

  const initial = user?.name?.charAt(0)?.toUpperCase() || (variant === 'VC' ? 'V' : 'H')

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a]">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r border-[#262626] bg-[#0a0a0a] transition-all duration-300',
          sidebarCollapsed ? 'w-[68px]' : 'w-64'
        )}
      >
        <div
          className={cn(
            'flex h-16 items-center border-b border-[#262626] px-4 gap-3',
            sidebarCollapsed && 'justify-center px-2'
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#C9A84C]">
            <GraduationCap className="h-5 w-5 text-black" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold text-white truncate">{c.subtitle}</span>
              <span className="text-[10px] text-gray-500 truncate">COMCAT University</span>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 py-4">
          <nav className="flex flex-col gap-1 px-3">
            <Button
              variant="secondary"
              className="justify-start gap-3 h-10 bg-[#C9A84C]/10 text-[#C9A84C] hover:bg-[#C9A84C]/15 hover:text-[#C9A84C] font-medium"
            >
              <LayoutDashboard className="h-4 w-4 shrink-0 text-[#C9A84C]" />
              {!sidebarCollapsed && <span>Dashboard</span>}
            </Button>
          </nav>
        </ScrollArea>

        <div className="border-t border-[#262626] p-3">
          <Button
            variant="ghost"
            size="icon"
            className="w-full mb-2 text-gray-500 hover:text-white"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <ChevronLeft
              className={cn(
                'h-4 w-4 transition-transform duration-300',
                sidebarCollapsed && 'rotate-180'
              )}
            />
          </Button>
          <Separator className="mb-2 bg-[#262626]" />
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start gap-3 text-gray-400 hover:text-red-400 hover:bg-red-500/10',
              sidebarCollapsed && 'justify-center'
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-72 p-0 bg-[#0a0a0a] border-[#262626]"
          aria-describedby={undefined}
        >
          <SheetHeader className="flex h-16 items-center gap-3 border-b border-[#262626] px-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#C9A84C]">
              <GraduationCap className="h-5 w-5 text-black" />
            </div>
            <SheetTitle className="flex flex-col items-start">
              <span className="text-sm font-bold text-white">{c.subtitle}</span>
              <span className="text-[10px] text-gray-500">COMCAT University</span>
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 py-4">
            <nav className="flex flex-col gap-1 px-3">
              <Button
                variant="secondary"
                className="justify-start gap-3 h-10 bg-[#C9A84C]/10 text-[#C9A84C] hover:bg-[#C9A84C]/15 hover:text-[#C9A84C] font-medium"
              >
                <LayoutDashboard className="h-4 w-4 text-[#C9A84C]" />
                <span>Dashboard</span>
              </Button>
            </nav>
          </ScrollArea>
          <div className="border-t border-[#262626] p-3">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
              onClick={() => {
                handleLogout()
                setMobileOpen(false)
              }}
            >
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-[#262626] bg-[#111] px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden text-gray-400 hover:text-white"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle sidebar</span>
                </Button>
              </SheetTrigger>
            </Sheet>
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-[#C9A84C]" />
              <h1 className="text-lg font-semibold text-white">{c.heading}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C9A84C]/20">
                <span className="text-xs font-semibold text-[#C9A84C]">{initial}</span>
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-sm font-medium text-white leading-tight">
                  {user?.name || c.title}
                </span>
                <Badge className="text-[10px] px-1.5 py-0 w-fit bg-[#C9A84C]/15 text-[#C9A84C] hover:bg-[#C9A84C]/15">
                  {c.badge}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-500 hover:text-red-400 lg:hidden"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[#0a0a0a]">{children}</main>
      </div>
    </div>
  )
}
