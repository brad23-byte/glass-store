'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, Lock, Check, Package, Truck, CircleCheck, XCircle, Clock, Printer } from 'lucide-react';
import PaymentSlot from './PaymentSlot';
import { payOrder, validateTestCard } from './payClient';
import { useToast } from './Providers';
import { fmt } from '@/lib/money';

import { STATUS } from '@/lib/status';

export function StatusChip({ status }) {
  const s = STATUS[status] || { label: status, tone: 'bg-tint/10 text-ink2' };
  return <span className={`chip ${s.tone}`}>{s.label}</span>;
}

export function Timeline({ order }) {
  const steps = [['Placed', Package], ['Confirmed', Check], ['Shipped', Truck], ['Delivered', CircleCheck]];
  if (order.status === 'cancelled' || order.status === 'refunded') {
    return <p className="flex items-center gap-2 rounded-2xl bg-danger/10 p-4 text-sm font-semibold text-danger"><XCircle size={18} /> This order was {order.status}.</p>;
  }
  const reached = order.status === 'pending_payment' ? 0 : order.status === 'processing' ? 1 : order.status === 'shipped' ? 2 : 3;
  return (
    <ol className="flex items-start justify-between gap-2">
      {steps.map(([l, Icon], i) => (
        <li key={l} className="flex flex-1 flex-col items-center gap-1.5 text-center">
          <span className={`flex h-11 w-11 items-center justify-center rounded-full transition ${i <= reached ? 'bg-gradient-to-br from-accent to-accent2 text-onaccent shadow-lg' : 'bg-tint/10 text-muted'}`}><Icon size={19} /></span>
          <span className={`text-xs font-semibold ${i <= reached ? 'text-ink' : 'text-muted'}`}>{l}</span>
        </li>
      ))}
    </ol>
  );
}

export function PayPending({ order, token, methods, storeName, symbol }) {
  const router = useRouter();
  const toast = useToast();
  const method = order.payment_method === 'razorpay' && methods.razorpay ? 'razorpay' : methods.demo ? 'demo' : 'razorpay';
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function pay() {
    setError('');
    if (method === 'demo') { const m = validateTestCard(card); if (m) return setError(m); }
    setBusy(true);
    try {
      const r = await payOrder({ number: order.number, token, method, card, storeName });
      if (r.paid) { toast('Payment successful'); router.refresh(); }
    } catch (e) { setError(e.message); }
    setBusy(false);
  }
  return (
    <section className="glass space-y-4 !rounded-3xl p-6">
      <p className="flex items-center gap-2 font-bold text-ink"><Clock size={18} className="text-warn" /> Complete your payment</p>
      <p className="text-sm text-muted">Your items are reserved for 30 minutes from when you placed the order.</p>
      {method === 'demo' && <PaymentSlot methods={{ demo: true }} method="demo" setMethod={() => {}} card={card} setCard={setCard} />}
      {error && <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      <button type="button" onClick={pay} disabled={busy} className="btn-primary w-full !py-3.5">{busy ? <Loader2 size={18} className="animate-spin" /> : <Lock size={16} />} Pay {fmt(order.total, symbol)}</button>
    </section>
  );
}

export function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="btn-glass no-print"><Printer size={16} /> Print receipt</button>;
}
