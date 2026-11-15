import { getOrderByNumber, canViewOrder } from '@/lib/orders';
import { getDb, getSettings } from '@/lib/db';
import { paymentMethods, createRazorpayOrder } from '@/lib/payments';
import { bad, ok, readJson } from '@/lib/api';

export async function POST(req) {
  const m = paymentMethods(getSettings());
  if (!m.razorpay) return bad('Online payments are not set up yet', 503);
  const b = await readJson(req);
  const o = getOrderByNumber(b.number);
  if (!o || !canViewOrder(o, null, String(b.token || ''))) return bad('Order not found', 404);
  if (o.status !== 'pending_payment' || o.payment_status === 'paid') return bad('This order is not waiting for payment', 409);
  try {
    const r = o.provider_order ? { id: o.provider_order } : await createRazorpayOrder(o);
    if (!o.provider_order) getDb().prepare("UPDATE orders SET provider_order = ?, payment_method = 'razorpay' WHERE id = ?").run(r.id, o.id);
    return ok({ keyId: m.keyId, razorpayOrderId: r.id, amount: o.total, currency: 'INR', name: o.name, email: o.email, phone: o.phone });
  } catch (e) {
    return bad(e.message || 'Could not start the payment', 502);
  }
}
