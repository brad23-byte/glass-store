'use client';

import { Star } from 'lucide-react';

/* Product image: real https image, or generated glass-gradient tile from "emoji:🎧|#7c3aed|#22d3ee" */
export function ProductImage({ src, alt = '', className = '', big = false }) {
  if (typeof src === 'string' && src.startsWith('emoji:')) {
    const [emoji, a = '#6366f1', b = '#22d3ee'] = src.slice(6).split('|');
    return (
      <div role="img" aria-label={alt} className={`relative flex aspect-square items-center justify-center overflow-hidden ${className}`} style={{ background: `linear-gradient(145deg, ${a}, ${b})` }}>
        <div className="absolute -left-1/4 -top-1/3 h-[90%] w-[90%] rounded-full bg-white/25 blur-2xl" />
        <div className="absolute -bottom-1/3 -right-1/4 h-[80%] w-[80%] rounded-full bg-black/20 blur-3xl" />
        <span className="relative select-none drop-shadow-[0_14px_18px_rgba(0,0,0,0.35)]" style={{ fontSize: big ? '9rem' : '4.6rem', lineHeight: 1 }}>{emoji}</span>
        <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-black/10" />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src || ''} alt={alt} loading="lazy" className={`aspect-square h-full w-full object-cover ${className}`} />;
}

export function Stars({ value = 0, size = 14 }) {
  return (
    <span className="inline-flex items-center" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(value) ? 'fill-warn text-warn' : 'text-muted/40'} />
      ))}
    </span>
  );
}

// pointer-follow sheen for .glass.lift
export function sheen(e) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
}
