import { NextRequest, NextResponse } from 'next/server';
import { verifyOwnWalletChogNft, getSimulatedJudgeAuthStatus } from '@/lib/auth-service';
import { getLiveInvestigationEvidence } from '@/lib/telemetry-service';
import { gradeMissionVerdict } from '@/lib/mission-engine';
import type { VerdictSubmission } from '@/types';

export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { submission, walletAddress, isWalletConnected, isSimulatedJudge } = body as {
      submission: VerdictSubmission;
      walletAddress?: string;
      isWalletConnected?: boolean;
      isSimulatedJudge?: boolean;
    };

    if (!submission || !submission.curveAddress || !submission.selectedChoice) {
      return NextResponse.json(
        { success: false, error: 'Invalid submission payload.' },
        { status: 400 }
      );
    }

    // 1. Resolve Auth Status
    const authStatus = isSimulatedJudge
      ? getSimulatedJudgeAuthStatus()
      : await verifyOwnWalletChogNft(walletAddress, Boolean(isWalletConnected));

    // 2. Fetch Fresh Live Telemetry Evidence
    const evidence = await getLiveInvestigationEvidence(submission.curveAddress);

    // 3. Evaluate Verdict Deterministically
    const grading = gradeMissionVerdict(submission, evidence, authStatus);

    return NextResponse.json({
      success: true,
      grading,
      evidence
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to grade mission verdict'
      },
      { status: 500 }
    );
  }
}
