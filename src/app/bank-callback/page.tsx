'use client';

import {useEffect, useState} from 'react';

/**
 * Plaid's OAuth bank flow opens the connecting institution in a new tab/
 * popup, then redirects that tab to `bankAccountLinkRedirect` once the user
 * finishes authenticating with their bank. This page is that redirect
 * target for the iframe demo: it has nothing to do but close itself so the
 * user lands back on the original tab, where the iframe's own
 * `accountLinked` postMessage is what actually reports success.
 */
export default function BankCallbackPage() {
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      window.close();
      setClosed(true);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="callback-page">
      <h1>Bank connected</h1>
      <p>
        {closed
          ? 'You can close this window and return to the demo.'
          : 'Finishing up…'}
      </p>
    </main>
  );
}
