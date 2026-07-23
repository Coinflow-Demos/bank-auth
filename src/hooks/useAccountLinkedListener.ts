'use client';

import {useEffect} from 'react';

/**
 * Coinflow's hosted bank-auth UI posts a window message when linking
 * succeeds. Docs show two shapes in the wild (`{data: 'accountLinked', ...}`
 * and `{method: 'accountLinked', ...}`), so this listens for either.
 */
export function useAccountLinkedListener(onLinked: (info?: unknown) => void) {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      let parsed: unknown = event.data;
      if (typeof event.data === 'string') {
        try {
          parsed = JSON.parse(event.data);
        } catch {
          return;
        }
      }
      if (!parsed || typeof parsed !== 'object') return;

      const {data, method, info} = parsed as {
        data?: string;
        method?: string;
        info?: unknown;
      };

      if (data === 'accountLinked' || method === 'accountLinked') {
        onLinked(info);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLinked]);
}
