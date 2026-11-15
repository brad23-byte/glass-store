'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

/* ---------------- Theme ---------------- */
const ThemeCtx = createContext({ theme: 'dark', resolved: 'dark', setTheme: () => {} });
export const useTheme = () => useContext(ThemeCtx);
const TKEY = 'lumina_theme_v1';

/* ---------------- Cart ---------------- */
const CartCtx = createContext(null);
export const useCart = () => useContext(CartCtx);
const CKEY = 'lumina_cart_v1';

/* ---------------- Toast ---------------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export default function Providers({ children }) {
  const [theme, setThemeState] = useState('dark');
  const [resolved, setResolved] = useState('dark');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const ready = useRef(false);

  useEffect(() => {
    try {
      const t = localStorage.getItem(TKEY);
      if (t) setThemeState(t);
      const c = JSON.parse(localStorage.getItem(CKEY) || '[]');
      if (Array.isArray(c)) setItems(c.filter((x) => Number.isInteger(x?.id) && Number.isInteger(x?.qty) && x.qty > 0).slice(0, 50));
    } catch {}
    ready.current = true;
  }, []);

  useEffect(() => {
    const apply = () => {
      const r = theme === 'system' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : theme;
      document.documentElement.dataset.theme = r;
      setResolved(r);
    };
    apply();
    if (ready.current) {
      try { localStorage.setItem(TKEY, theme); } catch {}
    }
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: light)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [theme]);

  useEffect(() => {
    if (!ready.current) return;
    try { localStorage.setItem(CKEY, JSON.stringify(items)); } catch {}
  }, [items]);

  // keep the cart in sync across tabs
  useEffect(() => {
    const on = (e) => {
      if (e.key === CKEY) { try { setItems(JSON.parse(e.newValue || '[]')); } catch {} }
    };
    window.addEventListener('storage', on);
    return () => window.removeEventListener('storage', on);
  }, []);

  const toast = useCallback((text, kind = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const cart = useMemo(
    () => ({
      items,
      count: items.reduce((a, i) => a + i.qty, 0),
      open,
      setOpen,
      add: (id, qty = 1) => setItems((cur) => {
        const ex = cur.find((i) => i.id === id);
        if (ex) return cur.map((i) => (i.id === id ? { ...i, qty: Math.min(10, i.qty + qty) } : i));
        return [...cur, { id, qty: Math.min(10, qty) }];
      }),
      set: (id, qty) => setItems((cur) => (qty <= 0 ? cur.filter((i) => i.id !== id) : cur.map((i) => (i.id === id ? { ...i, qty: Math.min(10, qty) } : i)))),
      remove: (id) => setItems((cur) => cur.filter((i) => i.id !== id)),
      clear: () => setItems([]),
    }),
    [items, open]
  );

  return (
    <ThemeCtx.Provider value={{ theme, resolved, setTheme: setThemeState }}>
      <CartCtx.Provider value={cart}>
        <ToastCtx.Provider value={toast}>
          {children}
          <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-8" aria-live="polite">
            {toasts.map((t) => (
              <div key={t.id} className="glass glass-strong animate-pop-in pointer-events-auto flex items-center gap-2 !rounded-full px-4 py-2.5 text-sm font-medium text-ink">
                {t.kind === 'ok' ? <CheckCircle2 size={16} className="text-ok" /> : <AlertTriangle size={16} className="text-warn" />}
                {t.text}
              </div>
            ))}
          </div>
        </ToastCtx.Provider>
      </CartCtx.Provider>
    </ThemeCtx.Provider>
  );
}
