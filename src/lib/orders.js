import crypto from 'crypto';
import { getDb, transaction, getSettings } from './db';
import { hydrate } from './products';

export const MAX_LINE_QTY = 10;
export const PENDING_MINUTES = 30;

/* ---------------- Pricing ---------------- */
export async function priceCart(items, couponCode, { forUpdate = false, db = getDb() } = {}) {
  const settings = await getSettings(db);
  const lines = [];
  const merged = new Map();
  for (const it of Array.isArray(items) ? items : []) {
    const id = Number(it?.id);
    const qty = Math.trunc(Number(it?.qty));
    if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(qty) || qty <= 0) continue;
    merged.set(id, Math.min(MAX_LINE_QTY, (merged.get(id) || 0) + qty));
  }
  let subtotal = 0;
  for (const [id, qty] of merged) {
    const p = hydrate(await db.prepare('SELECT * FROM products WHERE id = ?').get(id));
    if (!p || !p.is_active) {
      lines.push({ id, qty, ok: false, problem: 'This item is no longer available', product: null, line_total: 0 });
      continue;
    }
    let problem = '';
    if (p.stock <= 0) problem = 'Out of stock';
    else if (qty > p.stock) problem = `Only ${p.stock} left`;
    const line_total = p.price * qty;
    if (!problem) subtotal += line_total;
    lines.push({
      id, qty, ok: !problem, problem, line_total,
      product: { id: p.id, slug: p.slug, name: p.name, brand: p.brand, image: p.images[0] || '', price: p.price, compare_at: p.compare_at, stock: p.stock, sku: p.sku, supplier_id: p.supplier_id, supplier_sku: p.supplier_sku, supplier_cost: p.supplier_cost },
    });
  }

  let discount = 0;
  let coupon = null;
  let couponError = '';
  if (couponCode) {
    const c = await db.prepare('SELECT * FROM coupons WHERE code = ? COLLATE NOCASE').get(String(couponCode).trim());
    if (!c || !c.active) couponError = 'This code is not valid';
    else if (c.expires_at && c.expires_at < new Date().toISOString().slice(0, 10)) couponError = 'This code has expired';
    else if (c.max_uses != null && c.uses >= c.max_uses) couponError = 'This code has been fully used';
    else if (subtotal < c.min_subtotal) couponError = `Add items worth ${(c.min_subtotal / 100).toLocaleString('en-IN')} or more to use this code`;
    else {
      coupon = c;
      discount = c.kind === 'percent' ? Math.floor((subtotal * c.value) / 100) : Math.min(c.value, subtotal);
    }
  }
  const afterDiscount = subtotal - discount;
  const shipping = subtotal === 0 ? 0 : afterDiscount >= settings.free_shipping_over ? 0 : settings.shipping_fee;
  return {
    lines, subtotal, discount, shipping, total: afterDiscount + shipping,
    coupon: coupon ? { code: coupon.code, kind: coupon.kind, value: coupon.value } : null,
    couponError, problems: lines.some((l) => !l.ok),
    free_shipping_over: settings.free_shipping_over,
  };
}

/* ---------------- Events ---------------- */
export async function addEvent(orderId, label, detail = '', db = getDb()) {
  await db.prepare('INSERT INTO order_events (order_id, label, detail) VALUES (?,?,?)').run(orderId, label, detail);
}

/* ---------------- Create ---------------- */
const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function validateCheckout(b) {
  const email = clean(b.email, 120).toLowerCase();
  const name = clean(b.name, 80);
  const phone = clean(b.phone, 20).replace(/[^\d+ -]/g, '');
  const a = b.address || {};
  const address = {
    line1: clean(a.line1, 120), line2: clean(a.line2, 120), city: clean(a.city, 60),
    state: clean(a.state, 60), pin: clean(a.pin, 10), country: clean(a.country, 60) || 'India',
  };
  if (name.length < 2) return { error: 'Enter your full name' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email address' };
  if (phone.replace(/\D/g, '').length < 10) return { error: 'Enter a phone number with at least 10 digits' };
  if (!address.line1 || !address.city || !address.state) return { error: 'Enter your full delivery address' };
  if (!/^\d{6}$/.test(address.pin)) return { error: 'Enter a valid 6-digit PIN code' };
  return { value: { email, name, phone, address } };
}

export async function createOrder({ items, coupon, method, customer, userId }) {
  await releaseExpired();
  return await transaction(async (db) => {
    const priced = await priceCart(items, coupon, { db });
    if (!priced.lines.length) throw new UserError('Your cart is empty');
    if (priced.problems) throw new UserError('Some items in your cart changed. Please review your cart.');
    if (coupon && priced.couponError) throw new UserError(priced.couponError);

    for (const l of priced.lines) {
      const r = await db.prepare('UPDATE products SET stock = stock - ?, updated_at = datetime(\'now\') WHERE id = ? AND stock >= ?').run(l.qty, l.id, l.qty);
      if (r.changes === 0) throw new UserError(`${l.product.name} just sold out. Please review your cart.`);
    }
    if (priced.coupon) {
      const r = await db.prepare('UPDATE coupons SET uses = uses + 1 WHERE code = ? COLLATE NOCASE AND (max_uses IS NULL OR uses < max_uses)').run(priced.coupon.code);
      if (r.changes === 0) throw new UserError('This code has been fully used');
    }

    const cod = method === 'cod';
    const token = crypto.randomBytes(16).toString('hex');
    const ins = await db.prepare(`INSERT INTO orders (access_token, user_id, email, name, phone, ship_address, subtotal, discount, shipping, total, coupon_code, status, payment_status, payment_method)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      token, userId || null, customer.email, customer.name, customer.phone, JSON.stringify(customer.address),
      priced.subtotal, priced.discount, priced.shipping, priced.total, priced.coupon?.code || null,
      cod ? 'processing' : 'pending_payment', cod ? 'cod' : 'unpaid', method
    );
    const id = ins.lastInsertRowid;
    const number = `MAG-${10000 + id}`;
    await db.prepare('UPDATE orders SET number = ? WHERE id = ?').run(number, id);

    const insItem = db.prepare(`INSERT INTO order_items (order_id, product_id, name, sku, image, unit_price, qty, line_total, supplier_id, supplier_sku, unit_cost, fulfilment)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const l of priced.lines) {
      const p = l.product;
      await insItem.run(id, p.id, p.name, p.sku || '', p.image || '', p.price, l.qty, l.line_total, p.supplier_id || null, p.supplier_sku || null, p.supplier_cost ?? null, p.supplier_id ? 'pending_supplier' : 'own');
    }
    await addEvent(id, 'Order placed', cod ? 'Cash on delivery' : 'Waiting for payment', db);
    return { id, number, token, total: priced.total, status: cod ? 'processing' : 'pending_payment' };
  });
}

export class UserError extends Error {}

/* ---------------- Payment state ---------------- */
export async function markPaid(orderId, { method, ref }) {
  return await transaction(async (db) => {
    const o = await db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!o) return { ok: false, reason: 'not_found' };
    if (o.payment_status === 'paid') return { ok: true, already: true };
    if (o.status === 'cancelled') {
      await db.prepare("UPDATE orders SET payment_status = 'paid', payment_method = ?, payment_ref = ?, paid_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(method, ref || null, orderId);
      await addEvent(orderId, 'Payment received after the order was cancelled', 'Refund required', db);
      return { ok: false, reason: 'cancelled_refund_due' };
    }
    await db.prepare("UPDATE orders SET payment_status = 'paid', status = 'processing', payment_method = ?, payment_ref = ?, paid_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(method, ref || null, orderId);
    await addEvent(orderId, 'Payment received', `${method}${ref ? ` · ${ref}` : ''}`, db);
    return { ok: true };
  });
}

export async function markPaymentFailed(orderId, detail = '') {
  const db = getDb();
  const o = await db.prepare('SELECT payment_status, status FROM orders WHERE id = ?').get(orderId);
  if (!o || o.payment_status === 'paid') return;
  await db.prepare("UPDATE orders SET payment_status = 'failed', updated_at = datetime('now') WHERE id = ?").run(orderId);
  await addEvent(orderId, 'Payment failed', detail);
}

/* ---------------- Cancel / expire ---------------- */
export async function cancelOrder(orderId, reason = '') {
  return await transaction(async (db) => {
    const o = await db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!o || ['cancelled', 'refunded', 'delivered'].includes(o.status)) return false;
    const items = await db.prepare('SELECT product_id, qty FROM order_items WHERE order_id = ?').all(orderId);
    for (const it of items) if (it.product_id) await db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(it.qty, it.product_id);
    if (o.coupon_code) await db.prepare('UPDATE coupons SET uses = MAX(0, uses - 1) WHERE code = ? COLLATE NOCASE').run(o.coupon_code);
    await db.prepare("UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").run(orderId);
    await addEvent(orderId, 'Order cancelled', reason + (o.payment_status === 'paid' ? ' · Paid order: refund needed' : ''), db);
    return true;
  });
}

export async function releaseExpired() {
  const db = getDb();
  const rows = await db.prepare(`SELECT id FROM orders WHERE status = 'pending_payment' AND payment_status != 'paid' AND created_at < datetime('now', ?)`).all(`-${PENDING_MINUTES} minutes`);
  for (const r of rows) await cancelOrder(r.id, 'Payment not completed in time');
  return rows.length;
}

/* ---------------- Admin status changes ---------------- */
const NEXT = {
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: ['refunded'],
  pending_payment: ['cancelled'],
  cancelled: ['refunded'],
  refunded: [],
};

export async function updateOrderStatus(orderId, { status, tracking_number, tracking_url, note }, actor = 'admin') {
  const db = getDb();
  const o = await db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!o) throw new UserError('Order not found');
  if (status && status !== o.status) {
    if (!(NEXT[o.status] || []).includes(status)) throw new UserError(`Cannot move an order from ${o.status.replace('_', ' ')} to ${status.replace('_', ' ')}`);
    if (status === 'cancelled') {
      await cancelOrder(orderId, `Cancelled by ${actor}`);
    } else {
      if (status === 'refunded') {
        await db.prepare("UPDATE orders SET status = 'refunded', payment_status = 'refunded', updated_at = datetime('now') WHERE id = ?").run(orderId);
        await addEvent(orderId, 'Marked as refunded', `By ${actor}`);
      } else if (status === 'delivered') {
        await db.prepare("UPDATE orders SET status = 'delivered', payment_status = CASE WHEN payment_status = 'cod' THEN 'paid' ELSE payment_status END, paid_at = COALESCE(paid_at, datetime('now')), updated_at = datetime('now') WHERE id = ?").run(orderId);
        await addEvent(orderId, 'Delivered', o.payment_status === 'cod' ? 'Cash collected' : '');
      } else {
        await db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, orderId);
        await addEvent(orderId, status === 'shipped' ? 'Shipped' : `Status: ${status}`, tracking_number ? `Tracking ${tracking_number}` : '');
      }
    }
  }
  if (tracking_number !== undefined || tracking_url !== undefined) {
    const url = clean(tracking_url || '', 300);
    if (url && !/^https?:\/\//i.test(url)) throw new UserError('Tracking link must start with http:// or https://');
    await db.prepare("UPDATE orders SET tracking_number = ?, tracking_url = ?, updated_at = datetime('now') WHERE id = ?").run(clean(tracking_number || '', 80) || null, url || null, orderId);
  }
  if (note !== undefined) await db.prepare("UPDATE orders SET note = ?, updated_at = datetime('now') WHERE id = ?").run(clean(note, 500), orderId);
}

/* ---------------- Queries ---------------- */
export async function getOrder(id) {
  const db = getDb();
  const o = await db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  return o ? await inflate(o) : null;
}
export async function getOrderByNumber(number) {
  const o = await getDb().prepare('SELECT * FROM orders WHERE number = ?').get(String(number));
  return o ? await inflate(o) : null;
}
async function inflate(o) {
  const db = getDb();
  return {
    ...o,
    ship_address: (() => { try { return JSON.parse(o.ship_address); } catch { return {}; } })(),
    items: await db.prepare('SELECT i.*, s.name AS supplier_name FROM order_items i LEFT JOIN suppliers s ON s.id = i.supplier_id WHERE i.order_id = ? ORDER BY i.id').all(o.id),
    events: await db.prepare('SELECT * FROM order_events WHERE order_id = ? ORDER BY id').all(o.id),
  };
}

export function canViewOrder(order, session, token) {
  if (!order) return false;
  if (session?.role === 'admin') return true;
  if (session && order.user_id === session.id) return true;
  if (token && typeof token === 'string' && token.length === order.access_token.length) {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(order.access_token));
  }
  return false;
}

// Only orders placed while signed in: matching by email would let anyone read someone else's guest orders.
export async function listOrdersForUser(userId) {
  const db = getDb();
  const orders = await db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 100').all(userId);
  return Promise.all(orders.map(async (o) => ({ ...o, items: await db.prepare('SELECT name, image, qty FROM order_items WHERE order_id = ?').all(o.id) })));
}

export async function listOrdersAdmin({ status = '', pay = '', q = '', page = 1, perPage = 20 } = {}) {
  const where = ['1=1'];
  const args = [];
  if (status) { where.push('status = ?'); args.push(status); }
  if (pay) { where.push('payment_status = ?'); args.push(pay); }
  if (q) { where.push('(number LIKE ? OR email LIKE ? OR name LIKE ? OR phone LIKE ?)'); const l = `%${q.replace(/[%_]/g, '')}%`; args.push(l, l, l, l); }
  const w = where.join(' AND ');
  const db = getDb();
  const total = (await db.prepare(`SELECT COUNT(*) AS c FROM orders WHERE ${w}`).get(...args)).c;
  const rows = await db.prepare(`SELECT * FROM orders WHERE ${w} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...args, perPage, (Math.max(1, page) - 1) * perPage);
  return {
    total, pages: Math.max(1, Math.ceil(total / perPage)),
    items: await Promise.all(rows.map(async (o) => ({ ...o, item_count: (await db.prepare('SELECT COALESCE(SUM(qty),0) AS n FROM order_items WHERE order_id = ?').get(o.id)).n }))),
  };
}

export async function adminStats() {
  const db = getDb();
  const settings = await getSettings();
  const paid = "payment_status = 'paid' AND status NOT IN ('cancelled','refunded')";
  const one = async (sql, ...a) => await db.prepare(sql).get(...a);
  const revenue = await one(`SELECT COALESCE(SUM(total),0) AS v, COUNT(*) AS n FROM orders WHERE ${paid}`);
  const last30 = await one(`SELECT COALESCE(SUM(total),0) AS v, COUNT(*) AS n FROM orders WHERE ${paid} AND created_at >= datetime('now','-30 days')`);
  const pending = (await one("SELECT COUNT(*) AS n FROM orders WHERE status = 'processing'")).n;
  const cod = await one("SELECT COALESCE(SUM(total),0) AS v, COUNT(*) AS n FROM orders WHERE payment_status = 'cod' AND status NOT IN ('cancelled','refunded')");
  const days = await db.prepare(`SELECT date(created_at) AS d, COALESCE(SUM(total),0) AS v, COUNT(*) AS n FROM orders WHERE ${paid} AND created_at >= date('now','-13 days') GROUP BY date(created_at)`).all();
  const series = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const hit = days.find((x) => x.d === d);
    series.push({ d, v: hit?.v || 0, n: hit?.n || 0 });
  }
  const top = await db.prepare(`SELECT i.name, SUM(i.qty) AS qty, SUM(i.line_total) AS rev FROM order_items i JOIN orders o ON o.id = i.order_id WHERE o.${paid.replace(/ AND /g, ' AND o.')} GROUP BY i.product_id, i.name ORDER BY rev DESC LIMIT 5`).all();
  const low = await db.prepare('SELECT id, name, stock FROM products WHERE is_active = 1 AND stock <= ? ORDER BY stock LIMIT 8').all(settings.low_stock_threshold);
  const recent = await db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 6').all();
  const aov = revenue.n ? Math.round(revenue.v / revenue.n) : 0;
  return { revenue, last30, pending, cod, series, top, low, recent, aov, productCount: (await one('SELECT COUNT(*) AS n FROM products')).n, customerCount: (await one("SELECT COUNT(*) AS n FROM users WHERE role = 'customer'")).n };
}

export function cleanReviewInput(b) {
  const rating = Math.trunc(Number(b.rating));
  if (!(rating >= 1 && rating <= 5)) return { error: 'Choose a rating from 1 to 5' };
  return { value: { rating, title: clean(b.title, 80), body: clean(b.body, 1000) } };
}
