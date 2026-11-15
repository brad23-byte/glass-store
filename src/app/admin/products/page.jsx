import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getDb, getSettings } from '@/lib/db';
import { hydrate } from '@/lib/products';
import { ProductImage } from '@/components/ui';
import { fmt } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default function AdminProducts() {
  const s = getSettings();
  const rows = getDb().prepare('SELECT p.*, su.name AS supplier_name FROM products p LEFT JOIN suppliers su ON su.id = p.supplier_id ORDER BY p.id DESC').all().map((r) => ({ ...hydrate(r), supplier_name: r.supplier_name }));
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-extrabold text-ink sm:text-4xl">Products</h1><p className="text-muted">{rows.length} in catalogue</p></div><Link href="/admin/products/new" className="btn-primary"><Plus size={16} /> New product</Link></div>
      <section className="glass overflow-hidden !rounded-3xl"><div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted"><tr>{['Product', 'Category', 'Price', 'Margin', 'Stock', 'Source', 'Status'].map((h) => <th key={h} className="px-5 py-4 font-semibold">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-tint/10">
            {rows.map((p) => {
              const margin = p.supplier_cost != null && p.price ? Math.round(((p.price - p.supplier_cost) / p.price) * 100) : null;
              return (
                <tr key={p.id} className="hover:bg-tint/5">
                  <td className="px-5 py-3"><Link href={`/admin/products/${p.id}`} className="flex items-center gap-3"><span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl"><ProductImage src={p.images[0]} className="h-11 w-11 !text-xl" /></span><span><span className="block font-semibold text-ink hover:text-accent2">{p.name}</span><span className="text-xs text-muted">{p.sku}</span></span></Link></td>
                  <td className="px-5 py-3 text-ink2">{p.category}</td>
                  <td className="px-5 py-3 font-bold text-ink">{fmt(p.price, s.currency_symbol)}</td>
                  <td className="px-5 py-3 text-ink2">{margin != null ? `${margin}%` : '-'}</td>
                  <td className="px-5 py-3"><span className={`chip ${p.stock === 0 ? 'bg-danger/15 text-danger' : p.stock <= s.low_stock_threshold ? 'bg-warn/15 text-warn' : 'bg-ok/15 text-ok'}`}>{p.stock}</span></td>
                  <td className="px-5 py-3 text-xs text-muted">{p.supplier_name || 'Own stock'}</td>
                  <td className="px-5 py-3"><span className={`chip ${p.is_active ? 'bg-ok/15 text-ok' : 'bg-muted/20 text-ink2'}`}>{p.is_active ? 'Live' : 'Hidden'}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table></div></section>
    </>
  );
}
