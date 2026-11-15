import Link from 'next/link';
import { Download, Search } from 'lucide-react';
import { listOrdersAdmin } from '@/lib/orders';
import { getSettings } from '@/lib/db';
import { StatusChip } from '@/components/OrderBits';
import { PAY } from '@/lib/status';
import { fmt } from '@/lib/money';

export const dynamic = 'force-dynamic';

const STATUSES = ['pending_payment', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

export default function AdminOrders({ searchParams }) {
  const s = getSettings();
  const status = String(searchParams.status || '');
  const pay = String(searchParams.pay || '');
  const q = String(searchParams.q || '').slice(0, 60);
  const page = Math.max(1, Number(searchParams.page) || 1);
  const { items, total, pages } = listOrdersAdmin({ status, pay, q, page });
  const href = (over) => { const p = new URLSearchParams({ status, pay, q, ...over }); for (const [k, v] of [...p]) if (!v) p.delete(k); const str = p.toString(); return `/admin/orders${str ? `?${str}` : ''}`; };
  const payTone = { paid: 'bg-ok/15 text-ok', cod: 'bg-accent2/15 text-accent2', unpaid: 'bg-warn/15 text-warn', failed: 'bg-danger/15 text-danger', refunded: 'bg-muted/20 text-ink2' };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-extrabold text-ink sm:text-4xl">Purchases</h1><p className="text-muted">{total} orders</p></div><a href="/api/admin/orders/export" className="btn-glass"><Download size={16} /> Export CSV</a></div>

      <form className="glass flex flex-wrap items-center gap-3 !rounded-3xl p-4">
        <div className="relative min-w-52 flex-1"><Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input name="q" defaultValue={q} placeholder="Order number, name, email or phone" className="input pl-10" aria-label="Search orders" /></div>
        <select name="status" defaultValue={status} className="input !w-auto" aria-label="Order status"><option value="">All statuses</option>{STATUSES.map((x) => <option key={x} value={x}>{x.replace('_', ' ')}</option>)}</select>
        <select name="pay" defaultValue={pay} className="input !w-auto" aria-label="Payment status"><option value="">All payments</option>{Object.entries(PAY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <button className="btn-primary">Filter</button>
        {(status || pay || q) && <Link href="/admin/orders" className="text-sm font-semibold text-accent2">Clear</Link>}
      </form>

      <section className="glass overflow-hidden !rounded-3xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted"><tr>{['Order', 'Date', 'Customer', 'Items', 'Total', 'Payment', 'Status'].map((h) => <th key={h} className="px-5 py-4 font-semibold">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-tint/10">
              {items.map((o) => (
                <tr key={o.id} className="transition hover:bg-tint/5">
                  <td className="px-5 py-4"><Link href={`/admin/orders/${o.id}`} className="font-bold text-accent2 hover:underline">{o.number}</Link></td>
                  <td className="px-5 py-4 text-ink2">{new Date(o.created_at + 'Z').toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className="px-5 py-4"><p className="font-medium text-ink">{o.name}</p><p className="text-xs text-muted">{o.email}</p></td>
                  <td className="px-5 py-4 text-ink2">{o.item_count}</td>
                  <td className="px-5 py-4 font-bold text-ink">{fmt(o.total, s.currency_symbol)}</td>
                  <td className="px-5 py-4"><span className={`chip ${payTone[o.payment_status] || ''}`}>{PAY[o.payment_status] || o.payment_status}</span></td>
                  <td className="px-5 py-4"><StatusChip status={o.status} /></td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={7} className="px-5 py-16 text-center text-muted">No orders match.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      {pages > 1 && <nav className="flex justify-center gap-2" aria-label="Pages">{Array.from({ length: pages }, (_, i) => i + 1).map((n) => <Link key={n} href={href({ page: String(n) })} className={`btn !px-4 !py-2 ${n === page ? 'btn-primary' : 'btn-glass'}`}>{n}</Link>)}</nav>}
    </>
  );
}
