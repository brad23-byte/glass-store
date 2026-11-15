# Lumina: Glass Store

A full online store built with Next.js 14: liquid-glass interface (light and dark), full product pages,
cart and checkout with a payment slot, customer accounts and order tracking, supplier connections, and an
admin area where you see every purchase. Built-in SQLite database (nothing extra to install).

## Quick start

Needs Node.js 22.5 or newer.

```bash
npm install
npm run setup      # creates .env.local with a random JWT_SECRET (once)
npm run dev        # http://localhost:3000
```

Production: `npm run build && npm start`.
You may see "ExperimentalWarning: SQLite" in the terminal. It is harmless.

## Sign in

| Role     | Email                 | Password       |
|----------|-----------------------|----------------|
| Admin    | admin@lumina.local    | Admin@12345    |
| Customer | customer@lumina.local | Customer@12345 |

Admin area: `/admin`. **Change these passwords before real use.** Delete `data/store.db` to reset everything.
The 16 sample products are fictional demo data: replace them in Admin > Products.

## What shoppers get

- Home page, search, category / price / stock filters, sorting, pagination
- Product pages with gallery, price and discount, stock status, highlights, full specifications, warranty,
  shipping and returns, delivery estimate, verified-buyer reviews, related products
- Cart drawer and cart page with live prices, free-shipping progress, discount codes
- Checkout with delivery address and the **payment slot**: online payment (Razorpay: UPI, cards, netbanking),
  a test card for trying checkout, or cash on delivery
- Guest checkout or account; order page with status timeline, tracking link and receipt; "My orders"
- Light and dark theme, mobile tab bar, reduced-motion support

## What the admin gets (`/admin`)

- **Dashboard:** revenue, last 30 days, orders to process, average order, cash-on-delivery to collect,
  14-day revenue chart, top products, low stock, recent purchases
- **Purchases:** every order with search and filters (status, payment), CSV export; each order shows items,
  customer, address, payment reference, activity log; mark shipped (with tracking), delivered, cancel, refund
- **Products:** create, edit, hide or delete; price, compare-at price, stock, images, specs, warranty, policies;
  margin shown for supplier items
- **Suppliers:** connect, test, sync, forward orders (see below)
- **Settings:** store name, shipping fee and free-shipping amount, cash on delivery, discount codes, payment status

## Taking real payments (Razorpay)

1. Create a Razorpay account and copy your **Key ID** and **Key Secret** (use Test mode first).
2. Put them in `.env.local`:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxx
   RAZORPAY_KEY_SECRET=xxxxx
   RAZORPAY_WEBHOOK_SECRET=a-secret-you-choose
   ```
3. Restart. The checkout now shows "UPI, cards & netbanking".
4. In the Razorpay dashboard add a webhook to `https://YOUR-SITE/api/payments/razorpay/webhook` for
   `payment.captured`, `order.paid` and `payment.failed`, using the same webhook secret. This confirms payments
   even if a customer closes the tab right after paying.

How it stays safe: the server (not the browser) decides the amount; every payment is confirmed by a signed
response checked on the server (HMAC-SHA256), and must match that order; the webhook checks its signature and
the amount; card details never touch this site (Razorpay's own window handles them); stock is held for 30
minutes while payment is pending and released if it is not completed.

**Test card mode** (4242 4242 4242 4242 works, 4000 0000 0000 0002 is declined) is on in development and **off in
production** unless you set `ALLOW_DEMO_PAYMENTS=true`. Anyone could mark orders paid with it, so never enable it
on a live store. Cash on delivery can be switched off in Admin > Settings.

## Connecting supplier websites (Admin > Suppliers)

A supplier must offer a product **feed**: a JSON API or a CSV file (with a key if they require one).

1. Add the supplier: feed address, key (kept on the server only), your markup %, and a currency rate
   (supplier price × rate = your currency; remember to set it for USD or other feeds).
2. **Test** shows how many products were found. **Sync now** imports them; every later sync refreshes
   price and stock and keeps your edits to names, descriptions and images.
3. When a customer buys a supplier product the order shows "to order" under Supplier fulfilment. Press
   **Send order to supplier** (if they give you an order address) or order on their website and record the
   reference. The customer's name, phone, email and address are shared with the supplier for delivery.
4. Optional: schedule a call to `/api/cron/sync-suppliers` with header `x-cron-secret: $CRON_SECRET` to sync
   automatically.

Two ready-made options are included: a **built-in demo feed** (works offline) and a preset for the public
**DummyJSON** test API. The default field names follow the common layout (sku, title, description, brand, category,
price, stock, images). For other layouts use the field map (for example `{"name":"product_name"}`).
Shoppers never see the supplier name, cost or margin. Supplier order forwarding sends a standard JSON request;
real suppliers differ, so check their API documentation and adjust `forwardToSupplier` in `src/lib/suppliers.js`.

## Product photos

Paste `https://` image links into a product's Images box (first is the main image). Products without photos
show a glass placeholder tile.

## Security notes

Passwords are hashed (bcrypt); sessions are signed, HTTP-only cookies; the admin role is checked in the
database on every request; login and sign-up are throttled; supplier addresses are checked so the server cannot
be pointed at private networks; CSV exports block spreadsheet formula injection; security headers are set.

## Before going live

- Change demo passwords, set a long `JWT_SECRET`, serve over HTTPS, turn off test-card mode.
- Replace the sample catalogue, set shipping, add your policies and support email.
- `npm audit` reports advisories for Next.js 14. Upgrade to a current Next.js release before exposing the site
  publicly.
- Throttles are in memory (one server). SQLite suits one server: back up `data/store.db`.
- You are the seller of record: add your legal pages (terms, privacy, returns) and GST details as your region
  requires. Orders hold customers' personal data.
- I could not test live Razorpay or real supplier APIs here. Their signature and webhook logic is tested, but
  run a test-mode payment and a test sync with your own accounts before launch.

## Structure

```
src/app/            storefront pages, /admin pages, /api routes
src/components/     glass UI, cart, checkout and payment slot, admin screens
src/lib/            db (schema, seed), orders, payments, suppliers, validation, auth
data/store.db       created on first run
```
