import Link from 'next/link';
import { IndianRupee, ShoppingCart, TrendingUp, Banknote, Package, Users, AlertTriangle, Clock } from 'lucide-react';
import { adminStats } from '@/lib/orders';
import { getSettings } from '@/lib/db';
import { RevenueChart } from '@/components/AdminBits';
import { StatusChip } from '@/components/OrderBits';
import { fmt } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  const st = await adminStats();
  const s = await getSettings();
  const sym = s.currency_symbol;
  const cards = [
    ['Total revenue', fmt(st.revenue.v, sym), `${st.revenue.n} paid orders`, IndianRupee, 'from-accent to-accent2'],
    ['Last 30 days', fmt(st.last30.v, sym), `${st.last30.n} orders`, TrendingUp, 'from-accent2 to-ok'],
    ['To process', String(st.pending), 'orders waiting', Clock, 'from-warn to-accent3'],
    ['Average order', fmt(st.aov, sym), 'per paid order', ShoppingCart, 'from-accent3 to-accent'],
    ['COD to collect', fmt(st.cod.v, sym), `${st.cod.n} orders`, Banknote, 'from-ok to-accent2'],
    ['Products', String(st.productCount), `${st.customerCount} ${st.customerCount === 1 ? "customer" : "customers"}`, Package, 'from-accent to-accent3'],
  ];
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-extrabold text-ink sm:text-4xl">Dashboard</h1><p className="text-muted">What is happening in your store</p></div><Link href="/admin/orders" className="btn-primary">All purchases</Link></div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
        {cards.map(([t, v, n, Icon, g]) => (
          <div key={t} className="glass lift !rounded-3xl p-5"><span className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${g} text-onaccent shadow`}><Icon size={19} /></span><p className="mt-3 text-sm text-muted">{t}</p><p className="text-2xl font-extrabold text-ink sm:text-3xl">{v}</p><p className="text-xs text-muted">{n}</p></div>
        ))}
      </div>

      <section className="glass !rounded-3xl p-6"><h2 className="mb-2 text-lg font-bold text-ink">Revenue, last 14 days</h2><RevenueChart series={st.series} symbol={sym} /></section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass !rounded-3xl p-6">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold text-ink">Recent purchases</h2><Link href="/admin/orders" className="text-sm font-semibold text-accent2">View all</Link></div>
          {st.recent.length === 0 ? <p className="py-6 text-center text-sm text-muted">No orders yet.</p> : (
            <ul className="divide-y divide-tint/10">{st.recent.map((o) => (
              <li key={o.id}><Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 rounded-xl px-2 py-3 hover:bg-tint/5"><div><p className="font-semibold text-ink">{o.number}</p><p className="text-xs text-muted">{o.name}</p></div><div className="flex items-center gap-3"><StatusChip status={o.status} /><span className="w-20 text-right font-bold text-ink">{fmt(o.total, sym)}</span></div></Link></li>
            ))}</ul>
          )}
        </section>
        <div className="space-y-6">
          <section className="glass !rounded-3xl p-6"><h2 className="mb-3 text-lg font-bold text-ink">Top products</h2>
            {st.top.length === 0 ? <p className="text-sm text-muted">Sales will appear here.</p> : <ol className="space-y-2">{st.top.map((t, i) => (<li key={t.name} className="flex items-center gap-3 text-sm"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-tint/10 text-xs font-bold text-ink2">{i + 1}</span><span className="flex-1 truncate text-ink">{t.name}</span><span className="text-muted">{t.qty} sold</span><span className="font-bold text-ink">{fmt(t.rev, sym)}</span></li>))}</ol>}</section>
          <section className="glass !rounded-3xl p-6"><h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-ink"><AlertTriangle size={17} className="text-warn" /> Low stock</h2>
            {st.low.length === 0 ? <p className="text-sm text-muted">All products are well stocked.</p> : <ul className="space-y-2">{st.low.map((p) => (<li key={p.id} className="flex justify-between text-sm"><Link href={`/admin/products/${p.id}`} className="truncate text-ink hover:text-accent2">{p.name}</Link><span className={`chip ${p.stock === 0 ? 'bg-danger/15 text-danger' : 'bg-warn/15 text-warn'}`}>{p.stock === 0 ? 'Out' : `${p.stock} left`}</span></li>))}</ul>}</section>
        </div>
      </div>
    </>
  );
}
