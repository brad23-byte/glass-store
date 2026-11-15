'use client';

import Link from 'next/link';
import { ShoppingBag, Check } from 'lucide-react';
import { useState } from 'react';
import { useCart, useToast } from './Providers';
import { ProductImage, Stars, sheen } from './ui';
import { fmt, discountPct } from '@/lib/money';

export default function ProductCard({ p, symbol = '₹', i = 0 }) {
  const cart = useCart();
  const toast = useToast();
  const [done, setDone] = useState(false);
  const off = discountPct(p.price, p.compare_at);
  const out = p.stock <= 0;
  const rating = p.rating_count ? p.rating : p.supplier_rating || 0;

  function add(e) {
    e.preventDefault();
    e.stopPropagation();
    cart.add(p.id, 1);
    toast(`${p.name} added to cart`);
    setDone(true);
    setTimeout(() => setDone(false), 1200);
  }

  return (
    <article className="glass lift animate-fade-up group overflow-hidden !rounded-[1.75rem]" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }} onPointerMove={sheen}>
      <Link href={`/product/${p.slug}`} className="block" aria-label={p.name}>
        <div className="relative m-2 overflow-hidden rounded-[1.25rem]">
          <div className="transition-transform duration-700 group-hover:scale-110"><ProductImage src={p.images[0]} alt={p.name} className="w-full" /></div>
          <div className="absolute left-2.5 top-2.5 flex gap-1.5">
            {off > 0 && <span className="chip bg-accent3 text-white shadow">-{off}%</span>}
            {out ? <span className="chip bg-black/60 text-white backdrop-blur">Sold out</span> : p.stock <= 5 ? <span className="chip bg-warn/90 text-black">Only {p.stock} left</span> : null}
          </div>
        </div>
        <div className="px-4 pb-1 pt-2">
          <p className="text-xs font-medium text-muted">{p.brand || p.category}</p>
          <h3 className="line-clamp-2 min-h-[2.6rem] text-[0.95rem] font-semibold leading-snug text-ink">{p.name}</h3>
          {rating > 0 && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted"><Stars value={rating} size={12} /> {p.rating_count ? `(${p.rating_count})` : ''}</p>
          )}
        </div>
      </Link>
      <div className="flex items-end justify-between px-4 pb-4 pt-2">
        <div>
          <p className="text-lg font-bold text-ink">{fmt(p.price, symbol)}</p>
          {p.compare_at > p.price && <p className="text-xs text-muted line-through">{fmt(p.compare_at, symbol)}</p>}
        </div>
        <button type="button" onClick={add} disabled={out} className="btn-primary !p-2.5" aria-label={`Add ${p.name} to cart`}>
          {done ? <Check size={18} /> : <ShoppingBag size={18} />}
        </button>
      </div>
    </article>
  );
}
