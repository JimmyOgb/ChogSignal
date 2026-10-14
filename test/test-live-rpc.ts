import { getMonadClient, getRobinhoodClient } from '../src/lib/clients';
import { CHOG_NFT_ADDRESS, VIBE_FACTORY_ADDRESS } from '../src/lib/constants';
import { CHOG_NFT_ABI, VIBE_FACTORY_ABI, VIBE_CURVE_ABI } from '../src/lib/abis';

async function main() {
  console.log('--- AUDITING LIVE MONAD MAINNET (143) ---');
  const monad = getMonadClient();
  const monadChainId = await monad.getChainId();
  console.log('Monad Chain ID:', monadChainId);
  const isErc721 = await monad.readContract({
    address: CHOG_NFT_ADDRESS,
    abi: CHOG_NFT_ABI,
    functionName: 'supportsInterface',
    args: ['0x80ac58cd']
  });
  console.log('Chog ERC-165 (0x80ac58cd):', isErc721);
  const name = await monad.readContract({ address: CHOG_NFT_ADDRESS, abi: CHOG_NFT_ABI, functionName: 'name' });
  const symbol = await monad.readContract({ address: CHOG_NFT_ADDRESS, abi: CHOG_NFT_ABI, functionName: 'symbol' });
  const totalSupply = await monad.readContract({ address: CHOG_NFT_ADDRESS, abi: CHOG_NFT_ABI, functionName: 'totalSupply' });
  console.log('Chog Metadata:', { name, symbol, totalSupply: totalSupply.toString() });
  const holderBal = await monad.readContract({
    address: CHOG_NFT_ADDRESS,
    abi: CHOG_NFT_ABI,
    functionName: 'balanceOf',
    args: ['0x3d38fee3e1a4c43d8fcf715aa6c9ff025074e7e0']
  });
  console.log('Holder Fixture Balance:', holderBal.toString());

  console.log('\n--- AUDITING LIVE ROBINHOOD TESTNET (46630) ---');
  const rh = getRobinhoodClient();
  const rhChainId = await rh.getChainId();
  console.log('Robinhood Chain ID:', rhChainId);
  const launchCount = await rh.readContract({
    address: VIBE_FACTORY_ADDRESS,
    abi: VIBE_FACTORY_ABI,
    functionName: 'launchCount'
  });
  console.log('vibe/vibe Factory launchCount:', launchCount.toString());
  const token0 = await rh.readContract({
    address: VIBE_FACTORY_ADDRESS,
    abi: VIBE_FACTORY_ABI,
    functionName: 'tokenOfLaunch',
    args: [launchCount - 1n]
  });
  const curve0 = await rh.readContract({
    address: VIBE_FACTORY_ADDRESS,
    abi: VIBE_FACTORY_ABI,
    functionName: 'curveOf',
    args: [token0]
  });
  console.log('Most Recent Token:', token0, 'Curve:', curve0);
  const curveData = await rh.multicall({
    contracts: [
      { address: curve0, abi: VIBE_CURVE_ABI, functionName: 'targetPairUnits' },
      { address: curve0, abi: VIBE_CURVE_ABI, functionName: 'pairPrincipal' },
      { address: curve0, abi: VIBE_CURVE_ABI, functionName: 'complete' },
      { address: curve0, abi: VIBE_CURVE_ABI, functionName: 'baseTaxBps' },
      { address: curve0, abi: VIBE_CURVE_ABI, functionName: 'createdAt' },
      { address: curve0, abi: VIBE_CURVE_ABI, functionName: 'sold' }
    ]
  });
  console.log('Curve Multicall Live Results:', curveData);
}

main().catch(console.error);
