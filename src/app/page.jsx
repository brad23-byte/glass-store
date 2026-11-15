import Link from 'next/link';
import { ArrowRight, Truck, ShieldCheck, RotateCcw } from 'lucide-react';
import { featured, listProducts, listCategories } from '@/lib/products';
import { getSettings } from '@/lib/db';
import ProductCard from '@/components/ProductCard';
import { ProductImage } from '@/components/ui';
import { fmt } from '@/lib/money';

export const dynamic = 'force-dynamic';

const CAT_EMOJI = { Audio: '🎧', Wearables: '⌚', 'Smart Home': '💡', Kitchen: '☕', Fitness: '🧘', Travel: '🧳', 'Desk & Work': '💻' };

export default async function Home() {
  const s = await getSettings();
  const hero = await featured(3);
  const picks = await featured(8);
  const fresh = (await listProducts({ sort: 'newest', perPage: 4 })).items;
  const cats = await listCategories();

  return (
    <div className="mx-auto max-w-6xl px-3 pt-8 sm:px-5 sm:pt-14">
      {/* Hero */}
      <section className="glass relative overflow-hidden !rounded-[2.5rem] px-6 py-12 sm:px-12 sm:py-20">
        <div className="relative z-10 max-w-xl animate-fade-up">
          <span className="chip bg-tint/15 text-ink2">New season · free shipping over {fmt(s.free_shipping_over, s.currency_symbol)}</span>
          <h1 className="mt-5 text-5xl font-extrabold leading-[1.02] text-ink sm:text-7xl">Beautiful things, <span className="gradient-text">delivered.</span></h1>
          <p className="mt-5 max-w-md text-lg text-ink2">{s.tagline} Audio, wearables, smart home and more, with honest details on every product.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="btn-primary !px-7 !py-3.5 !text-base">Shop now <ArrowRight size={18} /></Link>
            <Link href="/shop?sort=price-asc" className="btn-glass !px-7 !py-3.5 !text-base">See deals</Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink2">
            <span className="flex items-center gap-1.5"><Truck size={16} className="text-accent2" /> Fast delivery</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={16} className="text-accent2" /> Secure payments</span>
            <span className="flex items-center gap-1.5"><RotateCcw size={16} className="text-accent2" /> 7-day returns</span>
          </div>
        </div>
        <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-[48%] lg:block" aria-hidden="true">
          {hero.map((p, i) => (
            <div key={p.id} className="glass animate-float absolute w-52 !rounded-[1.75rem] p-2" style={{ '--r': `${[-6, 5, -3][i]}deg`, right: `${[56, 200, 92][i]}px`, top: `${[34, 150, 270][i]}px`, animationDelay: `${i * -1.8}s` }}>
              <ProductImage src={p.images[0]} className="w-full rounded-[1.25rem]" />
              <p className="truncate px-2 pb-1 pt-2 text-sm font-semibold text-ink">{p.name}</p>
              <p className="px-2 pb-1 text-xs text-muted">{fmt(p.price, s.currency_symbol)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mt-14">
        <h2 className="mb-4 text-2xl font-bold text-ink">Shop by category</h2>
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
          {cats.map((c) => (
            <Link key={c.category} href={`/shop?category=${encodeURIComponent(c.category)}`} className="glass lift flex shrink-0 items-center gap-3 !rounded-full py-2.5 pl-3 pr-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-accent/25 to-accent2/25 text-2xl">{CAT_EMOJI[c.category] || '📦'}</span>
              <span><span className="block text-sm font-semibold text-ink">{c.category}</span><span className="text-xs text-muted">{c.n} items</span></span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="mt-14">
        <div className="mb-5 flex items-end justify-between"><h2 className="text-2xl font-bold text-ink sm:text-3xl">Featured picks</h2><Link href="/shop" className="text-sm font-semibold text-accent2 hover:underline">View all</Link></div>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{picks.map((p, i) => <ProductCard key={p.id} p={p} symbol={s.currency_symbol} i={i} />)}</div>
      </section>

      {/* Banner */}
      <section className="glass mt-16 grid items-center gap-6 !rounded-[2.5rem] p-8 sm:grid-cols-[1.2fr_1fr] sm:p-12">
        <div>
          <h2 className="text-3xl font-extrabold text-ink sm:text-4xl">Every product, <span className="gradient-text">fully explained.</span></h2>
          <p className="mt-3 max-w-md text-ink2">Specifications, what is in the box, warranty, shipping and return details: all in one place before you buy.</p>
          <Link href="/shop" className="btn-primary mt-6">Browse the catalogue <ArrowRight size={16} /></Link>
        </div>
        <div className="grid grid-cols-2 gap-3">{fresh.slice(0, 2).map((p) => (<Link key={p.id} href={`/product/${p.slug}`} className="glass lift !rounded-3xl p-2"><ProductImage src={p.images[0]} className="w-full rounded-[1.25rem]" /><p className="truncate px-2 pt-2 text-sm font-semibold text-ink">{p.name}</p><p className="px-2 pb-2 text-xs text-muted">{fmt(p.price, s.currency_symbol)}</p></Link>))}</div>
      </section>

      <section className="mt-16">
        <h2 className="mb-5 text-2xl font-bold text-ink sm:text-3xl">Just in</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{fresh.map((p, i) => <ProductCard key={p.id} p={p} symbol={s.currency_symbol} i={i} />)}</div>
      </section>
    </div>
  );
}
