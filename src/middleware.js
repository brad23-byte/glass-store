import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Pages under /admin and /account need a valid session. Admin-only checks happen again on the server.
export async function middleware(req) {
  const token = req.cookies.get('store_session')?.value;
  const secret = process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'dev-only-secret-change-me-please-32chars' : null);
  let valid = false;
  if (token && secret) {
    try { await jwtVerify(token, new TextEncoder().encode(secret)); valid = true; } catch {}
  }
  if (valid) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/admin/:path*', '/account/:path*'] };
