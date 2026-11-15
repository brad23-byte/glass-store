'use client';

export function RevenueChart({ series, symbol = '₹' }) {
  const max = Math.max(1, ...series.map((s) => s.v));
  const W = 700, H = 200, pad = 24, bw = (W - pad * 2) / series.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 28}`} className="w-full" role="img" aria-label="Revenue for the last 14 days">
      <defs>
        <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgb(var(--accent2))" /><stop offset="100%" stopColor="rgb(var(--accent))" /></linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((t) => <line key={t} x1={pad} x2={W - pad} y1={H - t * (H - 20)} y2={H - t * (H - 20)} stroke="rgb(var(--glass-tint) / 0.12)" strokeDasharray="4 6" />)}
      {series.map((s, i) => {
        const h = s.v ? Math.max(6, (s.v / max) * (H - 20)) : 3;
        const x = pad + i * bw + bw * 0.18;
        return (
          <g key={s.d}>
            <rect x={x} y={H - h} width={bw * 0.64} height={h} rx={8} fill={s.v ? 'url(#bar)' : 'rgb(var(--glass-tint) / 0.18)'}><title>{`${s.d}: ${symbol}${(s.v / 100).toLocaleString('en-IN')} · ${s.n} orders`}</title></rect>
            <text x={x + bw * 0.32} y={H + 18} textAnchor="middle" fontSize="11" fill="rgb(var(--muted))">{s.d.slice(8)}</text>
          </g>
        );
      })}
    </svg>
  );
}
