import { getDb } from '@/lib/db';
import { markPaid, markPaymentFailed } from '@/lib/orders';
import { verifyWebhookSignature } from '@/lib/payments';
import { bad, ok } from '@/lib/api';

// Backup confirmation: Razorpay calls this even if the customer closes the tab after paying.
export async function POST(req) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get('x-razorpay-signature'))) return bad('Invalid signature', 400);
  let ev;
  try { ev = JSON.parse(raw); } catch { return bad('Bad payload', 400); }
  const pay = ev?.payload?.payment?.entity;
  if (!pay?.order_id) return ok({ ignored: true });
  const o = await getDb().prepare('SELECT * FROM orders WHERE provider_order = ?').get(pay.order_id);
  if (!o) return ok({ ignored: true });
  if (ev.event === 'payment.captured' || ev.event === 'order.paid') {
    if (Number(pay.amount) !== o.total) return bad('Amount mismatch', 400);
    await markPaid(o.id, { method: 'razorpay', ref: String(pay.id).slice(0, 60) });
  } else if (ev.event === 'payment.failed') {
    await markPaymentFailed(o.id, String(pay.error_description || '').slice(0, 120));
  }
  return ok({ ok: true });
}
