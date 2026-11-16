'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search, ShoppingBag, Sun, Moon, User, LogOut, LayoutDashboard, Package } from 'lucide-react';
import Logo from './Logo';
import { useCart, useTheme } from './Providers';

export default function SiteHeader({ storeName, session }) {
  const { count, setOpen } = useCart();
  const { resolved, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState(false);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setMenu(false);
    router.replace('/');
    router.refresh();
  }

  if (pathname.startsWith('/admin')) return null; // admin has its own shell

  const link = (href, label) => (
    <Link href={href} className={`rounded-full px-3.5 py-2 text-sm font-medium transition hover:bg-tint/10 ${pathname === href ? 'bg-tint/15 text-ink' : 'text-ink2'}`}>{label}</Link>
  );

  return (
    <header className="sticky top-3 z-40 px-3 sm:px-5">
      <div className="glass glass-strong mx-auto flex max-w-6xl items-center gap-2 !rounded-full py-2 pl-4 pr-2 sm:gap-3">
        <Link href="/" className="flex items-center gap-2 pr-1 text-ink" aria-label={`${storeName} home`}>
          <Logo name={storeName} size={34} id="hdr" hideNameOnMobile />
        </Link>
        <nav className="ml-1 hidden items-center md:flex" aria-label="Main">{link('/shop', 'Shop')}{link('/shop?sort=newest', 'New')}{link('/shop?sort=price-asc', 'Deals')}</nav>

        <form action="/shop" method="get" onSubmit={(e) => { e.preventDefault(); router.push(`/shop?q=${encodeURIComponent(q.trim())}`); }} className="relative mx-1 min-w-0 flex-1" role="search">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" aria-label="Search products" className="input !rounded-full !py-2 pl-10" />
        </form>

        <button type="button" onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')} className="btn-glass !p-2.5" aria-label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {resolved === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <div className="relative hidden sm:block">
          {session ? (
            <>
              <button type="button" onClick={() => setMenu((v) => !v)} className="btn-glass !p-2.5" aria-label="Account menu" aria-expanded={menu}><User size={17} /></button>
              {menu && (
                <div className="glass glass-strong animate-pop-in absolute right-0 top-12 w-56 !rounded-2xl p-2" onMouseLeave={() => setMenu(false)}>
                  <p className="truncate px-3 py-2 text-xs text-muted">{session.name}</p>
                  <Link href="/account" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink hover:bg-tint/10"><Package size={15} /> My orders</Link>
                  {session.role === 'admin' && <Link href="/admin" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink hover:bg-tint/10"><LayoutDashboard size={15} /> Admin</Link>}
                  <button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-danger hover:bg-tint/10"><LogOut size={15} /> Sign out</button>
                </div>
              )}
            </>
          ) : (
            <Link href="/login" className="btn-glass !py-2.5">Sign in</Link>
          )}
        </div>

        <button type="button" onClick={() => setOpen(true)} className="btn-primary relative !p-2.5 sm:!px-4" aria-label={`Open cart, ${count} items`}>
          <ShoppingBag size={17} /> <span className="hidden sm:inline">Cart</span>
          {count > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent3 px-1 text-[11px] font-bold text-white shadow">{count}</span>}
        </button>
      </div>
    </header>
  );
}
