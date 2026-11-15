import { getDb } from './db';

const J = (v, d) => {
  try { return JSON.parse(v); } catch { return d; }
};

export function hydrate(r) {
  if (!r) return r;
  return {
    ...r,
    images: J(r.images, []),
    tags: J(r.tags, []),
    highlights: J(r.highlights, []),
    specs: J(r.specs, []),
    supplier_reviews: J(r.supplier_reviews, []),
    is_active: !!r.is_active,
    featured: !!r.featured,
  };
}

// Strip fields the shopper must never see (supplier cost, supplier identity)
export function publicProduct(p) {
  if (!p) return p;
  const { supplier_cost, supplier_id, supplier_sku, ...rest } = p;
  return { ...rest, from_supplier: !!supplier_id };
}

const SORTS = {
  featured: 'featured DESC, rating_count DESC, id DESC',
  newest: 'id DESC',
  'price-asc': 'price ASC',
  'price-desc': 'price DESC',
  rating: 'COALESCE(NULLIF(rating,0), supplier_rating, 0) DESC, rating_count DESC',
};

export function listProducts({ q = '', category = '', sort = 'featured', min = 0, max = 0, inStock = false, page = 1, perPage = 12 } = {}) {
  const where = ['is_active = 1'];
  const args = [];
  if (q) {
    where.push('(name LIKE ? OR brand LIKE ? OR category LIKE ? OR short_desc LIKE ? OR tags LIKE ?)');
    const like = `%${q.replace(/[%_]/g, '')}%`;
    args.push(like, like, like, like, like);
  }
  if (category) { where.push('category = ?'); args.push(category); }
  if (min > 0) { where.push('price >= ?'); args.push(min * 100); }
  if (max > 0) { where.push('price <= ?'); args.push(max * 100); }
  if (inStock) where.push('stock > 0');
  const w = where.join(' AND ');
  const db = getDb();
  const total = db.prepare(`SELECT COUNT(*) AS c FROM products WHERE ${w}`).get(...args).c;
  const order = SORTS[sort] || SORTS.featured;
  const rows = db.prepare(`SELECT * FROM products WHERE ${w} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...args, perPage, (Math.max(1, page) - 1) * perPage);
  return { items: rows.map((r) => publicProduct(hydrate(r))), total, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export function getProductBySlug(slug) {
  return hydrate(getDb().prepare('SELECT * FROM products WHERE slug = ? AND is_active = 1').get(slug));
}

export function getProductById(id) {
  return hydrate(getDb().prepare('SELECT * FROM products WHERE id = ?').get(id));
}

export function listCategories() {
  return getDb().prepare('SELECT category, COUNT(*) AS n FROM products WHERE is_active = 1 GROUP BY category ORDER BY n DESC, category').all();
}

export function featured(limit = 8) {
  return getDb().prepare('SELECT * FROM products WHERE is_active = 1 AND featured = 1 ORDER BY rating_count DESC, id LIMIT ?').all(limit).map((r) => publicProduct(hydrate(r)));
}

export function related(product, limit = 4) {
  return getDb()
    .prepare('SELECT * FROM products WHERE is_active = 1 AND id != ? AND (category = ? OR brand = ?) ORDER BY (category = ?) DESC, featured DESC LIMIT ?')
    .all(product.id, product.category, product.brand, product.category, limit)
    .map((r) => publicProduct(hydrate(r)));
}

export function getReviews(productId) {
  return getDb()
    .prepare('SELECT r.id, r.rating, r.title, r.body, r.created_at, u.name FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.product_id = ? ORDER BY r.id DESC LIMIT 50')
    .all(productId);
}

export function recomputeRating(productId) {
  const r = getDb().prepare('SELECT COUNT(*) AS n, AVG(rating) AS a FROM reviews WHERE product_id = ?').get(productId);
  getDb().prepare('UPDATE products SET rating = ?, rating_count = ? WHERE id = ?').run(r.n ? Math.round(r.a * 10) / 10 : 0, r.n, productId);
}

export function hasPurchased(userId, productId) {
  return !!getDb()
    .prepare("SELECT 1 AS x FROM order_items i JOIN orders o ON o.id = i.order_id WHERE o.user_id = ? AND i.product_id = ? AND o.status IN ('processing','shipped','delivered') LIMIT 1")
    .get(userId, productId);
}
