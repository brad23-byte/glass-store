import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { cleanReviewInput } from '@/lib/orders';
import { hasPurchased, recomputeRating } from '@/lib/products';
import { bad, ok, readJson } from '@/lib/api';

export async function POST(req) {
  const s = await getSession();
  if (!s) return bad('Sign in to write a review', 401);
  const b = await readJson(req);
  const productId = Number(b.product_id);
  const { value, error } = cleanReviewInput(b);
  if (error) return bad(error);
  if (!Number.isInteger(productId) || !hasPurchased(s.id, productId)) return bad('Only customers who bought this product can review it', 403);
  getDb().prepare(`INSERT INTO reviews (product_id, user_id, rating, title, body) VALUES (?,?,?,?,?)
    ON CONFLICT(product_id, user_id) DO UPDATE SET rating = excluded.rating, title = excluded.title, body = excluded.body`).run(productId, s.id, value.rating, value.title, value.body);
  recomputeRating(productId);
  return ok({ ok: true });
}
