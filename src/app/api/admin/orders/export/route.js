import { adminOrNull } from '@/lib/auth';
import { getDb } from '@/lib/db';

const q = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // block spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET() {
  if (!(await adminOrNull())) return new Response('Admin access needed', { status: 403 });
  const rows = await getDb().prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 5000').all();
  const head = ['Order', 'Date', 'Customer', 'Email', 'Phone', 'Items', 'Subtotal', 'Discount', 'Shipping', 'Total', 'Supplier cost', 'Gross profit', 'Items without cost', 'Status', 'Payment status', 'Payment method', 'Payment ref', 'City', 'PIN'];
  const lines = [head.map(q).join(',')];
  for (const o of rows) {
    const a = JSON.parse(o.ship_address || '{}');
    const lines_ = await getDb().prepare('SELECT name, qty, unit_cost FROM order_items WHERE order_id = ?').all(o.id);
    const items = lines_.map((i) => `${i.name} x${i.qty}`).join('; ');
    // Supplier cost is only recorded for supplier items. Gross profit = order total less that cost.
    const cost = lines_.reduce((t, i) => t + (i.unit_cost != null ? i.unit_cost * i.qty : 0), 0);
    const noCost = lines_.filter((i) => i.unit_cost == null).length;
    lines.push([o.number, o.created_at, o.name, o.email, o.phone, items, o.subtotal / 100, o.discount / 100, o.shipping / 100, o.total / 100, cost / 100, (o.total - cost) / 100, noCost, o.status, o.payment_status, o.payment_method, o.payment_ref || '', a.city || '', a.pin || ''].map(q).join(','));
  }
  return new Response(lines.join('\n'), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="orders.csv"' } });
}
