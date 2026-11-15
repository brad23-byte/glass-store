import CartPage from '@/components/CartPage';
import { getSettings } from '@/lib/db';

export const metadata = { title: 'Cart' };
export default async function Cart() {
  const s = await getSettings();
  return (
    <div className="mx-auto max-w-6xl px-3 pt-8 sm:px-5 sm:pt-12">
      <h1 className="mb-6 text-4xl font-extrabold text-ink sm:text-5xl">Your cart</h1>
      <CartPage symbol={s.currency_symbol} />
    </div>
  );
}
