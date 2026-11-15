// Built-in test supplier. Uses the same JSON shape as popular public product APIs (for example DummyJSON),
// so you can try the connector without any account. URL scheme: mock://demo/products
const E = (emoji, a, b) => `emoji:${emoji}|${a}|${b}`;
export function mockProducts() {
  const rows = [
    ['Halo Bluetooth Speaker', 'Soundora', 'speakers', 24.0, 62, '🔊', '#06b6d4', '#8b5cf6', 'Portable 20 W speaker with 360-degree sound and 12-hour battery.'],
    ['Vista 4K Action Camera', 'Capturo', 'cameras', 58.5, 25, '🎥', '#f43f5e', '#f59e0b', 'Waterproof 4K action camera with image stabilisation and wrist remote.'],
    ['Nimbus Power Bank 20000', 'Voltix', 'mobile accessories', 17.9, 140, '🔋', '#22c55e', '#06b6d4', '20,000 mAh fast-charging power bank with dual USB-C ports.'],
    ['Zen Aroma Diffuser', 'Calmora', 'home fragrance', 14.2, 75, '🪔', '#a78bfa', '#f472b6', 'Ultrasonic aroma diffuser with soft ambient light and auto shut-off.'],
    ['Peak Insulated Bottle 750', 'Trekline', 'outdoor', 11.5, 210, '🧴', '#0ea5e9', '#14b8a6', 'Double-wall steel bottle keeps drinks cold 24 h or hot 12 h.'],
    ['Loop Resistance Bands Set', 'Stridely', 'fitness', 7.8, 180, '➰', '#f97316', '#eab308', 'Five-level resistance bands with door anchor and carry bag.'],
    ['Pixel Desk Webcam 1080p', 'Capturo', 'computer accessories', 19.9, 48, '📹', '#64748b', '#6366f1', 'Full HD webcam with autofocus, dual mics and privacy shutter.'],
    ['Cozy Throw Blanket', 'Calmora', 'home decor', 12.4, 95, '🛋️', '#ec4899', '#f59e0b', 'Soft microfibre throw, 150 x 200 cm, machine washable.'],
    ['Spark Electric Toothbrush', 'Brightly', 'personal care', 16.6, 70, '🪥', '#38bdf8', '#34d399', 'Sonic brush with 5 modes and a 30-day battery.'],
    ['Drift Wireless Mouse', 'Deskly', 'computer accessories', 9.9, 160, '🖱️', '#8b5cf6', '#22d3ee', 'Silent-click wireless mouse with adjustable DPI and USB receiver.'],
    ['Bloom Indoor Plant Pot Set', 'Greenly', 'garden', 13.0, 85, '🪴', '#16a34a', '#a3e635', 'Set of three ceramic pots with drainage trays.'],
    ['Strike Badminton Racket Pair', 'Smashly', 'sports', 21.5, 40, '🏸', '#ef4444', '#f97316', 'Lightweight aluminium rackets with 3 shuttles and bag.'],
  ];
  return {
    total: rows.length,
    products: rows.map((r, i) => ({
      id: i + 1,
      sku: `SUP-${2000 + i}`,
      title: r[0],
      brand: r[1],
      category: r[2],
      price: r[3], // supplier price in the supplier's currency (here: USD)
      stock: r[4],
      description: `${r[8]} Supplied by a partner warehouse and shipped directly to you.`,
      thumbnail: E(r[5], r[6], r[7]),
      images: [E(r[5], r[6], r[7])],
      tags: [r[2], r[1].toLowerCase()],
      rating: 4 + ((i * 7) % 10) / 10,
      weight: 200 + i * 90,
      dimensions: { width: 10 + i, height: 8 + (i % 5), depth: 6 + (i % 4) },
      warrantyInformation: i % 3 === 0 ? '1 year warranty' : '6 months warranty',
      shippingInformation: 'Ships in 2-3 business days from the partner warehouse',
      returnPolicy: '7 days return policy',
      reviews: [
        { rating: 5, comment: 'Works great and arrived quickly.', reviewerName: 'Verified buyer (supplier site)', date: '2026-08-14' },
        { rating: 4, comment: 'Good value for the price.', reviewerName: 'Verified buyer (supplier site)', date: '2026-09-02' },
      ],
    })),
  };
}

export function mockPlaceOrder(body, apiKey) {
  if (apiKey !== 'demo-supplier-key') return { status: 401, body: { error: 'Invalid API key' } };
  if (!Array.isArray(body?.items) || !body.items.length) return { status: 400, body: { error: 'No items' } };
  return { status: 201, body: { reference: `SUP-ORD-${Math.floor(100000 + Math.random() * 900000)}`, status: 'accepted' } };
}
