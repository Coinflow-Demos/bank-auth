# Coinflow Bank Auth Demo

Reference implementation of Coinflow's [Bank Authentication UI](https://docs.coinflow.cash/guides/payouts/implementation-methods/bank-authentication-ui):
link a bank account, list it back via the withdrawer API, and send a
delegated payout to it — shown three ways:

1. **`/iframe`** — the standard web pattern: bank auth embedded in an
   `<iframe>` on a normal page.
2. **`/webview`** — the page a native app's `WKWebView` / `react-native-webview`
   would load directly (full-page nav, native bridge messaging), plus a
   warning about why OAuth banks often refuse to complete inside an embedded
   webview.
3. **`/mobile`** — a QR code to the mobile-web preview, and the real fix: a
   native iOS app (`ios-app/`) that opens bank auth in the system browser via
   `ASWebAuthenticationSession`, which OAuth banks are fine with.

**This repo is sandbox-only, on purpose.** There's no prod URL or prod toggle
anywhere in the code — see `src/lib/coinflow.ts`. Every payout is hard-capped
at **$3.00**, enforced in both the UI and the `/api/payout` route, so this is
safe to fork and click around in.

## How the pieces fit together

```
Browser/App ──▶ our API routes ──▶ Coinflow sandbox API (merchant key, server-side only)
                     │
                     └─ GET  /api/session-key   → POST /auth/session-key            (customer-scoped JWT)
                        POST /api/withdrawer    → GET  /customer/v2/                (linked bank accounts)
                        POST /api/payout        → POST /merchant/withdraws/payout/delegated
                        GET  /api/withdrawal/:id→ GET  /merchant/withdraws/:id       (status)

Browser/App ──▶ https://sandbox.coinflow.cash/solana/withdraw/{merchantId}?sessionKey=...
                (Coinflow's hosted UI — handles KYC gate + Plaid bank linking itself)
```

The merchant API key never leaves the server. The session key it mints is
customer-scoped and short-lived, so it's safe to hand to the browser/app —
that's what gets embedded in the hosted bank-auth URL and sent as the
`x-coinflow-auth-session-key` header when fetching linked accounts.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in COINFLOW_SANDBOX_API_KEY
npm run dev
```

Open `http://localhost:3000` (or whatever port you choose) and pick one of
the three flows from the home page. Each flow generates its own test
`customerId` (stored in `localStorage`) the first time you load it — use
"reset test user" to start over with a fresh identity.

To actually link a bank account, sandbox uses Plaid's sandbox mode: pick any
institution and log in with Plaid's test credentials (`user_good` /
`pass_good`).

## Native iOS app

See [`ios-app/README.md`](ios-app/README.md). It's a SwiftUI project defined
via [XcodeGen](https://github.com/yonaskolb/XcodeGen)'s `project.yml` — run
`xcodegen generate` to produce the `.xcodeproj`, then open it in Xcode,
select your own Apple ID as the signing team, and run it on your iPhone.

## Why three flows, not one

The whole point of this repo is to make the mobile OAuth-bank problem
concrete: banks that use Plaid's OAuth flow (most large US banks) will often
silently fail or refuse to load inside an embedded in-app webview, the same
way Google blocks its OAuth inside in-app browsers. `/webview` demonstrates
that pattern (and its risk) directly; the iOS app demonstrates the fix —
handing the URL to the actual system browser via `ASWebAuthenticationSession`
instead of an embedded webview.
