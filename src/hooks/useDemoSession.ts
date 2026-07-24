'use client';

import {useCallback, useEffect, useState} from 'react';

function generateCustomerId(): string {
  return `bank-auth-demo-${crypto.randomUUID()}`;
}

/**
 * A brand-new identity on every load, EXCEPT when returning from the mobile
 * bank-auth redirect — that trip carries `?customerId=` forward in the URL
 * so you don't land back as a stranger to the account you just linked.
 * Consumes (and strips) that param if present.
 */
function resolveInitialCustomerId(): string {
  const params = new URLSearchParams(window.location.search);
  const continuationId = params.get('customerId');
  if (!continuationId) return generateCustomerId();

  params.delete('customerId');
  const query = params.toString();
  window.history.replaceState(
    null,
    '',
    window.location.pathname + (query ? `?${query}` : '')
  );
  return continuationId;
}

/**
 * Owns the "who is this demo user" identity, plus the Coinflow session key
 * scoped to them. Deliberately not persisted anywhere (no localStorage) —
 * every page load is a fresh customer, and a plain refresh never brings the
 * previous one back.
 */
export function useDemoSession() {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessionKey = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/session-key', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({customerId: id}),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Failed to create session key');
      setSessionKey(body.sessionKey);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = resolveInitialCustomerId();
    // Mount-time identity resolution (URL continuation or a fresh UUID) —
    // not derivable from render, so the set-state-in-effect rule's usual
    // "you might not need an effect" doesn't apply.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCustomerId(id);
    fetchSessionKey(id);
    // Only run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetCustomerId = useCallback(() => {
    const id = generateCustomerId();
    setCustomerId(id);
    fetchSessionKey(id);
  }, [fetchSessionKey]);

  return {customerId, sessionKey, loading, error, resetCustomerId};
}
