import { notFound } from 'next/navigation';
import { getProductById } from '@/lib/products';
import { getDb } from '@/lib/db';
import ProductForm from '@/components/ProductForm';

export const dynamic = 'force-dynamic';

export default function EditProduct({ params }) {
  const p = getProductById(Number(params.id));
  if (!p) notFound();
  const sup = p.supplier_id ? getDb().prepare('SELECT name FROM suppliers WHERE id = ?').get(p.supplier_id) : null;
  const { supplier_reviews, supplier_cost, ...safe } = p;
  return (<><h1 className="text-3xl font-extrabold text-ink sm:text-4xl">Edit product</h1><ProductForm product={safe} supplierName={sup?.name} /></>);
}
