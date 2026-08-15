/**
 * EXAMPLE: Next.js Middleware License Guard
 *
 * Place this at: middleware.ts (project root)
 *
 * Blocks all pages behind /app/* unless license is valid.
 * The license token must be stored server-side (file or database).
 */

// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// The plugin uses its own synchronous cache check — no network call in middleware.
// NOTE: This example works for same-process deployments.
// For Vercel Edge, use KV storage (see DatabaseStorage in LicenseNestNextApp.ts).

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only gate /app/* routes
  if (!pathname.startsWith('/app')) {
    return NextResponse.next();
  }

  // Read license token from cookie (set at activation time)
  const licenseToken = request.cookies.get('ln_token')?.value;

  if (!licenseToken) {
    return NextResponse.redirect(new URL('/activate', request.url));
  }

  // Allow — actual JWT validation happens in the API route or server action
  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*'],
};
