import Link from 'next/link';

// Shared layout for the policy pages. `sections` is [[heading, [paragraph, ...]], ...]
export default function LegalPage({ title, updated, intro, sections, storeName }) {
  return (
    <div className="mx-auto max-w-3xl px-3 py-10 sm:px-5">
      <div className="glass !rounded-[2rem] p-6 sm:p-10">
        <h1 className="text-3xl font-bold text-ink">{title}</h1>
        <p className="mt-1 text-sm text-muted">{storeName} · Last updated {updated}</p>
        <p className="mt-5 rounded-2xl bg-warn/10 px-4 py-3 text-sm text-warn">{intro}</p>
        <div className="mt-6 space-y-6">
          {sections.map(([h, paras]) => (
            <section key={h}>
              <h2 className="text-lg font-semibold text-ink">{h}</h2>
              {paras.map((p, i) => <p key={i} className="mt-2 leading-relaxed text-muted">{p}</p>)}
            </section>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-4 border-t border-tint/15 pt-5 text-sm text-muted">
          <Link href="/terms" className="hover:text-ink">Terms</Link>
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <Link href="/shipping" className="hover:text-ink">Shipping</Link>
          <Link href="/returns" className="hover:text-ink">Returns</Link>
        </div>
      </div>
    </div>
  );
}
