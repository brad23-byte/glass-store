import Link from 'next/link';
import { SearchX, SlidersHorizontal } from 'lucide-react';
import { listProducts, listCategories } from '@/lib/products';
import { getSettings } from '@/lib/db';
import ProductCard from '@/components/ProductCard';
import SortSelect from '@/components/SortSelect';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Shop' };

export default function ShopPage({ searchParams }) {
  const s = getSettings();
  const q = String(searchParams.q || '').slice(0, 60);
  const category = String(searchParams.category || '');
  const sort = String(searchParams.sort || 'featured');
  const min = Math.max(0, Number(searchParams.min) || 0);
  const max = Math.max(0, Number(searchParams.max) || 0);
  const inStock = searchParams.stock === '1';
  const page = Math.max(1, Number(searchParams.page) || 1);
  const { items, total, pages } = listProducts({ q, category, sort, min, max, inStock, page });
  const cats = listCategories();

  const href = (over) => {
    const p = new URLSearchParams();
    const cur = { q, category, sort, min: min || '', max: max || '', stock: inStock ? '1' : '', page: '', ...over };
    for (const [k, v] of Object.entries(cur)) if (v !== '' && v != null && !(k === 'sort' && v === 'featured')) p.set(k, String(v));
    const str = p.toString();
    return `/shop${str ? `?${str}` : ''}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-3 pt-8 sm:px-5 sm:pt-12">
      <div className="mb-6">
        <h1 className="text-4xl font-extrabold text-ink sm:text-5xl">{q ? <>Results for “{q}”</> : category || 'All products'}</h1>
        <p className="mt-1 text-muted">{total} {total === 1 ? 'product' : 'products'}</p>
      </div>

      <form method="get" className="grid gap-6 lg:grid-cols-[17rem_1fr]">
        <input type="hidden" name="q" value={q} />
        <aside className="glass h-fit space-y-5 !rounded-3xl p-5 lg:sticky lg:top-24">
          <p className="flex items-center gap-2 font-bold text-ink"><SlidersHorizontal size={16} /> Filters</p>
          <div>
            <p className="label">Category</p>
            <div className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-1">
              <Link href={href({ category: '' })} className={`rounded-full px-3 py-1.5 text-sm transition ${!category ? 'bg-gradient-to-r from-accent to-accent2 font-semibold text-onaccent' : 'bg-tint/10 text-ink2 hover:bg-tint/20'}`}>All</Link>
              {cats.map((c) => (
                <Link key={c.category} href={href({ category: c.category })} className={`flex items-center justify-between rounded-full px-3 py-1.5 text-sm transition ${category === c.category ? 'bg-gradient-to-r from-accent to-accent2 font-semibold text-onaccent' : 'bg-tint/10 text-ink2 hover:bg-tint/20'}`}>
                  <span>{c.category}</span><span className="ml-2 text-xs opacity-70">{c.n}</span>
                </Link>
              ))}
            </div>
          </div>
          <input type="hidden" name="category" value={category} />
          <div>
            <p className="label">Price ({s.currency_symbol})</p>
            <div className="flex items-center gap-2"><input name="min" type="number" min="0" defaultValue={min || ''} placeholder="Min" className="input !py-2" aria-label="Minimum price" /><span className="text-muted">to</span><input name="max" type="number" min="0" defaultValue={max || ''} placeholder="Max" className="input !py-2" aria-label="Maximum price" /></div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink2"><input type="checkbox" name="stock" value="1" defaultChecked={inStock} className="h-4 w-4 accent-[rgb(var(--accent))]" /> In stock only</label>
          <button className="btn-primary w-full" type="submit">Apply</button>
          {(category || min || max || inStock || q) && <Link href="/shop" className="block text-center text-sm font-medium text-accent2 hover:underline">Clear all</Link>}
        </aside>

        <section>
          <div className="mb-4 flex justify-end"><SortSelect value={sort} /></div>
          {items.length === 0 ? (
            <div className="glass flex flex-col items-center gap-3 !rounded-3xl px-6 py-20 text-center">
              <SearchX size={40} className="text-muted" />
              <p className="text-lg font-semibold text-ink">No products match</p>
              <p className="text-sm text-muted">Try fewer filters or a different search.</p>
              <Link href="/shop" className="btn-primary mt-2">See all products</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">{items.map((p, i) => <ProductCard key={p.id} p={p} symbol={s.currency_symbol} i={i} />)}</div>
          )}
          {pages > 1 && (
            <nav className="mt-8 flex justify-center gap-2" aria-label="Pages">
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <Link key={n} href={href({ page: n })} aria-current={n === page ? 'page' : undefined} className={`btn !px-4 !py-2 ${n === page ? 'btn-primary' : 'btn-glass'}`}>{n}</Link>
              ))}
            </nav>
          )}
        </section>
      </form>
    </div>
  );
}
