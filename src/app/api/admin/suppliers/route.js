import { getDb } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { cleanSupplier } from '@/lib/validate';
import { assertSafeUrl } from '@/lib/suppliers';
import { bad, ok, readJson } from '@/lib/api';

export async function POST(req) {
  if (!(await adminOrNull())) return bad('Admin access needed', 403);
  const { value, error } = cleanSupplier(await readJson(req));
  if (error) return bad(error);
  try {
    await assertSafeUrl(value.url);
    if (value.order_url) await assertSafeUrl(value.order_url);
  } catch (e) {
    return bad(e.message);
  }
  const r = await getDb().prepare(`INSERT INTO suppliers (name, kind, url, api_key, auth_header, items_path, field_map, currency_rate, markup_pct, order_url, active)
    VALUES (@name,@kind,@url,@api_key,@auth_header,@items_path,@field_map,@currency_rate,@markup_pct,@order_url,@active)`).run(value);
  return ok({ id: r.lastInsertRowid }, 201);
}
