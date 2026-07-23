# Bank Auth Demo — iOS

SwiftUI test app that links a bank account through Coinflow's hosted UI by
opening it in the **system browser** (`ASWebAuthenticationSession`), not an
embedded webview — that's the fix for OAuth banks that refuse to complete
login inside an in-app webview.

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
5. Make sure the Next.js app (`npm run dev` in the repo root) is running
   and reachable from your iPhone:
   - Simulator: `http://localhost:3100` works as-is.
   - Physical iPhone: use your Mac's LAN IP instead of `localhost` (e.g.
     `http://192.168.1.23:3100`) — the app's first field lets you set this
     without recompiling.
6. Plug in your iPhone (or connect over Wi-Fi in Xcode's Devices window),
   select it as the run destination, and hit Run.

## What it does

1. **Link a bank account** — fetches a session key from `/api/session-key`,
   builds the same `sandbox.coinflow.cash/solana/withdraw/...` URL the web
   app uses, and opens it via `ASWebAuthenticationSession` with the
   `bankauthdemo://callback` redirect. Because this uses the real system
   browser, it shares Safari's session/cookies — Plaid's OAuth bank flow
   works the same way it would in mobile Safari itself.
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
