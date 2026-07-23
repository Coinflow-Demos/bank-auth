import {NextRequest, NextResponse} from 'next/server';
import {CoinflowApiError, getCustomerWithAccounts} from '@/lib/coinflow';

export async function POST(request: NextRequest) {
  const {sessionKey} = (await request.json()) as {sessionKey?: string};

  if (!sessionKey || typeof sessionKey !== 'string') {
    return NextResponse.json({error: 'sessionKey is required'}, {status: 400});
  }

  try {
    const accounts = await getCustomerWithAccounts(sessionKey);
    return NextResponse.json(accounts);
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
