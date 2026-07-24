/**
 * Sandbox-only Coinflow API client.
 *
 * This whole file intentionally has no "prod" base URL anywhere, not even
 * behind an env toggle — that's a deliberate safety choice while this repo
 * is being built against a real (sandbox) merchant account. Flip to prod
 * only when explicitly asked to, and treat that as a separate change.
 */

import type {BankAccountSummary, WithdrawerAccounts} from './types';
import {MAX_PAYOUT_CENTS} from './constants';

export const COINFLOW_API_BASE = 'https://api-sandbox.coinflow.cash/api';

function getApiKey(): string {
  const key = process.env.COINFLOW_SANDBOX_API_KEY;
  if (!key) {
    throw new Error(
      'COINFLOW_SANDBOX_API_KEY is not set. Add it to .env.local (see .env.example).'
    );
  }
  return key;
}

export class CoinflowApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'CoinflowApiError';
    this.status = status;
    this.body = body;
  }
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * GET /auth/session-key
 * Requires the merchant API key (server-side only) plus the customer id the
 * session key should be scoped to. Session keys are safe to hand to the
 * browser afterwards — they're customer-scoped and short-lived, unlike the
 * merchant API key.
 */
export async function getSessionKey(customerId: string): Promise<string> {
  const response = await fetch(`${COINFLOW_API_BASE}/auth/session-key`, {
    method: 'GET',
    headers: {
      Authorization: getApiKey(),
      'x-coinflow-auth-user-id': customerId,
    },
    cache: 'no-store',
  });

  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw new CoinflowApiError(
      'Failed to create session key',
      response.status,
      body
    );
  }

  return (body as {key: string}).key;
}

/**
 * GET /withdraw/
 * Scoped by the session key's Withdrawer identity — NOT the same record as
 * `/customer/v2/`. Coinflow keeps two entirely separate models: a
 * "Customer" (checkout/pay-in accounts) and a "Withdrawer" (payout
 * destinations, which is what the hosted bank-auth UI actually writes to).
 * Calling the customer endpoint here would always show an empty account
 * list even after a real, successful bank link.
 *
 * Returns 401 ("No withdrawer associated with wallet...") until this
 * customerId has gone through bank auth at least once, and 451 if a
 * withdrawer exists but hasn't finished identity verification yet — both
 * treated as "no accounts to show" rather than hard errors.
 */
export async function getWithdrawerAccounts(
  sessionKey: string
): Promise<WithdrawerAccounts> {
  const response = await fetch(`${COINFLOW_API_BASE}/withdraw/`, {
    method: 'GET',
    headers: {
      'x-coinflow-auth-session-key': sessionKey,
    },
    cache: 'no-store',
  });

  if (response.status === 401) {
    return {hasWithdrawer: false, kycApproved: false, bankAccounts: []};
  }
  if (response.status === 451) {
    return {hasWithdrawer: true, kycApproved: false, bankAccounts: []};
  }

  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw new CoinflowApiError(
      'Failed to fetch withdrawer accounts',
      response.status,
      body
    );
  }

  const parsed = body as {
    withdrawer: {
      bankAccounts?: BankAccountSummary[];
      verification?: {status?: string};
    };
  };

  return {
    hasWithdrawer: true,
    kycApproved: parsed.withdrawer?.verification?.status === 'approved',
    bankAccounts: parsed.withdrawer?.bankAccounts ?? [],
  };
}

export interface DelegatedPayoutResult {
  signature: string;
  effectiveSpeed: string;
}

/**
 * POST /merchant/withdraws/payout/delegated
 * Pays a linked bank account from the merchant's Coinflow wallet balance.
 * Callers MUST have already clamped amountCents to MAX_PAYOUT_CENTS — this
 * function also enforces it as a second line of defense.
 */
export async function createDelegatedPayout({
  customerId,
  accountToken,
  amountCents,
  idempotencyKey,
}: {
  customerId: string;
  accountToken: string;
  amountCents: number;
  idempotencyKey: string;
}): Promise<DelegatedPayoutResult> {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('amountCents must be a positive integer');
  }
  if (amountCents > MAX_PAYOUT_CENTS) {
    throw new Error(
      `Refusing to pay out $${(amountCents / 100).toFixed(2)} — this demo is capped at $${(MAX_PAYOUT_CENTS / 100).toFixed(2)}`
    );
  }

  const response = await fetch(
    `${COINFLOW_API_BASE}/merchant/withdraws/payout/delegated`,
    {
      method: 'POST',
      headers: {
        Authorization: getApiKey(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: customerId,
        amount: {cents: amountCents, currency: 'USD'},
        speed: 'standard',
        account: accountToken,
        idempotencyKey,
      }),
      cache: 'no-store',
    }
  );

  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw new CoinflowApiError('Delegated payout failed', response.status, body);
  }

  return body as DelegatedPayoutResult;
}

export interface WithdrawalStatus {
  status: string;
  [key: string]: unknown;
}

/** GET /merchant/withdraws/{withdrawalId} — poll payout status by signature. */
export async function getWithdrawalStatus(
  withdrawalId: string
): Promise<WithdrawalStatus> {
  const response = await fetch(
    `${COINFLOW_API_BASE}/merchant/withdraws/${encodeURIComponent(withdrawalId)}`,
    {
      method: 'GET',
      headers: {Authorization: getApiKey()},
      cache: 'no-store',
    }
  );

  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw new CoinflowApiError(
      'Failed to fetch withdrawal status',
      response.status,
      body
    );
  }

  return (body as {withdrawal: WithdrawalStatus}).withdrawal;
}
