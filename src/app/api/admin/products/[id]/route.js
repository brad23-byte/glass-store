import { getDb } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { cleanProduct } from '@/lib/validate';
import { bad, ok, readJson } from '@/lib/api';

export async function PATCH(req, { params }) {
  if (!(await adminOrNull())) return bad('Admin access needed', 403);
  const id = Number(params.id);
  const { value, error } = cleanProduct(await readJson(req));
  if (error) return bad(error);
  const r = await getDb().prepare(`UPDATE products SET name=@name, brand=@brand, category=@category, short_desc=@short_desc, description=@description, price=@price, compare_at=@compare_at,
    stock=@stock, sku=@sku, images=@images, tags=@tags, highlights=@highlights, specs=@specs, warranty=@warranty, shipping_info=@shipping_info, return_policy=@return_policy,
    weight_g=@weight_g, is_active=@is_active, featured=@featured, updated_at=datetime('now') WHERE id=@id`).run({ ...value, id });
  return r.changes ? ok({ ok: true }) : bad('Product not found', 404);
}

// Products that were ordered are only hidden; others are deleted.
export async function DELETE(_req, { params }) {
  if (!(await adminOrNull())) return bad('Admin access needed', 403);
  const id = Number(params.id);
  const db = getDb();
  const used = await db.prepare('SELECT 1 AS x FROM order_items WHERE product_id = ? LIMIT 1').get(id);
  if (used) {
    await db.prepare("UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(id);
    return ok({ hidden: true });
  }
  await db.prepare('DELETE FROM products WHERE id = ?').run(id);
  return ok({ deleted: true });
}
