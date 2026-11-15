import { priceCart } from '@/lib/orders';
import { ok, readJson, throttle, clientIp } from '@/lib/api';

export async function POST(req) {
  if (!throttle(`price:${clientIp(req)}`, 120, 60 * 1000)) return ok({ error: 'Slow down' }, 429);
  const b = await readJson(req);
  const p = priceCart(b.items, b.coupon);
  // Never expose supplier identity or cost to shoppers
  const lines = p.lines.map((l) => ({ ...l, product: l.product && (({ supplier_id, supplier_sku, supplier_cost, ...rest }) => rest)(l.product) }));
  return ok({ ...p, lines });
}
