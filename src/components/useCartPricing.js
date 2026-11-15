'use client';

import { useEffect, useRef, useState } from 'react';
import { useCart } from './Providers';

// Fetches live prices, stock and totals from the server (the browser never decides prices)
export default function useCartPricing(coupon = '') {
  const { items } = useCart();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  const key = JSON.stringify(items) + '|' + coupon;

  useEffect(() => {
    if (!items.length) { setData({ lines: [], subtotal: 0, discount: 0, shipping: 0, total: 0, coupon: null, couponError: '', problems: false }); setLoading(false); return; }
    const mine = ++seq.current;
    setLoading(true);
    fetch('/api/cart/price', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items, coupon }) })
      .then((r) => r.json())
      .then((d) => { if (mine === seq.current && d.lines) { setData(d); } })
      .catch(() => {})
      .finally(() => { if (mine === seq.current) setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, loading };
}
