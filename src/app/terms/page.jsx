import LegalPage from '@/components/LegalPage';
import { getSettings } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Terms of Service' };

export default async function Page() {
  const s = await getSettings();
  const sections = [
    ['1. Using this site', [
      `By browsing or placing an order on ${s.store_name} you agree to these terms. If you do not agree, please do not use the site.`,
      'Please give accurate details when you create an account or place an order, and keep your password private. You are responsible for activity on your account.',
    ]],
    ['2. Products and prices', [
      'Prices are shown in Indian rupees and include the discount shown on the product page. Shipping is added at checkout.',
      'We try to keep descriptions, photos, prices and stock correct, but mistakes can happen. If an item is priced wrongly or sells out, we may cancel the order and refund anything you paid.',
    ]],
    ['3. Orders and payment', [
      'Your order is placed when you complete checkout. It is confirmed once payment succeeds, or straight away for cash on delivery.',
      'Card and UPI details are handled by the payment provider and are never stored on this site. While the store is in test mode, no real money is charged.',
    ]],
    ['4. Cancellations, returns and refunds', [
      'You can ask us to cancel an order before it ships. Returns and refunds follow our Returns page.',
    ]],
    ['5. Our responsibility', [
      'We will do our reasonable best to deliver what you order. To the extent the law allows, we are not responsible for delays caused by couriers or events outside our control, or for indirect losses. Nothing here limits your rights under Indian consumer law.',
    ]],
    ['6. Changes to these terms', [
      'We may update these terms from time to time. The date at the top shows when they last changed.',
    ]],
    ['7. Contact', [`Questions about these terms or an order? Email ${s.support_email}.`]],
  ];
  return (
    <LegalPage
      title="Terms of Service"
      updated="16 November 2026"
      storeName={s.store_name}
      intro="This store is a student project. These terms describe how it is designed to work."
      sections={sections}
    />
  );
}
