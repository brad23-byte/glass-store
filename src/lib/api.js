import { NextResponse } from 'next/server';

export const bad = (msg, status = 400) => NextResponse.json({ error: msg }, { status });
export const ok = (data = {}, status = 200) => NextResponse.json(data, { status });

const buckets = new Map();
// Simple in-memory throttle (single server). Returns true if the request is allowed.
export function throttle(key, max, windowMs) {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { buckets.set(key, arr); return false; }
  arr.push(now);
  buckets.set(key, arr);
  return true;
}
export const clientIp = (req) => (req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();

export async function readJson(req) {
  try { return await req.json(); } catch { return {}; }
}
