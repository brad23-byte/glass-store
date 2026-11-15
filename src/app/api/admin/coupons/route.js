import { getDb } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { cleanCoupon } from '@/lib/validate';
import { bad, ok, readJson } from '@/lib/api';

export async function POST(req) {
  if (!(await adminOrNull())) return bad('Admin access needed', 403);
  const { value, error } = cleanCoupon(await readJson(req));
  if (error) return bad(error);
  try {
    await getDb().prepare('INSERT INTO coupons (code, kind, value, min_subtotal, max_uses, expires_at, active) VALUES (@code,@kind,@value,@min_subtotal,@max_uses,@expires_at,@active)').run(value);
  } catch { return bad('That code already exists', 409); }
  return ok({ ok: true }, 201);
}
