import type { Address } from 'viem';
export type { Address };

export type ChogRole = 'CHOG_LEAD_INVESTIGATOR' | 'CADET_OBSERVER';

export interface ChogAuthStatus {
  walletAddress: Address | null;
  isVerifiedHolder: boolean;
  chogBalance: number;
  role: ChogRole;
  isSimulatedJudge: boolean;
  authSource: 'OWN_WALLET_ONCHAIN' | 'SIMULATED_DEMO_FIXTURE' | 'UNVERIFIED' | 'MANUAL_PREVIEW_LOOKUP';
  lastCheckedTimestamp: number | null;
  error?: string | null;
  isWalletConnected?: boolean;
}

export type MarketSession = 'REGULAR_HOURS' | 'PRE_MARKET' | 'AFTER_HOURS' | 'WEEKEND_CLOSED';

export interface TelemetryEvidence {
  curveAddress: Address;
  tokenAddress: Address;
  tokenName: string;
  tokenSymbol: string;
  targetPairUnits: string;
  pairReserveUnits: string;
  targetPairFormatted: string;
  pairReserveFormatted: string;
  onChainProgressPct: number;
  apiReportedProgressPct: number;
  discrepancyBps: number;
  isGraduated: boolean;
  baseTaxBps: number;
  taxAvailable: boolean;
  createdAtTimestamp: number;
  marketSession: MarketSession;
  timestamp: number;
  evidenceSource: 'ON_CHAIN_MULTICALL3' | 'BOARD_API_CACHE' | 'FACTORY_ONCHAIN_DISCOVERY';
  networkName: string;
  chainId: number;
}

export type CaseId = 'CASE_A' | 'CASE_B' | 'CASE_C';

export type VerdictChoice =
  | 'ACCURATE_SYNC'
  | 'API_LAG_DISCREPANCY'
  | 'CURVE_COMPLETED'
  | 'REGULAR_SESSION'
  | 'OFF_MARKET_DISCONNECT'
  | 'ZERO_TAX'
  | 'STANDARD_TAX'
  | 'ELEVATED_TAX'
  | 'UNAVAILABLE_TAX';

export interface MissionQuestion {
  id: string;
  caseId: CaseId;
  caseNumber: string;
  title: string;
  scenario: string;
  prompt: string;
  options: {
    id: VerdictChoice;
    label: string;
    description: string;
  }[];
  tolerancePct?: number;
  isAvailable?: boolean;
  unavailableReason?: string;
}

export interface VerdictSubmission {
  caseId: CaseId;
  curveAddress: Address;
  selectedChoice: VerdictChoice;
  isSimulatedJudge: boolean;
}

export interface GradingResult {
  caseId: CaseId;
  isCorrect: boolean;
  scoreAwarded: number;
  correctChoice: VerdictChoice;
  explanation: string;
  groundTruth: {
    onChainProgressPct?: number;
    apiReportedProgressPct?: number;
    diffPct?: number;
    isGraduated?: boolean;
    marketSession?: MarketSession;
    baseTaxBps?: number;
    taxAvailable?: boolean;
  };
  isSimulatedJudge: boolean;
  recordedToStorage: boolean;
  timestamp: number;
}

export interface LocalDemoScoreRecord {
  totalXp: number;
  casesAudited: number;
  correctVerdicts: number;
  accuracyRate: number;
  lastVerdictTimestamp: number;
  badges: string[];
}

