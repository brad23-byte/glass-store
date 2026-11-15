import Link from 'next/link';
import { PackageOpen } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { listOrdersForUser } from '@/lib/orders';
import { getSettings } from '@/lib/db';
import { ProductImage } from '@/components/ui';
import { StatusChip } from '@/components/OrderBits';
import { fmt } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My orders' };

export default async function Account() {
  const s = await requireUser('/account');
  const settings = await getSettings();
  const orders = await listOrdersForUser(s.id);
  return (
    <div className="mx-auto max-w-4xl px-3 pt-8 sm:px-5 sm:pt-12">
      <h1 className="text-4xl font-extrabold text-ink sm:text-5xl">My orders</h1>
      <p className="mb-8 mt-1 text-muted">{s.name} · {s.email}</p>
      {orders.length === 0 ? (
        <div className="glass flex flex-col items-center gap-3 !rounded-3xl px-6 py-20 text-center"><PackageOpen size={42} className="text-muted" /><p className="text-lg font-semibold text-ink">No orders yet</p><Link href="/shop" className="btn-primary">Start shopping</Link></div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <Link key={o.id} href={`/order/${o.number}`} className="glass lift block !rounded-3xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-bold text-ink">{o.number}</p><p className="text-xs text-muted">{new Date(o.created_at + 'Z').toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p></div><div className="flex items-center gap-3"><StatusChip status={o.status} /><span className="font-bold text-ink">{fmt(o.total, settings.currency_symbol)}</span></div></div>
              <div className="mt-3 flex gap-2">{o.items.slice(0, 5).map((i, k) => <div key={k} className="h-12 w-12 overflow-hidden rounded-xl"><ProductImage src={i.image} className="h-12 w-12 !text-xl" /></div>)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
