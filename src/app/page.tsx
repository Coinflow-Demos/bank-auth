import Link from 'next/link';

export default function Home() {
  return (
    <main className="page">
      <h1>Coinflow Bank Auth Demo</h1>
      <p className="muted">
        Reference implementation of Coinflow&apos;s hosted bank-account
        linking UI plus a delegated payout, shown three ways: embedded in an
        iframe (web), loaded directly in a mobile app webview, and opened in
        the system browser from a native iOS app.
      </p>

      <p className="sandbox-banner">
        Sandbox only — merchant <code>predictionmarketmoon</code>. Every
        payout in this repo is hard-capped at $3.00, client and server side.
      </p>

      <div className="home-grid">
        <Link className="home-card" href="/iframe">
          <h2>1. Web · iframe</h2>
          <p className="muted">
            Bank auth embedded in an iframe on a normal webpage, then link
            accounts and send a capped payout.
          </p>
        </Link>

        <Link className="home-card" href="/webview">
          <h2>2. Mobile · webview</h2>
          <p className="muted">
            The same flow as a native app&apos;s embedded webview would see
            it — full-page navigation, native bridge messaging, and a warning
            about why OAuth banks often fail here.
          </p>
        </Link>

        <Link className="home-card" href="/mobile">
          <h2>3. Native app · scan to test</h2>
          <p className="muted">
            QR code to a quick mobile-web preview, plus the real fix: a
            native iOS test app using <code>ASWebAuthenticationSession</code>{' '}
            to open bank auth in the system browser.
          </p>
        </Link>
      </div>
    </main>
  );
}
