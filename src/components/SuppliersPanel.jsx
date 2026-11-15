'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, RefreshCw, PlugZap, Pencil, Trash2, Loader2, Truck, X, Info } from 'lucide-react';
import { useToast } from './Providers';

const PRESETS = {
  demo: { name: 'Demo Supplier (built-in test feed)', kind: 'json', url: 'mock://demo/products', api_key: 'demo-supplier-key', auth_header: 'x-api-key', items_path: 'products', field_map: '', currency_rate: 85, markup_pct: 35, order_url: 'mock://demo/orders' },
  dummyjson: { name: 'DummyJSON (public test products)', kind: 'json', url: 'https://dummyjson.com/products?limit=100', api_key: '', auth_header: 'x-api-key', items_path: 'products', field_map: '', currency_rate: 85, markup_pct: 30, order_url: '' },
  csv: { name: 'My supplier CSV', kind: 'csv', url: 'https://', api_key: '', auth_header: 'x-api-key', items_path: '', field_map: '{"sku":"sku","name":"name","description":"description","brand":"brand","category":"category","price":"price","stock":"stock","images":"image"}', currency_rate: 1, markup_pct: 30, order_url: '' },
};
const EMPTY = { name: '', kind: 'json', url: 'https://', api_key: '', auth_header: 'x-api-key', items_path: '', field_map: '', currency_rate: 1, markup_pct: 30, order_url: '', active: true };

async function call(url, method, body) {
  const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || 'Something went wrong');
  return d;
}

export default function SuppliersPanel({ suppliers }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState({});
  const [error, setError] = useState('');

  async function act(key, fn, ok) {
    setBusy(key);
    try { const r = await fn(); if (ok) toast(typeof ok === 'function' ? ok(r) : ok); router.refresh(); return r; } catch (e) { toast(e.message, 'warn'); setResult((x) => ({ ...x, [key]: { error: e.message } })); }
    finally { setBusy(''); }
  }
  async function save(e) {
    e.preventDefault();
    setError('');
    setBusy('save');
    try {
      await call(form.id ? `/api/admin/suppliers/${form.id}` : '/api/admin/suppliers', form.id ? 'PATCH' : 'POST', form);
      toast('Supplier saved');
      setForm(null);
      router.refresh();
    } catch (err) { setError(err.message); }
    setBusy('');
  }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <div className="space-y-6">
      <section className="glass flex gap-3 !rounded-3xl p-5 text-sm text-ink2">
        <Info size={20} className="mt-0.5 shrink-0 text-accent2" />
        <div className="space-y-1.5">
          <p><b className="text-ink">How supplier connections work.</b> Add a supplier's product feed (a JSON API or CSV file). Press <b>Sync</b> to import their products into your store with your own markup. Prices and stock refresh on every sync. When a customer buys a supplier item, open the order and send it to the supplier (or place it on their website and record the reference).</p>
          <p className="text-muted">Shoppers never see the supplier name, cost or margin. API keys are stored on the server only. When you send an order to a supplier, the customer's name, phone, email and delivery address are shared with them so they can deliver it. Only suppliers who give you API or feed access can be connected: you cannot connect to a website that does not offer one.</p>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={() => { setError(''); setForm({ ...EMPTY }); }}><Plus size={16} /> Add supplier</button>
        <button className="btn-glass" onClick={() => { setError(''); setForm({ ...EMPTY, ...PRESETS.demo }); }}>Use built-in demo feed</button>
        <button className="btn-glass" onClick={() => { setError(''); setForm({ ...EMPTY, ...PRESETS.dummyjson }); }}>Try DummyJSON (public API)</button>
        <button className="btn-glass" onClick={() => { setError(''); setForm({ ...EMPTY, ...PRESETS.csv }); }}>CSV feed template</button>
      </div>

      {form && (
        <form onSubmit={save} className="glass glass-strong animate-pop-in space-y-4 !rounded-3xl p-6">
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-ink">{form.id ? 'Edit supplier' : 'Add supplier'}</h2><button type="button" onClick={() => setForm(null)} className="btn-glass !p-2" aria-label="Close"><X size={16} /></button></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2"><label className="label" htmlFor="sn">Supplier name</label><input id="sn" className="input" required value={form.name} onChange={set('name')} /></div>
            <div><label className="label" htmlFor="sk">Feed type</label><select id="sk" className="input" value={form.kind} onChange={set('kind')}><option value="json">JSON API</option><option value="csv">CSV file</option></select></div>
          </div>
          <div><label className="label" htmlFor="su">Product feed address</label><input id="su" className="input font-mono text-xs" required value={form.url} onChange={set('url')} placeholder="https://supplier.com/api/products" /></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="label" htmlFor="sa">API key {form.has_key && <span className="font-normal">(saved: leave blank to keep)</span>}</label><input id="sa" type="password" autoComplete="off" className="input" value={form.api_key || ''} onChange={set('api_key')} /></div>
            <div><label className="label" htmlFor="sh">Key header name</label><input id="sh" className="input" value={form.auth_header} onChange={set('auth_header')} /></div>
            <div><label className="label" htmlFor="sp">{form.kind === 'json' ? 'Product list path' : 'Not used for CSV'}</label><input id="sp" className="input" disabled={form.kind === 'csv'} value={form.items_path} onChange={set('items_path')} placeholder="products" /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="label" htmlFor="sr">Currency rate (supplier price × rate = your currency)</label><input id="sr" type="number" step="any" min="0" required className="input" value={form.currency_rate} onChange={set('currency_rate')} /></div>
            <div><label className="label" htmlFor="sm">Your markup %</label><input id="sm" type="number" step="any" min="0" max="500" required className="input" value={form.markup_pct} onChange={set('markup_pct')} /></div>
            <div><label className="label" htmlFor="so">Order address (optional)</label><input id="so" className="input font-mono text-xs" value={form.order_url} onChange={set('order_url')} placeholder="https://supplier.com/api/orders" /></div>
          </div>
          <div><label className="label" htmlFor="sf">Field map (optional JSON: your field → supplier field)</label><textarea id="sf" className="input min-h-20 font-mono text-xs" value={form.field_map} onChange={set('field_map')} placeholder='{"name":"title","price":"price","images":"images"}' /><p className="mt-1 text-xs text-muted">Leave blank for the standard layout (sku, title, description, brand, category, price, stock, images). Dots reach into nested fields, like "meta.barcode". Remember to set the rate for foreign-currency feeds (check today's exchange rate).</p></div>
          <label className="flex items-center gap-2 text-sm text-ink2"><input type="checkbox" checked={form.active !== false} onChange={set('active')} className="h-4 w-4 accent-[rgb(var(--accent))]" /> Active</label>
          {error && <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
          <div className="flex gap-2"><button className="btn-primary" disabled={busy === 'save'}>{busy === 'save' && <Loader2 size={16} className="animate-spin" />} Save supplier</button><button type="button" className="btn-glass" onClick={() => setForm(null)}>Cancel</button></div>
        </form>
      )}

      <div className="space-y-4">
        {suppliers.length === 0 && <div className="glass !rounded-3xl px-6 py-16 text-center text-muted"><Truck size={36} className="mx-auto mb-2" />No suppliers yet.</div>}
        {suppliers.map((s) => {
          const r = result[`t${s.id}`];
          return (
            <section key={s.id} className="glass !rounded-3xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold text-ink">{s.name}</h3><span className="chip bg-tint/10 text-ink2">{s.kind.toUpperCase()}</span>{!s.active && <span className="chip bg-muted/20 text-ink2">Paused</span>}</div>
                  <p className="mt-1 truncate font-mono text-xs text-muted">{s.url}</p>
                  <p className="mt-2 text-sm text-ink2">{s.product_count} products · markup {s.markup_pct}% · rate × {s.currency_rate}{s.order_url ? ' · orders can be sent automatically' : ' · manual ordering'}</p>
                  <p className={`mt-1 text-xs ${s.last_sync_status.startsWith('Failed') ? 'text-danger' : 'text-muted'}`}>{s.last_sync_at ? `Last sync ${new Date(s.last_sync_at + 'Z').toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}: ${s.last_sync_status}` : 'Never synced'}</p></div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-glass !py-2" disabled={!!busy} onClick={async () => { const x = await act(`t${s.id}`, () => call(`/api/admin/suppliers/${s.id}/test`, 'POST'), 'Connection works'); if (x) setResult((v) => ({ ...v, [`t${s.id}`]: x })); }}>{busy === `t${s.id}` ? <Loader2 size={15} className="animate-spin" /> : <PlugZap size={15} />} Test</button>
                  <button className="btn-primary !py-2" disabled={!!busy} onClick={() => act(`s${s.id}`, () => call(`/api/admin/suppliers/${s.id}/sync`, 'POST'), (r) => r.message)}>{busy === `s${s.id}` ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Sync now</button>
                  <button className="btn-glass !p-2.5" aria-label="Edit supplier" onClick={() => { setError(''); setForm({ ...s, api_key: '' }); }}><Pencil size={15} /></button>
                  <button className="btn-danger !p-2.5" aria-label="Delete supplier" disabled={!!busy} onClick={() => { if (confirm(`Delete ${s.name}? Imported products stay in your store as your own items.`)) act(`d${s.id}`, () => call(`/api/admin/suppliers/${s.id}`, 'DELETE'), 'Supplier deleted'); }}><Trash2 size={15} /></button>
                </div>
              </div>
              {r && !r.error && <div className="glass glass-flat mt-4 !rounded-2xl p-4 text-sm"><p className="font-semibold text-ok">Found {r.total} items · {r.usable} usable{r.skipped ? ` · ${r.skipped} skipped (missing name, SKU or price)` : ''}</p><ul className="mt-2 space-y-1 text-ink2">{r.sample.map((x) => <li key={x.sku}>{x.name} <span className="text-xs text-muted">({x.sku}) cost {x.cost} · stock {x.stock}</span></li>)}</ul></div>}
              {r?.error && <p className="mt-4 rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{r.error}</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
