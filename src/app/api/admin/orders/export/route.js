import { adminOrNull } from '@/lib/auth';
import { getDb } from '@/lib/db';

const q = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // block spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET() {
  if (!(await adminOrNull())) return new Response('Admin access needed', { status: 403 });
  const rows = getDb().prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 5000').all();
  const head = ['Order', 'Date', 'Customer', 'Email', 'Phone', 'Items', 'Subtotal', 'Discount', 'Shipping', 'Total', 'Status', 'Payment status', 'Payment method', 'Payment ref', 'City', 'PIN'];
  const lines = [head.map(q).join(',')];
  for (const o of rows) {
    const a = JSON.parse(o.ship_address || '{}');
    const items = getDb().prepare('SELECT name, qty FROM order_items WHERE order_id = ?').all(o.id).map((i) => `${i.name} x${i.qty}`).join('; ');
    lines.push([o.number, o.created_at, o.name, o.email, o.phone, items, o.subtotal / 100, o.discount / 100, o.shipping / 100, o.total / 100, o.status, o.payment_status, o.payment_method, o.payment_ref || '', a.city || '', a.pin || ''].map(q).join(','));
  }
  return new Response(lines.join('\n'), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="orders.csv"' } });
}
