import { NextRequest, NextResponse } from 'next/server';
import { verifyOwnWalletChogNft, getSimulatedJudgeAuthStatus } from '@/lib/auth-service';

export const revalidate = 0; // Live check

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, isWalletConnected, isSimulatedJudge } = body;

    if (isSimulatedJudge) {
      return NextResponse.json({
        success: true,
        auth: getSimulatedJudgeAuthStatus()
      });
    }

    const auth = await verifyOwnWalletChogNft(walletAddress, Boolean(isWalletConnected));
    return NextResponse.json({
      success: true,
      auth
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to verify Chog NFT ownership'
      },
      { status: 500 }
    );
  }
}
