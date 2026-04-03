/**
 * Rol bazlı yönlendirme yolunu döndürür.
 * Hem middleware hem de server component'larda kullanılır.
 */
export type UserRole =
  | 'super_admin'
  | 'institution_admin'
  | 'department_admin'
  | 'staff'

export function getRedirectPath(role: UserRole | string | null | undefined): string {
  switch (role) {
    case 'super_admin':
      return '/dashboard/super'
    case 'institution_admin':
      return '/dashboard/admin'
    case 'department_admin':
      return '/dashboard/dept-admin'
    case 'staff':
    default:
      return '/dashboard/staff'
  }
}
