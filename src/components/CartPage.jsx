'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from './Providers';
import useCartPricing from './useCartPricing';
import { ProductImage } from './ui';
import { fmt } from '@/lib/money';

export default function CartPage({ symbol = '₹' }) {
  const cart = useCart();
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState('');
  const { data, loading } = useCartPricing(applied);

  if (cart.items.length === 0) {
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
    <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-3">
        {loading && !data && [0, 1].map((i) => <div key={i} className="skeleton h-32" />)}
        {lines.map((l) => (
          <div key={l.id} className="glass flex gap-4 !rounded-3xl p-4">
            {l.product && <Link href={`/product/${l.product.slug}`} className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl"><ProductImage src={l.product.image} alt={l.product.name} className="h-28 w-28 !text-5xl" /></Link>}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">{l.product?.brand}</p>
              <p className="font-semibold text-ink">{l.product?.name || 'Unavailable item'}</p>
              {l.problem && <p className="text-sm font-medium text-warn">{l.problem}</p>}
              <p className="mt-1 text-sm text-muted">{l.product ? fmt(l.product.price, symbol) : ''} each</p>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1 rounded-full bg-tint/10 p-1">
                  <button type="button" onClick={() => cart.set(l.id, l.qty - 1)} className="rounded-full p-2 text-ink hover:bg-tint/15" aria-label="Decrease quantity"><Minus size={14} /></button>
                  <span className="w-7 text-center font-semibold text-ink">{l.qty}</span>
                  <button type="button" onClick={() => cart.set(l.id, l.qty + 1)} disabled={l.product && l.qty >= Math.min(10, l.product.stock)} className="rounded-full p-2 text-ink hover:bg-tint/15 disabled:opacity-40" aria-label="Increase quantity"><Plus size={14} /></button>
                </div>
                <div className="flex items-center gap-3"><span className="font-bold text-ink">{l.product ? fmt(l.product.price * l.qty, symbol) : ''}</span><button type="button" onClick={() => cart.remove(l.id)} className="rounded-full p-2 text-muted hover:text-danger" aria-label="Remove item"><Trash2 size={16} /></button></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <aside className="glass h-fit space-y-4 !rounded-3xl p-6 lg:sticky lg:top-24">
        <h2 className="text-xl font-bold text-ink">Order summary</h2>
        <form onSubmit={(e) => { e.preventDefault(); setApplied(code.trim()); }} className="flex gap-2">
          <input className="input !py-2" placeholder="Discount code" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Discount code" />
          <button className="btn-glass !py-2">Apply</button>
        </form>
        {data?.couponError && <p className="text-sm text-warn">{data.couponError}</p>}
        {data?.coupon && <p className="text-sm text-ok">Code {data.coupon.code} applied</p>}
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="text-ink">{fmt(data?.subtotal || 0, symbol)}</dd></div>
          {data?.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd className="text-ok">-{fmt(data.discount, symbol)}</dd></div>}
          <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd className="text-ink">{data?.shipping ? fmt(data.shipping, symbol) : 'Free'}</dd></div>
          <div className="flex justify-between border-t border-tint/15 pt-3 text-lg font-bold"><dt className="text-ink">Total</dt><dd className="text-ink">{fmt(data?.total || 0, symbol)}</dd></div>
        </dl>
        <Link href={`/checkout${applied && data?.coupon ? `?coupon=${encodeURIComponent(applied)}` : ''}`} className={`btn-primary w-full !py-3.5 ${data?.problems ? 'pointer-events-none opacity-50' : ''}`}>Checkout <ArrowRight size={16} /></Link>
        {data?.problems && <p className="text-center text-xs text-warn">Fix the highlighted items to continue.</p>}
      </aside>
    </div>
  );
}
