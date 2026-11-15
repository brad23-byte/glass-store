import { getOrderByNumber, markPaid, markPaymentFailed, canViewOrder } from '@/lib/orders';
import { getSettings } from '@/lib/db';
import { paymentMethods } from '@/lib/payments';
import { bad, ok, readJson } from '@/lib/api';

// TEST MODE ONLY: no card data is ever sent here. Disabled in production unless ALLOW_DEMO_PAYMENTS=true.
export async function POST(req) {
  if (!paymentMethods(getSettings()).demo) return bad('Test payments are switched off', 403);
  const b = await readJson(req);
  const o = getOrderByNumber(b.number);
  if (!o || !canViewOrder(o, null, String(b.token || ''))) return bad('Order not found', 404);
  if (o.status !== 'pending_payment') return bad('This order is not waiting for payment', 409);
  if (b.outcome === 'declined') {
    markPaymentFailed(o.id, 'Test card declined');
    return bad('Your card was declined. Try another card.', 402);
  }
  const r = markPaid(o.id, { method: 'demo', ref: `TEST-${Date.now().toString(36).toUpperCase()}` });
  return r.ok ? ok({ ok: true }) : bad('This order expired. Please place it again.', 409);
}
