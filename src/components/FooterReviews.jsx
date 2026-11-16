import Link from 'next/link';
import { Stars } from './ui';
import { latestReviews } from '@/lib/products';

// Real reviews only, newest first. Shows nothing until a customer has left one.
export default async function FooterReviews() {
  let data;
  try { data = await latestReviews(3); } catch { return null; }
  if (!data.items.length) return null;
  return (
    <section className="mb-8 border-b border-tint/15 pb-8" aria-label="Customer reviews">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-xl font-bold text-ink">What our customers say</h2>
        <p className="flex items-center gap-2 text-sm text-muted"><Stars value={data.avg} size={16} /> <b className="text-ink">{data.avg.toFixed(1)}</b> from {data.count} verified {data.count === 1 ? 'review' : 'reviews'}</p>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {data.items.map((r) => (
          <figure key={r.id} className="glass glass-flat !rounded-3xl p-5">
            <Stars value={r.rating} size={15} />
            {r.title && <p className="mt-2 font-semibold text-ink">{r.title}</p>}
            {r.body && <blockquote className="mt-1 line-clamp-4 text-sm leading-relaxed text-muted">{r.body}</blockquote>}
            <figcaption className="mt-3 text-xs text-muted">
              {r.author} · verified buyer of <Link href={`/product/${r.slug}`} className="text-ink2 underline-offset-2 hover:underline">{r.product}</Link>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
