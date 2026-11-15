import LegalPage from '@/components/LegalPage';
import { getSettings } from '@/lib/db';
import { fmt } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Shipping Policy' };

export default async function Page() {
  const s = await getSettings();
  const sections = [
    ['Where we deliver', ['We deliver across India. Enter a full address and a valid 6-digit PIN code at checkout.']],
    ['Dispatch and delivery times', [
      'Orders are dispatched within 1 to 2 business days. Delivery usually takes 3 to 7 days after dispatch, depending on your location.',
      'Delivery estimates are not guarantees. Weather, couriers and public holidays can cause delays.',
    ]],
    ['Shipping charges', [
      `Shipping is ${fmt(s.shipping_fee, s.currency_symbol)} per order. Orders of ${fmt(s.free_shipping_over, s.currency_symbol)} or more after discounts ship free.`,
    ]],
    ['Tracking', ['When your order ships, its status changes to Shipped and a tracking number and link appear on your order page, found under My orders or through the link you received at checkout.']],
    ['Cash on delivery', [
      s.cod_enabled ? 'Cash on delivery is available. Please keep the exact amount ready. Repeated refused deliveries may mean we stop offering this option on your orders.' : 'Cash on delivery is currently not available.',
    ]],
    ['Wrong address or failed delivery', [`If an order cannot be delivered because of a wrong address or no one is available, email ${s.support_email} quickly so we can try again or cancel it.`]],
  ];
  return (
    <LegalPage
      title="Shipping Policy"
      updated="16 November 2026"
      storeName={s.store_name}
      intro="This store is a student project. This page describes how shipping is designed to work."
      sections={sections}
    />
  );
}
