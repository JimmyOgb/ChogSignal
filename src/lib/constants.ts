import type { Address } from 'viem';

// Monad Mainnet (Chain ID 143)
export const MONAD_CHAIN_ID = 143;
export const MONAD_RPC_URL = process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://rpc.monad.xyz';
export const CHOG_NFT_ADDRESS: Address = (process.env.NEXT_PUBLIC_CHOG_NFT_ADDRESS as Address) || '0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763';

// Robinhood Chain Testnet (Chain ID 46630)
export const ROBINHOOD_TESTNET_CHAIN_ID = 46630;
export const ROBINHOOD_TESTNET_RPC = process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL || 'https://rpc.testnet.chain.robinhood.com';
export const MULTICALL3_ADDRESS: Address = (process.env.NEXT_PUBLIC_MULTICALL3_ADDRESS as Address) || '0xcA11bde05977b3631167028862bE2a173976CA11';
export const VIBE_FACTORY_ADDRESS: Address = (process.env.NEXT_PUBLIC_VIBE_FACTORY_ADDRESS as Address) || '0xe794217880011f9ca6961340ed5c16ec9559fea0';

// vibe/vibe REST Upstream
export const VIBE_API_UPSTREAM = process.env.VIBE_API_UPSTREAM || 'https://testnet.vibevibe.fun';

// Hackathon Working Submission Deadline (Strictly Pinned)
export const WORKING_SUBMISSION_DEADLINE = '2026-10-23T15:00:00Z';
