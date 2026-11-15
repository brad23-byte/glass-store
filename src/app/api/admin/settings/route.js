import { adminOrNull } from '@/lib/auth';
import { saveSettings } from '@/lib/db';
import { bad, ok, readJson } from '@/lib/api';

export async function PUT(req) {
  if (!(await adminOrNull())) return bad('Admin access needed', 403);
  const b = await readJson(req);
  const t = (v, n) => String(v ?? '').trim().slice(0, n);
  const fee = Math.round(Number(b.shipping_fee) * 100);
  const free = Math.round(Number(b.free_shipping_over) * 100);
  const low = Math.trunc(Number(b.low_stock_threshold));
  if (!t(b.store_name, 40)) return bad('Enter a store name');
  if (!(fee >= 0) || !(free >= 0)) return bad('Enter valid shipping amounts');
  if (!(low >= 0)) return bad('Low-stock level must be 0 or more');
  saveSettings({ store_name: t(b.store_name, 40), tagline: t(b.tagline, 100), currency_symbol: t(b.currency_symbol, 3) || '₹', shipping_fee: fee, free_shipping_over: free, cod_enabled: b.cod_enabled ? '1' : '0', low_stock_threshold: low, support_email: t(b.support_email, 100) });
  return ok({ ok: true });
}
