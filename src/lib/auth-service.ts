import { isAddress, type Address } from 'viem';
import { getMonadClient } from './clients';
import { CHOG_NFT_ADDRESS, MONAD_CHAIN_ID } from './constants';
import { CHOG_NFT_ABI } from './abis';
import type { ChogAuthStatus } from '../types';

/**
 * Checks Chog NFT ownership on Monad using the connected user's OWN wallet address.
 * Never substitutes a third-party wallet, never impersonates a holder, never assumes ownership.
 *
 * DEF-01 Authorized Remediation:
 * - Real verified-holder status REQUIRES an actual wallet connection via the provider (isWalletConnected === true).
 * - Manual address entry (isWalletConnected === false) is strictly Address Lookup / Cadet Preview.
 *   It may display read-only ownership balance, but NEVER confers verified-holder status or role.
 */
export async function verifyOwnWalletChogNft(
  walletAddress: string | null | undefined,
  isWalletConnected: boolean = false
): Promise<ChogAuthStatus> {
  if (!walletAddress || !isAddress(walletAddress)) {
    return {
      walletAddress: null,
      isVerifiedHolder: false,
      chogBalance: 0,
      role: 'CADET_OBSERVER',
      isSimulatedJudge: false,
      authSource: 'UNVERIFIED',
      lastCheckedTimestamp: Date.now(),
      error: 'No valid address provided.',
      isWalletConnected: false
    };
  }

  const cleanAddress = walletAddress as Address;
  const client = getMonadClient();

  try {
    const balance = await client.readContract({
      address: CHOG_NFT_ADDRESS,
      abi: CHOG_NFT_ABI,
      functionName: 'balanceOf',
      args: [cleanAddress]
    });

    const numBalance = Number(balance);
    const hasNft = numBalance > 0;

    // Real verified-holder status is ONLY granted if the wallet is genuinely connected AND owns the NFT
    const isVerifiedHolder = isWalletConnected && hasNft;

    return {
      walletAddress: cleanAddress,
      isVerifiedHolder,
      chogBalance: numBalance,
      role: isVerifiedHolder ? 'CHOG_LEAD_INVESTIGATOR' : 'CADET_OBSERVER',
      isSimulatedJudge: false,
      authSource: isWalletConnected ? 'OWN_WALLET_ONCHAIN' : 'MANUAL_PREVIEW_LOOKUP',
      lastCheckedTimestamp: Date.now(),
      error: null,
      isWalletConnected
    };
  } catch (err: any) {
    return {
      walletAddress: cleanAddress,
      isVerifiedHolder: false,
      chogBalance: 0,
      role: 'CADET_OBSERVER',
      isSimulatedJudge: false,
      authSource: isWalletConnected ? 'OWN_WALLET_ONCHAIN' : 'MANUAL_PREVIEW_LOOKUP',
      lastCheckedTimestamp: Date.now(),
      error: `Monad RPC Read Failure: ${err?.message || 'Unable to query Chog NFT contract'}`,
      isWalletConnected
    };
  }
}

/**
 * Generates an isolated Simulated Judge Demo status for hackathon demonstrations.
 * Explicitly flagged: isSimulatedJudge: true, authSource: 'SIMULATED_DEMO_FIXTURE'.
 * MUST NEVER produce real verified-holder status or contaminate real Local Demo Scores.
 */
export function getSimulatedJudgeAuthStatus(): ChogAuthStatus {
  return {
    walletAddress: '0x000000000000000000000000000000000000dEaD' as Address,
    isVerifiedHolder: false, // Strictly false for real on-chain holding
    chogBalance: 1, // Simulated fixture balance
    role: 'CHOG_LEAD_INVESTIGATOR', // Granted temporary simulated investigator persona for UI testing
    isSimulatedJudge: true,
    authSource: 'SIMULATED_DEMO_FIXTURE',
    lastCheckedTimestamp: Date.now(),
    error: null,
    isWalletConnected: false
  };
}

/**
 * Returns cleared/disconnected authentication state.
 * Prevents reuse of stale holder state on disconnect or provider errors.
 */
export function getDisconnectedAuthStatus(errorMessage?: string | null): ChogAuthStatus {
  return {
    walletAddress: null,
    isVerifiedHolder: false,
    chogBalance: 0,
    role: 'CADET_OBSERVER',
    isSimulatedJudge: false,
    authSource: 'UNVERIFIED',
    lastCheckedTimestamp: Date.now(),
    error: errorMessage || null,
    isWalletConnected: false
  };
}

/**
 * Handles wallet account changes from the provider.
 * If new account is empty or null, clears authentication.
 * If new account is provided, immediately revalidates on Monad without reusing stale state.
 */
export async function handleWalletAccountChange(
  newAccount: string | null | undefined
): Promise<ChogAuthStatus> {
  if (!newAccount) {
    return getDisconnectedAuthStatus();
  }
  return verifyOwnWalletChogNft(newAccount, true);
}

/**
 * Handles network change events.
 * Revalidates connected wallet on Monad (Chain 143), reporting unsupported network if needed.
 */
export async function handleWalletNetworkChange(
  chainId: number | string,
  currentAddress: string | null
): Promise<ChogAuthStatus> {
  const numericChainId = typeof chainId === 'string'
    ? (chainId.startsWith('0x') ? parseInt(chainId, 16) : parseInt(chainId, 10))
    : chainId;

  if (numericChainId !== MONAD_CHAIN_ID && numericChainId !== 46630) {
    // If provider is set to an unexpected network, still revalidate address on Monad directly or flag advisory
    if (currentAddress) {
      const auth = await verifyOwnWalletChogNft(currentAddress, true);
      return {
        ...auth,
        error: `Provider network is chain ${numericChainId}. Chog verification runs directly on Monad (143).`
      };
    }
    return getDisconnectedAuthStatus(`Unsupported provider network: chain ${numericChainId}`);
  }

  if (currentAddress) {
    return verifyOwnWalletChogNft(currentAddress, true);
  }
  return getDisconnectedAuthStatus();
}
