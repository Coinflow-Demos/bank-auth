import Link from 'next/link';

export default function Home() {
  return (
    <main className="page">
      <h1>Coinflow Bank Auth Demo</h1>
      <p className="muted">
        Reference implementation of Coinflow&apos;s hosted bank-account
        linking UI plus a delegated payout: one adaptive web integration
        (iframe on desktop, full-page redirect on mobile browsers), and a
        native iOS app that opens bank auth in the system browser — the
        actual fix for OAuth banks, which is a native-app-webview problem,
        not a mobile-browser one.
      </p>

      <p className="sandbox-banner">
        Sandbox only — merchant <code>predictionmarketmoon</code>. Every
        payout in this repo is hard-capped at $3.00, client and server side.
      </p>

      <div className="home-grid">
        <Link className="home-card" href="/link">
          <h2>1. Web integration</h2>
          <p className="muted">
            Link a bank account and send a capped payout. Desktop gets an
            iframe embed; mobile browsers get a full-page redirect —
            detected automatically, same URL either way.
          </p>
        </Link>

        <Link className="home-card" href="/mobile">
          <h2>2. Native app · scan to test</h2>
          <p className="muted">
            QR code to a mobile-web preview, plus the real native-app fix: an
            iOS test app that hands off to the real Safari app instead of an
            embedded webview.
          </p>
        </Link>
      </div>
    </main>
  );
}
