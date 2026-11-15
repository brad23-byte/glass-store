import { getDb } from '@/lib/db';
import { syncSupplier } from '@/lib/suppliers';
import { releaseExpired } from '@/lib/orders';
import { bad, ok } from '@/lib/api';
import crypto from 'crypto';

// Call from a scheduler with header x-cron-secret: $CRON_SECRET (refreshes prices and stock, frees expired carts)
async function run(req) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get('x-cron-secret') || '';
  if (!secret || given.length !== secret.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret))) return bad('Not allowed', 401);
  const out = [];
  for (const s of getDb().prepare('SELECT id, name FROM suppliers WHERE active = 1').all()) {
    try { out.push({ supplier: s.name, ...(await syncSupplier(s.id)) }); } catch (e) { out.push({ supplier: s.name, error: e.message }); }
  }
  return ok({ results: out, releasedOrders: releaseExpired() });
}
export const POST = run;
export const GET = run;
