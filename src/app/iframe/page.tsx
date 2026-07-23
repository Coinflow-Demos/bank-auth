'use client';

import {useCallback, useMemo, useState} from 'react';
import Link from 'next/link';
import {useDemoSession} from '@/hooks/useDemoSession';
import {useWithdrawerAccounts} from '@/hooks/useWithdrawerAccounts';
import {useAccountLinkedListener} from '@/hooks/useAccountLinkedListener';
import {AccountList} from '@/components/AccountList';
import {PayoutForm} from '@/components/PayoutForm';

export default function IframeDemoPage() {
  const {customerId, sessionKey, loading, error, resetCustomerId} =
    useDemoSession('iframe');
  const {
    accounts,
    loading: accountsLoading,
    refetch,
  } = useWithdrawerAccounts(sessionKey);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [justLinked, setJustLinked] = useState(false);

  const handleLinked = useCallback(() => {
    setJustLinked(true);
    refetch();
  }, [refetch]);
  useAccountLinkedListener(handleLinked);

  const bankAuthUrl = useMemo(() => {
    if (!sessionKey) return null;
    const params = new URLSearchParams({
      sessionKey,
      bankAccountLinkRedirect: `${window.location.origin}/bank-callback`,
      allowedWithdrawSpeeds: 'standard',
      origins: JSON.stringify([window.location.origin]),
    });
    return `https://sandbox.coinflow.cash/solana/withdraw/predictionmarketmoon?${params.toString()}`;
  }, [sessionKey]);

  return (
    <main className="page">
      <p className="breadcrumb">
        <Link href="/">← back</Link>
      </p>
      <h1>Web: iframe embed</h1>
      <p className="muted">
        This is the standard web pattern from Coinflow&apos;s{' '}
        <a href="https://docs.coinflow.cash/guides/payouts/implementation-methods/bank-authentication-ui">
          Bank Authentication UI
        </a>{' '}
        docs: embed the hosted withdraw/bank-auth URL in an iframe on a normal
        webpage. Works well in a desktop or mobile browser because the whole
        page (and the iframe) share the browser&apos;s real cookies/session —
        OAuth banks connect fine.
      </p>

      <section className="card">
        <div className="row-between">
          <span className="muted small">customerId: {customerId}</span>
          <button className="link-button" onClick={resetCustomerId}>
            reset test user
          </button>
        </div>

        {loading && <p>Creating session key…</p>}
        {error && <p className="error">{error}</p>}

        {bankAuthUrl && (
          <iframe
            src={bankAuthUrl}
            className="bank-auth-iframe"
            allow="geolocation"
          />
        )}
        {justLinked && <p className="success">Account linked message received ✓</p>}
      </section>

      <section className="card">
        <h2>Linked accounts (Get Withdrawer)</h2>
        {accountsLoading && <p>Loading accounts…</p>}
        {accounts && (
          <AccountList
            accounts={accounts.bankAccounts}
            selectedToken={selectedToken}
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
          <PayoutForm customerId={customerId} accountToken={selectedToken} />
        </section>
      )}
    </main>
  );
}
