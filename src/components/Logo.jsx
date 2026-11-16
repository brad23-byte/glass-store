// MAGSON logo: a glass tile with a bold "M" and a spark, plus a spaced wordmark.
// Colours come from the theme variables, so it adapts to light and dark mode.
export function LogoMark({ size = 32, id = 'logo', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Logo" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-g`} x1="4" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: 'rgb(var(--accent))' }} />
          <stop offset="0.55" style={{ stopColor: 'rgb(var(--accent2))' }} />
          <stop offset="1" style={{ stopColor: 'rgb(var(--accent3))' }} />
        </linearGradient>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="14" fill={`url(#${id}-g)`} />
      <rect x="1" y="1" width="46" height="46" rx="14" fill={`url(#${id}-s)`} />
      <rect x="1.8" y="1.8" width="44.4" height="44.4" rx="13.2" fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="1.4" />
      <path d="M11.5 35.5V15.5L24 29L36.5 15.5V35.5" fill="none" stroke="#000" strokeOpacity="0.18" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 1.6)" />
      <path d="M11.5 35.5V15.5L24 29L36.5 15.5V35.5" fill="none" stroke="#fff" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M39 6.2l1.3 3 3 1.3-3 1.3-1.3 3-1.3-3-3-1.3 3-1.3z" fill="#fff" />
    </svg>
  );
}

export default function Logo({ name = 'MAGSON', size = 32, id = 'logo', showName = true, hideNameOnMobile = false, underline = true, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} id={id} />
      {showName && (
        <span className={`${hideNameOnMobile ? 'hidden sm:block' : 'block'} leading-none`}>
          <span className="block font-extrabold uppercase tracking-[0.24em] text-ink" style={{ fontSize: Math.max(13, Math.round(size * 0.5)) }}>{name}</span>
          {underline && <span className="mt-1.5 block h-[2px] w-full rounded-full bg-gradient-to-r from-accent via-accent2 to-accent3" />}
        </span>
      )}
    </span>
  );
}
