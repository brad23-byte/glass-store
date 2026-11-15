import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, User, MapPin, CreditCard, Mail, Phone } from 'lucide-react';
import { getOrder } from '@/lib/orders';
import { getDb, getSettings } from '@/lib/db';
import { ProductImage } from '@/components/ui';
import { StatusChip } from '@/components/OrderBits';
import OrderActions from '@/components/OrderActions';
import { PAY, METHOD } from '@/lib/status';
import { fmt } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default function AdminOrder({ params }) {
  const o = getOrder(Number(params.id));
  if (!o) notFound();
  const sym = getSettings().currency_symbol;
  const a = o.ship_address;
  const sup = new Map();
  for (const i of o.items) {
    if (!i.supplier_id) continue;
    if (!sup.has(i.supplier_id)) {
      const s = getDb().prepare('SELECT id, name, order_url FROM suppliers WHERE id = ?').get(i.supplier_id);
      sup.set(i.supplier_id, { id: i.supplier_id, name: s?.name || i.supplier_name || 'Supplier', canForward: !!s?.order_url, items: [], pending: 0 });
    }
    const g = sup.get(i.supplier_id);
    g.items.push(i);
    if (i.fulfilment === 'pending_supplier') g.pending += 1;
  }
  const cost = o.items.reduce((t, i) => t + (i.unit_cost != null ? i.unit_cost * i.qty : 0), 0);
  const hasCost = o.items.some((i) => i.unit_cost != null);

  return (
    <>
      <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent2"><ArrowLeft size={15} /> All purchases</Link>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-extrabold text-ink sm:text-4xl">{o.number}</h1><p className="text-muted">{new Date(o.created_at + 'Z').toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p></div><div className="flex gap-2"><StatusChip status={o.status} /><span className="chip bg-tint/10 text-ink2">{PAY[o.payment_status] || o.payment_status}</span></div></div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          <section className="glass !rounded-3xl p-6">
            <h3 className="mb-3 text-lg font-bold text-ink">Items purchased</h3>
            <ul className="divide-y divide-tint/10">
              {o.items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 py-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl"><ProductImage src={i.image} className="h-14 w-14 !text-2xl" /></div>
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold text-ink">{i.name}</p><p className="text-xs text-muted">{i.sku}{i.supplier_name ? ` · ${i.supplier_name}` : ''}</p></div>
                  <p className="text-sm text-muted">{i.qty} × {fmt(i.unit_price, sym)}</p><p className="w-24 text-right font-bold text-ink">{fmt(i.line_total, sym)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-tint/15 pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="text-ink">{fmt(o.subtotal, sym)}</dd></div>
              {o.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Discount {o.coupon_code ? `(${o.coupon_code})` : ''}</dt><dd className="text-ok">-{fmt(o.discount, sym)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd className="text-ink">{o.shipping ? fmt(o.shipping, sym) : 'Free'}</dd></div>
              <div className="flex justify-between pt-2 text-xl font-extrabold"><dt className="text-ink">Total</dt><dd className="text-ink">{fmt(o.total, sym)}</dd></div>
              {hasCost && <div className="flex justify-between border-t border-tint/10 pt-2 text-xs text-muted"><dt>Supplier cost (private)</dt><dd>{fmt(cost, sym)}</dd></div>}
            </dl>
          </section>
          <OrderActions order={{ id: o.id, status: o.status, payment_status: o.payment_status, tracking_number: o.tracking_number, tracking_url: o.tracking_url, note: o.note }} supplierGroups={[...sup.values()]} />
        </div>

        <aside className="space-y-5">
          <section className="glass !rounded-3xl p-6 text-sm"><p className="mb-2 flex items-center gap-2 font-bold text-ink"><User size={16} className="text-accent2" /> Customer</p><p className="font-semibold text-ink">{o.name}</p><p className="mt-1 flex items-center gap-1.5 text-ink2"><Mail size={13} /> {o.email}</p><p className="flex items-center gap-1.5 text-ink2"><Phone size={13} /> {o.phone}</p><p className="mt-1 text-xs text-muted">{o.user_id ? 'Registered customer' : 'Guest checkout'}</p></section>
          <section className="glass !rounded-3xl p-6 text-sm"><p className="mb-2 flex items-center gap-2 font-bold text-ink"><MapPin size={16} className="text-accent2" /> Ship to</p><p className="leading-relaxed text-ink2">{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.state} {a.pin}<br />{a.country}</p></section>
          <section className="glass !rounded-3xl p-6 text-sm"><p className="mb-2 flex items-center gap-2 font-bold text-ink"><CreditCard size={16} className="text-accent2" /> Payment</p><p className="text-ink2">{PAY[o.payment_status] || o.payment_status}</p><p className="text-ink2">{METHOD[o.payment_method] || o.payment_method || '-'}</p>{o.payment_ref && <p className="mt-1 break-all text-xs text-muted">Ref {o.payment_ref}</p>}{o.paid_at && <p className="text-xs text-muted">Paid {new Date(o.paid_at + 'Z').toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>}</section>
          <section className="glass !rounded-3xl p-6"><p className="mb-3 font-bold text-ink">Activity</p><ol className="space-y-3 border-l border-tint/20 pl-4 text-sm">{o.events.map((e) => (<li key={e.id} className="relative"><span className="absolute -left-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-accent to-accent2" /><p className="font-semibold text-ink">{e.label}</p>{e.detail && <p className="text-xs text-ink2">{e.detail}</p>}<p className="text-xs text-muted">{new Date(e.at + 'Z').toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p></li>))}</ol></section>
        </aside>
      </div>
    </>
  );
}
