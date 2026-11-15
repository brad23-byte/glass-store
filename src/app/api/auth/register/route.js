import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { cleanAccount } from '@/lib/validate';
import { bad, ok, readJson, throttle, clientIp } from '@/lib/api';

export async function POST(req) {
  if (!throttle(`reg:${clientIp(req)}`, 10, 60 * 60 * 1000)) return bad('Too many sign-ups from this network. Try again later.', 429);
  const { value, error } = cleanAccount(await readJson(req));
  if (error) return bad(error);
  const db = getDb();
  if (db.prepare('SELECT 1 AS x FROM users WHERE email = ?').get(value.email)) return bad('An account with this email already exists. Try signing in.', 409);
  const r = db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,'customer')").run(value.name, value.email, bcrypt.hashSync(value.password, 10));
  await createSession({ id: r.lastInsertRowid, name: value.name, email: value.email, role: 'customer' });
  return ok({ ok: true }, 201);
}
