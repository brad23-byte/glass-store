'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { useToast } from './Providers';
import { ProductImage } from './ui';

const toLines = (a) => (Array.isArray(a) ? a.join('\n') : '');

export default function ProductForm({ product, supplierName }) {
  const router = useRouter();
  const toast = useToast();
  const p = product;
  const [f, setF] = useState({
    name: p?.name || '', brand: p?.brand || '', category: p?.category || '', short_desc: p?.short_desc || '', description: p?.description || '',
    price: p ? p.price / 100 : '', compare_at: p?.compare_at ? p.compare_at / 100 : '', stock: p?.stock ?? 0, sku: p?.sku || '',
    images: toLines(p?.images), tags: toLines(p?.tags), highlights: toLines(p?.highlights), specs: (p?.specs || []).map(([k, v]) => `${k}: ${v}`).join('\n'),
    warranty: p?.warranty || '', shipping_info: p?.shipping_info || '', return_policy: p?.return_policy || '', weight_g: p?.weight_g ?? '',
    is_active: p ? p.is_active : true, featured: p?.featured || false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch(p ? `/api/admin/products/${p.id}` : '/api/admin/products', { method: p ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) return setError(d.error || 'Could not save');
    toast('Product saved');
    if (!p) router.replace(`/admin/products/${d.id}`); else router.refresh();
  }
  async function remove() {
    if (!confirm('Delete this product? If it has been ordered it will only be hidden.')) return;
    const res = await fetch(`/api/admin/products/${p.id}`, { method: 'DELETE' });
    const d = await res.json();
    toast(d.hidden ? 'Product hidden (it has orders)' : 'Product deleted');
    router.replace('/admin/products');
    router.refresh();
  }

  const first = f.images.split('\n')[0]?.trim();
  return (
    <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        <section className="glass space-y-4 !rounded-3xl p-6">
          <h2 className="text-lg font-bold text-ink">Basics</h2>
          {supplierName && <p className="rounded-2xl bg-accent2/10 p-3 text-sm text-ink2">Imported from <b>{supplierName}</b>. Price and stock refresh when you sync; details you edit here are kept.</p>}
          <div><label className="label" htmlFor="pn">Name</label><input id="pn" className="input" required value={f.name} onChange={set('name')} /></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="label" htmlFor="pb">Brand</label><input id="pb" className="input" value={f.brand} onChange={set('brand')} /></div>
            <div><label className="label" htmlFor="pc">Category</label><input id="pc" className="input" value={f.category} onChange={set('category')} /></div>
            <div><label className="label" htmlFor="ps">SKU</label><input id="ps" className="input" value={f.sku} onChange={set('sku')} /></div>
          </div>
          <div><label className="label" htmlFor="pd">Short description (shown on cards)</label><input id="pd" className="input" maxLength={200} value={f.short_desc} onChange={set('short_desc')} /></div>
          <div><label className="label" htmlFor="pl">Full description</label><textarea id="pl" className="input min-h-36" value={f.description} onChange={set('description')} /></div>
        </section>

        <section className="glass space-y-4 !rounded-3xl p-6">
          <h2 className="text-lg font-bold text-ink">Details shoppers see</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="hl">Highlights (one per line)</label><textarea id="hl" className="input min-h-32" value={f.highlights} onChange={set('highlights')} /></div>
            <div><label className="label" htmlFor="sp">Specifications (Label: Value, one per line)</label><textarea id="sp" className="input min-h-32 font-mono text-xs" value={f.specs} onChange={set('specs')} placeholder={'Battery: 40 hours\nWeight: 255 g'} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="label" htmlFor="pw">Warranty</label><input id="pw" className="input" value={f.warranty} onChange={set('warranty')} /></div>
            <div><label className="label" htmlFor="pwg">Weight (grams)</label><input id="pwg" type="number" min="0" className="input" value={f.weight_g} onChange={set('weight_g')} /></div>
            <div><label className="label" htmlFor="pt">Tags (one per line)</label><textarea id="pt" className="input min-h-12" value={f.tags} onChange={set('tags')} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="psi">Shipping information</label><textarea id="psi" className="input min-h-20" value={f.shipping_info} onChange={set('shipping_info')} /></div>
            <div><label className="label" htmlFor="prp">Return policy</label><textarea id="prp" className="input min-h-20" value={f.return_policy} onChange={set('return_policy')} /></div>
          </div>
        </section>

        <section className="glass space-y-3 !rounded-3xl p-6">
          <h2 className="text-lg font-bold text-ink">Images</h2>
          <label className="label" htmlFor="im">One https:// image link per line (first one is the main image)</label>
          <textarea id="im" className="input min-h-24 font-mono text-xs" value={f.images} onChange={set('images')} placeholder="https://..." />
          <p className="text-xs text-muted">No photo yet? Use a placeholder tile: <code className="text-ink2">emoji:🎧|#7c3aed|#22d3ee</code></p>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="glass space-y-4 !rounded-3xl p-6 lg:sticky lg:top-8">
          {first && <div className="overflow-hidden rounded-2xl"><ProductImage src={first} className="w-full" /></div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="pp">Price</label><input id="pp" type="number" step="0.01" min="0" required className="input" value={f.price} onChange={set('price')} /></div>
            <div><label className="label" htmlFor="pcp">Compare-at</label><input id="pcp" type="number" step="0.01" min="0" className="input" value={f.compare_at} onChange={set('compare_at')} /></div>
          </div>
          <div><label className="label" htmlFor="pst">Stock</label><input id="pst" type="number" min="0" required className="input" value={f.stock} onChange={set('stock')} /></div>
          <label className="flex items-center gap-2 text-sm text-ink2"><input type="checkbox" checked={f.is_active} onChange={set('is_active')} className="h-4 w-4 accent-[rgb(var(--accent))]" /> Visible in the store</label>
          <label className="flex items-center gap-2 text-sm text-ink2"><input type="checkbox" checked={f.featured} onChange={set('featured')} className="h-4 w-4 accent-[rgb(var(--accent))]" /> Featured on home page</label>
          {error && <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save product</button>
          {p && <button type="button" onClick={remove} className="btn-danger w-full"><Trash2 size={16} /> Delete</button>}
        </section>
      </aside>
    </form>
  );
}
