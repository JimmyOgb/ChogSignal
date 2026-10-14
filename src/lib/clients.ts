import { createPublicClient, defineChain, http, type PublicClient } from 'viem';
import {
  MONAD_CHAIN_ID,
  MONAD_RPC_URL,
  ROBINHOOD_TESTNET_CHAIN_ID,
  ROBINHOOD_TESTNET_RPC,
  MULTICALL3_ADDRESS
} from './constants';

export const monadChain = defineChain({
  id: MONAD_CHAIN_ID,
  name: 'Monad',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: [MONAD_RPC_URL] },
    public: { http: [MONAD_RPC_URL] }
  }
});

export const robinhoodTestnet = defineChain({
  id: ROBINHOOD_TESTNET_CHAIN_ID,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [ROBINHOOD_TESTNET_RPC] },
    public: { http: [ROBINHOOD_TESTNET_RPC] }
  },
  contracts: {
    multicall3: {
      address: MULTICALL3_ADDRESS,
      blockCreated: 1
    }
  },
  testnet: true
});

let monadClientInstance: PublicClient | null = null;
let robinhoodClientInstance: PublicClient | null = null;

export function getMonadClient(): PublicClient {
  if (!monadClientInstance) {
    monadClientInstance = createPublicClient({
      chain: monadChain,
      transport: http(MONAD_RPC_URL, {
        retryCount: 3,
        retryDelay: 1000,
        timeout: 12000
      })
    });
  }
  return monadClientInstance;
}

export function getRobinhoodClient(): PublicClient {
  if (!robinhoodClientInstance) {
    robinhoodClientInstance = createPublicClient({
      chain: robinhoodTestnet,
      transport: http(ROBINHOOD_TESTNET_RPC, {
        retryCount: 3,
        retryDelay: 1000,
        timeout: 12000
      })
    });
  }
  return robinhoodClientInstance;
}
