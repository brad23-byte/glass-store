'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from './Providers';

// One-click "cash received" for a cash-on-delivery order, used in the orders list.
export default function QuickComplete({ orderId, number }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function go() {
    if (!confirm(`Confirm: the customer received ${number} and you collected the cash? This completes the sale and cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'delivered' }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Something went wrong');
      toast('Sale completed');
      router.refresh();
    } catch (e) {
      toast(e.message, 'warn');
    }
    setBusy(false);
  }

  return (
    <button disabled={busy} className="btn-primary !px-3 !py-2 text-xs" onClick={go}>
      {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Cash received
    </button>
  );
}
