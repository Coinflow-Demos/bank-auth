import {NextResponse} from 'next/server';
import {CoinflowApiError, getWithdrawalStatus} from '@/lib/coinflow';

export async function GET(
  _request: Request,
  ctx: RouteContext<'/api/withdrawal/[id]'>
) {
  const {id} = await ctx.params;

  try {
    const withdrawal = await getWithdrawalStatus(id);
    return NextResponse.json({withdrawal});
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
