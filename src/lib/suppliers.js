import dns from 'dns/promises';
import net from 'net';
import { getDb, slugify } from './db';
import { mockProducts, mockPlaceOrder } from './mockSupplier';
import { SHIPPING_DEFAULT, RETURNS_DEFAULT } from './seed';
import { addEvent } from './orders';

/* ---------- URL safety (server-side requests to admin-supplied URLs) ---------- */
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const l = ip.toLowerCase();
  return l === '::1' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80') || l.startsWith('::ffff:127.') || l.startsWith('::ffff:10.') || l.startsWith('::ffff:192.168.');
}

export async function assertSafeUrl(raw) {
  if (/^mock:\/\/demo\//.test(raw)) return raw;
  let u;
  try { u = new URL(raw); } catch { throw new Error('Enter a full web address that starts with https://'); }
  const dev = process.env.NODE_ENV !== 'production';
  if (u.protocol !== 'https:' && !(dev && u.protocol === 'http:')) throw new Error('Supplier addresses must start with https://');
  if (u.username || u.password) throw new Error('Do not put a username or password in the web address. Use the API key field.');
  const host = u.hostname;
  if (!dev) {
    const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => { throw new Error('Could not find that website'); });
    if (addrs.some((a) => isPrivateIp(a.address))) throw new Error('That address points to a private network and is blocked');
  }
  return u.toString();
}

async function http(url, { method = 'GET', headers = {}, body } = {}) {
  const safe = await assertSafeUrl(url);
  const res = await fetch(safe, { method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(20000) });
  if (res.status >= 300 && res.status < 400) throw new Error('The supplier redirected the request. Use the final web address.');
  const text = await res.text();
  if (text.length > 15_000_000) throw new Error('The supplier feed is too large');
  return { res, text };
}

/* ---------- Mapping ---------- */
export const DEFAULT_MAP = {
  sku: 'sku', id: 'id', name: 'title', description: 'description', brand: 'brand', category: 'category', price: 'price', stock: 'stock',
  images: 'images', thumbnail: 'thumbnail', tags: 'tags', rating: 'rating', weight: 'weight', warranty: 'warrantyInformation',
  shipping: 'shippingInformation', returns: 'returnPolicy', reviews: 'reviews', dimensions: 'dimensions',
};
export const DEFAULT_CSV_MAP = { sku: 'sku', name: 'name', description: 'description', brand: 'brand', category: 'category', price: 'price', stock: 'stock', images: 'image' };

const dig = (o, p) => (p ? String(p).split('.').reduce((a, k) => (a == null ? undefined : a[k]), o) : undefined);
const str = (v, max = 4000) => (v == null ? '' : String(v).replace(/<[^>]*>/g, '').trim().slice(0, max));
const num = (v) => { const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : NaN; };
const title = (s) => str(s, 60).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const okImage = (u) => typeof u === 'string' && (/^https:\/\//i.test(u) || /^emoji:/.test(u)) && u.length < 600;

export function mapItem(raw, map) {
  const m = { ...DEFAULT_MAP, ...(map || {}) };
  const g = (k) => dig(raw, m[k]);
  const sku = str(g('sku') ?? g('id'), 80);
  const name = str(g('name'), 160);
  const cost = num(g('price'));
  if (!sku || !name || !Number.isFinite(cost) || cost < 0) return null;
  let images = [];
  const imgs = g('images');
  if (Array.isArray(imgs)) images = imgs;
  else if (typeof imgs === 'string') images = imgs.split(/[|,;]\s*(?=https?:|emoji:)/);
  const thumb = g('thumbnail');
  if (thumb) images = [thumb, ...images];
  images = [...new Set(images.map((x) => String(x).trim()).filter(okImage))].slice(0, 8);
  const dims = g('dimensions');
  const specs = [];
  if (dims && typeof dims === 'object') specs.push(['Dimensions (W x H x D)', `${dims.width ?? '?'} x ${dims.height ?? '?'} x ${dims.depth ?? '?'} cm`]);
  const weight = num(g('weight'));
  if (Number.isFinite(weight)) specs.push(['Weight', `${weight} g`]);
  const brand = str(g('brand'), 60);
  if (brand) specs.push(['Brand', brand]);
  const reviews = (Array.isArray(g('reviews')) ? g('reviews') : []).slice(0, 10).map((r) => ({
    rating: Math.max(1, Math.min(5, Math.round(num(r.rating)) || 5)), comment: str(r.comment, 400), name: str(r.reviewerName || r.name, 60) || 'Customer', date: str(r.date, 20).slice(0, 10),
  })).filter((r) => r.comment);
  const tags = Array.isArray(g('tags')) ? g('tags').map((t) => str(t, 30)).filter(Boolean).slice(0, 10) : [];
  const rating = num(g('rating'));
  return {
    sku, name, cost, brand, category: title(g('category')) || 'General', description: str(g('description'), 4000), stock: Math.max(0, Math.trunc(num(g('stock')) || 0)),
    images, tags, specs, reviews, rating: Number.isFinite(rating) ? Math.max(0, Math.min(5, rating)) : null, weight_g: Number.isFinite(weight) ? Math.round(weight) : null,
    warranty: str(g('warranty'), 200), shipping_info: str(g('shipping'), 400), return_policy: str(g('returns'), 400),
  };
}

export function parseCSV(text) {
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some((x) => x !== '')) rows.push(row); row = []; }
    else cur += c;
  }
  row.push(cur);
  if (row.some((x) => x !== '')) rows.push(row);
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

/* ---------- Fetch ---------- */
function authHeaders(s) {
  return s.api_key ? { [s.auth_header || 'x-api-key']: s.api_key, accept: 'application/json' } : { accept: 'application/json' };
}

export async function fetchItems(s, limit = 500) {
  const map = (() => { try { return JSON.parse(s.field_map || '{}'); } catch { return {}; } })();
  let rawItems;
  if (s.url.startsWith('mock://demo/')) {
    rawItems = mockProducts().products;
  } else {
    const { res, text } = await http(s.url, { headers: authHeaders(s) });
    if (!res.ok) throw new Error(`Supplier replied with status ${res.status}`);
    if (s.kind === 'csv') rawItems = parseCSV(text);
    else {
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('The supplier did not return valid JSON'); }
      rawItems = s.items_path ? dig(data, s.items_path) : data;
      if (!Array.isArray(rawItems)) throw new Error(`Could not find a list of products${s.items_path ? ` at "${s.items_path}"` : ''}. Check the "list path" setting.`);
    }
  }
  const effMap = s.kind === 'csv' ? { ...DEFAULT_CSV_MAP, ...map } : map;
  const mapped = [];
  let skipped = 0;
  for (const raw of rawItems.slice(0, limit)) {
    const m = s.kind === 'csv' ? mapItemCsv(raw, effMap) : mapItem(raw, effMap);
    if (m) mapped.push(m); else skipped++;
  }
  return { items: mapped, skipped, total: rawItems.length };
}
function mapItemCsv(raw, map) { return mapItem(raw, map); }

export async function testSupplier(s) {
  const { items, skipped, total } = await fetchItems(s, 50);
  return { total, usable: items.length, skipped, sample: items.slice(0, 3).map((i) => ({ sku: i.sku, name: i.name, cost: i.cost, stock: i.stock })) };
}

/* ---------- Sync ---------- */
const sellPrice = (cost, s) => {
  const major = cost * (s.currency_rate || 1) * (1 + (s.markup_pct || 0) / 100);
  return Math.max(100, Math.round(major) * 100); // whole rupees, in paise
};

export async function syncSupplier(id) {
  const db = getDb();
  const s = await db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
  if (!s) throw new Error('Supplier not found');
  try {
    const { items, skipped } = await fetchItems(s);
    let created = 0, updated = 0;

    // Read what exists once, then send every change in a single atomic batch (one round trip to the database).
    const existing = new Map((await db.prepare('SELECT id, supplier_sku FROM products WHERE supplier_id = ?').all(s.id)).map((r) => [String(r.supplier_sku), r.id]));
    const slugs = new Set((await db.prepare('SELECT slug FROM products').all()).map((r) => r.slug));
    const UPDATE_SQL = "UPDATE products SET price = ?, supplier_cost = ?, stock = ?, supplier_rating = ?, supplier_reviews = CASE WHEN supplier_reviews = '[]' THEN ? ELSE supplier_reviews END, updated_at = datetime('now') WHERE id = ?";
    const INSERT_SQL = `INSERT INTO products (slug, name, brand, category, short_desc, description, price, stock, sku, images, tags, specs, warranty, shipping_info, return_policy, weight_g, supplier_id, supplier_sku, supplier_cost, supplier_rating, supplier_reviews, highlights)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const stmts = [];
    for (const it of items) {
      const price = sellPrice(it.cost, s);
      const costMinor = Math.round(it.cost * (s.currency_rate || 1) * 100);
      const exId = existing.get(String(it.sku));
      if (exId) {
        // Refresh price, cost and stock. Details you edited by hand are kept.
        stmts.push([UPDATE_SQL, price, costMinor, it.stock, it.rating, JSON.stringify(it.reviews), exId]);
        updated++;
      } else {
        let slug = slugify(it.name) || `item-${it.sku}`;
        if (slugs.has(slug)) slug = `${slug}-${slugify(it.sku)}`;
        slugs.add(slug);
        existing.set(String(it.sku), -1);
        stmts.push([INSERT_SQL,
          slug, it.name, it.brand, it.category, it.description.slice(0, 160), it.description, price, it.stock, `S${s.id}-${it.sku}`.slice(0, 60),
          JSON.stringify(it.images.length ? it.images : ['emoji:📦|#64748b|#94a3b8']), JSON.stringify(it.tags), JSON.stringify(it.specs),
          it.warranty, it.shipping_info || SHIPPING_DEFAULT, it.return_policy || RETURNS_DEFAULT, it.weight_g, s.id, it.sku, costMinor, it.rating, JSON.stringify(it.reviews), '[]']);
        created++;
      }
    }
    // Chunks keep each request a sensible size; a failed chunk rolls back on its own.
    for (let i = 0; i < stmts.length; i += 100) await db.batch(stmts.slice(i, i + 100));
    const msg = `OK: ${created} new, ${updated} updated${skipped ? `, ${skipped} skipped` : ''}`;
    await db.prepare("UPDATE suppliers SET last_sync_at = datetime('now'), last_sync_status = ? WHERE id = ?").run(msg, s.id);
    return { created, updated, skipped, message: msg };
  } catch (e) {
    await db.prepare("UPDATE suppliers SET last_sync_at = datetime('now'), last_sync_status = ? WHERE id = ?").run(`Failed: ${String(e.message).slice(0, 200)}`, s.id);
    throw e;
  }
}

/* ---------- Forward an order's supplier items ---------- */
export async function forwardToSupplier(orderId, supplierId) {
  const db = getDb();
  const s = await db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplierId);
  const o = await db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!s || !o) throw new Error('Order or supplier not found');
  if (!['processing', 'shipped'].includes(o.status)) throw new Error('Only paid or confirmed orders can be sent to a supplier');
  if (o.payment_status === 'unpaid' || o.payment_status === 'failed') throw new Error('This order has not been paid yet');
  const items = await db.prepare("SELECT * FROM order_items WHERE order_id = ? AND supplier_id = ? AND fulfilment = 'pending_supplier'").all(orderId, supplierId);
  if (!items.length) throw new Error('No pending items for this supplier');
  if (!s.order_url) throw new Error('This supplier has no order address set. Place the order on their website, then record the reference.');
  const addr = JSON.parse(o.ship_address || '{}');
  const payload = {
    reference: o.number,
    items: items.map((i) => ({ sku: i.supplier_sku, quantity: i.qty })),
    ship_to: { name: o.name, phone: o.phone, email: o.email, ...addr },
  };
  let ref, status = 200, bodyOut;
  if (s.order_url.startsWith('mock://demo/')) {
    const r = mockPlaceOrder(payload, s.api_key);
    status = r.status; bodyOut = r.body;
  } else {
    const { res, text } = await http(s.order_url, { method: 'POST', headers: { ...authHeaders(s), 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    status = res.status;
    try { bodyOut = JSON.parse(text); } catch { bodyOut = {}; }
  }
  if (status >= 300) throw new Error(`Supplier rejected the order: ${bodyOut?.error || bodyOut?.message || `status ${status}`}`);
  ref = String(bodyOut.reference || bodyOut.id || bodyOut.order_id || 'accepted').slice(0, 80);
  await db.prepare("UPDATE order_items SET fulfilment = 'forwarded', supplier_ref = ? WHERE order_id = ? AND supplier_id = ? AND fulfilment = 'pending_supplier'").run(ref, orderId, supplierId);
  await addEvent(orderId, `Sent to supplier: ${s.name}`, `Reference ${ref}`);
  return { ref };
}

export async function recordManualSupplierOrder(orderId, supplierId, ref) {
  const db = getDb();
  const r = await db.prepare("UPDATE order_items SET fulfilment = 'forwarded', supplier_ref = ? WHERE order_id = ? AND supplier_id = ? AND fulfilment = 'pending_supplier'").run(String(ref).slice(0, 80), orderId, supplierId);
  if (r.changes === 0) throw new Error('No pending items for this supplier');
  await addEvent(orderId, 'Ordered from supplier manually', `Reference ${ref}`);
}
