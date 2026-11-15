export const STATUS = {
  pending_payment: { label: 'Awaiting payment', tone: 'bg-warn/15 text-warn' },
  processing: { label: 'Processing', tone: 'bg-accent2/15 text-accent2' },
  shipped: { label: 'Shipped', tone: 'bg-accent/15 text-accent' },
  delivered: { label: 'Delivered', tone: 'bg-ok/15 text-ok' },
  cancelled: { label: 'Cancelled', tone: 'bg-danger/15 text-danger' },
  refunded: { label: 'Refunded', tone: 'bg-muted/20 text-ink2' },
};
export const PAY = { unpaid: 'Unpaid', paid: 'Paid', cod: 'Cash on delivery', failed: 'Payment failed', refunded: 'Refunded' };
export const METHOD = { razorpay: 'Online (Razorpay)', demo: 'Test card', cod: 'Cash on delivery' };
