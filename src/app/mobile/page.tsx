import {headers} from 'next/headers';
import QRCode from 'qrcode';
import Link from 'next/link';

export default async function MobilePage() {
  const headersList = await headers();
  const host = headersList.get('host') ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const origin = `${protocol}://${host}`;
  const linkUrl = `${origin}/link`;

  const qrDataUrl = await QRCode.toDataURL(linkUrl, {
    margin: 1,
    width: 280,
  });

  return (
    <main className="page">
      <p className="breadcrumb">
        <Link href="/">← back</Link>
      </p>
      <h1>Native app: scan to test</h1>

      <section className="card">
        <h2>Quick preview (mobile web)</h2>
        <p className="muted">
          Scan this with your iPhone camera to open the same adaptive web
          integration in mobile Safari — it&apos;ll detect the device and
          switch to the full-page redirect automatically. Useful for proving
          out the UI and the linked-accounts / payout flow, but it&apos;s a
          real mobile browser tab, not a native app — for that, see below.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt="QR code linking to the web integration"
          width={280}
          height={280}
        />
        <p className="muted small">{linkUrl}</p>
      </section>

      <section className="card">
        <h2>The real thing: native iOS test app</h2>
        <p className="muted">
          OAuth banks generally refuse to complete inside a native app&apos;s
          embedded webview (a restriction on native apps specifically, not
          on mobile browsers). The correct pattern for a native app is to
          open the bank-auth URL in the system browser via{' '}
          <code>ASWebAuthenticationSession</code>, which shares Safari&apos;s
          session and calls back into the app through a callback URL scheme
          when linking finishes. That can&apos;t be installed by scanning a
          QR code without an Apple Developer account (TestFlight or an
          ad-hoc build) — instead, build and run it straight from Xcode:
        </p>
        <ol>
          <li>
            Open <code>ios-app/BankAuthDemo.xcodeproj</code> (or run{' '}
            <code>xcodegen generate</code> first if you&apos;re starting from{' '}
            <code>project.yml</code>).
          </li>
          <li>
            In Signing &amp; Capabilities, select your own Apple ID as the
            team (a free personal team works for on-device testing).
          </li>
          <li>Plug in your iPhone (or connect it over Wi-Fi) and hit Run.</li>
        </ol>
        <p className="muted small">
          The app talks to this same Next.js app&apos;s API routes
          (<code>/api/session-key</code>, <code>/api/withdrawer</code>,{' '}
          <code>/api/payout</code>) — point it at{' '}
          <code>{origin}</code> once this is deployed, or your machine&apos;s
          LAN IP while running <code>npm run dev</code> locally.
        </p>
      </section>
    </main>
  );
}
