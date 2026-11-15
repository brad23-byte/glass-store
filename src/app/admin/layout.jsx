import { requireAdmin } from '@/lib/auth';
import { getSettings, getDb } from '@/lib/db';
import { releaseExpired } from '@/lib/orders';
import AdminShell from '@/components/AdminShell';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin', robots: { index: false } };

export default async function AdminLayout({ children }) {
  const s = await requireAdmin();
  releaseExpired();
  const n = getDb().prepare("SELECT COUNT(*) AS n FROM orders WHERE status = 'processing'").get().n;
  return <AdminShell session={{ name: s.name }} storeName={getSettings().store_name} badge={n}>{children}</AdminShell>;
}
