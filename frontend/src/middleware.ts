import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // Create Supabase Client to check Auth
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    // Refresh Session if needed and get User
    const { data: { user } } = await supabase.auth.getUser()

    // Route Protection Logic
    const path = request.nextUrl.pathname
    const isProtectedRoute = path.startsWith('/campaign') || path.startsWith('/admin') || path.startsWith('/auth') || path.startsWith('/organization')

    if (isProtectedRoute && !user && path !== '/login') {
        const loginUrl = new URL('/login', request.url)
        return NextResponse.redirect(loginUrl)
    }

    // MFA Enforcement for Admin
    if (path.startsWith('/admin') && user) {
        const { data, error } = await supabase.auth.mfa.listFactors()

        if (!error && data) {
            const factors = data.all || []
            const hasVerifiedMfa = factors.some(f => f.status === 'verified')

            // If user has MFA enabled but session is aal1, redirect to challenge
            // Standard Supabase sessions start at aal1
            const { data: { session } } = await supabase.auth.getSession()
            const aal = session?.user?.aal || 'aal1'

            if (hasVerifiedMfa && aal === 'aal1' && path !== '/auth/mfa/challenge') {
                const mfaUrl = new URL('/auth/mfa/challenge', request.url)
                mfaUrl.searchParams.set('next', path)
                return NextResponse.redirect(mfaUrl)
            }
        }
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/campaign/:path*',
        '/admin/:path*',
        '/organization/:path*',
        '/auth/:path*',
    ],
}
