import {NextRequest, NextResponse} from 'next/server';
import {CoinflowApiError, getSessionKey} from '@/lib/coinflow';

export async function POST(request: NextRequest) {
  const {customerId} = (await request.json()) as {customerId?: string};

  if (!customerId || typeof customerId !== 'string') {
    return NextResponse.json({error: 'customerId is required'}, {status: 400});
  }

  try {
    const key = await getSessionKey(customerId);
    return NextResponse.json({sessionKey: key});
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
