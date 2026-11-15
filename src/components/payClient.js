'use client';

// Browser side of payments. The server decides amounts and confirms payments; nothing here is trusted.
export function luhn(num) {
  const d = String(num).replace(/\D/g, '');
  if (d.length < 12 || d.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
}

export function validateTestCard(c) {
  const n = c.number.replace(/\D/g, '');
  if (!luhn(n)) return 'Enter a valid card number';
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(c.expiry.trim());
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) return 'Enter the expiry as MM/YY';
  const exp = new Date(2000 + Number(m[2]), Number(m[1]), 1);
  if (exp <= new Date()) return 'This card has expired';
  if (!/^\d{3,4}$/.test(c.cvc)) return 'Enter the 3 or 4 digit security code';
  if (c.name.trim().length < 2) return 'Enter the name on the card';
  return '';
}

export function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load the payment window. Check your connection.'));
    document.body.appendChild(s);
  });
}

async function post(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || 'Something went wrong');
  return d;
}

// Resolves { paid: true } on success, { paid: false, dismissed: true } if the customer closes the window.
export async function payOrder({ number, token, method, card, storeName }) {
  if (method === 'demo') {
    // Card details never leave the browser. Only the outcome of the test card is sent.
    const n = (card?.number || '').replace(/\D/g, '');
    await post('/api/payments/demo', { number, token, outcome: n === '4000000000000002' ? 'declined' : 'success' });
    return { paid: true };
  }
  if (method === 'razorpay') {
    await loadRazorpay();
    const c = await post('/api/payments/razorpay/create', { number, token });
    return new Promise((resolve, reject) => {
      const rz = new window.Razorpay({
        key: c.keyId, amount: c.amount, currency: c.currency, name: storeName || 'Store', description: `Order ${number}`, order_id: c.razorpayOrderId,
        prefill: { name: c.name, email: c.email, contact: c.phone },
        theme: { color: '#6366f1' },
        handler: async (r) => {
          try {
            await post('/api/payments/razorpay/verify', { number, token, ...r });
            resolve({ paid: true });
          } catch (e) { reject(e); }
        },
        modal: { ondismiss: () => resolve({ paid: false, dismissed: true }) },
      });
      rz.on('payment.failed', (r) => reject(new Error(r?.error?.description || 'Payment failed')));
      rz.open();
    });
  }
  return { paid: false };
}
