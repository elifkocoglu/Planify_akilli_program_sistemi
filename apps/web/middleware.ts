import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ÖNEMLI: getUser() kullan, getSession() değil
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isAuthPage =
    pathname.startsWith('/login') || pathname.startsWith('/register')
  const isProtectedPage = pathname.startsWith('/dashboard')

  // Oturum yok + korunan sayfa → login'e gönder
  if (!user && isProtectedPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Oturum var + auth sayfası → dashboard'a yönlendir
  if (user && isAuthPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    // is_active kontrolü
    if (profile?.is_active === false) {
      await supabase.auth.signOut()
      const url = new URL('/login', request.url)
      url.searchParams.set('reason', 'disabled')
      return NextResponse.redirect(url)
    }

    const role = profile?.role ?? 'staff'
    const redirectPath = getRedirectPath(role)
    return NextResponse.redirect(new URL(redirectPath, request.url))
  }

  return supabaseResponse
}

function getRedirectPath(role: string): string {
  switch (role) {
    case 'super_admin':
      return '/dashboard/super'
    case 'institution_admin':
      return '/dashboard/admin'
    case 'department_admin':
      return '/dashboard/dept-admin'
    default:
      return '/dashboard/staff'
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
