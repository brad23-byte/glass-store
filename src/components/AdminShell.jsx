'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { LayoutDashboard, ShoppingCart, Package, Truck, Settings, Store, LogOut, Menu, X, Sun, Moon } from 'lucide-react';
import { LogoMark } from './Logo';
import { useTheme } from './Providers';

const NAV = [
  ['/admin', 'Dashboard', LayoutDashboard], ['/admin/orders', 'Orders', ShoppingCart], ['/admin/products', 'Products', Package],
  ['/admin/suppliers', 'Suppliers', Truck], ['/admin/settings', 'Settings', Settings],
];

export default function AdminShell({ session, storeName, badge, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolved, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  const nav = (
    <nav className="flex-1 space-y-1 p-3" aria-label="Admin">
      {NAV.map(([href, label, Icon]) => {
        const active = href === '/admin' ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${active ? 'bg-gradient-to-r from-accent to-accent2 text-onaccent shadow-lg' : 'text-ink2 hover:bg-tint/10'}`}>
            <Icon size={18} /> {label}
            {label === 'Orders' && badge > 0 && <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${active ? 'bg-white/30' : 'bg-accent3 text-white'}`}>{badge}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen lg:pl-72">
      <aside className={`glass glass-strong fixed bottom-3 left-3 top-3 z-50 flex w-64 flex-col !rounded-[2rem] transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-[110%]'} lg:translate-x-0`}>
        <div className="flex items-center gap-2.5 px-5 pb-2 pt-5"><LogoMark size={38} id="adm" /><div><p className="font-extrabold leading-tight text-ink">{storeName}</p><p className="text-xs text-muted">Admin</p></div></div>
        {nav}
        <div className="space-y-1 border-t border-tint/15 p-3">
          <Link href="/" className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium text-ink2 hover:bg-tint/10"><Store size={17} /> View store</Link>
          <button type="button" onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')} className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium text-ink2 hover:bg-tint/10">{resolved === 'dark' ? <Sun size={17} /> : <Moon size={17} />} {resolved === 'dark' ? 'Light mode' : 'Dark mode'}</button>
          <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium text-danger hover:bg-tint/10"><LogOut size={17} /> Sign out</button>
          <p className="truncate px-4 pt-1 text-xs text-muted">{session.name}</p>
        </div>
      </aside>
      {open && <button type="button" className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu" />}

      <div className="sticky top-3 z-30 mx-3 mb-4 mt-3 lg:hidden">
        <div className="glass glass-strong flex items-center justify-between !rounded-full px-3 py-2"><button type="button" onClick={() => setOpen((v) => !v)} className="btn-glass !p-2.5" aria-label="Menu">{open ? <X size={18} /> : <Menu size={18} />}</button><p className="font-bold text-ink">{storeName} Admin</p><span className="w-10" /></div>
      </div>
      <main className="mx-auto max-w-6xl space-y-6 px-3 pb-16 pt-3 sm:px-6 lg:pt-8">{children}</main>
    </div>
  );
}
