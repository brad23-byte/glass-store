import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, MapPin, CreditCard, ExternalLink } from 'lucide-react';
import { getOrderByNumber, canViewOrder } from '@/lib/orders';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/db';
import { paymentMethods } from '@/lib/payments';
import { ProductImage } from '@/components/ui';
import { StatusChip, Timeline, PayPending, PrintButton } from '@/components/OrderBits';
import { PAY, METHOD } from '@/lib/status';
import { fmt } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your order', robots: { index: false } };

export default async function OrderPage({ params, searchParams }) {
  const o = getOrderByNumber(params.number);
  const session = await getSession();
  const token = typeof searchParams.token === 'string' ? searchParams.token : '';
  if (!o || !canViewOrder(o, session, token)) notFound();
  const s = getSettings();
  const m = paymentMethods(s);
  const a = o.ship_address;
  const justPlaced = o.status !== 'pending_payment' && Date.now() - new Date(o.created_at + 'Z').getTime() < 10 * 60 * 1000;

  return (
    <div className="mx-auto max-w-4xl px-3 pt-8 sm:px-5 sm:pt-12">
      {justPlaced && (
        <div className="glass animate-pop-in mb-6 flex items-center gap-4 !rounded-3xl p-6">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ok/20 text-ok"><CheckCircle2 size={30} /></span>
          <div><h1 className="text-2xl font-extrabold text-ink">Thank you, {o.name.split(' ')[0]}!</h1><p className="text-ink2">Your order is confirmed. A receipt is shown below{o.payment_status === 'cod' ? ': keep the cash ready for delivery' : ''}.</p></div>
        </div>
      )}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm text-muted">Order</p><h2 className="text-3xl font-extrabold text-ink">{o.number}</h2><p className="text-sm text-muted">Placed {new Date(o.created_at + 'Z').toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p></div>
        <div className="flex items-center gap-2"><StatusChip status={o.status} /><PrintButton /></div>
      </div>

      <div className="space-y-5">
        <section className="glass !rounded-3xl p-6"><Timeline order={o} />
          {o.tracking_number && <p className="mt-5 rounded-2xl bg-tint/10 p-3 text-sm text-ink2">Tracking number <b className="text-ink">{o.tracking_number}</b>{o.tracking_url && <> · <a href={o.tracking_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-accent2">Track package <ExternalLink size={13} /></a></>}</p>}
        </section>

        {o.status === 'pending_payment' && <PayPending order={{ number: o.number, total: o.total, payment_method: o.payment_method }} token={token || o.access_token} methods={{ razorpay: m.razorpay, demo: m.demo }} storeName={s.store_name} symbol={s.currency_symbol} />}

        <section className="glass !rounded-3xl p-6">
          <h3 className="mb-4 text-lg font-bold text-ink">Items</h3>
          <ul className="divide-y divide-tint/10">
            {o.items.map((i) => (
              <li key={i.id} className="flex items-center gap-4 py-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl"><ProductImage src={i.image} className="h-16 w-16 !text-3xl" /></div>
                <div className="min-w-0 flex-1"><p className="font-semibold text-ink">{i.name}</p><p className="text-sm text-muted">{i.qty} × {fmt(i.unit_price, s.currency_symbol)}</p></div>
                <span className="font-bold text-ink">{fmt(i.line_total, s.currency_symbol)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 border-t border-tint/15 pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="text-ink">{fmt(o.subtotal, s.currency_symbol)}</dd></div>
            {o.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Discount {o.coupon_code ? `(${o.coupon_code})` : ''}</dt><dd className="text-ok">-{fmt(o.discount, s.currency_symbol)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd className="text-ink">{o.shipping ? fmt(o.shipping, s.currency_symbol) : 'Free'}</dd></div>
            <div className="flex justify-between pt-2 text-xl font-extrabold"><dt className="text-ink">Total</dt><dd className="text-ink">{fmt(o.total, s.currency_symbol)}</dd></div>
          </dl>
        </section>

        <div className="grid gap-5 sm:grid-cols-2">
          <section className="glass !rounded-3xl p-6"><p className="mb-2 flex items-center gap-2 font-bold text-ink"><MapPin size={17} className="text-accent2" /> Delivery address</p>
            <p className="text-sm leading-relaxed text-ink2">{o.name}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.state} {a.pin}<br />{a.country}<br />{o.phone}</p></section>
          <section className="glass !rounded-3xl p-6"><p className="mb-2 flex items-center gap-2 font-bold text-ink"><CreditCard size={17} className="text-accent2" /> Payment</p>
            <p className="text-sm text-ink2">{PAY[o.payment_status] || o.payment_status}{o.payment_method ? ` · ${METHOD[o.payment_method] || o.payment_method}` : ''}</p>
            {o.payment_ref && <p className="mt-1 text-xs text-muted">Reference {o.payment_ref}</p>}</section>
        </div>

        <section className="glass !rounded-3xl p-6">
          <h3 className="mb-3 text-lg font-bold text-ink">Activity</h3>
          <ol className="space-y-3 border-l border-tint/20 pl-5">
            {o.events.map((e) => (<li key={e.id} className="relative text-sm"><span className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-accent to-accent2" /><p className="font-semibold text-ink">{e.label}</p><p className="text-xs text-muted">{new Date(e.at + 'Z').toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p></li>))}
          </ol>
        </section>
        <p className="text-center text-sm text-muted">Need help? Write to <b className="text-ink2">{s.support_email}</b> with your order number. <Link href="/shop" className="font-semibold text-accent2">Continue shopping</Link></p>
      </div>
    </div>
  );
}
