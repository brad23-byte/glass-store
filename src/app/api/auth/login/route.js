import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { bad, ok, readJson, throttle, clientIp } from '@/lib/api';

export async function POST(req) {
  const b = await readJson(req);
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');
  if (!email || !password) return bad('Enter your email and password');
  if (!throttle(`login:${clientIp(req)}:${email}`, 5, 15 * 60 * 1000)) return bad('Too many attempts. Try again in 15 minutes.', 429);
  const u = getDb().prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!u || !bcrypt.compareSync(password, u.password_hash)) return bad('Email or password is incorrect', 401);
  await createSession(u);
  return ok({ ok: true, role: u.role });
}
