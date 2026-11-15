import { adminOrNull } from '@/lib/auth';
import { getOrder, updateOrderStatus, addEvent } from '@/lib/orders';
import { refundRazorpay } from '@/lib/payments';
import { bad, ok } from '@/lib/api';

// Refunds via Razorpay when the order was paid there; otherwise just records the refund (do it in your payment dashboard).
export async function POST(_req, { params }) {
  const a = await adminOrNull();
  if (!a) return bad('Admin access needed', 403);
  const o = await getOrder(Number(params.id));
  if (!o) return bad('Order not found', 404);
  if (o.payment_status !== 'paid') return bad('Only paid orders can be refunded', 409);
  let via = 'recorded only';
  if (o.payment_method === 'razorpay' && o.payment_ref && process.env.RAZORPAY_KEY_ID) {
    try {
      await refundRazorpay(o.payment_ref, o.total);
      via = 'sent to Razorpay';
    } catch (e) {
      return bad(`Razorpay refund failed: ${e.message}`, 502);
    }
  }
  try {
    if (o.status !== 'cancelled' && o.status !== 'delivered') await updateOrderStatus(o.id, { status: 'cancelled' }, a.name);
    await updateOrderStatus(o.id, { status: 'refunded' }, a.name);
  } catch (e) {
    return bad(e.message, 409);
  }
  await addEvent(o.id, 'Refund', via);
  return ok({ ok: true, via });
}
