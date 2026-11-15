'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, Save, Trash2, CheckCircle2, XCircle, Plus, Copy } from 'lucide-react';
import { useToast } from './Providers';
import { fmt } from '@/lib/money';

async function call(url, method, body) {
  const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || 'Something went wrong');
  return d;
}

export default function AdminSettings({ settings, coupons, payments }) {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState({ ...settings, shipping_fee: settings.shipping_fee / 100, free_shipping_over: settings.free_shipping_over / 100 });
  const [busy, setBusy] = useState('');
  const [c, setC] = useState({ code: '', kind: 'percent', value: '', min_subtotal: '', max_uses: '', expires_at: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  async function saveSettings(e) {
    e.preventDefault();
    setBusy('s'); setErr('');
    try { await call('/api/admin/settings', 'PUT', f); toast('Settings saved'); router.refresh(); } catch (x) { setErr(x.message); }
    setBusy('');
  }
  async function addCoupon(e) {
    e.preventDefault();
    setBusy('c'); setErr('');
    try { await call('/api/admin/coupons', 'POST', c); toast('Coupon added'); setC({ code: '', kind: 'percent', value: '', min_subtotal: '', max_uses: '', expires_at: '' }); router.refresh(); } catch (x) { setErr(x.message); }
    setBusy('');
  }

  const Row = ({ ok, title, text }) => (<li className="flex items-start gap-3 py-3">{ok ? <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-ok" /> : <XCircle size={20} className="mt-0.5 shrink-0 text-muted" />}<div><p className="font-semibold text-ink">{title}</p><p className="text-sm text-muted">{text}</p></div></li>);

  return (
    <div className="space-y-6">
      <section className="glass !rounded-3xl p-6">
        <h2 className="mb-1 text-lg font-bold text-ink">Payments</h2>
        <ul className="divide-y divide-tint/10">
          <Row ok={payments.razorpay} title="Online payments (Razorpay: UPI, cards, netbanking)" text={payments.razorpay ? 'Connected. Real payments are switched on.' : 'Not connected. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.local and restart to take real payments.'} />
          <Row ok={payments.demo} title="Test card (no real money)" text={payments.demo ? 'On: customers can try checkout with a test card. Turn this off before going live (set ALLOW_DEMO_PAYMENTS=false).' : 'Off.'} />
          <Row ok={settings.cod_enabled} title="Cash on delivery" text="Switch on or off below." />
        </ul>
        {payments.razorpay && (
          <div className="mt-3 rounded-2xl bg-tint/10 p-4 text-sm text-ink2"><p className="font-semibold text-ink">Webhook (recommended)</p><p className="mt-1">In the Razorpay dashboard add this webhook for the events <b>payment.captured</b>, <b>order.paid</b> and <b>payment.failed</b>, and put the secret in RAZORPAY_WEBHOOK_SECRET:</p>
            <p className="mt-2 flex items-center gap-2 break-all font-mono text-xs text-ink"><span>{origin}/api/payments/razorpay/webhook</span><button type="button" onClick={() => { navigator.clipboard?.writeText(`${origin}/api/payments/razorpay/webhook`); toast('Copied'); }} className="btn-glass !p-1.5" aria-label="Copy"><Copy size={13} /></button></p><p className="mt-1 text-xs text-muted">Razorpay needs a public https address, so this works once the site is online.</p></div>
        )}
      </section>

      <form onSubmit={saveSettings} className="glass space-y-4 !rounded-3xl p-6">
        <h2 className="text-lg font-bold text-ink">Store</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="a1">Store name</label><input id="a1" className="input" required value={f.store_name} onChange={set('store_name')} /></div>
          <div><label className="label" htmlFor="a2">Tagline</label><input id="a2" className="input" value={f.tagline} onChange={set('tagline')} /></div>
          <div><label className="label" htmlFor="a3">Support email</label><input id="a3" className="input" value={f.support_email} onChange={set('support_email')} /></div>
          <div><label className="label" htmlFor="a4">Currency symbol</label><input id="a4" className="input" maxLength={3} value={f.currency_symbol} onChange={set('currency_symbol')} /></div>
          <div><label className="label" htmlFor="a5">Shipping fee ({f.currency_symbol})</label><input id="a5" type="number" min="0" step="0.01" className="input" value={f.shipping_fee} onChange={set('shipping_fee')} /></div>
          <div><label className="label" htmlFor="a6">Free shipping above ({f.currency_symbol})</label><input id="a6" type="number" min="0" step="0.01" className="input" value={f.free_shipping_over} onChange={set('free_shipping_over')} /></div>
          <div><label className="label" htmlFor="a7">Low-stock warning at</label><input id="a7" type="number" min="0" className="input" value={f.low_stock_threshold} onChange={set('low_stock_threshold')} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink2"><input type="checkbox" checked={f.cod_enabled} onChange={set('cod_enabled')} className="h-4 w-4 accent-[rgb(var(--accent))]" /> Allow cash on delivery</label>
        {err && <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{err}</p>}
        <button className="btn-primary" disabled={busy === 's'}>{busy === 's' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save settings</button>
      </form>

      <section className="glass !rounded-3xl p-6">
        <h2 className="mb-4 text-lg font-bold text-ink">Discount codes</h2>
        <ul className="mb-5 divide-y divide-tint/10">
          {coupons.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div><p className="font-mono font-bold text-ink">{x.code}</p><p className="text-xs text-muted">{x.kind === 'percent' ? `${x.value}% off` : `${fmt(x.value, settings.currency_symbol)} off`}{x.min_subtotal ? ` · min ${fmt(x.min_subtotal, settings.currency_symbol)}` : ''} · used {x.uses}{x.max_uses ? `/${x.max_uses}` : ''}{x.expires_at ? ` · expires ${x.expires_at}` : ''}</p></div>
              <div className="flex gap-2"><button className={`btn !py-1.5 ${x.active ? 'bg-ok/15 text-ok' : 'bg-muted/20 text-ink2'}`} onClick={async () => { await call(`/api/admin/coupons/${x.id}`, 'PATCH', { active: !x.active }); router.refresh(); }}>{x.active ? 'Active' : 'Paused'}</button><button className="btn-danger !p-2" aria-label={`Delete ${x.code}`} onClick={async () => { if (confirm(`Delete ${x.code}?`)) { await call(`/api/admin/coupons/${x.id}`, 'DELETE'); router.refresh(); } }}><Trash2 size={14} /></button></div>
            </li>
          ))}
          {coupons.length === 0 && <li className="py-3 text-sm text-muted">No codes yet.</li>}
        </ul>
        <form onSubmit={addCoupon} className="grid items-end gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div><label className="label" htmlFor="c1">Code</label><input id="c1" className="input uppercase" required value={c.code} onChange={(e) => setC({ ...c, code: e.target.value.toUpperCase() })} /></div>
          <div><label className="label" htmlFor="c2">Type</label><select id="c2" className="input" value={c.kind} onChange={(e) => setC({ ...c, kind: e.target.value })}><option value="percent">Percent off</option><option value="fixed">Fixed amount</option></select></div>
          <div><label className="label" htmlFor="c3">{c.kind === 'percent' ? 'Percent' : 'Amount'}</label><input id="c3" type="number" min="1" step="any" required className="input" value={c.value} onChange={(e) => setC({ ...c, value: e.target.value })} /></div>
          <div><label className="label" htmlFor="c4">Min order</label><input id="c4" type="number" min="0" className="input" value={c.min_subtotal} onChange={(e) => setC({ ...c, min_subtotal: e.target.value })} /></div>
          <div><label className="label" htmlFor="c5">Max uses</label><input id="c5" type="number" min="1" className="input" value={c.max_uses} onChange={(e) => setC({ ...c, max_uses: e.target.value })} /></div>
          <button className="btn-primary" disabled={busy === 'c'}>{busy === 'c' ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Add</button>
        </form>
      </section>
    </div>
  );
}
