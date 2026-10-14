import type {
  TelemetryEvidence,
  MissionQuestion,
  VerdictChoice,
  GradingResult,
  VerdictSubmission,
  ChogAuthStatus,
  CaseId
} from '../types';

export const MISSION_CASE_A_SPEC: MissionQuestion = {
  id: 'mission-case-a-graduation',
  caseId: 'CASE_A',
  caseNumber: 'Case File #01',
  title: 'Case A: Curve Graduation & Reserve Proof',
  scenario:
    'Rogue market snipers often exploit indexing lags between upstream launchpad APIs and actual on-chain bonding curves. As an on-chain auditor, your duty is to compare the upstream board API reported graduation progress against authoritative Multicall3 on-chain reserve principal.',
  prompt:
    'Cross-examine the on-chain reserves against the API reported metric. Has the curve already graduated (complete=true), is the API synced within ±0.05%, or is there an active indexing lag discrepancy?',
  options: [
    {
      id: 'ACCURATE_SYNC',
      label: 'Accurate Synchronization (Synced)',
      description: 'On-chain reserve principal and API reported progress match within ±0.05% tolerance.'
    },
    {
      id: 'API_LAG_DISCREPANCY',
      label: 'Indexing Lag Discrepancy (Diverged)',
      description: 'On-chain reserve principal diverges from API progress by more than 0.05% (Data Lag Detected).'
    },
    {
      id: 'CURVE_COMPLETED',
      label: 'Bonding Curve Graduated (Completed)',
      description: 'On-chain curve state reports complete = true (100% target attained, migrated to DEX).'
    }
  ],
  tolerancePct: 0.05,
  isAvailable: true
};

export const MISSION_CASE_B_SPEC: MissionQuestion = {
  id: 'mission-case-b-ghost-market',
  caseId: 'CASE_B',
  caseNumber: 'Case File #02',
  title: 'Case B: Ghost Market Oracle Trap',
  scenario:
    'Crypto bonding curves trade 24/7, but Real-World Asset (RWA) and equity-paired tokens rely on underlying Wall Street market sessions. When US equity markets are closed, reference asset price feeds are static, exposing 24/7 token curves to off-market oracle disconnect.',
  prompt:
    'Evaluate the Wall Street Market Clock against continuous 24/7 curve activity. Is the equity reference market currently in its official Regular Trading Session (09:30–16:00 ET), or is it exposed to off-market session disconnect (Pre-Market, After-Hours, or Weekend Closed)?',
  options: [
    {
      id: 'REGULAR_SESSION',
      label: 'Regular Trading Session (Active)',
      description: 'Wall Street is in Regular Hours (09:30–16:00 ET). Equity reference oracles are liquid and actively updating.'
    },
    {
      id: 'OFF_MARKET_DISCONNECT',
      label: 'Off-Market Session Disconnect (Exposed)',
      description: 'Wall Street is Pre-Market, After-Hours, or Weekend Closed. Equity reference is halted while curve trades 24/7.'
    }
  ],
  isAvailable: true
};

export const MISSION_CASE_C_SPEC: MissionQuestion = {
  id: 'mission-case-c-tax-audit',
  caseId: 'CASE_C',
  caseNumber: 'Case File #03',
  title: 'Case C: Creator Tax Extraction Audit',
  scenario:
    'Bonding curves can configure variable creator transaction fees (baseTaxBps). High base taxes extract disproportionate friction on every buy and sell, siphoning community capital into creator treasuries.',
  prompt:
    'Audit the authoritative on-chain baseTaxBps parameter queried via Multicall3. What fee tier is enforced on this active curve?',
  options: [
    {
      id: 'ZERO_TAX',
      label: 'Zero Fee Tier (0% Tax)',
      description: 'On-chain baseTaxBps equals 0 (0 bps). Fair-launch trading with no creator transaction tax.'
    },
    {
      id: 'STANDARD_TAX',
      label: 'Standard Baseline Tier (0.01% - 1.50%)',
      description: 'On-chain baseTaxBps is between 1 and 150 bps (<= 1.5%). Baseline trading friction.'
    },
    {
      id: 'ELEVATED_TAX',
      label: 'Elevated Surcharge Tier (> 1.50%)',
      description: 'On-chain baseTaxBps exceeds 150 bps (> 1.5%). High fee friction extracting value on every trade.'
    }
  ],
  isAvailable: true
};

// Phase 1 Backward Compatibility
export const MISSION_ONE_SPEC: MissionQuestion = MISSION_CASE_A_SPEC;

export const ALL_MISSION_SPECS: Record<CaseId, MissionQuestion> = {
  CASE_A: MISSION_CASE_A_SPEC,
  CASE_B: MISSION_CASE_B_SPEC,
  CASE_C: MISSION_CASE_C_SPEC
};

export function getMissionSpec(caseId: CaseId, evidence?: TelemetryEvidence | null): MissionQuestion {
  const baseSpec = ALL_MISSION_SPECS[caseId] || MISSION_CASE_A_SPEC;
  if (caseId === 'CASE_C' && evidence && !evidence.taxAvailable) {
    return {
      ...baseSpec,
      isAvailable: false,
      unavailableReason: `The curve contract at ${evidence.curveAddress} does not return a verifiable baseTaxBps reading on Robinhood Testnet.`
    };
  }
  return baseSpec;
}

/**
 * Deterministically grades a player's verdict against verified live evidence.
 * 100% deterministic rules — no AI hallucination, no mock substitutions.
 */
export function gradeMissionVerdict(
  submission: VerdictSubmission,
  evidence: TelemetryEvidence,
  authStatus: ChogAuthStatus
): GradingResult {
  const caseId: CaseId = submission.caseId || 'CASE_A';
  let correctChoice: VerdictChoice = 'ACCURATE_SYNC';
  let explanation = '';

  if (caseId === 'CASE_A') {
    const onChainPct = evidence.onChainProgressPct;
    const apiPct = evidence.apiReportedProgressPct;
    const diffPct = Math.abs(onChainPct - apiPct);
    const isGraduated = evidence.isGraduated;

    if (isGraduated) {
      correctChoice = 'CURVE_COMPLETED';
      explanation = `The bonding curve at ${evidence.curveAddress} is marked complete=true on-chain. It has finished its bonding lifecycle and migrated liquidity to Uniswap v4.`;
    } else if (diffPct > (MISSION_CASE_A_SPEC.tolerancePct ?? 0.05)) {
      correctChoice = 'API_LAG_DISCREPANCY';
      explanation = `On-chain Multicall3 reading reveals ${onChainPct.toFixed(2)}% graduation, while the board API reported ${apiPct.toFixed(2)}%. The divergence is ${(diffPct * 100).toFixed(0)} bps (> 5 bps tolerance), proving an active indexing delay.`;
    } else {
      correctChoice = 'ACCURATE_SYNC';
      explanation = `On-chain Multicall3 reading (${onChainPct.toFixed(2)}%) and API reported reading (${apiPct.toFixed(2)}%) are synchronized within ${(diffPct * 100).toFixed(0)} bps (within 5 bps tolerance).`;
    }
  } else if (caseId === 'CASE_B') {
    const session = evidence.marketSession;
    if (session === 'REGULAR_HOURS') {
      correctChoice = 'REGULAR_SESSION';
      explanation = `Wall Street is currently in its Regular Trading Session (09:30–16:00 ET). Equity reference markets are open and liquid, minimizing synthetic oracle disconnect.`;
    } else {
      correctChoice = 'OFF_MARKET_DISCONNECT';
      explanation = `Wall Street is currently in ${session} (closed). While the 24/7 on-chain curve continues trading on Robinhood Testnet, the underlying US equity market reference is halted, creating an active off-market divergence risk.`;
    }
  } else if (caseId === 'CASE_C') {
    if (!evidence.taxAvailable) {
      correctChoice = 'UNAVAILABLE_TAX';
      explanation = `The curve contract at ${evidence.curveAddress} did not return a valid on-chain baseTaxBps value. Case unavailable.`;
    } else if (evidence.baseTaxBps === 0) {
      correctChoice = 'ZERO_TAX';
      explanation = `On-chain Multicall3 verified baseTaxBps = 0. The curve enforces 0.00% creator transaction fee (fair-launch tier).`;
    } else if (evidence.baseTaxBps <= 150) {
      correctChoice = 'STANDARD_TAX';
      explanation = `On-chain Multicall3 verified baseTaxBps = ${evidence.baseTaxBps} (${(evidence.baseTaxBps / 100).toFixed(2)}%). This is within the standard baseline fee tier (<= 1.50%).`;
    } else {
      correctChoice = 'ELEVATED_TAX';
      explanation = `On-chain Multicall3 verified baseTaxBps = ${evidence.baseTaxBps} (${(evidence.baseTaxBps / 100).toFixed(2)}%). This exceeds 1.50% base tax, placing it in the elevated surcharge tier.`;
    }
  }

  const isCorrect = submission.selectedChoice === correctChoice;
  const isHolder = authStatus.isVerifiedHolder;
  const isJudge = authStatus.isSimulatedJudge;

  let scoreAwarded = 0;
  if (isCorrect) {
    scoreAwarded = 100;
  }

  return {
    caseId,
    isCorrect,
    scoreAwarded,
    correctChoice,
    explanation,
    groundTruth: {
      onChainProgressPct: evidence.onChainProgressPct,
      apiReportedProgressPct: evidence.apiReportedProgressPct,
      diffPct: Math.abs(evidence.onChainProgressPct - evidence.apiReportedProgressPct),
      isGraduated: evidence.isGraduated,
      marketSession: evidence.marketSession,
      baseTaxBps: evidence.baseTaxBps,
      taxAvailable: evidence.taxAvailable
    },
    isSimulatedJudge: isJudge,
    recordedToStorage: isHolder || isJudge,
    timestamp: Date.now()
  };
}
