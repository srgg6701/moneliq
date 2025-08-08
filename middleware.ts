import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define a list of protected routes
const protectedRoutes = ['/dashboard', '/currencies', '/balances']; // /currencies покроет и /currencies/[currencyId]

export function middleware(request: NextRequest) {

  const pathname = request.nextUrl.pathname;
  console.log('Middleware triggered for:', pathname);

  // Check if the current route is secure
  const isProtectedRoute = protectedRoutes.some(prefix => pathname.startsWith(prefix));
  console.log('Is protected route:', isProtectedRoute); 
  // Get authentication state from cookie or sessionStorage (via cookie for Middleware)
  // Middleware doesn't have direct access to sessionStorage, so we'll need cookie.
  // temporal solution
  const isAuthenticated = request.cookies.get('isAuthenticated')?.value === 'true';
  console.log('Is authenticated (from cookie):', isAuthenticated);

  if (isProtectedRoute && !isAuthenticated) {
    console.log('Redirecting to /login');
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && pathname === '/login') {
    console.log('Redirecting to /dashboard (already logged in)');
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