const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const rupeesToPaise = (v) => Math.round(Number(v) * 100);

export function cleanAccount(b) {
  const name = str(b.name, 60);
  const email = str(b.email, 120).toLowerCase();
  const password = typeof b.password === 'string' ? b.password : '';
  if (name.length < 2) return { error: 'Enter your name' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email address' };
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return { error: 'Password needs 8 or more characters with at least one letter and one number' };
  if (password.length > 100) return { error: 'Password is too long' };
  return { value: { name, email, password } };
}

const okImage = (u) => typeof u === 'string' && u.length < 600 && (/^https:\/\//i.test(u) || /^emoji:/.test(u) || /^\/[A-Za-z0-9_\-./]+$/.test(u));

export function cleanProduct(b) {
  const lines = (v) => (Array.isArray(v) ? v : typeof v === 'string' ? v.split('\n') : []).map((x) => str(x, 300)).filter(Boolean);
  const name = str(b.name, 160);
  const price = rupeesToPaise(b.price);
  const compare = b.compare_at === '' || b.compare_at == null ? null : rupeesToPaise(b.compare_at);
  const stock = Math.trunc(Number(b.stock));
  const images = lines(b.images).slice(0, 10);
  if (name.length < 2) return { error: 'Enter a product name' };
  if (!Number.isFinite(price) || price < 0) return { error: 'Enter a valid price' };
  if (compare !== null && (!Number.isFinite(compare) || compare < 0)) return { error: 'Enter a valid compare-at price' };
  if (!Number.isInteger(stock) || stock < 0) return { error: 'Stock must be a whole number, 0 or more' };
  if (images.some((i) => !okImage(i))) return { error: 'Images must be https:// links (or emoji: codes)' };
  const specs = lines(b.specs).map((l) => {
    const i = l.indexOf(':');
    return i > 0 ? [l.slice(0, i).trim().slice(0, 60), l.slice(i + 1).trim().slice(0, 200)] : null;
  }).filter(Boolean);
  const w = b.weight_g === '' || b.weight_g == null ? null : Math.trunc(Number(b.weight_g));
  return {
    value: {
      name, brand: str(b.brand, 60), category: str(b.category, 60) || 'General', short_desc: str(b.short_desc, 200), description: str(b.description, 5000),
      price, compare_at: compare, stock, sku: str(b.sku, 60), images: JSON.stringify(images.length ? images : ['emoji:📦|#64748b|#94a3b8']),
      tags: JSON.stringify(lines(b.tags).slice(0, 12)), highlights: JSON.stringify(lines(b.highlights).slice(0, 10)), specs: JSON.stringify(specs.slice(0, 30)),
      warranty: str(b.warranty, 200), shipping_info: str(b.shipping_info, 600), return_policy: str(b.return_policy, 600),
      weight_g: Number.isFinite(w) && w >= 0 ? w : null, is_active: b.is_active === false || b.is_active === 0 ? 0 : 1, featured: b.featured ? 1 : 0,
    },
  };
}

export function cleanSupplier(b, existing) {
  const name = str(b.name, 80);
  const kind = b.kind === 'csv' ? 'csv' : 'json';
  const url = str(b.url, 500);
  const order_url = str(b.order_url, 500);
  const header = str(b.auth_header, 40) || 'x-api-key';
  const rate = Number(b.currency_rate);
  const markup = Number(b.markup_pct);
  if (name.length < 2) return { error: 'Enter a supplier name' };
  if (!/^(https:\/\/|http:\/\/|mock:\/\/demo\/)/i.test(url)) return { error: 'The product feed address must start with https://' };
  if (order_url && !/^(https:\/\/|http:\/\/|mock:\/\/demo\/)/i.test(order_url)) return { error: 'The order address must start with https://' };
  if (!/^[A-Za-z0-9-]+$/.test(header)) return { error: 'Header name can only contain letters, numbers and dashes' };
  if (!(rate > 0 && rate < 100000)) return { error: 'Currency rate must be above 0 (for example 1 if the supplier already uses your currency)' };
  if (!(markup >= 0 && markup <= 500)) return { error: 'Markup must be between 0 and 500%' };
  let map = {};
  if (b.field_map && String(b.field_map).trim()) {
    try {
      const m = typeof b.field_map === 'string' ? JSON.parse(b.field_map) : b.field_map;
      if (!m || typeof m !== 'object' || Array.isArray(m)) throw new Error();
      for (const [k, v] of Object.entries(m)) if (typeof v === 'string' && v.length < 80) map[k] = v;
    } catch { return { error: 'Field map must be valid JSON like {"name":"title"}' }; }
  }
  const api_key = typeof b.api_key === 'string' && b.api_key.trim() ? b.api_key.trim().slice(0, 300) : existing?.api_key || '';
  return { value: { name, kind, url, api_key, auth_header: header, items_path: str(b.items_path, 80), field_map: JSON.stringify(map), currency_rate: rate, markup_pct: markup, order_url, active: b.active === false ? 0 : 1 } };
}

export function cleanCoupon(b) {
  const code = str(b.code, 20).toUpperCase();
  const kind = b.kind === 'fixed' ? 'fixed' : 'percent';
  const value = kind === 'percent' ? Math.trunc(Number(b.value)) : rupeesToPaise(b.value);
  const min = b.min_subtotal === '' || b.min_subtotal == null ? 0 : rupeesToPaise(b.min_subtotal);
  const max = b.max_uses === '' || b.max_uses == null ? null : Math.trunc(Number(b.max_uses));
  if (!/^[A-Z0-9]{3,20}$/.test(code)) return { error: 'Code must be 3 to 20 letters or numbers' };
  if (!Number.isFinite(value) || value <= 0 || (kind === 'percent' && value > 90)) return { error: kind === 'percent' ? 'Percent must be 1 to 90' : 'Enter a discount amount' };
  if (!Number.isFinite(min) || min < 0) return { error: 'Enter a valid minimum order' };
  if (max !== null && (!Number.isInteger(max) || max < 1)) return { error: 'Max uses must be 1 or more' };
  const exp = str(b.expires_at, 10);
  if (exp && !/^\d{4}-\d{2}-\d{2}$/.test(exp)) return { error: 'Expiry must be a date' };
  return { value: { code, kind, value, min_subtotal: min, max_uses: max, expires_at: exp || null, active: b.active === false ? 0 : 1 } };
}
