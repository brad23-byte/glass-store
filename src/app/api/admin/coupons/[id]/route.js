import { getDb } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { bad, ok, readJson } from '@/lib/api';

export async function PATCH(req, { params }) {
  if (!(await adminOrNull())) return bad('Admin access needed', 403);
  const b = await readJson(req);
  getDb().prepare('UPDATE coupons SET active = ? WHERE id = ?').run(b.active ? 1 : 0, Number(params.id));
  return ok({ ok: true });
}
export async function DELETE(_req, { params }) {
  if (!(await adminOrNull())) return bad('Admin access needed', 403);
  getDb().prepare('DELETE FROM coupons WHERE id = ?').run(Number(params.id));
  return ok({ ok: true });
}
