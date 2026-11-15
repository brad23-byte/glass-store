'use client';
import { usePathname } from 'next/navigation';

// Hides storefront chrome (footer, cart drawer) on admin pages
export default function ChromeOnly({ children }) {
  const p = usePathname();
  return p.startsWith('/admin') ? null : children;
}
