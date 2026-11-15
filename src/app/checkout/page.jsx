import CheckoutForm from '@/components/CheckoutForm';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/db';
import { paymentMethods } from '@/lib/payments';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Checkout' };

export default async function Checkout({ searchParams }) {
  const s = getSettings();
  const session = await getSession();
  const m = paymentMethods(s);
  return (
    <div className="mx-auto max-w-6xl px-3 pt-8 sm:px-5 sm:pt-12">
      <h1 className="mb-6 text-4xl font-extrabold text-ink sm:text-5xl">Checkout</h1>
      <CheckoutForm methods={{ razorpay: m.razorpay, demo: m.demo, cod: m.cod }} symbol={s.currency_symbol} storeName={s.store_name} prefill={{ name: session?.name || '', email: session?.email || '' }} initialCoupon={typeof searchParams.coupon === 'string' ? searchParams.coupon.slice(0, 20) : ''} />
    </div>
  );
}
