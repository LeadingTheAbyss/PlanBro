import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Check if the user has an active session cookie
  const sessionCookie = request.cookies.get('brewplans_session');
  
  console.log('[Middleware] Path:', request.nextUrl.pathname);
  console.log('[Middleware] Cookies:', request.cookies.getAll());

  if (!sessionCookie) {
    console.log('[Middleware] Redirecting to login, no session cookie found.');
    // Redirect to login if unauthenticated and append the return url
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Specify which routes should be protected
export const config = {
  matcher: [
    '/plan/:path*',
    '/profile',
    '/recommend',
    '/quick-trip',
    '/stats',
    '/blog/write'
  ],
};
