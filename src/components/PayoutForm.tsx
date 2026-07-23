'use client';

import {useState} from 'react';

const MAX_DOLLARS = 3;

export function PayoutForm({
  customerId,
  accountToken,
}: {
  customerId: string;
  accountToken: string | null;
}) {
  const [amount, setAmount] = useState('1.00');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{signature: string; effectiveSpeed: string} | null>(
    null
  );
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clampAmount = () => {
    const value = Math.min(Math.max(Number(amount) || 0, 0.01), MAX_DOLLARS);
    setAmount(value.toFixed(2));
  };

  const submit = async () => {
    if (!accountToken) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    setStatus(null);
    try {
      const amountCents = Math.round(Number(amount) * 100);
      const response = await fetch('/api/payout', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({customerId, accountToken, amountCents}),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Payout failed');
      setResult(body);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const checkStatus = async () => {
    if (!result) return;
    setStatus('Checking...');
    try {
      const response = await fetch(
        `/api/withdrawal/${encodeURIComponent(result.signature)}`
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Status check failed');
      setStatus(body.withdrawal.status);
    } catch (e) {
      setStatus(`Error: ${(e as Error).message}`);
    }
  };

  return (
    <div className="payout-form">
      <label className="field">
        <span>Amount (max ${MAX_DOLLARS.toFixed(2)})</span>
        <input
          type="number"
          min={0.01}
          max={MAX_DOLLARS}
          step={0.01}
          value={amount}
          onChange={e => setAmount(e.target.value)}
          onBlur={clampAmount}
        />
      </label>

      <button disabled={!accountToken || submitting} onClick={submit}>
        {submitting ? 'Sending payout…' : `Pay out $${amount}`}
      </button>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="payout-result">
          <p>
            Payout sent. Signature: <code>{result.signature}</code>
          </p>
          <p>Effective speed: {result.effectiveSpeed}</p>
          <button onClick={checkStatus}>Check status</button>
          {status && <p>Status: {status}</p>}
        </div>
      )}
    </div>
  );
}
