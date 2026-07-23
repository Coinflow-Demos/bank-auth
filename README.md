# Coinflow Bank Auth Demo

Reference implementation of Coinflow's [Bank Authentication UI](https://docs.coinflow.cash/guides/payouts/implementation-methods/bank-authentication-ui):
link a bank account, list it back via the withdrawer API, and send a
delegated payout to it.

1. **`/link`** — one web integration that adapts to the device: desktop
   browsers get the hosted bank-auth UI embedded in an `<iframe>`; mobile
   browsers get a full-page redirect instead. Same URL, same code, the
   behavior just switches based on real device detection.
2. **`/mobile`** — a QR code to that same page (proving the mobile-redirect
   behavior on a real phone browser), plus a native iOS app (`ios-app/`) that
   opens bank auth in the system browser via `ASWebAuthenticationSession` —
   the actual fix for native apps whose embedded webview would otherwise
   break OAuth bank logins.

**This repo is sandbox-only, on purpose.** There's no prod URL or prod toggle
anywhere in the code — see `src/lib/coinflow.ts`. Every payout is hard-capped
at **$3.00**, enforced in both the UI and the `/api/payout` route, so this is
safe to fork and click around in.

## A note on terminology

"WebView" (`WKWebView` on iOS, `android.webkit.WebView` on Android) means a
**native app** embedding a stripped-down web engine inside its own UI — it
has nothing to do with mobile *browsers*. Safari or Chrome on a phone is a
full browser, same category as desktop, and OAuth works fine there. The two
real reasons `/link` treats mobile differently from desktop are unrelated to
"webviews":

- Bank OAuth login pages refuse to be framed at all (universal, not
  mobile-specific), so the actual bank login always has to escape any
  iframe via a popup or top-level redirect.
- Mobile browsers are more prone to popup-blocking and awkward small-viewport
  UX when that escape happens, so a full-page redirect is just more reliable
  there than dealing with a popup.

The actual "OAuth breaks inside a webview" problem is a **native-app-only**
issue, which is what the iOS app under `ios-app/` exists to fix — see its
[README](ios-app/README.md) for how `ASWebAuthenticationSession` sidesteps it.

## How the pieces fit together

```
Browser/App ──▶ our API routes ──▶ Coinflow sandbox API (merchant key, server-side only)
                     │
                     └─ GET  /api/session-key   → POST /auth/session-key            (wallet-scoped JWT)
                        POST /api/withdrawer    → GET  /withdraw/                   (linked bank accounts — the
                                                                                       Withdrawer record, NOT /customer/v2/,
                                                                                       which is a different model entirely)
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

Open `http://localhost:3000` and pick a flow from the home page. Every page
load generates a brand-new test `customerId` — nothing is persisted to
localStorage, so a plain refresh gets you a completely fresh identity with
no linked accounts. The one exception is the mobile full-page redirect: the
customerId rides along in the `bankAccountLinkRedirect` URL so returning
from the bank's login doesn't land you as a stranger to the account you
just linked. "reset test user" gets you a new identity without reloading.

To actually link a bank account, sandbox uses Plaid's sandbox mode: pick any
institution and log in with Plaid's test credentials (`user_good` /
`pass_good`). Sandbox is fully simulated — there's no path to a real bank
account from it, by design.

## Native iOS app

See [`ios-app/README.md`](ios-app/README.md). It's a SwiftUI project defined
via [XcodeGen](https://github.com/yonaskolb/XcodeGen)'s `project.yml` — run
`xcodegen generate` to produce the `.xcodeproj`, then open it in Xcode,
select your own Apple ID as the signing team, and run it on your iPhone.
