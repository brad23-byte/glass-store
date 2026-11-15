import { getDb } from '@/lib/db';
import SuppliersPanel from '@/components/SuppliersPanel';

export const dynamic = 'force-dynamic';

export default async function AdminSuppliers() {
  const rows = (await getDb().prepare('SELECT s.*, (SELECT COUNT(*) FROM products p WHERE p.supplier_id = s.id) AS product_count FROM suppliers s ORDER BY s.id').all())
    .map(({ api_key, ...s }) => ({ ...s, has_key: !!api_key, active: !!s.active })); // the key itself never leaves the server
  return (<><div><h1 className="text-3xl font-extrabold text-ink sm:text-4xl">Suppliers</h1><p className="text-muted">Connect supplier websites and import their products</p></div><SuppliersPanel suppliers={rows} /></>);
}
