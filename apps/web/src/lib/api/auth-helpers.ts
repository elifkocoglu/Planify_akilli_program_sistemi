import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Kullanıcı rolü */
export type UserRole = 'super_admin' | 'institution_admin' | 'department_admin' | 'staff'

/** Profil bilgisi (auth helper'dan dönen) */
export interface AuthProfile {
  id: string
  full_name: string
  role: UserRole
  institution_id: string | null
  department_id: string | null
  is_active: boolean
}

/** Auth kontrolü başarılıysa dönen değer */
export interface AuthResult {
  user: { id: string; email?: string }
  profile: AuthProfile
  supabase: ReturnType<typeof createClient>
}

/**
 * Tüm API route'larında kullanılacak ortak auth + rol kontrolü.
 *
 * @param allowedRoles — Boş bırakılırsa sadece oturum kontrolü yapar.
 *                       Dolu ise kullanıcının rolü bu listede olmalıdır.
 * @returns AuthResult veya hata NextResponse
 */
export async function requireAuth(
  allowedRoles?: UserRole[]
): Promise<AuthResult | NextResponse> {
  try {
    const supabase = createClient()

    // 1. Session kontrolü
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Oturum bulunamadı' },
        { status: 401 }
      )
    }

    // 2. Profil çek
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, role, institution_id, department_id, is_active')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'Kullanıcı profili bulunamadı' },
        { status: 401 }
      )
    }

    if (!profile.is_active) {
      return NextResponse.json(
        { success: false, error: 'Hesabınız devre dışı bırakılmış' },
        { status: 403 }
      )
    }

    // 3. Rol kontrolü
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(profile.role as UserRole)) {
        return NextResponse.json(
          { success: false, error: 'Bu işlem için yetkiniz bulunmuyor' },
          { status: 403 }
        )
      }
    }

    return {
      user: { id: user.id, email: user.email },
      profile: profile as AuthProfile,
      supabase,
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Kimlik doğrulama hatası' },
      { status: 500 }
    )
  }
}

/**
 * requireAuth sonucunun hata response'u olup olmadığını kontrol eder.
 * Type guard fonksiyonu.
 */
export function isAuthError(
  result: AuthResult | NextResponse
): result is NextResponse {
  return result instanceof NextResponse
}

/**
 * department_admin'in belirtilen departmana erişim yetkisi olup olmadığını kontrol eder.
 * admin_departments tablosundan kontrol yapar.
 */
export async function canAccessDepartment(
  supabase: ReturnType<typeof createClient>,
  profile: AuthProfile,
  departmentId: string
): Promise<boolean> {
  // institution_admin her departmana erişebilir
  if (profile.role === 'institution_admin' || profile.role === 'super_admin') {
    return true
  }

  // department_admin ise admin_departments tablosundan kontrol et
  if (profile.role === 'department_admin') {
    const { data } = await supabase
      .from('admin_departments')
      .select('id')
      .eq('profile_id', profile.id)
      .eq('department_id', departmentId)
      .single()

    return !!data
  }

  return false
}
