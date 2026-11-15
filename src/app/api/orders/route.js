import { createOrder, validateCheckout, UserError } from '@/lib/orders';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/db';
import { paymentMethods } from '@/lib/payments';
import { bad, ok, readJson, throttle, clientIp } from '@/lib/api';

export async function POST(req) {
  if (!throttle(`order:${clientIp(req)}`, 20, 60 * 60 * 1000)) return bad('Too many orders from this network. Try again later.', 429);
  const b = await readJson(req);
  const cust = validateCheckout(b);
  if (cust.error) return bad(cust.error);
  const methods = paymentMethods(await getSettings());
  const method = String(b.method || '');
  if (!['cod', 'razorpay', 'demo'].includes(method) || !methods[method]) return bad('Choose an available payment method');
  const session = await getSession();
  try {
    const o = await createOrder({ items: b.items, coupon: b.coupon ? String(b.coupon) : '', method, customer: cust.value, userId: session?.id });
    return ok(o, 201);
  } catch (e) {
    if (e instanceof UserError) return bad(e.message, 409);
    console.error('order error', e);
    return bad('Could not place the order. Please try again.', 500);
  }
}
