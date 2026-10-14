import { parseAbi } from 'viem';

export const CHOG_NFT_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function supportsInterface(bytes4 interfaceId) view returns (bool)'
]);

export const VIBE_CURVE_ABI = parseAbi([
  'function targetPairUnits() view returns (uint256)',
  'function pairPrincipal() view returns (uint256)',
  'function sold() view returns (uint256)',
  'function complete() view returns (bool)',
  'function baseTaxBps() view returns (uint16)',
  'function createdAt() view returns (uint256)',
  'function token() view returns (address)',
  'function pairCurrency() view returns (address)',
  'function factory() view returns (address)'
]);

export const VIBE_FACTORY_ABI = parseAbi([
  'function launchCount() view returns (uint256)',
  'function tokenOfLaunch(uint256 id) view returns (address)',
  'function curveOf(address token) view returns (address)'
]);

export const VIBE_TOKEN_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)'
]);
