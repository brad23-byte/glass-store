import { updateOrderStatus, UserError } from '@/lib/orders';
import { adminOrNull } from '@/lib/auth';
import { bad, ok, readJson } from '@/lib/api';

export async function PATCH(req, { params }) {
  const a = await adminOrNull();
  if (!a) return bad('Admin access needed', 403);
  const b = await readJson(req);
  try {
    await updateOrderStatus(Number(params.id), { status: b.status, tracking_number: b.tracking_number, tracking_url: b.tracking_url, note: b.note }, a.name);
    return ok({ ok: true });
  } catch (e) {
    return bad(e instanceof UserError ? e.message : 'Could not update the order', e instanceof UserError ? 409 : 500);
  }
}
