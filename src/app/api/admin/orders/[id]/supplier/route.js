import { adminOrNull } from '@/lib/auth';
import { forwardToSupplier, recordManualSupplierOrder } from '@/lib/suppliers';
import { bad, ok, readJson } from '@/lib/api';

export async function POST(req, { params }) {
  if (!(await adminOrNull())) return bad('Admin access needed', 403);
  const b = await readJson(req);
  const orderId = Number(params.id);
  const supplierId = Number(b.supplier_id);
  try {
    if (b.mode === 'manual') {
      const ref = String(b.ref || '').trim();
      if (!ref) return bad('Enter the supplier order reference');
      await recordManualSupplierOrder(orderId, supplierId, ref);
      return ok({ ok: true, ref });
    }
    return ok({ ok: true, ...(await forwardToSupplier(orderId, supplierId)) });
  } catch (e) {
    return bad(e.message || 'Could not reach the supplier', 502);
  }
}
