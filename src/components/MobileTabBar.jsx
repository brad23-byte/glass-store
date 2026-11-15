'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, ShoppingBag, User } from 'lucide-react';
import { useCart } from './Providers';

export default function MobileTabBar({ signedIn }) {
  const pathname = usePathname();
  const { count, setOpen } = useCart();
  if (pathname.startsWith('/admin')) return null;
  const tab = (href, label, Icon) => (
    <Link href={href} className={`flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-[11px] font-semibold transition ${pathname === href ? 'bg-tint/15 text-ink' : 'text-muted'}`}>
      <Icon size={20} /> {label}
    </Link>
  );
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 md:hidden" aria-label="Tabs">
      <div className="glass glass-strong flex items-center !rounded-full p-1.5">
        {tab('/', 'Home', Home)}
        {tab('/shop', 'Shop', LayoutGrid)}
        <button type="button" onClick={() => setOpen(true)} className="relative flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-[11px] font-semibold text-muted">
          <ShoppingBag size={20} /> Cart
          {count > 0 && <span className="absolute right-[28%] top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent3 px-1 text-[10px] font-bold text-white">{count}</span>}
        </button>
        {tab(signedIn ? '/account' : '/login', signedIn ? 'Account' : 'Sign in', User)}
      </div>
    </nav>
  );
}
