/**
 * Builds Coinflow's hosted bank-auth URL. No secrets here — safe to import
 * from client components, unlike coinflow.ts (which holds the merchant API
 * key and is server-only).
 */

export const COINFLOW_MERCHANT_ID = 'predictionmarketmoon';
export const COINFLOW_HOSTED_BASE = 'https://sandbox.coinflow.cash';

export function buildBankAuthUrl({
  sessionKey,
  bankAccountLinkRedirect,
  origins,
}: {
  sessionKey: string;
  bankAccountLinkRedirect: string;
  origins?: string[];
}): string {
  const url = new URL(
    `${COINFLOW_HOSTED_BASE}/solana/withdraw/${COINFLOW_MERCHANT_ID}`
  );
  url.searchParams.set('sessionKey', sessionKey);
  url.searchParams.set('bankAccountLinkRedirect', bankAccountLinkRedirect);
  // Bank accounts only — no debit card push-to-card option in this demo.
  url.searchParams.set('allowedWithdrawSpeeds', 'standard');
  if (origins?.length) {
    url.searchParams.set('origins', JSON.stringify(origins));
  }
  return url.toString();
}
