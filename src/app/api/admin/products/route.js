import { getDb, slugify } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { cleanProduct } from '@/lib/validate';
import { bad, ok, readJson } from '@/lib/api';

export async function POST(req) {
  if (!(await adminOrNull())) return bad('Admin access needed', 403);
  const { value, error } = cleanProduct(await readJson(req));
  if (error) return bad(error);
  const db = getDb();
  let slug = slugify(value.name) || 'product';
  if (await db.prepare('SELECT 1 AS x FROM products WHERE slug = ?').get(slug)) slug += `-${Date.now().toString(36).slice(-4)}`;
  const r = await db.prepare(`INSERT INTO products (slug, name, brand, category, short_desc, description, price, compare_at, stock, sku, images, tags, highlights, specs, warranty, shipping_info, return_policy, weight_g, is_active, featured)
    VALUES (@slug,@name,@brand,@category,@short_desc,@description,@price,@compare_at,@stock,@sku,@images,@tags,@highlights,@specs,@warranty,@shipping_info,@return_policy,@weight_g,@is_active,@featured)`).run({ ...value, slug });
  return ok({ id: r.lastInsertRowid, slug }, 201);
}
