'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, Lock, ShoppingBag } from 'lucide-react';
import { useCart, useToast } from './Providers';
import useCartPricing from './useCartPricing';
import PaymentSlot from './PaymentSlot';
import { ProductImage } from './ui';
import { payOrder, validateTestCard } from './payClient';
import { fmt } from '@/lib/money';

const STATES = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'];

export default function CheckoutForm({ methods, symbol, storeName, prefill, initialCoupon }) {
  const router = useRouter();
  const cart = useCart();
  const toast = useToast();
  const [coupon, setCoupon] = useState(initialCoupon || '');
  const [applied, setApplied] = useState(initialCoupon || '');
  const { data } = useCartPricing(applied);
  const first = methods.razorpay ? 'razorpay' : methods.demo ? 'demo' : methods.cod ? 'cod' : '';
  const [method, setMethod] = useState(first);
  const [f, setF] = useState({ name: prefill.name || '', email: prefill.email || '', phone: '', line1: '', line2: '', city: '', state: 'Punjab', pin: '' });
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => { if (!method) setMethod(first); }, [first, method]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!cart.items.length) return setError('Your cart is empty');
    if (data?.problems) return setError('Some items in your cart changed. Please review your cart.');
    if (method === 'demo') {
      const msg = validateTestCard(card);
      if (msg) return setError(msg);
    }
    setBusy(true);
    let order;
    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: cart.items, coupon: data?.coupon ? applied : '', method, name: f.name, email: f.email, phone: f.phone, address: { line1: f.line1, line2: f.line2, city: f.city, state: f.state, pin: f.pin } }),
      });
      order = await res.json();
      if (!res.ok) throw new Error(order.error || 'Could not place the order');
    } catch (err) {
      setBusy(false);
      return setError(err.message);
    }
    const url = `/order/${order.number}?token=${order.token}`;
    if (method === 'cod') {
      cart.clear();
      return router.push(url);
    }
    try {
      const r = await payOrder({ number: order.number, token: order.token, method, card, storeName });
      if (r.paid) { cart.clear(); toast('Payment successful'); return router.push(url); }
      toast('Payment not completed. You can retry from your order.', 'warn');
      cart.clear();
      router.push(url);
    } catch (err) {
      setBusy(false);
      setError(`${err.message}. Your order ${order.number} is saved for 30 minutes: you can retry payment from the order page.`);
      cart.clear();
      setTimeout(() => router.push(url), 3500);
    }
  }

  if (!cart.items.length && !busy) {
    return (
      <div className="glass mx-auto flex max-w-xl flex-col items-center gap-3 !rounded-[2rem] px-6 py-20 text-center">
        <ShoppingBag size={44} className="text-muted" />
        <h2 className="text-2xl font-bold text-ink">Your cart is empty</h2>
        <Link href="/shop" className="btn-primary mt-2">Start shopping</Link>
      </div>
    );
  }
  const lines = data?.lines || [];

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_26rem]">
      <div className="space-y-6">
        <section className="glass space-y-4 !rounded-3xl p-6">
          <h2 className="text-lg font-bold text-ink">Contact</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="name">Full name</label><input id="name" className="input" required autoComplete="name" value={f.name} onChange={set('name')} /></div>
            <div><label className="label" htmlFor="phone">Phone</label><input id="phone" className="input" required inputMode="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} /></div>
          </div>
          <div><label className="label" htmlFor="email">Email (for your receipt)</label><input id="email" className="input" type="email" required autoComplete="email" value={f.email} onChange={set('email')} /></div>
        </section>

        <section className="glass space-y-4 !rounded-3xl p-6">
          <h2 className="text-lg font-bold text-ink">Delivery address</h2>
          <div><label className="label" htmlFor="l1">Address</label><input id="l1" className="input" required autoComplete="address-line1" value={f.line1} onChange={set('line1')} placeholder="House / flat, street" /></div>
          <div><label className="label" htmlFor="l2">Landmark (optional)</label><input id="l2" className="input" autoComplete="address-line2" value={f.line2} onChange={set('line2')} /></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="label" htmlFor="city">City</label><input id="city" className="input" required autoComplete="address-level2" value={f.city} onChange={set('city')} /></div>
            <div><label className="label" htmlFor="state">State</label><select id="state" className="input" value={f.state} onChange={set('state')}>{STATES.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div><label className="label" htmlFor="pin">PIN code</label><input id="pin" className="input" required inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="postal-code" value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, '') })} /></div>
          </div>
        </section>

        <section className="glass !rounded-3xl p-6"><PaymentSlot methods={methods} method={method} setMethod={setMethod} card={card} setCard={setCard} /></section>
      </div>

      <aside className="glass h-fit space-y-4 !rounded-3xl p-6 lg:sticky lg:top-24">
        <h2 className="text-xl font-bold text-ink">Order summary</h2>
        <ul className="max-h-64 space-y-3 overflow-y-auto pr-1">
          {lines.map((l) => (
            <li key={l.id} className="flex items-center gap-3">
              {l.product && <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl"><ProductImage src={l.product.image} className="h-14 w-14 !text-2xl" /><span className="absolute right-0.5 top-0.5 rounded-full bg-black/70 px-1.5 text-[10px] font-bold text-white">{l.qty}</span></div>}
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink">{l.product?.name}</p>{l.problem && <p className="text-xs text-warn">{l.problem}</p>}</div>
              <span className="text-sm font-semibold text-ink">{l.product ? fmt(l.product.price * l.qty, symbol) : ''}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input className="input !py-2" placeholder="Discount code" value={coupon} onChange={(e) => setCoupon(e.target.value)} aria-label="Discount code" />
          <button type="button" className="btn-glass !py-2" onClick={() => setApplied(coupon.trim())}>Apply</button>
        </div>
        {data?.couponError && <p className="text-sm text-warn">{data.couponError}</p>}
        {data?.coupon && <p className="text-sm text-ok">Code {data.coupon.code} applied</p>}
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="text-ink">{fmt(data?.subtotal || 0, symbol)}</dd></div>
          {data?.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd className="text-ok">-{fmt(data.discount, symbol)}</dd></div>}
          <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd className="text-ink">{data?.shipping ? fmt(data.shipping, symbol) : 'Free'}</dd></div>
          <div className="flex justify-between border-t border-tint/15 pt-3 text-xl font-bold"><dt className="text-ink">Total</dt><dd className="text-ink">{fmt(data?.total || 0, symbol)}</dd></div>
        </dl>
        {error && <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
        <button type="submit" disabled={busy || !method || !data || data.problems} className="btn-primary w-full !py-4 !text-base">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Lock size={16} />} {method === 'cod' ? 'Place order' : `Pay ${fmt(data?.total || 0, symbol)}`}
        </button>
        <p className="text-center text-xs text-muted">By placing your order you agree to our returns policy.</p>
      </aside>
    </form>
  );
}
