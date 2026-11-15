import './globals.css';
import Providers from '@/components/Providers';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import MobileTabBar from '@/components/MobileTabBar';
import CartDrawer from '@/components/CartDrawer';
import ChromeOnly from '@/components/ChromeOnly';
import SiteBanner from '@/components/SiteBanner';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/db';
import { paymentMethods } from '@/lib/payments';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const s = await getSettings();
  return { title: { default: `${s.store_name}: ${s.tagline}`, template: `%s | ${s.store_name}` }, description: s.tagline };
}

const themeScript = `(function(){try{var t=localStorage.getItem('lumina_theme_v1')||'dark';if(t==='system'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default async function RootLayout({ children }) {
  const session = await getSession();
  const s = await getSettings();
  // Show the project notice until live payment keys are in use.
  const notice = !String(paymentMethods(s).keyId || '').startsWith('rzp_live_');
  const pub = session ? { name: session.name, role: session.role } : null;
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>
          <div className="scene" aria-hidden="true"><div className="orb o1" /><div className="orb o2" /><div className="orb o3" /></div>
          {notice && <ChromeOnly><SiteBanner /></ChromeOnly>}
          <SiteHeader storeName={s.store_name} session={pub} />
          <main id="content">{children}</main>
          <ChromeOnly><SiteFooter storeName={s.store_name} tagline={s.tagline} email={s.support_email} demo={notice} /></ChromeOnly>
          <MobileTabBar signedIn={!!session} />
          <ChromeOnly><CartDrawer symbol={s.currency_symbol} /></ChromeOnly>
        </Providers>
      </body>
    </html>
  );
}
