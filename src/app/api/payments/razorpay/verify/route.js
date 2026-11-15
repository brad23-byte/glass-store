import { getOrderByNumber, canViewOrder, markPaid } from '@/lib/orders';
import { verifyCheckoutSignature } from '@/lib/payments';
import { bad, ok, readJson } from '@/lib/api';

export async function POST(req) {
  const b = await readJson(req);
  const o = await getOrderByNumber(b.number);
  if (!o || !canViewOrder(o, null, String(b.token || ''))) return bad('Order not found', 404);
  // The payment must belong to THIS order's Razorpay order, and the signature must match
  if (!o.provider_order || b.razorpay_order_id !== o.provider_order) return bad('Payment does not match this order', 400);
  if (!verifyCheckoutSignature(b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature)) return bad('Payment could not be verified', 400);
  const r = await markPaid(o.id, { method: 'razorpay', ref: String(b.razorpay_payment_id).slice(0, 60) });
  return r.ok || r.already ? ok({ ok: true }) : bad('Payment received but the order had expired. Our team will refund you.', 409);
}
