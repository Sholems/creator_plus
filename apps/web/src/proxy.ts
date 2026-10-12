import { NextResponse, type NextRequest } from 'next/server';

// Mirrors SESSION_HINT_COOKIE in lib/auth.tsx (kept separate: that module is client-only).
const SESSION_HINT_COOKIE = 'cp_session';

/**
 * Edge gate for member-only pages: signed-out visitors are sent to login
 * (with a return path) before the page renders. The hint cookie is not a
 * credential — the API still authorizes every request, and client layouts
 * still handle an expired session that kept a stale hint.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.get(SESSION_HINT_COOKIE)?.value) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const login = new URL('/auth/login', request.url);
  login.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/creator/qr-studio/:path*',
    '/community/settings/:path*',
    '/community/saved/:path*',
  ],
};
