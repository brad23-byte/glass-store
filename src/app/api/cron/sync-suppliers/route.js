import { getDb } from '@/lib/db';
import { syncSupplier } from '@/lib/suppliers';
import { releaseExpired } from '@/lib/orders';
import { bad, ok } from '@/lib/api';
import crypto from 'crypto';

// Supplier syncs fetch a feed and write many rows: allow more time than the default.
export const maxDuration = 60;

// Call from a scheduler with header x-cron-secret: $CRON_SECRET (refreshes prices and stock, frees expired carts)
async function run(req) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get('x-cron-secret') || '';
  if (!secret || given.length !== secret.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret))) return bad('Not allowed', 401);
  const out = [];
  for (const s of await getDb().prepare('SELECT id, name FROM suppliers WHERE active = 1').all()) {
    try { out.push({ supplier: s.name, ...(await syncSupplier(s.id)) }); } catch (e) { out.push({ supplier: s.name, error: e.message }); }
  }
  return ok({ results: out, releasedOrders: await releaseExpired() });
}
export const POST = run;
export const GET = run;
