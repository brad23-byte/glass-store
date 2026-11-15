import { getDb } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { cleanSupplier } from '@/lib/validate';
import { assertSafeUrl } from '@/lib/suppliers';
import { bad, ok, readJson } from '@/lib/api';

export async function PATCH(req, { params }) {
  if (!(await adminOrNull())) return bad('Admin access needed', 403);
  const id = Number(params.id);
  const db = getDb();
  const ex = await db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
  if (!ex) return bad('Supplier not found', 404);
  const { value, error } = cleanSupplier(await readJson(req), ex);
  if (error) return bad(error);
  try {
    await assertSafeUrl(value.url);
    if (value.order_url) await assertSafeUrl(value.order_url);
  } catch (e) {
    return bad(e.message);
  }
  await db.prepare(`UPDATE suppliers SET name=@name, kind=@kind, url=@url, api_key=@api_key, auth_header=@auth_header, items_path=@items_path, field_map=@field_map,
    currency_rate=@currency_rate, markup_pct=@markup_pct, order_url=@order_url, active=@active WHERE id=@id`).run({ ...value, id });
  return ok({ ok: true });
}

export async function DELETE(_req, { params }) {
  if (!(await adminOrNull())) return bad('Admin access needed', 403);
  await getDb().prepare('DELETE FROM suppliers WHERE id = ?').run(Number(params.id));
  return ok({ ok: true });
}
