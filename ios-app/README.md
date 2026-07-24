# Bank Auth Demo — iOS

SwiftUI test app that links a bank account through Coinflow's hosted UI by
handing off to the **real system Safari app** (`UIApplication.shared.open`),
not an embedded webview and not an in-app auth session — that's the fix for
OAuth banks that refuse to complete login anywhere other than a genuine,
fully-external browser context. This matches Coinflow's own documented
guidance for mobile apps (see the React Native redirect example in their
docs, which uses `Linking.openURL` — the RN equivalent of this).

It talks to the Next.js app one level up (`../src/app/api/*`) for anything
that needs the merchant API key — the app itself never sees that key.

## Run it

1. Install [XcodeGen](https://github.com/yonaskolb/XcodeGen) if you don't
   have it: `brew install xcodegen`.
2. From this directory: `xcodegen generate`. This produces
   `BankAuthDemo.xcodeproj` (gitignored — `project.yml` is the source of
   truth, regenerate any time you pull changes to it).
3. Open `BankAuthDemo.xcodeproj` in Xcode.
4. Select the `BankAuthDemo` target → **Signing & Capabilities** → set
   **Team** to your own Apple ID (a free personal team is fine for running
   on your own device).
5. The app defaults to the deployed instance at `https://bank-auth.vercel.app`
   — no setup needed. If you're running the Next.js app locally instead
   (`npm run dev`), change the "API base URL" field in the app itself: the
   simulator can use `http://localhost:3100` directly, but a physical
   iPhone needs your Mac's LAN IP (e.g. `http://192.168.1.23:3100`) since
   `localhost` on the phone means the phone itself.
6. Plug in your iPhone (or connect over Wi-Fi in Xcode's Devices window),
   select it as the run destination, and hit Run.

## What it does

1. **Link a bank account** — fetches a session key from `/api/session-key`,
   builds the same `sandbox.coinflow.cash/solana/withdraw/...` URL the web
   app uses, and opens it with `UIApplication.shared.open(url)` — a real,
   full hand-off to Safari (the app backgrounds; this is not a sheet or an
   in-app session). Because it's genuinely Safari, it shares its real
   session/cookies and OAuth bank flows work exactly as they would if you'd
   typed the URL into mobile Safari yourself. `bankAccountLinkRedirect` is
   set to `bankauthdemo://callback`; when Coinflow redirects there after
   linking finishes, Safari shows a one-time **"Open in 'Bank Auth
   Demo'?"** prompt (standard for custom URL schemes — a Universal Link
   would skip this but requires hosting a verification file on a real
   domain), and `.onOpenURL` in `ContentView` picks it back up.
2. **Get Withdrawer** — calls `/api/withdrawer` to list bank accounts linked
   to that session, same as both web flows.
3. **Delegated payout** — capped at $3.00 in the UI (matches the server-side
   cap in `/api/payout`), with a "check status" button against
   `/api/withdrawal/{signature}`.

## Notes

- `NSAllowsArbitraryLoads` is set in `project.yml` so the app can hit plain
  `http://` during local development. Tighten this (or point at an HTTPS
  deployment) before distributing the app to anyone else.
- The bundle identifier (`com.example.bankauthdemo`) and URL scheme
  (`bankauthdemo`) in `project.yml` are placeholders — change them if you
  want, just keep `CFBundleURLSchemes` and `Coinflow.callbackURLScheme` in
  `Coinflow.swift` in sync.
