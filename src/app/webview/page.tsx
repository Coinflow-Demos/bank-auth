'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {useDemoSession} from '@/hooks/useDemoSession';
import {useWithdrawerAccounts} from '@/hooks/useWithdrawerAccounts';
import {AccountList} from '@/components/AccountList';
import {PayoutForm} from '@/components/PayoutForm';

declare global {
  interface Window {
    ReactNativeWebView?: {postMessage: (message: string) => void};
  }
}

function postToNativeHost(message: unknown) {
  const payload = JSON.stringify(message);
  // Android react-native-webview bridge.
  window.ReactNativeWebView?.postMessage(payload);
  // iOS WKWebView bridge — handler name MUST be exactly "ReactNativeWebView",
  // Coinflow's checkout/withdraw page itself also looks for this handler to
  // decide whether it's running inside a supported mobile webview.
  const webkitHandler = (
    window as unknown as {
      webkit?: {messageHandlers?: {ReactNativeWebView?: {postMessage: (m: unknown) => void}}};
    }
  ).webkit?.messageHandlers?.ReactNativeWebView;
  webkitHandler?.postMessage(payload);
}

function isInsideRecognizedWebview(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as {
    ReactNativeWebView?: unknown;
    webkit?: {messageHandlers?: {ReactNativeWebView?: unknown}};
  };
  return Boolean(w.ReactNativeWebView || w.webkit?.messageHandlers?.ReactNativeWebView);
}

export default function WebviewDemoPage() {
  const {customerId, sessionKey, loading, error, resetCustomerId} =
    useDemoSession('webview');
  const {accounts, loading: accountsLoading, refetch} =
    useWithdrawerAccounts(sessionKey);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [justLinked, setJustLinked] = useState(false);
  const [recognizedWebview, setRecognizedWebview] = useState(false);

  // A fresh customerId (via "reset test user") means the previous selection
  // no longer refers to anything real. Doesn't fire on the ?linked=1 return
  // trip, since customerId is stable across that redirect. Not derivable
  // during render — it's resetting UI state in response to an identity
  // change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedToken(null);
  }, [customerId]);

  // Skip the extra tap when there's exactly one account — computed at
  // render time instead of an effect, so there's nothing to reset later.
  const effectiveSelectedToken =
    selectedToken ??
    (accounts?.bankAccounts.length === 1 ? accounts.bankAccounts[0].token : null);

  useEffect(() => {
    // Reads window/location on mount — genuinely external state, not
    // something derivable during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecognizedWebview(isInsideRecognizedWebview());
    const params = new URLSearchParams(window.location.search);
    if (params.get('linked') === '1') {
      setJustLinked(true);
      postToNativeHost({event: 'accountLinked', info: {type: 'bank'}});
      refetch();
      window.history.replaceState(null, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bankAuthUrl = useMemo(() => {
    if (!sessionKey) return null;
    const params = new URLSearchParams({
      sessionKey,
      bankAccountLinkRedirect: `${window.location.origin}/webview?linked=1`,
      allowedWithdrawSpeeds: 'standard',
    });
    return `https://sandbox.coinflow.cash/solana/withdraw/predictionmarketmoon?${params.toString()}`;
  }, [sessionKey]);

  return (
    <main className="page">
      <p className="breadcrumb">
        <Link href="/">← back</Link>
      </p>
      <h1>Mobile: embedded webview</h1>
      <p className="muted">
        This is the page a native app&apos;s <code>WKWebView</code> /{' '}
        <code>react-native-webview</code> would load directly — no iframe
        wrapper, full-page navigation, and it posts a bridge message back to
        the native host on success (handler name must be exactly{' '}
        <code>ReactNativeWebView</code>, which is also what Coinflow&apos;s
        own hosted page checks for).
      </p>

      <div className="warning">
        <strong>Why this is risky for OAuth banks:</strong> many banks (and
        Plaid&apos;s OAuth flow generally) detect that they&apos;re running
        inside an embedded in-app webview and refuse to complete login there —
        the same restriction Google enforces for its own OAuth. If you&apos;re
        building this for a real mobile app, prefer opening the bank-auth URL
        in the system browser (<code>ASWebAuthenticationSession</code> on iOS,
        Chrome Custom Tabs on Android) — see the native app demo.
      </div>

      {!recognizedWebview && (
        <div className="notice">
          You&apos;re viewing this in a normal browser tab, not inside a
          native app&apos;s webview, so the <code>ReactNativeWebView</code>{' '}
          bridge isn&apos;t present here — the bridge-post code still runs,
          it just has nothing to call.
        </div>
      )}

      <section className="card">
        <div className="row-between">
          <span className="muted small">customerId: {customerId}</span>
          <button className="link-button" onClick={resetCustomerId}>
            reset test user
          </button>
        </div>
        {loading && <p>Creating session key…</p>}
        {error && <p className="error">{error}</p>}
        {justLinked && <p className="success">Account linked ✓ (returned from bank auth)</p>}

        {bankAuthUrl && (
          <a className="button-link" href={bankAuthUrl}>
            Open bank auth (full-page navigation)
          </a>
        )}
      </section>

      <section className="card">
        <h2>Linked accounts (Get Withdrawer)</h2>
        {accountsLoading && <p>Loading accounts…</p>}
        {accounts && (
          <AccountList
            accounts={accounts.bankAccounts}
            selectedToken={effectiveSelectedToken}
            onSelect={setSelectedToken}
          />
        )}
        <button className="link-button" onClick={refetch}>
          refresh
        </button>
      </section>

      {customerId && (
        <section className="card">
          <h2>Delegated payout</h2>
          <PayoutForm
            key={customerId}
            customerId={customerId}
            accountToken={effectiveSelectedToken}
          />
        </section>
      )}
    </main>
  );
}
