// Shown only while the test-card payment option is switched on.
export default function SiteBanner() {
  return (
    <div className="px-3 pt-2 sm:px-5">
      <p className="mx-auto max-w-6xl rounded-2xl bg-warn/10 px-4 py-2 text-center text-xs text-warn">
        Payment test mode is on: card payments on this site are not real and will not be charged.
      </p>
    </div>
  );
}
