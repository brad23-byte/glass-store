import LegalPage from '@/components/LegalPage';
import { getSettings } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Privacy Policy' };

export default async function Page() {
  const s = await getSettings();
  const sections = [
    ['What we collect', [
      'When you create an account we store your name, email address and a scrambled (hashed) version of your password. When you place an order we store your name, email, phone number, delivery address, and the items, totals and payment status of the order.',
      'We do not store card numbers, CVV codes or UPI PINs. Those are handled by the payment provider.',
    ]],
    ['How we use it', [
      'We use your details to process and deliver your order, show your order history, contact you about an order, and keep the store secure. We do not sell your information.',
    ]],
    ['Who we share it with', [
      'Some items are supplied by partner suppliers. When you buy one of those items we share your name, phone number, email and delivery address with that supplier so they can deliver it.',
      'The site runs on third-party services: Vercel hosts the website and Turso hosts the database. When online payments are switched on, the payment provider processes your payment.',
    ]],
    ['Cookies and browser storage', [
      'We use one sign-in cookie to keep you logged in. Your cart and your light or dark theme choice are saved in your browser. We do not use advertising cookies.',
    ]],
    ['How long we keep it', [
      'We keep account and order records for as long as they are needed to run the store and handle returns or disputes. You can ask us to delete your account at any time.',
    ]],
    ['Your choices', [
      `To see, correct or delete your information, email ${s.support_email} from the address on your account.`,
    ]],
  ];
  return (
    <LegalPage
      title="Privacy Policy"
      updated="16 November 2026"
      storeName={s.store_name}
      intro="This store is a student project. Please do not enter sensitive personal information you would not want stored."
      sections={sections}
    />
  );
}
