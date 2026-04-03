import { UserProvider } from '@/lib/auth/UserContext'
import { SidebarNav } from '@/components/dashboard/SidebarNav'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { MobileSidebar } from '@/components/dashboard/MobileSidebar'
import type { UserRole } from '@/lib/auth/getRedirectPath'

// UserContext'ten veri almak için bir wrapper kullanıyoruz
// Ancak dashboard layout'u Server Component olduğu için
// doğrudan useContext kullanamayız — UserContext'e parent'tan aktarılıyor
// Bu layout (protected)/layout.tsx'in altında olduğu için
// user, profile zaten context'te mevcut; ancak layout Server Component olduğundan
// DashboardShell isimli bir Client Wrapper kullanıyoruz

import { DashboardShell } from '@/components/dashboard/DashboardShell'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardShell>{children}</DashboardShell>
}
