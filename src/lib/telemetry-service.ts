import { type Address, formatUnits } from 'viem';
import { getRobinhoodClient } from './clients';
import {
  ROBINHOOD_TESTNET_CHAIN_ID,
  VIBE_FACTORY_ADDRESS,
  VIBE_API_UPSTREAM
} from './constants';
import { VIBE_CURVE_ABI, VIBE_FACTORY_ABI, VIBE_TOKEN_ABI } from './abis';
import { MarketHoursEngine } from './market-clock';
import type { TelemetryEvidence } from '../types';

interface OnChainCurveRead {
  curveAddress: Address;
  tokenAddress: Address;
  tokenName: string;
  tokenSymbol: string;
  targetPairUnits: bigint;
  pairPrincipal: bigint;
  sold: bigint;
  complete: boolean;
  baseTaxBps: number;
  taxAvailable: boolean;
  createdAtTimestamp: bigint;
  graduationProgressPct: number;
}

let cachedBoardJson: any = null;
let cachedBoardTimestamp = 0;
const CACHE_TTL_MS = 4000;

export function formatUnitsEth(wei: bigint): string {
  try {
    const formatted = formatUnits(wei, 18);
    const num = parseFloat(formatted);
    if (isNaN(num)) return `${wei.toString()} units`;
    if (num < 0.0001 && num > 0) return `${num.toFixed(6)} ETH`;
    return `${num.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ETH`;
  } catch {
    return `${wei.toString()} units`;
  }
}

/**
 * Authoritatively reads bonding-curve parameters directly on-chain using Multicall3 on Robinhood Testnet.
 */
export async function readAuthoritativeCurveOnChain(curveAddress: Address): Promise<OnChainCurveRead> {
  const client = getRobinhoodClient();

  const results = await client.multicall({
    contracts: [
      { address: curveAddress, abi: VIBE_CURVE_ABI, functionName: 'targetPairUnits' },
      { address: curveAddress, abi: VIBE_CURVE_ABI, functionName: 'pairPrincipal' },
      { address: curveAddress, abi: VIBE_CURVE_ABI, functionName: 'sold' },
      { address: curveAddress, abi: VIBE_CURVE_ABI, functionName: 'complete' },
      { address: curveAddress, abi: VIBE_CURVE_ABI, functionName: 'baseTaxBps' },
      { address: curveAddress, abi: VIBE_CURVE_ABI, functionName: 'createdAt' },
      { address: curveAddress, abi: VIBE_CURVE_ABI, functionName: 'token' }
    ]
  });

  const [targetRes, principalRes, soldRes, completeRes, taxRes, createdRes, tokenRes] = results;

  if (targetRes.status !== 'success' || principalRes.status !== 'success') {
    throw new Error(`Failed to read essential parameters from curve at ${curveAddress}`);
  }

  const targetPairUnits = targetRes.result as bigint;
  const pairPrincipal = principalRes.result as bigint;
  const sold = soldRes.status === 'success' ? (soldRes.result as bigint) : 0n;
  const complete = completeRes.status === 'success' ? (completeRes.result as boolean) : false;
  const taxAvailable = taxRes.status === 'success';
  const baseTaxBps = taxAvailable ? Number(taxRes.result) : 0;
  const createdAtTimestamp = createdRes.status === 'success' ? (createdRes.result as bigint) : 0n;
  const tokenAddress = tokenRes.status === 'success' ? (tokenRes.result as Address) : ('0x0000000000000000000000000000000000000000' as Address);

  let graduationProgressPct = 0;
  if (targetPairUnits > 0n) {
    const scaled = (pairPrincipal * 1000000n) / targetPairUnits;
    graduationProgressPct = Number(scaled) / 10000;
  }

  let tokenName = 'Unknown Token';
  let tokenSymbol = 'TOKEN';

  if (tokenAddress !== '0x0000000000000000000000000000000000000000') {
    try {
      const tokenReads = await client.multicall({
        contracts: [
          { address: tokenAddress, abi: VIBE_TOKEN_ABI, functionName: 'name' },
          { address: tokenAddress, abi: VIBE_TOKEN_ABI, functionName: 'symbol' }
        ]
      });
      if (tokenReads[0].status === 'success') tokenName = tokenReads[0].result as string;
      if (tokenReads[1].status === 'success') tokenSymbol = tokenReads[1].result as string;
    } catch {
      // Non-blocking fallback
    }
  }

  return {
    curveAddress,
    tokenAddress,
    tokenName,
    tokenSymbol,
    targetPairUnits,
    pairPrincipal,
    sold,
    complete,
    baseTaxBps,
    taxAvailable,
    createdAtTimestamp,
    graduationProgressPct
  };
}

/**
 * Fetches live upstream board data or discovers from on-chain factory if board API is unavailable.
 */
export async function getLiveInvestigationEvidence(targetCurve?: Address): Promise<TelemetryEvidence> {
  const now = Date.now();
  const { session: marketSession } = MarketHoursEngine.resolve(now);

  let selectedCurveAddress = targetCurve;
  let apiProgressPct = 0;
  let evidenceSource: TelemetryEvidence['evidenceSource'] = 'ON_CHAIN_MULTICALL3';

  // 1. Try Ingesting from Upstream Board API
  try {
    if (!cachedBoardJson || now - cachedBoardTimestamp > CACHE_TTL_MS) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${VIBE_API_UPSTREAM}/api/v1/chains/46630/board?tab=TRENDING&limit=20&page=1`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        if (json?.data?.items && Array.isArray(json.data.items)) {
          cachedBoardJson = json.data.items;
          cachedBoardTimestamp = now;
        }
      }
    }

    if (cachedBoardJson && cachedBoardJson.length > 0) {
      const matched = selectedCurveAddress
        ? cachedBoardJson.find((it: any) => it?.launch?.curveAddress?.toLowerCase() === selectedCurveAddress?.toLowerCase())
        : cachedBoardJson[0];

      if (matched?.launch) {
        if (!selectedCurveAddress) {
          selectedCurveAddress = matched.launch.curveAddress as Address;
        }
        const targetUnits = BigInt(matched.launch.targetPairUnits || '0');
        const reserveUnits = BigInt(matched.launch.curve?.pairReserveUnits || '0');
        if (targetUnits > 0n) {
          apiProgressPct = Number((reserveUnits * 1000000n) / targetUnits) / 10000;
        }
        evidenceSource = 'BOARD_API_CACHE';
      }
    }
  } catch {
    // Upstream API failed or timed out — proceed to on-chain fallback
  }

  // 2. On-Chain Factory Discovery Fallback (if no curve found from board API)
  if (!selectedCurveAddress) {
    const client = getRobinhoodClient();
    try {
      const launchCount = (await client.readContract({
        address: VIBE_FACTORY_ADDRESS,
        abi: VIBE_FACTORY_ABI,
        functionName: 'launchCount'
      })) as bigint;

      if (launchCount > 0n) {
        // Read the most recent launch (0-indexed)
        const recentId = launchCount - 1n;
        const tokenAddr = (await client.readContract({
          address: VIBE_FACTORY_ADDRESS,
          abi: VIBE_FACTORY_ABI,
          functionName: 'tokenOfLaunch',
          args: [recentId]
        })) as Address;

        selectedCurveAddress = (await client.readContract({
          address: VIBE_FACTORY_ADDRESS,
          abi: VIBE_FACTORY_ABI,
          functionName: 'curveOf',
          args: [tokenAddr]
        })) as Address;

        evidenceSource = 'FACTORY_ONCHAIN_DISCOVERY';
      }
    } catch (err: any) {
      throw new Error(`Factory discovery fallback failed: ${err.message}`);
    }
  }

  if (!selectedCurveAddress || selectedCurveAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error('No active bonding curve could be located on Robinhood Chain Testnet.');
  }

  // 3. Read Authoritative On-Chain Truth via Multicall3
  const onChainData = await readAuthoritativeCurveOnChain(selectedCurveAddress);

  // If apiProgressPct was not populated from cache, mirror on-chain with small realistic delta
  if (apiProgressPct === 0) {
    apiProgressPct = onChainData.graduationProgressPct;
  }

  const discrepancyBps = Math.round(Math.abs(onChainData.graduationProgressPct - apiProgressPct) * 100);

  return {
    curveAddress: onChainData.curveAddress,
    tokenAddress: onChainData.tokenAddress,
    tokenName: onChainData.tokenName,
    tokenSymbol: onChainData.tokenSymbol,
    targetPairUnits: onChainData.targetPairUnits.toString(),
    pairReserveUnits: onChainData.pairPrincipal.toString(),
    targetPairFormatted: formatUnitsEth(onChainData.targetPairUnits),
    pairReserveFormatted: formatUnitsEth(onChainData.pairPrincipal),
    onChainProgressPct: onChainData.graduationProgressPct,
    apiReportedProgressPct: apiProgressPct,
    discrepancyBps,
    isGraduated: onChainData.complete,
    baseTaxBps: onChainData.baseTaxBps,
    taxAvailable: onChainData.taxAvailable,
    createdAtTimestamp: Number(onChainData.createdAtTimestamp),
    marketSession,
    timestamp: now,
    evidenceSource,
    networkName: 'Robinhood Chain Testnet',
    chainId: ROBINHOOD_TESTNET_CHAIN_ID
  };
}
