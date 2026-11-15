// Thin notice at the very top of the storefront while payments run in test mode.
export default function SiteBanner() {
  return (
    <div className="px-3 pt-2 sm:px-5">
      <p className="mx-auto max-w-6xl rounded-2xl bg-warn/10 px-4 py-2 text-center text-xs text-warn">
        Student project · Payments run in test mode. No real money is taken and nothing is shipped.
      </p>
    </div>
  );
}
