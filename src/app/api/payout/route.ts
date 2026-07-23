import {randomUUID} from 'crypto';
import {NextRequest, NextResponse} from 'next/server';
import {CoinflowApiError, createDelegatedPayout, MAX_PAYOUT_CENTS} from '@/lib/coinflow';

export async function POST(request: NextRequest) {
  const {customerId, accountToken, amountCents} = (await request.json()) as {
    customerId?: string;
    accountToken?: string;
    amountCents?: number;
  };

  if (!customerId || !accountToken) {
    return NextResponse.json(
      {error: 'customerId and accountToken are required'},
      {status: 400}
    );
  }

  if (
    typeof amountCents !== 'number' ||
    !Number.isInteger(amountCents) ||
    amountCents <= 0
  ) {
    return NextResponse.json(
      {error: 'amountCents must be a positive integer'},
      {status: 400}
    );
  }

  // Hard server-side cap — never trust the client's number alone.
  if (amountCents > MAX_PAYOUT_CENTS) {
    return NextResponse.json(
      {
        error: `This demo never pays out more than $${(MAX_PAYOUT_CENTS / 100).toFixed(2)}`,
      },
      {status: 400}
    );
  }

  try {
    const result = await createDelegatedPayout({
      customerId,
      accountToken,
      amountCents,
      idempotencyKey: randomUUID(),
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CoinflowApiError) {
      return NextResponse.json(
        {error: error.message, details: error.body},
        {status: error.status}
      );
    }
    return NextResponse.json({error: (error as Error).message}, {status: 500});
  }
}
