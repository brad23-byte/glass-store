import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { getProductBySlug, publicProduct, related, getReviews, hasPurchased } from '@/lib/products';
import { getSettings, getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Gallery, BuyBox, Tabs } from '@/components/ProductView';
import ProductCard from '@/components/ProductCard';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const p = getProductBySlug(params.slug);
  return p ? { title: p.name, description: p.short_desc } : { title: 'Not found' };
}

function eta() {
  const f = (d) => new Date(Date.now() + d * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${f(3)} to ${f(7)}`;
}

export default async function ProductPage({ params }) {
  const raw = getProductBySlug(params.slug);
  if (!raw) notFound();
  const s = getSettings();
  const session = await getSession();
  const p = publicProduct(raw);
  const reviews = getReviews(p.id);
  const canReview = !!session && hasPurchased(session.id, p.id);
  const mine = session ? getDb().prepare('SELECT rating, title, body FROM reviews WHERE product_id = ? AND user_id = ?').get(p.id, session.id) : null;
  const rel = related(p, 4);
  const ld = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.short_desc, sku: p.sku, brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
    offers: { '@type': 'Offer', priceCurrency: 'INR', price: (p.price / 100).toFixed(2), availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
    aggregateRating: p.rating_count ? { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.rating_count } : undefined,
  };

  return (
    <div className="mx-auto max-w-6xl px-3 pt-8 sm:px-5 sm:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <nav className="mb-5 flex items-center gap-1 text-sm text-muted" aria-label="Breadcrumb">
        <Link href="/shop" className="hover:text-ink">Shop</Link><ChevronRight size={14} />
        <Link href={`/shop?category=${encodeURIComponent(p.category)}`} className="hover:text-ink">{p.category}</Link><ChevronRight size={14} />
        <span className="truncate text-ink2">{p.name}</span>
      </nav>
      <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        <Gallery images={p.images} name={p.name} />
        <BuyBox p={p} symbol={s.currency_symbol} eta={eta()} />
      </div>
      <div className="mt-12"><Tabs p={p} reviews={reviews} canReview={canReview} myReview={mine} signedIn={!!session} /></div>
      {rel.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-5 text-2xl font-bold text-ink">You may also like</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{rel.map((r, i) => <ProductCard key={r.id} p={r} symbol={s.currency_symbol} i={i} />)}</div>
        </section>
      )}
    </div>
  );
}
