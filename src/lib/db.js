import bcrypt from 'bcryptjs';
import { createClient } from '@libsql/client/web';
import { SEED_PRODUCTS, SHIPPING_DEFAULT, RETURNS_DEFAULT } from './seed';

/*
 * Database layer. Every call is async (await it).
 *   - On Vercel (or anywhere TURSO_DATABASE_URL is set): Turso / libSQL in the cloud.
 *   - Locally without TURSO_DATABASE_URL: a file at data/store.db using Node's built-in SQLite (Node 22.5+).
 * Same API in both cases:  getDb().prepare(sql).get/all/run(...)   getDb().exec(sql)   getDb().batch([...])
 * transaction(async (db) => { ... })  runs everything done through `db` atomically.
 */

const TURSO_URL = (process.env.TURSO_DATABASE_URL || '').trim();
const REMOTE = !!TURSO_URL;

const norm = (v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v);
const isNamed = (a) => a.length === 1 && a[0] && typeof a[0] === 'object' && !Array.isArray(a[0]) && !ArrayBuffer.isView(a[0]);

function rowsOf(rs) {
  return rs.rows.map((r) => Object.fromEntries(rs.columns.map((c, i) => [c, r[i]])));
}

/* ---------------- Backends ---------------- */
// Each backend gives: run(sql, args) -> { rows, changes, lastInsertRowid }, execMany(sql), batch(stmts), transaction(fn)

function remoteBackend() {
  if (!globalThis.__storeClient) {
    // The web client talks HTTP, which works in serverless functions.
    const url = TURSO_URL.replace(/^libsql:\/\//, 'https://');
    globalThis.__storeClient = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  const client = globalThis.__storeClient;

  const toStmt = (sql, a) => {
    if (isNamed(a)) {
      const args = {};
      for (const [k, v] of Object.entries(a[0])) args[k] = norm(v);
      return { sql: sql.replace(/@([A-Za-z_]\w*)/g, ':$1'), args };
    }
    return { sql, args: a.map(norm) };
  };
  const shape = (rs) => ({
    rows: rowsOf(rs),
    changes: Number(rs.rowsAffected || 0),
    lastInsertRowid: rs.lastInsertRowid == null ? 0 : Number(rs.lastInsertRowid),
  });
  const runOn = (target) => async (sql, a) => shape(await target.execute(toStmt(sql, a)));

  return {
    run: runOn(client),
    execMany: (sql) => client.executeMultiple(sql),
    batch: async (stmts) => {
      const rs = await client.batch(stmts.map(([sql, ...a]) => toStmt(sql, a)), 'write');
      return rs.map(shape);
    },
    async transaction(makeDb, fn) {
      const tx = await client.transaction('write');
      try {
        const r = await fn(makeDb({
          run: runOn(tx),
          execMany: async (sql) => { for (const s of sql.split(';')) if (s.trim()) await tx.execute(s); },
          batch: async (stmts) => { const out = []; for (const [sql, ...a] of stmts) out.push(shape(await tx.execute(toStmt(sql, a)))); return out; },
        }));
        await tx.commit();
        return r;
      } catch (e) {
        try { await tx.rollback(); } catch {}
        throw e;
      } finally {
        tx.close();
      }
    },
  };
}

function localBackend() {
  if (process.env.VERCEL) {
    throw new Error('TURSO_DATABASE_URL is not set. Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in your Vercel project settings.');
  }
  if (!globalThis.__storeRaw) {
    const fs = process.getBuiltinModule('fs');
    const path = process.getBuiltinModule('path');
    const { DatabaseSync } = process.getBuiltinModule('node:sqlite');
    const dir = path.join(process.cwd(), 'data');
    fs.mkdirSync(dir, { recursive: true });
    const raw = new DatabaseSync(path.join(dir, 'store.db'));
    raw.exec('PRAGMA journal_mode = WAL');
    raw.exec('PRAGMA foreign_keys = ON');
    globalThis.__storeRaw = raw;
  }
  const raw = globalThis.__storeRaw;
  const plain = (r) => (r ? { ...r } : r);
  const run = async (sql, a) => {
    const st = raw.prepare(sql);
    const args = isNamed(a) ? [Object.fromEntries(Object.entries(a[0]).map(([k, v]) => [k, norm(v)]))] : a.map(norm);
    if (/^\s*(SELECT|WITH|PRAGMA)\b/i.test(sql)) return { rows: st.all(...args).map(plain), changes: 0, lastInsertRowid: 0 };
    const r = st.run(...args);
    return { rows: [], changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
  };
  const batch = async (stmts) => {
    const out = [];
    raw.exec('BEGIN');
    try {
      for (const [sql, ...a] of stmts) out.push(await run(sql, a));
      raw.exec('COMMIT');
    } catch (e) {
      try { raw.exec('ROLLBACK'); } catch {}
      throw e;
    }
    return out;
  };
  // One connection is shared, so transactions take turns.
  if (!globalThis.__storeLock) globalThis.__storeLock = Promise.resolve();
  return {
    run,
    execMany: async (sql) => raw.exec(sql),
    batch,
    transaction(makeDb, fn) {
      const job = globalThis.__storeLock.then(async () => {
        raw.exec('BEGIN IMMEDIATE');
        try {
          const r = await fn(makeDb({ run, execMany: async (sql) => raw.exec(sql), batch: async (stmts) => { const o = []; for (const [sql, ...a] of stmts) o.push(await run(sql, a)); return o; } }));
          raw.exec('COMMIT');
          return r;
        } catch (e) {
          try { raw.exec('ROLLBACK'); } catch {}
          throw e;
        }
      });
      globalThis.__storeLock = job.catch(() => {});
      return job;
    },
  };
}

function backend() {
  if (!globalThis.__storeBackend) globalThis.__storeBackend = REMOTE ? remoteBackend() : localBackend();
  return globalThis.__storeBackend;
}

/* ---------------- Public handle ---------------- */
function makeDb(b, gate) {
  const pre = gate ? () => gate() : () => undefined;
  return {
    prepare(sql) {
      return {
        get: async (...a) => { await pre(); return (await b.run(sql, a)).rows[0]; },
        all: async (...a) => { await pre(); return (await b.run(sql, a)).rows; },
        run: async (...a) => { await pre(); const r = await b.run(sql, a); return { changes: r.changes, lastInsertRowid: r.lastInsertRowid }; },
      };
    },
    exec: async (sql) => { await pre(); return b.execMany(sql); },
    // Run several statements atomically in one round trip: batch([[sql, ...args], ...])
    batch: async (stmts) => { await pre(); return b.batch(stmts); },
  };
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

const SCHEMA = `
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
  `;

async function init() {
  const b = backend();
  const db = makeDb(b, null);
  await db.exec(SCHEMA);

  if ((await db.prepare('SELECT COUNT(*) AS c FROM users').get()).c === 0) {
    await db.batch([
      ['INSERT OR IGNORE INTO users (name, email, password_hash, role) VALUES (?,?,?,?)', 'Store Admin', 'admin@lumina.local', bcrypt.hashSync('Admin@12345', 10), 'admin'],
      ['INSERT OR IGNORE INTO users (name, email, password_hash, role) VALUES (?,?,?,?)', 'Demo Customer', 'customer@lumina.local', bcrypt.hashSync('Customer@12345', 10), 'customer'],
    ]);
  }

  if ((await db.prepare('SELECT COUNT(*) AS c FROM products').get()).c === 0) {
    const insSql = `INSERT OR IGNORE INTO products (slug, name, brand, category, short_desc, description, price, compare_at, stock, sku, images, highlights, specs, warranty, shipping_info, return_policy, weight_g, featured)
      VALUES (@slug,@name,@brand,@category,@short,@description,@price,@compare,@stock,@sku,@images,@highlights,@specs,@warranty,@ship,@ret,@weight,@featured)`;
    const stmts = SEED_PRODUCTS.map((p, i) => [insSql, {
      slug: slugify(p.name), name: p.name, brand: p.brand, category: p.category, short: p.short, description: p.description,
      price: p.price * 100, compare: p.compare ? p.compare * 100 : null, stock: p.stock, sku: `LUM-${1000 + i}`,
      images: JSON.stringify([`emoji:${p.emoji}|${p.c[0]}|${p.c[1]}`]), highlights: JSON.stringify(p.highlights), specs: JSON.stringify(p.specs),
      warranty: p.warranty, ship: SHIPPING_DEFAULT, ret: RETURNS_DEFAULT, weight: p.weight, featured: p.featured,
    }]);
    stmts.push(["INSERT INTO suppliers (name, kind, url, api_key, items_path, currency_rate, markup_pct, order_url) VALUES (?,?,?,?,?,?,?,?)",
      'Demo Supplier (built-in test feed)', 'json', 'mock://demo/products', 'demo-supplier-key', 'products', 85, 35, 'mock://demo/orders']);
    stmts.push(["INSERT OR IGNORE INTO coupons (code, kind, value, min_subtotal) VALUES ('WELCOME10','percent',10,50000)"]);
    stmts.push(["INSERT OR IGNORE INTO coupons (code, kind, value, min_subtotal) VALUES ('FLAT200','fixed',20000,150000)"]);
    await db.batch(stmts);
  }
}

// Tables and sample data are created once per server instance, before the first query.
function ready() {
  if (!globalThis.__storeReady) {
    globalThis.__storeReady = init().catch((e) => { globalThis.__storeReady = null; throw e; });
  }
  return globalThis.__storeReady;
}

export function getDb() {
  return makeDb(backend(), ready);
}

// Run fn(db) atomically (rolls back if it throws). Use the `db` it receives for every query inside.
export async function transaction(fn) {
  await ready();
  return backend().transaction((tb) => makeDb(tb, null), fn);
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

export async function getSettings(db = getDb()) {
  const rows = await db.prepare('SELECT key, value FROM settings').all();
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

export async function saveSettings(patch) {
  const sql = 'INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value';
  const stmts = Object.entries(patch).filter(([k]) => k in DEFAULT_SETTINGS).map(([k, v]) => [sql, k, String(v)]);
  if (stmts.length) await getDb().batch(stmts);
}

export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);
