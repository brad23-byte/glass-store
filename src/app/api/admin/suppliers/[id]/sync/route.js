import { adminOrNull } from '@/lib/auth';
import { syncSupplier } from '@/lib/suppliers';
import { bad, ok } from '@/lib/api';

// Supplier syncs fetch a feed and write many rows: allow more time than the default.
export const maxDuration = 60;

export async function POST(_req, { params }) {
  if (!(await adminOrNull())) return bad('Admin access needed', 403);
  try { return ok(await syncSupplier(Number(params.id))); } catch (e) { return bad(e.message || 'Sync failed', 502); }
}
