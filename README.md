# Coinflow Bank Auth Demo

Reference implementation showing how bank-account linking + a delegated
payout should work across three surfaces: a desktop browser, a mobile
browser, and a native iOS app. Built against Coinflow's [Bank
Authentication UI](https://docs.coinflow.cash/guides/payouts/implementation-methods/bank-authentication-ui)
(a hosted page — see "No SDK" below).

**Sandbox only, on purpose.** There's no prod URL or prod toggle anywhere in
the code — see `src/lib/coinflow.ts`. Every payout is hard-capped at
**$3.00**, enforced in the UI *and* the `/api/payout` route, so this is safe
to fork and click around in.

## The three methods, explained simply

All three ultimately do the same two things — open Coinflow's hosted
bank-auth page, then detect when it's done — they just differ in *how* they
open it and *how* they find out it finished. No Coinflow SDK is involved in
any of them (see [No SDK](#no-sdk) below) — it's a URL you build yourself
and a REST API you call yourself.

### 1. Desktop browser → iframe

Drop the hosted URL into an `<iframe>`. The page never navigates away.

```tsx
<iframe src={bankAuthUrl} className="bank-auth-iframe" allow="geolocation" />
```

**How it knows linking finished:** Coinflow's page, running *inside* the
iframe, does a `window.postMessage()` to the parent page. We just listen
for it:

```ts
window.addEventListener('message', event => {
  // looks for {data: 'accountLinked'} or {method: 'accountLinked'}
});
```

No redirect needed — both windows are open at the same time, so a message
is enough. (A real OAuth bank's login page can't be framed at all, so it
briefly pops open in a separate tab and closes itself — see `bank-callback`
— but the iframe itself never moves.)

### 2. Mobile browser (Safari/Chrome on a phone) → full-page redirect

Same page, same code — it just detects it's on a phone and swaps strategy:

```ts
function isMobileDevice(): boolean {
  if (/Android|iPhone|iPod|Mobi/i.test(navigator.userAgent)) return true;
  if (/Mac/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1) return true; // iPad
  return false;
}
```

Instead of an iframe, it's a plain link that navigates the **whole page**
away:

```tsx
<a href={bankAuthUrl}>Link a bank account</a>
```

**How it knows linking finished:** the redirect target is our own page,
with a marker in the URL:

```ts
const bankAccountLinkRedirect = `${origin}/link?linked=1&customerId=${customerId}`;
```

When Coinflow finishes, it does a real top-level redirect back to that URL
— a full page reload — so on mount we just check for the marker:

```ts
if (new URLSearchParams(location.search).get('linked') === '1') {
  // refetch linked accounts, then clean the URL
}
```

Why `customerId` rides along in the URL: nothing here is persisted (no
localStorage, on purpose — see [Setup](#setup)), so passing it through the
redirect is the only way the page recognizes "you" after a real navigation
away and back.

### 3. Native iOS app → hand off to the real Safari app

The app renders zero web content itself. It asks iOS to open the URL in the
actual Safari app:

```swift
let opened = await UIApplication.shared.open(authURL)
```

This is a genuine hand-off — the app backgrounds, Safari takes over the
screen, exactly as if you'd typed the URL in yourself. This matters because
OAuth banks can refuse to complete inside anything that isn't a fully
independent browser context (an embedded `WKWebView`, or even an in-app
auth sheet, can trip this) — a real external Safari never does.

**How it knows linking finished:** the redirect target is a custom URL
scheme this app registers ownership of (`bankauthdemo://callback`). When
Coinflow redirects there, iOS recognizes it belongs to this app and hands
control back:

```swift
.onOpenURL { url in
    guard url.scheme == "bankauthdemo" else { return }
    // refetch linked accounts
}
```

One thing to expect: since this is a custom scheme (not a Universal Link),
Safari shows a one-time confirmation — **"Open in 'Bank Auth Demo'?"** —
before handing back. A Universal Link would skip that prompt, at the cost
of needing to host a verification file on a real domain.

## No SDK

None of the three methods use a Coinflow SDK (`@coinflowlabs/react`,
`coinflow-swift`, etc.) — those exist for *embedding the card-tokenization
form directly in your own UI*, a different problem. Bank auth is a hosted
page you build a URL for and open, plus a plain REST API (session keys,
linked accounts, payouts) you call over HTTP. See `src/lib/coinflow.ts` for
every API call this repo makes.

## How the pieces fit together

```
Browser/App ──▶ our API routes ──▶ Coinflow sandbox API (merchant key, server-side only)
                     │
                     └─ POST /api/session-key   → GET  /auth/session-key            (wallet-scoped JWT)
                        POST /api/withdrawer    → GET  /withdraw/                   (linked bank accounts — the
                                                                                       Withdrawer record, NOT /customer/v2/,
                                                                                       which is a different model entirely)
                        POST /api/payout        → POST /merchant/withdraws/payout/delegated
                        GET  /api/withdrawal/:id→ GET  /merchant/withdraws/:id       (status)

Browser/App ──▶ https://sandbox.coinflow.cash/solana/withdraw/{merchantId}?sessionKey=...
                (Coinflow's hosted UI — handles the KYC gate + Plaid bank linking itself)
```

The merchant API key never leaves the server (`src/lib/coinflow.ts`,
imported only by `app/api/*` route handlers). The session key it mints is
customer-scoped and short-lived, so it's safe to hand to the browser/app —
that's what ends up in the hosted bank-auth URL and in the
`x-coinflow-auth-session-key` header when fetching linked accounts.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in COINFLOW_SANDBOX_API_KEY
npm run dev
```

Open `http://localhost:3000` and pick a flow from the home page. Every page
load generates a brand-new test `customerId` — nothing is persisted to
localStorage, so a plain refresh gets you a completely fresh identity with
no linked accounts. The one exception is the mobile full-page redirect: the
customerId rides along in the `bankAccountLinkRedirect` URL, since that's a
real navigation away and back, not a persisted session. "reset test user"
gets you a new identity without reloading.

To actually link a bank account, sandbox uses Plaid's sandbox mode: pick
any institution (including real-looking names like Chase — sandbox
simulates the OAuth flow for these too) and log in with Plaid's test
credentials (`user_good` / `pass_good`). Sandbox is fully simulated —
there's no path to a real bank account from it, by design.

## Native iOS app

See [`ios-app/README.md`](ios-app/README.md). It's a SwiftUI project defined
via [XcodeGen](https://github.com/yonaskolb/XcodeGen)'s `project.yml` — run
`xcodegen generate` to produce the `.xcodeproj`, then open it in Xcode,
select your own Apple ID as the signing team, and run it on your iPhone.
