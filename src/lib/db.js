import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { SEED_PRODUCTS, SHIPPING_DEFAULT, RETURNS_DEFAULT } from './seed';

// Node's built-in SQLite (Node 22.5+): nothing to compile.
function openDatabase(file) {
  const { DatabaseSync } = process.getBuiltinModule('node:sqlite');
  const raw = new DatabaseSync(file);
  const plain = (r) => (r ? { ...r } : r);
  return {
    exec: (sql) => raw.exec(sql),
    prepare(sql) {
      const st = raw.prepare(sql);
      return {
        get: (...a) => plain(st.get(...a)),
        all: (...a) => st.all(...a).map(plain),
        run: (...a) => {
          const r = st.run(...a);
          return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
        },
      };
    },
  };
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

function init() {
  const dir = path.join(process.cwd(), 'data');
  fs.mkdirSync(dir, { recursive: true });
  const db = openDatabase(path.join(dir, 'store.db'));
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin','customer')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('json','csv')),
      url TEXT NOT NULL,
      api_key TEXT NOT NULL DEFAULT '',
      auth_header TEXT NOT NULL DEFAULT 'x-api-key',
      items_path TEXT NOT NULL DEFAULT '',
      field_map TEXT NOT NULL DEFAULT '{}',
      currency_rate REAL NOT NULL DEFAULT 1,
      markup_pct REAL NOT NULL DEFAULT 30,
      order_url TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      last_sync_at TEXT,
      last_sync_status TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      brand TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'General',
      short_desc TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      price INTEGER NOT NULL CHECK (price >= 0),
      compare_at INTEGER,
      stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      sku TEXT NOT NULL DEFAULT '',
      images TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      highlights TEXT NOT NULL DEFAULT '[]',
      specs TEXT NOT NULL DEFAULT '[]',
      warranty TEXT NOT NULL DEFAULT '',
      shipping_info TEXT NOT NULL DEFAULT '',
      return_policy TEXT NOT NULL DEFAULT '',
      weight_g INTEGER,
      rating REAL NOT NULL DEFAULT 0,
      rating_count INTEGER NOT NULL DEFAULT 0,
      supplier_rating REAL,
      supplier_reviews TEXT NOT NULL DEFAULT '[]',
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
      supplier_sku TEXT,
      supplier_cost INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1,
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id, supplier_sku) WHERE supplier_id IS NOT NULL;
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      title TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(product_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL CHECK (kind IN ('percent','fixed')),
      value INTEGER NOT NULL CHECK (value > 0),
      min_subtotal INTEGER NOT NULL DEFAULT 0,
      max_uses INTEGER,
      uses INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT UNIQUE,
      access_token TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      ship_address TEXT NOT NULL,
      subtotal INTEGER NOT NULL,
      discount INTEGER NOT NULL DEFAULT 0,
      shipping INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL,
      coupon_code TEXT,
      status TEXT NOT NULL DEFAULT 'pending_payment',
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      payment_method TEXT NOT NULL DEFAULT '',
      payment_ref TEXT,
      provider_order TEXT,
      tracking_number TEXT,
      tracking_url TEXT,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      paid_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      sku TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      unit_price INTEGER NOT NULL,
      qty INTEGER NOT NULL CHECK (qty > 0),
      line_total INTEGER NOT NULL,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
      supplier_sku TEXT,
      unit_cost INTEGER,
      fulfilment TEXT NOT NULL DEFAULT 'own',
      supplier_ref TEXT
    );
    CREATE TABLE IF NOT EXISTS order_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      at TEXT NOT NULL DEFAULT (datetime('now')),
      label TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);
  `);

  if (db.prepare('SELECT COUNT(*) AS c FROM users').get().c === 0) {
    const ins = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)');
    ins.run('Store Admin', 'admin@lumina.local', bcrypt.hashSync('Admin@12345', 10), 'admin');
    ins.run('Demo Customer', 'customer@lumina.local', bcrypt.hashSync('Customer@12345', 10), 'customer');
  }

  if (db.prepare('SELECT COUNT(*) AS c FROM products').get().c === 0) {
    const ins = db.prepare(`INSERT INTO products (slug, name, brand, category, short_desc, description, price, compare_at, stock, sku, images, highlights, specs, warranty, shipping_info, return_policy, weight_g, featured)
      VALUES (@slug,@name,@brand,@category,@short,@description,@price,@compare,@stock,@sku,@images,@highlights,@specs,@warranty,@ship,@ret,@weight,@featured)`);
    db.exec('BEGIN');
    try {
      SEED_PRODUCTS.forEach((p, i) => {
        ins.run({
          slug: slugify(p.name), name: p.name, brand: p.brand, category: p.category, short: p.short, description: p.description,
          price: p.price * 100, compare: p.compare ? p.compare * 100 : null, stock: p.stock, sku: `LUM-${1000 + i}`,
          images: JSON.stringify([`emoji:${p.emoji}|${p.c[0]}|${p.c[1]}`]), highlights: JSON.stringify(p.highlights), specs: JSON.stringify(p.specs),
          warranty: p.warranty, ship: SHIPPING_DEFAULT, ret: RETURNS_DEFAULT, weight: p.weight, featured: p.featured,
        });
      });
      db.prepare("INSERT INTO suppliers (name, kind, url, api_key, items_path, currency_rate, markup_pct, order_url) VALUES (?,?,?,?,?,?,?,?)").run(
        'Demo Supplier (built-in test feed)', 'json', 'mock://demo/products', 'demo-supplier-key', 'products', 85, 35, 'mock://demo/orders' /* feed prices are USD: set the rate to today's USD to INR rate */
      );
      db.prepare("INSERT INTO coupons (code, kind, value, min_subtotal) VALUES ('WELCOME10','percent',10,50000)").run();
      db.prepare("INSERT INTO coupons (code, kind, value, min_subtotal) VALUES ('FLAT200','fixed',20000,150000)").run();
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  return db;
}

export function getDb() {
  if (!globalThis.__storeDb) globalThis.__storeDb = init();
  return globalThis.__storeDb;
}

// Run fn inside an immediate transaction (rolls back if it throws)
export function transaction(fn) {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    const r = fn(db);
    db.exec('COMMIT');
    return r;
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch {}
    throw e;
  }
}

export { slugify };

/* ---------------- Settings ---------------- */
const DEFAULT_SETTINGS = {
  store_name: 'Lumina',
  tagline: 'Thoughtfully chosen goods, delivered.',
  currency_symbol: '₹',
  shipping_fee: '4900',
  free_shipping_over: '49900',
  cod_enabled: '1',
  low_stock_threshold: '5',
  support_email: 'support@lumina.local',
};

export function getSettings() {
  const rows = getDb().prepare('SELECT key, value FROM settings').all();
  const s = { ...DEFAULT_SETTINGS };
  for (const r of rows) s[r.key] = r.value;
  return {
    ...s,
    shipping_fee: Number(s.shipping_fee),
    free_shipping_over: Number(s.free_shipping_over),
    cod_enabled: s.cod_enabled === '1',
    low_stock_threshold: Number(s.low_stock_threshold),
  };
}

export function saveSettings(patch) {
  const up = getDb().prepare('INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  for (const [k, v] of Object.entries(patch)) if (k in DEFAULT_SETTINGS) up.run(k, String(v));
}

export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);
