import Link from 'next/link';
import { ShieldCheck, Truck, RotateCcw, Headphones } from 'lucide-react';

export default function SiteFooter({ storeName, tagline, email, demo }) {
  return (
    <footer className="mx-auto mt-24 max-w-6xl px-3 pb-32 sm:px-5 md:pb-10">
      <div className="glass !rounded-[2rem] p-6 sm:p-10">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[[Truck, 'Fast delivery', 'Dispatched in 1 to 2 business days'], [RotateCcw, 'Easy returns', '7-day returns on unused items'], [ShieldCheck, 'Secure checkout', 'Encrypted payments, no card data stored'], [Headphones, 'Real support', email]].map(([Icon, t, d]) => (
            <div key={t} className="flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/30 to-accent2/30 text-accent2"><Icon size={20} /></span>
              <div><p className="font-semibold text-ink">{t}</p><p className="text-sm text-muted">{d}</p></div>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-tint/15 pt-6 text-sm text-muted sm:flex-row sm:items-center">
          <p><b className="text-ink">{storeName}</b> · {tagline}</p>
          <div className="flex gap-4"><Link href="/shop" className="hover:text-ink">Shop</Link><Link href="/account" className="hover:text-ink">My orders</Link><Link href="/login" className="hover:text-ink">Sign in</Link></div>
        </div>
        {demo && <p className="mt-4 rounded-2xl bg-warn/10 px-4 py-2 text-xs text-warn">Demo store: products are sample data and payments run in test mode. Nothing real is charged or shipped.</p>}
      </div>
    </footer>
  );
}
