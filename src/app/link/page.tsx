'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {useDemoSession} from '@/hooks/useDemoSession';
import {useWithdrawerAccounts} from '@/hooks/useWithdrawerAccounts';
import {useAccountLinkedListener} from '@/hooks/useAccountLinkedListener';
import {isMobileDevice} from '@/lib/device';
import {AccountList} from '@/components/AccountList';
import {PayoutForm} from '@/components/PayoutForm';

export default function LinkPage() {
  const {customerId, sessionKey, loading, error, resetCustomerId} =
    useDemoSession();
  const {accounts, loading: accountsLoading, refetch} =
    useWithdrawerAccounts(sessionKey);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [justLinked, setJustLinked] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    // Reads navigator/location on mount — genuinely external, not derivable
    // during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobile(isMobileDevice());

    const params = new URLSearchParams(window.location.search);
    if (params.get('linked') === '1') {
      setJustLinked(true);
      refetch();
      window.history.replaceState(null, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A fresh customerId (via "reset test user") means the previous selection
  // and success banner no longer refer to anything real.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedToken(null);
    setJustLinked(false);
  }, [customerId]);

  // Skip the extra click when there's exactly one account to pick from.
  const effectiveSelectedToken =
    selectedToken ??
    (accounts?.bankAccounts.length === 1 ? accounts.bankAccounts[0].token : null);

  const handleLinked = useCallback(() => {
    setJustLinked(true);
    refetch();
  }, [refetch]);
  useAccountLinkedListener(handleLinked);

  const bankAuthUrl = useMemo(() => {
    if (!sessionKey || !customerId || isMobile === null) return null;
    // Mobile does a real full-page round trip, so the only way back to the
    // same (unpersisted, never-stored) identity is to carry it in the URL.
    const bankAccountLinkRedirect = isMobile
      ? `${window.location.origin}/link?linked=1&customerId=${encodeURIComponent(customerId)}`
      : `${window.location.origin}/bank-callback`;
    const params = new URLSearchParams({
      sessionKey,
      bankAccountLinkRedirect,
      allowedWithdrawSpeeds: 'standard',
      ...(isMobile ? {} : {origins: JSON.stringify([window.location.origin])}),
    });
    return `https://sandbox.coinflow.cash/solana/withdraw/predictionmarketmoon?${params.toString()}`;
  }, [sessionKey, customerId, isMobile]);

  return (
    <main className="page">
      <p className="breadcrumb">
        <Link href="/">← back</Link>
      </p>
      <h1>Link a bank account</h1>
      <p className="muted">
        One integration, adapted to the device: desktop browsers get
        Coinflow&apos;s{' '}
        <a href="https://docs.coinflow.cash/guides/payouts/implementation-methods/bank-authentication-ui">
          Bank Authentication UI
        </a>{' '}
        embedded in an iframe. Mobile browsers get a full-page redirect
        instead — bank OAuth login pages can&apos;t be framed at all (that&apos;s
        universal, not mobile-specific), and mobile browsers are far more
        prone to popup-blocking issues when that escape hatch kicks in, so a
        full-page redirect is just the more reliable choice there.
      </p>

      {isMobile !== null && (
        <p className="sandbox-banner">
          Detected: <strong>{isMobile ? 'mobile browser' : 'desktop browser'}</strong> →
          using {isMobile ? 'full-page redirect' : 'iframe embed'}.
        </p>
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
        {justLinked && <p className="success">Account linked ✓</p>}

        {bankAuthUrl && isMobile === false && (
          <iframe
            src={bankAuthUrl}
            className="bank-auth-iframe"
            allow="geolocation"
          />
        )}
        {bankAuthUrl && isMobile === true && (
          <a className="button-link" href={bankAuthUrl}>
            Link a bank account
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
