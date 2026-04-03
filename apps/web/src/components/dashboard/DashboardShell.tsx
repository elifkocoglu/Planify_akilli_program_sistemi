'use client'

import { useUser } from '@/lib/auth/useUser'
import { SidebarNav } from './SidebarNav'
import { MobileSidebar } from './MobileSidebar'
import { SignOutButton } from '@/components/auth/SignOutButton'

const roleLabels: Record<string, string> = {
  super_admin: 'Süper Admin',
  institution_admin: 'Kurum Yöneticisi',
  department_admin: 'Bölüm Yöneticisi',
  staff: 'Personel',
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { profile } = useUser()

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/10 bg-slate-900/50 backdrop-blur-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <span className="font-bold text-white text-lg tracking-tight">Planify</span>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav role={profile.role} />
        </div>

        {/* User info at bottom */}
        <div className="border-t border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">
              {profile.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile.full_name ?? 'Kullanıcı'}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {roleLabels[profile.role] ?? profile.role}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/10 bg-slate-900/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <MobileSidebar role={profile.role} />
            {/* Logo (mobile) */}
            <span className="font-bold text-white md:hidden">Planify</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-white leading-none">
                {profile.full_name ?? 'Kullanıcı'}
              </span>
              <span className="text-xs text-slate-400 mt-0.5">
                {roleLabels[profile.role] ?? profile.role}
              </span>
            </div>
            <SignOutButton />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
