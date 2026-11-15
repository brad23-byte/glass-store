'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Minus, Plus, ShoppingBag, Zap, Truck, ShieldCheck, RotateCcw, Check, Star, Loader2 } from 'lucide-react';
import { useCart, useToast } from './Providers';
import { ProductImage, Stars } from './ui';
import { fmt, discountPct } from '@/lib/money';

export function Gallery({ images, name }) {
  const [i, setI] = useState(0);
  return (
    <div>
      <div className="glass overflow-hidden !rounded-[2rem] p-2.5">
        <div className="overflow-hidden rounded-[1.5rem]"><ProductImage key={i} src={images[i]} alt={name} big className="w-full animate-pop-in" /></div>
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {images.map((im, k) => (
            <button key={k} type="button" onClick={() => setI(k)} aria-label={`Show image ${k + 1}`} className={`glass h-20 w-20 shrink-0 overflow-hidden !rounded-2xl p-1 transition ${k === i ? 'ring-2 ring-accent2' : 'opacity-70 hover:opacity-100'}`}>
              <ProductImage src={im} className="h-full w-full rounded-xl !text-3xl" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BuyBox({ p, symbol, eta }) {
  const cart = useCart();
  const toast = useToast();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const max = Math.min(10, p.stock);
  const off = discountPct(p.price, p.compare_at);
  const out = p.stock <= 0;
  const rating = p.rating_count ? p.rating : p.supplier_rating || 0;

  return (
    <div>
      <p className="text-sm font-semibold text-accent2">{p.brand || p.category}</p>
      <h1 className="mt-1 text-3xl font-extrabold leading-tight text-ink sm:text-4xl">{p.name}</h1>
      {rating > 0 && (
        <p className="mt-2 flex items-center gap-2 text-sm text-muted"><Stars value={rating} size={16} /> <b className="text-ink">{rating.toFixed(1)}</b> {p.rating_count ? <span>({p.rating_count} verified {p.rating_count === 1 ? 'review' : 'reviews'})</span> : <span>(supplier listing rating)</span>}</p>
      )}
      <p className="mt-4 text-ink2">{p.short_desc}</p>

      <div className="mt-6 flex flex-wrap items-baseline gap-3">
        <span className="text-4xl font-extrabold text-ink">{fmt(p.price, symbol)}</span>
        {p.compare_at > p.price && <><span className="text-lg text-muted line-through">{fmt(p.compare_at, symbol)}</span><span className="chip bg-accent3/20 text-accent3">Save {off}%</span></>}
      </div>
      <p className="mt-1 text-xs text-muted">Inclusive of all taxes</p>

      <p className={`mt-4 flex items-center gap-1.5 text-sm font-semibold ${out ? 'text-danger' : p.stock <= 5 ? 'text-warn' : 'text-ok'}`}>
        <span className="h-2 w-2 rounded-full bg-current" /> {out ? 'Out of stock' : p.stock <= 5 ? `Only ${p.stock} left in stock` : 'In stock'}
      </p>

      {!out && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="glass flex items-center !rounded-full p-1">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="rounded-full p-2.5 text-ink hover:bg-tint/15" aria-label="Decrease quantity"><Minus size={16} /></button>
            <span className="w-8 text-center font-bold text-ink" aria-live="polite">{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={qty >= max} className="rounded-full p-2.5 text-ink hover:bg-tint/15 disabled:opacity-40" aria-label="Increase quantity"><Plus size={16} /></button>
          </div>
          <button type="button" className="btn-primary !px-7 !py-3.5" onClick={() => { cart.add(p.id, qty); toast(`${qty} × ${p.name} added`); }}><ShoppingBag size={18} /> Add to cart</button>
          <button type="button" className="btn-glass !px-6 !py-3.5" onClick={() => { cart.add(p.id, qty); router.push('/checkout'); }}><Zap size={18} /> Buy now</button>
        </div>
      )}

      <ul className="mt-8 space-y-2.5">
        {p.highlights.map((h) => <li key={h} className="flex gap-2.5 text-sm text-ink2"><Check size={17} className="mt-0.5 shrink-0 text-ok" />{h}</li>)}
      </ul>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[[Truck, 'Delivery', eta], [ShieldCheck, 'Warranty', p.warranty || 'See details'], [RotateCcw, 'Returns', '7 days']].map(([Icon, t, d]) => (
          <div key={t} className="glass glass-flat !rounded-2xl p-3"><Icon size={18} className="text-accent2" /><p className="mt-1.5 text-xs text-muted">{t}</p><p className="text-sm font-semibold text-ink">{d}</p></div>
        ))}
      </div>
    </div>
  );
}

export function ReviewForm({ productId, existing }) {
  const toast = useToast();
  const router = useRouter();
  const [rating, setRating] = useState(existing?.rating || 5);
  const [title, setTitle] = useState(existing?.title || '');
  const [body, setBody] = useState(existing?.body || '');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch('/api/reviews', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ product_id: productId, rating, title, body }) });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) return toast(d.error || 'Could not save review', 'warn');
    toast('Thanks for your review!');
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="glass glass-flat space-y-3 !rounded-2xl p-5">
      <p className="font-bold text-ink">{existing ? 'Update your review' : 'Write a review'}</p>
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} onClick={() => setRating(n)} aria-label={`${n} stars`}><Star size={26} className={n <= rating ? 'fill-warn text-warn' : 'text-muted/40'} /></button>
        ))}
      </div>
      <input className="input" placeholder="Headline (optional)" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="input min-h-24" placeholder="What did you like or dislike?" value={body} maxLength={1000} onChange={(e) => setBody(e.target.value)} />
      <button className="btn-primary" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />} Submit review</button>
    </form>
  );
}

export function Tabs({ p, reviews, canReview, myReview, signedIn }) {
  const [tab, setTab] = useState('details');
  const tabs = [['details', 'Details'], ['specs', 'Specifications'], ['ship', 'Shipping & returns'], ['reviews', `Reviews (${reviews.length + p.supplier_reviews.length})`]];
  return (
    <div className="glass !rounded-[2rem] p-5 sm:p-8">
      <div className="no-scrollbar mb-6 flex gap-1.5 overflow-x-auto" role="tablist">
        {tabs.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${tab === k ? 'bg-gradient-to-r from-accent to-accent2 text-onaccent' : 'text-ink2 hover:bg-tint/10'}`}>{l}</button>
        ))}
      </div>

      {tab === 'details' && (
        <div className="animate-fade-up max-w-3xl space-y-4">
          <p className="whitespace-pre-line leading-relaxed text-ink2">{p.description || p.short_desc}</p>
          {p.tags.length > 0 && <div className="flex flex-wrap gap-2 pt-2">{p.tags.map((t) => <Link key={t} href={`/shop?q=${encodeURIComponent(t)}`} className="chip bg-tint/10 text-ink2 hover:bg-tint/20">#{t}</Link>)}</div>}
        </div>
      )}

      {tab === 'specs' && (
        <dl className="animate-fade-up max-w-3xl divide-y divide-tint/10">
          {[['Brand', p.brand], ['Category', p.category], ['SKU', p.sku], ['Weight', p.weight_g ? `${p.weight_g >= 1000 ? (p.weight_g / 1000).toFixed(2) + ' kg' : p.weight_g + ' g'}` : ''], ['Warranty', p.warranty], ...p.specs].filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[10rem_1fr] gap-4 py-3 text-sm"><dt className="text-muted">{k}</dt><dd className="font-medium text-ink">{v}</dd></div>
          ))}
        </dl>
      )}

      {tab === 'ship' && (
        <div className="animate-fade-up grid max-w-3xl gap-4 sm:grid-cols-2">
          <div className="glass glass-flat !rounded-2xl p-5"><Truck className="text-accent2" /><p className="mt-2 font-bold text-ink">Shipping</p><p className="mt-1 text-sm text-ink2">{p.shipping_info || 'Ships within 1 to 2 business days.'}</p></div>
          <div className="glass glass-flat !rounded-2xl p-5"><RotateCcw className="text-accent2" /><p className="mt-2 font-bold text-ink">Returns</p><p className="mt-1 text-sm text-ink2">{p.return_policy || '7-day returns on unused items.'}</p></div>
          <div className="glass glass-flat !rounded-2xl p-5 sm:col-span-2"><ShieldCheck className="text-accent2" /><p className="mt-2 font-bold text-ink">Warranty</p><p className="mt-1 text-sm text-ink2">{p.warranty || 'Ask support for warranty details.'}</p></div>
        </div>
      )}

      {tab === 'reviews' && (
        <div className="animate-fade-up max-w-3xl space-y-5">
          {canReview ? <ReviewForm productId={p.id} existing={myReview} /> : <p className="text-sm text-muted">{signedIn ? 'Only customers who bought this product can write a review.' : <>Buyers can review after purchase. <Link href="/login" className="font-semibold text-accent2">Sign in</Link></>}</p>}
          {reviews.map((r) => (
            <div key={r.id} className="glass glass-flat !rounded-2xl p-5">
              <div className="flex items-center justify-between"><Stars value={r.rating} /><span className="text-xs text-muted">{r.created_at.slice(0, 10)}</span></div>
              {r.title && <p className="mt-2 font-semibold text-ink">{r.title}</p>}
              {r.body && <p className="mt-1 text-sm text-ink2">{r.body}</p>}
              <p className="mt-2 text-xs text-muted">{r.name} · Verified purchase</p>
            </div>
          ))}
          {p.supplier_reviews.length > 0 && (
            <>
              <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted">From the supplier listing</p>
              {p.supplier_reviews.map((r, i) => (
                <div key={i} className="glass glass-flat !rounded-2xl p-5"><Stars value={r.rating} /><p className="mt-1 text-sm text-ink2">{r.comment}</p><p className="mt-2 text-xs text-muted">{r.name}{r.date ? ` · ${r.date}` : ''}</p></div>
              ))}
            </>
          )}
          {reviews.length === 0 && p.supplier_reviews.length === 0 && <p className="text-sm text-muted">No reviews yet.</p>}
        </div>
      )}
    </div>
  );
}
