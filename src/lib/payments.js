import crypto from 'crypto';

export function paymentMethods(settings) {
  const razorpay = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  const demo = process.env.NODE_ENV !== 'production' ? process.env.ALLOW_DEMO_PAYMENTS !== 'false' : process.env.ALLOW_DEMO_PAYMENTS === 'true';
  return { razorpay, demo, cod: !!settings.cod_enabled, keyId: razorpay ? process.env.RAZORPAY_KEY_ID : null };
}

const basic = () => 'Basic ' + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');

// Creates the payment order on Razorpay's side. Amount is taken from OUR database, never from the browser.
export async function createRazorpayOrder(order) {
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: basic(), 'content-type': 'application/json' },
    body: JSON.stringify({ amount: order.total, currency: 'INR', receipt: order.number, notes: { order_number: order.number } }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id) throw new Error(data?.error?.description || 'Could not start the payment');
  return data;
}

const safeEq = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Razorpay checkout signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret)
export function verifyCheckoutSignature(razorpayOrderId, paymentId, signature, secret = process.env.RAZORPAY_KEY_SECRET) {
  if (!secret || !razorpayOrderId || !paymentId || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${razorpayOrderId}|${paymentId}`).digest('hex');
  return safeEq(expected, signature);
}

// Webhook signature: HMAC_SHA256(raw_body, webhook_secret)
export function verifyWebhookSignature(rawBody, signature, secret = process.env.RAZORPAY_WEBHOOK_SECRET) {
  if (!secret || !signature) return false;
  return safeEq(crypto.createHmac('sha256', secret).update(rawBody).digest('hex'), signature);
}

export async function refundRazorpay(paymentId, amount) {
  const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: 'POST',
    headers: { Authorization: basic(), 'content-type': 'application/json' },
    body: JSON.stringify({ amount }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.description || 'Refund failed');
  return data;
}
