import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

const protectedRoutes = ['/dashboard', '/currencies', '/balances']; // /currencies покроет и /currencies/[currencyId]

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if the current route is secure
  const isProtectedRoute = protectedRoutes.some((prefix) => pathname.startsWith(prefix));

  // Get authentication state from cookie or sessionStorage (via cookie for Middleware)
  // Middleware doesn't have direct access to sessionStorage, so we'll need cookie.
  const isAuthenticated = request.cookies.get('isAuthenticated')?.value === 'true';

  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);

    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && pathname === '/login') {
    const dashboardUrl = new URL('/dashboard', request.url);

    return NextResponse.redirect(dashboardUrl);
  }

  // Continue executing the request if everything is OK
  return NextResponse.next();
}

// Middleware configuration: specify for which routes it should be launched
export const config = {
  matcher: ['/dashboard/:path*', '/currencies/:path*', '/balances/:path*', '/login'],
};
