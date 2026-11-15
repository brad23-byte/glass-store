/** @type {import('tailwindcss').Config} */
const c = (v) => `rgb(var(--${v}) / <alpha-value>)`;
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', '"Segoe UI"', 'Inter', 'system-ui', 'sans-serif'] },
      colors: {
        canvas: c('bg-a'), ink: c('ink'), ink2: c('ink2'), muted: c('muted'),
        accent: c('accent'), accent2: c('accent2'), accent3: c('accent3'),
        ok: c('ok'), warn: c('warn'), danger: c('danger'), onaccent: c('onaccent'), tint: c('glass-tint'),
      },
      keyframes: {
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        popIn: { '0%': { opacity: '0', transform: 'scale(.92)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        float: { '0%,100%': { transform: 'translateY(0) rotate(var(--r,0deg))' }, '50%': { transform: 'translateY(-10px) rotate(var(--r,0deg))' } },
        drift: { '0%,100%': { transform: 'translate3d(0,0,0) scale(1)' }, '50%': { transform: 'translate3d(40px,-30px,0) scale(1.12)' } },
        sheet: { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        shimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
      },
      animation: {
        'fade-up': 'fadeUp .6s cubic-bezier(.2,.8,.2,1) both',
        'pop-in': 'popIn .35s cubic-bezier(.34,1.56,.64,1) both',
        float: 'float 6s ease-in-out infinite',
        drift: 'drift 22s ease-in-out infinite',
        sheet: 'sheet .42s cubic-bezier(.2,.8,.2,1) both',
      },
    },
  },
  plugins: [],
};
