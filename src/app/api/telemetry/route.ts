import { NextRequest, NextResponse } from 'next/server';
import { getLiveInvestigationEvidence } from '@/lib/telemetry-service';
import { isAddress, type Address } from 'viem';

export const revalidate = 0; // Live on-chain read

export async function GET(req: NextRequest) {
  const curveParam = req.nextUrl.searchParams.get('curveAddress');
  const targetCurve = curveParam && isAddress(curveParam) ? (curveParam as Address) : undefined;

  try {
    const evidence = await getLiveInvestigationEvidence(targetCurve);
    return NextResponse.json({
      success: true,
      evidence
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to ingest on-chain telemetry evidence'
      },
      { status: 502 }
    );
  }
}
