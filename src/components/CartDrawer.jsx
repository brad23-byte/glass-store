'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { X, Minus, Plus, Trash2, ShoppingBag, Truck } from 'lucide-react';
import { useCart } from './Providers';
import useCartPricing from './useCartPricing';
import { ProductImage } from './ui';
import { fmt } from '@/lib/money';

export default function CartDrawer({ symbol = '₹' }) {
  const cart = useCart();
  const { data, loading } = useCartPricing('');
  const { open, setOpen } = cart;

  useEffect(() => {
    if (!open) return;
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [open, setOpen]);

  if (!open) return null;
  const lines = data?.lines || [];
  const freeAt = data?.free_shipping_over || 0;
  const toFree = Math.max(0, freeAt - (data?.subtotal || 0));
  const pct = freeAt ? Math.min(100, ((data?.subtotal || 0) / freeAt) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <button type="button" className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Close cart" />
      <aside className="glass glass-strong animate-sheet absolute bottom-3 right-3 top-3 flex w-[min(30rem,calc(100vw-1.5rem))] flex-col !rounded-[2rem]">
        <div className="flex items-center justify-between px-6 pb-3 pt-5">
          <h2 className="text-xl font-bold text-ink">Your cart <span className="text-sm font-medium text-muted">({cart.count})</span></h2>
          <button type="button" onClick={() => setOpen(false)} className="btn-glass !p-2" aria-label="Close"><X size={18} /></button>
        </div>

        {lines.length > 0 && data?.subtotal > 0 && (
          <div className="mx-6 mb-3 rounded-2xl bg-tint/10 p-3 text-xs text-ink2">
            <p className="mb-1.5 flex items-center gap-1.5"><Truck size={14} className="text-accent2" /> {toFree > 0 ? <>Add <b className="text-ink">{fmt(toFree, symbol)}</b> more for free shipping</> : <b className="text-ok">You get free shipping!</b>}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-tint/15"><div className="h-full rounded-full bg-gradient-to-r from-accent to-accent2 transition-all duration-500" style={{ width: `${pct}%` }} /></div>
          </div>
        )}

        <div className="flex-1 space-y-3 overflow-y-auto px-6 pb-4">
          {cart.items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-tint/10 text-muted"><ShoppingBag size={34} /></span>
              <p className="font-semibold text-ink">Your cart is empty</p>
              <Link href="/shop" onClick={() => setOpen(false)} className="btn-primary">Start shopping</Link>
            </div>
          ) : loading && !data ? (
            [0, 1].map((i) => <div key={i} className="skeleton h-24" />)
          ) : (
            lines.map((l) => (
              <div key={l.id} className="glass glass-flat flex gap-3 !rounded-2xl p-3">
                {l.product ? (
                  <Link href={`/product/${l.product.slug}`} onClick={() => setOpen(false)} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl"><ProductImage src={l.product.image} alt={l.product.name} className="h-20 w-20 !text-[2.2rem]" /></Link>
                ) : <div className="h-20 w-20 shrink-0 rounded-xl bg-tint/10" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{l.product?.name || 'Unavailable item'}</p>
                  {l.problem && <p className="text-xs font-medium text-warn">{l.problem}</p>}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1 rounded-full bg-tint/10 p-0.5">
                      <button type="button" onClick={() => cart.set(l.id, l.qty - 1)} className="rounded-full p-1.5 text-ink hover:bg-tint/15" aria-label="Decrease quantity"><Minus size={13} /></button>
                      <span className="w-6 text-center text-sm font-semibold text-ink">{l.qty}</span>
                      <button type="button" onClick={() => cart.set(l.id, l.qty + 1)} disabled={l.product && l.qty >= Math.min(10, l.product.stock)} className="rounded-full p-1.5 text-ink hover:bg-tint/15 disabled:opacity-40" aria-label="Increase quantity"><Plus size={13} /></button>
                    </div>
                    <span className="text-sm font-bold text-ink">{l.product ? fmt(l.product.price * l.qty, symbol) : ''}</span>
                  </div>
                </div>
                <button type="button" onClick={() => cart.remove(l.id)} className="self-start rounded-full p-1.5 text-muted hover:text-danger" aria-label="Remove item"><Trash2 size={15} /></button>
              </div>
            ))
          )}
        </div>

        {cart.items.length > 0 && data && (
          <div className="border-t border-tint/15 px-6 pb-6 pt-4">
            <div className="mb-3 flex justify-between text-sm"><span className="text-muted">Subtotal</span><span className="text-lg font-bold text-ink">{fmt(data.subtotal, symbol)}</span></div>
            <p className="mb-3 text-xs text-muted">Shipping and discount codes are applied at checkout.</p>
            <div className="flex gap-2">
              <Link href="/cart" onClick={() => setOpen(false)} className="btn-glass flex-1">View cart</Link>
              <Link href="/checkout" onClick={() => setOpen(false)} className={`btn-primary flex-1 ${data.problems ? 'pointer-events-none opacity-50' : ''}`}>Checkout</Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
