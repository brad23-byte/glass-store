'use client';

import { CreditCard, Smartphone, Banknote, ShieldCheck, Lock, FlaskConical } from 'lucide-react';

const fmtCard = (v) => v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
const fmtExp = (v) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };

// The "payment slot": pick a method, enter test-card details if needed.
export default function PaymentSlot({ methods, method, setMethod, card, setCard }) {
  const opts = [
    methods.razorpay && { id: 'razorpay', icon: Smartphone, title: 'UPI, cards & netbanking', desc: 'Pay securely through Razorpay' },
    methods.demo && { id: 'demo', icon: FlaskConical, title: 'Test card (no real money)', desc: 'Try the checkout with a test card' },
    methods.cod && { id: 'cod', icon: Banknote, title: 'Cash on delivery', desc: 'Pay when your order arrives' },
  ].filter(Boolean);

  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 flex items-center gap-2 text-lg font-bold text-ink"><CreditCard size={18} /> Payment</legend>
      {opts.length === 0 && <p className="rounded-2xl bg-warn/10 p-4 text-sm text-warn">No payment method is available right now. Please contact the store.</p>}
      {opts.map(({ id, icon: Icon, title, desc }) => (
        <label key={id} className={`glass glass-flat flex cursor-pointer items-center gap-4 !rounded-2xl p-4 transition ${method === id ? 'ring-2 ring-accent2' : 'opacity-80 hover:opacity-100'}`}>
          <input type="radio" name="pay" value={id} checked={method === id} onChange={() => setMethod(id)} className="sr-only" />
          <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${method === id ? 'bg-gradient-to-br from-accent to-accent2 text-onaccent' : 'bg-tint/10 text-ink2'}`}><Icon size={20} /></span>
          <span className="flex-1"><span className="block font-semibold text-ink">{title}</span><span className="text-sm text-muted">{desc}</span></span>
          <span className={`h-5 w-5 rounded-full border-2 ${method === id ? 'border-accent2 bg-accent2 shadow-[inset_0_0_0_4px_rgb(var(--bg-a))]' : 'border-muted/50'}`} />
        </label>
      ))}

      {method === 'demo' && (
        <div className="glass glass-flat animate-pop-in space-y-3 !rounded-2xl p-5">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent via-accent2 to-accent3 p-5 text-onaccent shadow-lg">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/25 blur-xl" />
            <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Test card</p>
            <p className="mt-4 font-mono text-xl tracking-widest">{card.number || '•••• •••• •••• ••••'}</p>
            <div className="mt-4 flex justify-between text-sm"><span>{card.name || 'CARDHOLDER'}</span><span>{card.expiry || 'MM/YY'}</span></div>
          </div>
          <div><label className="label" htmlFor="cn">Card number</label><input id="cn" className="input font-mono" inputMode="numeric" autoComplete="off" placeholder="4242 4242 4242 4242" value={card.number} onChange={(e) => setCard({ ...card, number: fmtCard(e.target.value) })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="ce">Expiry</label><input id="ce" className="input font-mono" inputMode="numeric" autoComplete="off" placeholder="12/30" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: fmtExp(e.target.value) })} /></div>
            <div><label className="label" htmlFor="cv">CVC</label><input id="cv" className="input font-mono" inputMode="numeric" autoComplete="off" placeholder="123" maxLength={4} value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, '') })} /></div>
          </div>
          <div><label className="label" htmlFor="cm">Name on card</label><input id="cm" className="input" autoComplete="off" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} /></div>
          <p className="text-xs text-muted">Test mode: use <b className="text-ink2">4242 4242 4242 4242</b> with any future expiry and CVC. <b className="text-ink2">4000 0000 0000 0002</b> is declined. Card details stay in your browser and are never sent or stored.</p>
        </div>
      )}

      <p className="flex items-center gap-1.5 pt-1 text-xs text-muted"><Lock size={12} /> Payments are encrypted. <ShieldCheck size={12} className="ml-1" /> We never store card details.</p>
    </fieldset>
  );
}
