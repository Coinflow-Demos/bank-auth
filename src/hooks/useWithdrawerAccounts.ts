'use client';

import {useCallback, useEffect, useState} from 'react';
import type {WithdrawerAccounts} from '@/lib/types';

export function useWithdrawerAccounts(sessionKey: string | null) {
  const [accounts, setAccounts] = useState<WithdrawerAccounts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!sessionKey) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/withdrawer', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({sessionKey}),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Failed to fetch accounts');
      setAccounts(body);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [sessionKey]);

  useEffect(() => {
    // Fetch on mount / whenever the session key changes — a real network
    // sync, not derived render state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, [refetch]);

  return {accounts, loading, error, refetch};
}
