import { getDb, getSettings } from '@/lib/db';
import { paymentMethods } from '@/lib/payments';
import AdminSettings from '@/components/AdminSettings';

export const dynamic = 'force-dynamic';

export default function AdminSettingsPage() {
  const s = getSettings();
  const m = paymentMethods(s);
  const coupons = getDb().prepare('SELECT * FROM coupons ORDER BY id DESC').all().map((c) => ({ ...c, active: !!c.active }));
  return (<><div><h1 className="text-3xl font-extrabold text-ink sm:text-4xl">Settings</h1><p className="text-muted">Store, payments and discount codes</p></div><AdminSettings settings={s} coupons={coupons} payments={{ razorpay: m.razorpay, demo: m.demo }} /></>);
}
