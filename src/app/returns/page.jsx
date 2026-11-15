import LegalPage from '@/components/LegalPage';
import { getSettings } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Returns and Refunds' };

export default async function Page() {
  const s = await getSettings();
  const sections = [
    ['7-day returns', [
      'You can return most items within 7 days of delivery if they are unused, in their original packaging, and with all tags and accessories.',
      'Some items cannot be returned, such as products that are personal or hygiene-related once opened, and items damaged after delivery. A product page may list extra conditions.',
    ]],
    ['How to start a return', [
      `Email ${s.support_email} with your order number and the reason for the return. We will reply with the next steps. Please do not send items back before we confirm.`,
    ]],
    ['Damaged or wrong items', ['If your item arrives damaged, defective or different from what you ordered, tell us within 48 hours of delivery with photos, and we will replace it or refund you.']],
    ['Refunds', [
      'Once we receive and check the returned item, we refund the amount paid for it. Online payments go back to the original payment method. Cash-on-delivery refunds are sent by bank transfer or UPI.',
      'Refunds usually arrive within 7 to 10 business days after approval, depending on your bank. Original shipping fees are refunded only if the return is our error.',
    ]],
    ['Cancelling an order', ['You can ask us to cancel an order before it ships. Once it has shipped, please refuse delivery or use the returns process above.']],
  ];
  return (
    <LegalPage
      title="Returns and Refunds"
      updated="16 November 2026"
      storeName={s.store_name}
      intro="This store is a student project. This page describes how returns are designed to work."
      sections={sections}
    />
  );
}
