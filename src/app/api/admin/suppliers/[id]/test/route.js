import { getDb } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { testSupplier } from '@/lib/suppliers';
import { bad, ok } from '@/lib/api';

export async function POST(_req, { params }) {
  if (!(await adminOrNull())) return bad('Admin access needed', 403);
  const s = await getDb().prepare('SELECT * FROM suppliers WHERE id = ?').get(Number(params.id));
  if (!s) return bad('Supplier not found', 404);
  try { return ok(await testSupplier(s)); } catch (e) { return bad(e.message || 'Could not connect', 502); }
}
