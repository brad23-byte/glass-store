// All prices are stored as integers in minor units (paise).
export function fmt(minor, symbol = '₹') {
  const n = (minor || 0) / 100;
  return symbol + n.toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
}
export const discountPct = (price, compare) => (compare && compare > price ? Math.round(((compare - price) / compare) * 100) : 0);
