'use client';

import {useCallback, useEffect, useState} from 'react';

function getOrCreateCustomerId(storageKey: string): string {
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;

  const fresh = `bank-auth-demo-${crypto.randomUUID()}`;
  window.localStorage.setItem(storageKey, fresh);
  return fresh;
}

/**
 * Owns the "who is this demo user" identity for one of the flows, plus the
 * Coinflow session key scoped to them. Each flow gets its own storage
 * namespace so testing one doesn't clobber another's linked bank account.
 */
export function useDemoSession(namespace: 'link') {
  const storageKey = `bank-auth-demo:${namespace}:customerId`;
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
    const id = getOrCreateCustomerId(storageKey);
    // Mount-time sync from localStorage — not derivable from render, so the
    // set-state-in-effect rule's usual "you might not need an effect" doesn't apply.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCustomerId(id);
    fetchSessionKey(id);
    // Only run once on mount per namespace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const resetCustomerId = useCallback(() => {
    window.localStorage.removeItem(storageKey);
    const id = getOrCreateCustomerId(storageKey);
    setCustomerId(id);
    fetchSessionKey(id);
  }, [storageKey, fetchSessionKey]);

  return {
    customerId,
    sessionKey,
    loading,
    error,
    resetCustomerId,
    refreshSessionKey: () => customerId && fetchSessionKey(customerId),
  };
}
