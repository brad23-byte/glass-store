import { adminOrNull } from '@/lib/auth';
import { syncSupplier } from '@/lib/suppliers';
import { bad, ok } from '@/lib/api';

export async function POST(_req, { params }) {
  if (!(await adminOrNull())) return bad('Admin access needed', 403);
  try { return ok(await syncSupplier(Number(params.id))); } catch (e) { return bad(e.message || 'Sync failed', 502); }
}
