'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, Truck, CheckCircle2, XCircle, RotateCcw, Send, ClipboardCheck } from 'lucide-react';
import { useToast } from './Providers';

const NEXT = { processing: ['shipped', 'cancelled'], shipped: ['delivered', 'cancelled'], delivered: ['refunded'], pending_payment: ['cancelled'], cancelled: ['refunded'], refunded: [] };
const LABEL = { shipped: 'Mark as shipped', delivered: 'Mark as delivered', cancelled: 'Cancel order', refunded: 'Mark as refunded' };
const ICON = { shipped: Truck, delivered: CheckCircle2, cancelled: XCircle, refunded: RotateCcw };

async function call(url, method, body) {
  const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || 'Something went wrong');
  return d;
}

export default function OrderActions({ order, supplierGroups }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState('');
  const [track, setTrack] = useState({ number: order.tracking_number || '', url: order.tracking_url || '' });
  const [note, setNote] = useState(order.note || '');
  const [refs, setRefs] = useState({});

  async function run(key, fn, ok) {
    setBusy(key);
    try { await fn(); toast(ok); router.refresh(); } catch (e) { toast(e.message, 'warn'); }
    setBusy('');
  }
  const next = NEXT[order.status] || [];

  return (
    <div className="space-y-5">
      <section className="glass !rounded-3xl p-6">
        <h3 className="mb-3 text-lg font-bold text-ink">Fulfilment</h3>
        <div className="flex flex-wrap gap-2">
          {next.filter((s) => s !== 'refunded' || order.payment_status !== 'paid').map((s) => {
            const Icon = ICON[s];
            return (
              <button key={s} disabled={!!busy} className={s === 'cancelled' ? 'btn-danger' : 'btn-primary'}
                onClick={() => { if (s === 'cancelled' && !confirm('Cancel this order? Stock will be returned.')) return; run(s, () => call(`/api/admin/orders/${order.id}`, 'PATCH', { status: s, tracking_number: track.number, tracking_url: track.url }), `Order ${s}`); }}>
                {busy === s ? <Loader2 size={15} className="animate-spin" /> : <Icon size={15} />} {LABEL[s]}
              </button>
            );
          })}
          {order.payment_status === 'paid' && !['refunded', 'pending_payment'].includes(order.status) && (
            <button disabled={!!busy} className="btn-danger" onClick={() => { if (confirm('Refund the full amount to the customer? If paid online, the refund is sent to Razorpay.')) run('refund', () => call(`/api/admin/orders/${order.id}/refund`, 'POST'), 'Refund recorded'); }}>
              {busy === 'refund' ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />} Refund customer
            </button>
          )}
          {next.length === 0 && order.status === 'refunded' && <p className="text-sm text-muted">This order is closed.</p>}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="tn">Tracking number</label><input id="tn" className="input" value={track.number} onChange={(e) => setTrack({ ...track, number: e.target.value })} /></div>
          <div><label className="label" htmlFor="tu">Tracking link</label><input id="tu" className="input" placeholder="https://" value={track.url} onChange={(e) => setTrack({ ...track, url: e.target.value })} /></div>
        </div>
        <div className="mt-3"><label className="label" htmlFor="nt">Internal note (not shown to the customer)</label><textarea id="nt" className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} /></div>
        <button disabled={!!busy} className="btn-glass mt-3" onClick={() => run('save', () => call(`/api/admin/orders/${order.id}`, 'PATCH', { tracking_number: track.number, tracking_url: track.url, note }), 'Saved')}>
          {busy === 'save' ? <Loader2 size={15} className="animate-spin" /> : <ClipboardCheck size={15} />} Save tracking and note
        </button>
      </section>

      {supplierGroups.length > 0 && (
        <section className="glass !rounded-3xl p-6">
          <h3 className="mb-1 text-lg font-bold text-ink">Supplier fulfilment</h3>
          <p className="mb-4 text-sm text-muted">Items from partner suppliers are ordered from the supplier once the customer has paid (or chosen cash on delivery).</p>
          <div className="space-y-4">
            {supplierGroups.map((g) => (
              <div key={g.id} className="glass glass-flat !rounded-2xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold text-ink">{g.name}</p><span className={`chip ${g.pending ? 'bg-warn/15 text-warn' : 'bg-ok/15 text-ok'}`}>{g.pending ? `${g.pending} item(s) to order` : 'Ordered'}</span></div>
                <ul className="mt-2 space-y-1 text-sm text-ink2">{g.items.map((i) => (<li key={i.id} className="flex justify-between gap-3"><span className="truncate">{i.qty} × {i.name} <span className="text-xs text-muted">({i.supplier_sku})</span></span><span className="text-xs text-muted">{i.fulfilment === 'forwarded' ? `Ref ${i.supplier_ref}` : 'Not ordered yet'}</span></li>))}</ul>
                {g.pending > 0 && (
                  <div className="mt-3 space-y-2">
                    {g.canForward && <button disabled={!!busy || !['processing', 'shipped'].includes(order.status) || order.payment_status === 'unpaid'} className="btn-primary !py-2" onClick={() => run(`fw${g.id}`, () => call(`/api/admin/orders/${order.id}/supplier`, 'POST', { supplier_id: g.id, mode: 'forward' }), 'Sent to supplier')}>{busy === `fw${g.id}` ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send order to supplier</button>}
                    <div className="flex gap-2"><input className="input !py-2" placeholder="Or enter the reference after ordering on their website" value={refs[g.id] || ''} onChange={(e) => setRefs({ ...refs, [g.id]: e.target.value })} aria-label="Supplier order reference" /><button disabled={!!busy || !(refs[g.id] || '').trim()} className="btn-glass !py-2" onClick={() => run(`mn${g.id}`, () => call(`/api/admin/orders/${order.id}/supplier`, 'POST', { supplier_id: g.id, mode: 'manual', ref: refs[g.id] }), 'Recorded')}>Record</button></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
