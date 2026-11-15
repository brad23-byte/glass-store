import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb } from './db';

export const COOKIE = 'store_session';

function secret() {
  const s = process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'dev-only-secret-change-me-please-32chars' : null);
  if (!s) throw new Error('JWT_SECRET must be set in production');
  return new TextEncoder().encode(s);
}

export async function createSession(user) {
  const token = await new SignJWT({ name: user.name, role: user.role, email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret());
  cookies().set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 8 });
}

export async function getSession() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const row = getDb().prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(Number(payload.sub));
    return row || null; // role is read from the database, so demoting an admin takes effect at once
  } catch {
    return null;
  }
}

export function clearSession() {
  cookies().delete(COOKIE);
}

export async function requireAdmin() {
  const s = await getSession();
  if (!s) redirect('/login?next=/admin');
  if (s.role !== 'admin') redirect('/');
  return s;
}

export async function requireUser(next = '/account') {
  const s = await getSession();
  if (!s) redirect(`/login?next=${encodeURIComponent(next)}`);
  return s;
}

// For API routes: returns the admin session or null
export async function adminOrNull() {
  const s = await getSession();
  return s && s.role === 'admin' ? s : null;
}
