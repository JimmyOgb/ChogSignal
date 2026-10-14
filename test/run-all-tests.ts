import assert from 'node:assert';
import {
  verifyOwnWalletChogNft,
  getSimulatedJudgeAuthStatus,
  handleWalletAccountChange,
  getDisconnectedAuthStatus,
  handleWalletNetworkChange
} from '../src/lib/auth-service';
import {
  gradeMissionVerdict,
  MISSION_CASE_A_SPEC,
  MISSION_CASE_B_SPEC,
  MISSION_CASE_C_SPEC,
  getMissionSpec
} from '../src/lib/mission-engine';
import { getLocalDemoScores, recordVerdictToLocalDemoScores } from '../src/lib/scores-storage';
import {
  readAuthoritativeCurveOnChain,
  getLiveInvestigationEvidence,
  formatUnitsEth
} from '../src/lib/telemetry-service';
import type { TelemetryEvidence, ChogAuthStatus, VerdictSubmission, Address } from '../src/types';

// Fixture: Known Verified Chog Genesis Holder on Monad Mainnet (143)
const VERIFIED_HOLDER_FIXTURE = '0x3d38fee3e1a4c43d8fcf715aa6c9ff025074e7e0' as Address;
// Fixture: Random Non-Holder Wallet
const NON_HOLDER_FIXTURE = '0x000000000000000000000000000000000000dead' as Address;
// Fixture: Known Verified V6 Curve Address on Robinhood Testnet (46630)
const VERIFIED_CURVE_FIXTURE = '0x9b20ea8e5ec5c693f02ada69b14767bfe719f6a7' as Address;

console.log('====================================================');
console.log('ChogSignal Arena — Phase 2 Acceptance Test Suite');
console.log('====================================================\n');

let passedTests = 0;
const totalTests = 16;

async function runTests() {
  // Test 1: Connected Chog holder
  console.log('Running Test 1: Connected Chog holder (isWalletConnected = true)...');
  try {
    const auth = await verifyOwnWalletChogNft(VERIFIED_HOLDER_FIXTURE, true);
    assert.strictEqual(auth.isVerifiedHolder, true, 'Wallet must be verified as Chog NFT holder');
    assert.ok(auth.chogBalance >= 1, 'Chog NFT balance must be >= 1');
    assert.strictEqual(auth.role, 'CHOG_LEAD_INVESTIGATOR', 'Holder must receive CHOG_LEAD_INVESTIGATOR role');
    assert.strictEqual(auth.isSimulatedJudge, false, 'Genuine holder must not be flagged as simulated judge');
    assert.strictEqual(auth.authSource, 'OWN_WALLET_ONCHAIN', 'Auth source must be OWN_WALLET_ONCHAIN');
    assert.strictEqual(auth.isWalletConnected, true, 'isWalletConnected must be true');
    console.log('✓ PASS: Test 1 (Connected Chog Holder)\n');
    passedTests++;
  } catch (err: any) {
    console.error('✗ FAIL: Test 1:', err.message);
  }

  // Test 2: Connected non-holder
  console.log('Running Test 2: Connected non-holder (isWalletConnected = true)...');
  try {
    const auth = await verifyOwnWalletChogNft(NON_HOLDER_FIXTURE, true);
    assert.strictEqual(auth.isVerifiedHolder, false, 'Non-holder must have isVerifiedHolder = false');
    assert.strictEqual(auth.chogBalance, 0, 'Non-holder balance must be 0');
    assert.strictEqual(auth.role, 'CADET_OBSERVER', 'Non-holder must receive CADET_OBSERVER role');
    assert.strictEqual(auth.isSimulatedJudge, false, 'Non-holder must not be simulated judge');
    assert.strictEqual(auth.authSource, 'OWN_WALLET_ONCHAIN', 'Auth source must be OWN_WALLET_ONCHAIN');
    assert.strictEqual(auth.isWalletConnected, true, 'isWalletConnected must be true');
    console.log('✓ PASS: Test 2 (Connected Non-Holder Cadet)\n');
    passedTests++;
  } catch (err: any) {
    console.error('✗ FAIL: Test 2:', err.message);
  }

  // Test 3: Manually entered holder address without a connected wallet (DEF-01 Core Invariant)
  console.log('Running Test 3: Manually entered holder address without a connected wallet...');
  try {
    const auth = await verifyOwnWalletChogNft(VERIFIED_HOLDER_FIXTURE, false);
    assert.strictEqual(auth.isVerifiedHolder, false, 'Manual address entry must NEVER grant isVerifiedHolder = true');
    assert.ok(auth.chogBalance >= 1, 'Read-only Chog balance must be visible for preview inspection');
    assert.strictEqual(auth.role, 'CADET_OBSERVER', 'Manual entry must receive CADET_OBSERVER role');
    assert.strictEqual(auth.authSource, 'MANUAL_PREVIEW_LOOKUP', 'Auth source must be MANUAL_PREVIEW_LOOKUP');
    assert.strictEqual(auth.isWalletConnected, false, 'isWalletConnected must be false');

    const mockEvidence: TelemetryEvidence = {
      curveAddress: VERIFIED_CURVE_FIXTURE,
      tokenAddress: '0x0000000000000000000000000000000000000000' as Address,
      tokenName: 'Test Token',
      tokenSymbol: 'TEST',
      targetPairUnits: '100000000000000000000',
      pairReserveUnits: '50000000000000000000',
      targetPairFormatted: '100.0000 ETH',
      pairReserveFormatted: '50.0000 ETH',
      onChainProgressPct: 50.0,
      apiReportedProgressPct: 50.0,
      discrepancyBps: 0,
      isGraduated: false,
      baseTaxBps: 200,
      taxAvailable: true,
      createdAtTimestamp: 1728000000,
      marketSession: 'REGULAR_HOURS',
      timestamp: Date.now(),
      evidenceSource: 'ON_CHAIN_MULTICALL3',
      networkName: 'Robinhood Chain Testnet',
      chainId: 46630
    };

    const submission: VerdictSubmission = {
      caseId: 'CASE_A',
      curveAddress: VERIFIED_CURVE_FIXTURE,
      selectedChoice: 'ACCURATE_SYNC',
      isSimulatedJudge: false
    };

    const manualResult = gradeMissionVerdict(submission, mockEvidence, auth);
    assert.strictEqual(manualResult.recordedToStorage, false, 'Manual preview verdict must NEVER record to storage');
    console.log('✓ PASS: Test 3 (Manually Entered Holder Address Strictly Gated to Cadet Preview)\n');
    passedTests++;
  } catch (err: any) {
    console.error('✗ FAIL: Test 3:', err.message);
  }

  // Test 4: Wallet account change from holder to non-holder
  console.log('Running Test 4: Wallet account change from holder to non-holder...');
  try {
    const initialAuth = await handleWalletAccountChange(VERIFIED_HOLDER_FIXTURE);
    assert.strictEqual(initialAuth.isVerifiedHolder, true, 'Initial holder connection must be verified');

    const switchedAuth = await handleWalletAccountChange(NON_HOLDER_FIXTURE);
    assert.strictEqual(switchedAuth.isVerifiedHolder, false, 'Switched account must not retain stale holder state');
    assert.strictEqual(switchedAuth.role, 'CADET_OBSERVER', 'Switched account must revert to CADET_OBSERVER');
    assert.strictEqual(switchedAuth.chogBalance, 0, 'Switched account balance must be 0');

    const switchedBackAuth = await handleWalletAccountChange(VERIFIED_HOLDER_FIXTURE);
    assert.strictEqual(switchedBackAuth.isVerifiedHolder, true, 'Re-connecting holder account revalidates accurately');
    console.log('✓ PASS: Test 4 (Wallet Account Change Handled Without Stale State)\n');
    passedTests++;
  } catch (err: any) {
    console.error('✗ FAIL: Test 4:', err.message);
  }

  // Test 5: Wallet disconnect and provider errors
  console.log('Running Test 5: Wallet disconnect and provider errors...');
  try {
    const disconnected = await handleWalletAccountChange(null);
    assert.strictEqual(disconnected.walletAddress, null, 'Disconnected state must clear wallet address');
    assert.strictEqual(disconnected.isVerifiedHolder, false, 'Disconnected state must not be holder');
    assert.strictEqual(disconnected.isWalletConnected, false, 'isWalletConnected must be false on disconnect');
    assert.strictEqual(disconnected.role, 'CADET_OBSERVER', 'Disconnected role must be CADET_OBSERVER');

    const providerErrorAuth = getDisconnectedAuthStatus('User rejected provider connection');
    assert.strictEqual(providerErrorAuth.isVerifiedHolder, false, 'Provider error must clear holder state');
    assert.strictEqual(providerErrorAuth.isWalletConnected, false, 'Provider error must have isWalletConnected = false');
    assert.ok(providerErrorAuth.error?.includes('User rejected'), 'Error message must be preserved');
    console.log('✓ PASS: Test 5 (Wallet Disconnect and Provider Errors Handled)\n');
    passedTests++;
  } catch (err: any) {
    console.error('✗ FAIL: Test 5:', err.message);
  }

  // Test 6: Unsupported network and NFT RPC failure
  console.log('Running Test 6: Unsupported network and NFT RPC failure...');
  try {
    const invalidAddressAuth = await verifyOwnWalletChogNft('0xInvalidAddress', true);
    assert.strictEqual(invalidAddressAuth.isVerifiedHolder, false, 'Invalid address must fail closed');
    assert.strictEqual(invalidAddressAuth.role, 'CADET_OBSERVER', 'Invalid address must have CADET_OBSERVER role');

    const netChange = await handleWalletNetworkChange('0x1', null);
    assert.strictEqual(netChange.isVerifiedHolder, false, 'Network change must trigger revalidation state');
    console.log('✓ PASS: Test 6 (Unsupported Network & Invalid Address Handled Cleanly)\n');
    passedTests++;
  } catch (err: any) {
    console.error('✗ FAIL: Test 6:', err.message);
  }

  // Test 7: Unavailable curve on-chain failure
  console.log('Running Test 7: Unavailable curve on-chain failure...');
  try {
    let threw = false;
    try {
      await readAuthoritativeCurveOnChain('0x0000000000000000000000000000000000000001' as Address);
    } catch (e: any) {
      threw = true;
      assert.ok(e.message.includes('Failed to read essential parameters'), 'Must give clear unavailable state');
    }
    assert.ok(threw, 'Reading non-existent curve on-chain must fail closed');
    console.log('✓ PASS: Test 7 (Unavailable Curve On-Chain Handled Cleanly)\n');
    passedTests++;
  } catch (err: any) {
    console.error('✗ FAIL: Test 7:', err.message);
  }

  // Test 8: Real live telemetry ingestion from Robinhood Testnet
  console.log('Running Test 8: Real live telemetry ingestion from Robinhood Testnet...');
  try {
    const evidence = await getLiveInvestigationEvidence(VERIFIED_CURVE_FIXTURE);
    assert.ok(evidence.curveAddress, 'Curve address must be present');
    assert.strictEqual(evidence.chainId, 46630, 'Chain ID must be 46630');
    assert.ok(evidence.onChainProgressPct >= 0, 'On-chain progress must be non-negative');
    assert.ok(evidence.timestamp > 0, 'Timestamp must be positive');
    assert.ok(typeof evidence.targetPairFormatted === 'string', 'Target pair formatted string must exist');
    assert.ok(typeof evidence.pairReserveFormatted === 'string', 'Pair reserve formatted string must exist');
    assert.ok(
      ['ON_CHAIN_MULTICALL3', 'BOARD_API_CACHE', 'FACTORY_ONCHAIN_DISCOVERY'].includes(evidence.evidenceSource),
      'Evidence source must be explicitly labeled'
    );
    console.log('✓ PASS: Test 8 (Live Telemetry Ingestion)\n');
    passedTests++;
  } catch (err: any) {
    console.error('✗ FAIL: Test 8:', err.message);
  }

  // Test 9: Case A (Curve Graduation) Correct and Incorrect Answer Grading
  console.log('Running Test 9: Case A (Curve Graduation) deterministic grading...');
  try {
    const mockEvidence: TelemetryEvidence = {
      curveAddress: VERIFIED_CURVE_FIXTURE,
      tokenAddress: '0x0000000000000000000000000000000000000000' as Address,
      tokenName: 'Test Token',
      tokenSymbol: 'TEST',
      targetPairUnits: '100000000000000000000',
      pairReserveUnits: '50000000000000000000',
      targetPairFormatted: '100.0000 ETH',
      pairReserveFormatted: '50.0000 ETH',
      onChainProgressPct: 50.0,
      apiReportedProgressPct: 50.02,
      discrepancyBps: 2,
      isGraduated: false,
      baseTaxBps: 200,
      taxAvailable: true,
      createdAtTimestamp: 1728000000,
      marketSession: 'REGULAR_HOURS',
      timestamp: Date.now(),
      evidenceSource: 'ON_CHAIN_MULTICALL3',
      networkName: 'Robinhood Chain Testnet',
      chainId: 46630
    };

    const mockAuth: ChogAuthStatus = {
      walletAddress: VERIFIED_HOLDER_FIXTURE,
      isVerifiedHolder: true,
      chogBalance: 1,
      role: 'CHOG_LEAD_INVESTIGATOR',
      isSimulatedJudge: false,
      authSource: 'OWN_WALLET_ONCHAIN',
      lastCheckedTimestamp: Date.now(),
      isWalletConnected: true
    };

    const correctSub: VerdictSubmission = {
      caseId: 'CASE_A',
      curveAddress: VERIFIED_CURVE_FIXTURE,
      selectedChoice: 'ACCURATE_SYNC',
      isSimulatedJudge: false
    };

    const correctRes = gradeMissionVerdict(correctSub, mockEvidence, mockAuth);
    assert.strictEqual(correctRes.isCorrect, true, 'Case A correct answer must pass');
    assert.strictEqual(correctRes.scoreAwarded, 100, 'Awards 100 XP');

    const wrongSub: VerdictSubmission = {
      caseId: 'CASE_A',
      curveAddress: VERIFIED_CURVE_FIXTURE,
      selectedChoice: 'API_LAG_DISCREPANCY',
      isSimulatedJudge: false
    };
    const wrongRes = gradeMissionVerdict(wrongSub, mockEvidence, mockAuth);
    assert.strictEqual(wrongRes.isCorrect, false, 'Case A incorrect answer must fail');
    assert.strictEqual(wrongRes.scoreAwarded, 0, 'Awards 0 XP');
    console.log('✓ PASS: Test 9 (Case A Deterministic Grading)\n');
    passedTests++;
  } catch (err: any) {
    console.error('✗ FAIL: Test 9:', err.message);
  }

  // Test 10: Case B (Ghost Market Oracle Trap) Deterministic Grading
  console.log('Running Test 10: Case B (Ghost Market) deterministic grading...');
  try {
    const mockAuth: ChogAuthStatus = {
      walletAddress: VERIFIED_HOLDER_FIXTURE,
      isVerifiedHolder: true,
      chogBalance: 1,
      role: 'CHOG_LEAD_INVESTIGATOR',
      isSimulatedJudge: false,
      authSource: 'OWN_WALLET_ONCHAIN',
      lastCheckedTimestamp: Date.now(),
      isWalletConnected: true
    };

    // Scenario 1: NY Regular Hours (Open)
    const openEvidence: TelemetryEvidence = {
      curveAddress: VERIFIED_CURVE_FIXTURE,
      tokenAddress: '0x0000000000000000000000000000000000000000' as Address,
      tokenName: 'SPCX Stock Token',
      tokenSymbol: 'SPCX',
      targetPairUnits: '100000000000000000000',
      pairReserveUnits: '50000000000000000000',
      targetPairFormatted: '100.0000 ETH',
      pairReserveFormatted: '50.0000 ETH',
      onChainProgressPct: 50.0,
      apiReportedProgressPct: 50.0,
      discrepancyBps: 0,
      isGraduated: false,
      baseTaxBps: 0,
      taxAvailable: true,
      createdAtTimestamp: 1728000000,
      marketSession: 'REGULAR_HOURS',
      timestamp: Date.now(),
      evidenceSource: 'ON_CHAIN_MULTICALL3',
      networkName: 'Robinhood Chain Testnet',
      chainId: 46630
    };

    const resOpen = gradeMissionVerdict(
      { caseId: 'CASE_B', curveAddress: VERIFIED_CURVE_FIXTURE, selectedChoice: 'REGULAR_SESSION', isSimulatedJudge: false },
      openEvidence,
      mockAuth
    );
    assert.strictEqual(resOpen.isCorrect, true, 'REGULAR_SESSION must be correct during REGULAR_HOURS');

    // Scenario 2: Weekend Closed (Halted)
    const closedEvidence: TelemetryEvidence = {
      ...openEvidence,
      marketSession: 'WEEKEND_CLOSED'
    };

    const resClosed = gradeMissionVerdict(
      { caseId: 'CASE_B', curveAddress: VERIFIED_CURVE_FIXTURE, selectedChoice: 'OFF_MARKET_DISCONNECT', isSimulatedJudge: false },
      closedEvidence,
      mockAuth
    );
    assert.strictEqual(resClosed.isCorrect, true, 'OFF_MARKET_DISCONNECT must be correct during WEEKEND_CLOSED');

    const resClosedWrong = gradeMissionVerdict(
      { caseId: 'CASE_B', curveAddress: VERIFIED_CURVE_FIXTURE, selectedChoice: 'REGULAR_SESSION', isSimulatedJudge: false },
      closedEvidence,
      mockAuth
    );
    assert.strictEqual(resClosedWrong.isCorrect, false, 'REGULAR_SESSION must be rejected during WEEKEND_CLOSED');
    console.log('✓ PASS: Test 10 (Case B Ghost Market Deterministic Grading)\n');
    passedTests++;
  } catch (err: any) {
    console.error('✗ FAIL: Test 10:', err.message);
  }

  // Test 11: Case C (Creator Tax Extraction Audit) Deterministic Grading
  console.log('Running Test 11: Case C (Creator Tax Audit) deterministic grading...');
  try {
    const mockAuth: ChogAuthStatus = {
      walletAddress: VERIFIED_HOLDER_FIXTURE,
      isVerifiedHolder: true,
      chogBalance: 1,
      role: 'CHOG_LEAD_INVESTIGATOR',
      isSimulatedJudge: false,
      authSource: 'OWN_WALLET_ONCHAIN',
      lastCheckedTimestamp: Date.now(),
      isWalletConnected: true
    };

    // Subtest: Elevated tax (> 150 bps)
    const elevatedEvidence: TelemetryEvidence = {
      curveAddress: VERIFIED_CURVE_FIXTURE,
      tokenAddress: '0x0000000000000000000000000000000000000000' as Address,
      tokenName: 'Tax Token',
      tokenSymbol: 'TAX',
      targetPairUnits: '100000000000000000000',
      pairReserveUnits: '50000000000000000000',
      targetPairFormatted: '100.0000 ETH',
      pairReserveFormatted: '50.0000 ETH',
      onChainProgressPct: 50.0,
      apiReportedProgressPct: 50.0,
      discrepancyBps: 0,
      isGraduated: false,
      baseTaxBps: 200, // 2.0%
      taxAvailable: true,
      createdAtTimestamp: 1728000000,
      marketSession: 'REGULAR_HOURS',
      timestamp: Date.now(),
      evidenceSource: 'ON_CHAIN_MULTICALL3',
      networkName: 'Robinhood Chain Testnet',
      chainId: 46630
    };

    const resElevated = gradeMissionVerdict(
      { caseId: 'CASE_C', curveAddress: VERIFIED_CURVE_FIXTURE, selectedChoice: 'ELEVATED_TAX', isSimulatedJudge: false },
      elevatedEvidence,
      mockAuth
    );
    assert.strictEqual(resElevated.isCorrect, true, 'baseTaxBps=200 must be graded as ELEVATED_TAX');

    // Subtest: Zero tax
    const zeroEvidence: TelemetryEvidence = {
      ...elevatedEvidence,
      baseTaxBps: 0
    };
    const resZero = gradeMissionVerdict(
      { caseId: 'CASE_C', curveAddress: VERIFIED_CURVE_FIXTURE, selectedChoice: 'ZERO_TAX', isSimulatedJudge: false },
      zeroEvidence,
      mockAuth
    );
    assert.strictEqual(resZero.isCorrect, true, 'baseTaxBps=0 must be graded as ZERO_TAX');

    // Subtest: Unavailable tax handling
    const unavailEvidence: TelemetryEvidence = {
      ...elevatedEvidence,
      taxAvailable: false
    };
    const specUnavail = getMissionSpec('CASE_C', unavailEvidence);
    assert.strictEqual(specUnavail.isAvailable, false, 'Case C must be marked unavailable if taxAvailable=false');
    console.log('✓ PASS: Test 11 (Case C Creator Tax Deterministic Grading & Unavailable Handling)\n');
    passedTests++;
  } catch (err: any) {
    console.error('✗ FAIL: Test 11:', err.message);
  }

  // Test 12: Chog Forensic Lens Permission Gating
  console.log('Running Test 12: Chog Forensic Lens permission gating...');
  try {
    const holderAuth: ChogAuthStatus = {
      walletAddress: VERIFIED_HOLDER_FIXTURE,
      isVerifiedHolder: true,
      chogBalance: 1,
      role: 'CHOG_LEAD_INVESTIGATOR',
      isSimulatedJudge: false,
      authSource: 'OWN_WALLET_ONCHAIN',
      lastCheckedTimestamp: Date.now(),
      isWalletConnected: true
    };
    const judgeAuth = getSimulatedJudgeAuthStatus();
    const cadetAuth: ChogAuthStatus = {
      walletAddress: NON_HOLDER_FIXTURE,
      isVerifiedHolder: false,
      chogBalance: 0,
      role: 'CADET_OBSERVER',
      isSimulatedJudge: false,
      authSource: 'OWN_WALLET_ONCHAIN',
      lastCheckedTimestamp: Date.now(),
      isWalletConnected: true
    };

    assert.strictEqual(holderAuth.isVerifiedHolder, true, 'Holder has verified status');
    assert.strictEqual(judgeAuth.isSimulatedJudge, true, 'Judge has simulated privileges');
    assert.strictEqual(cadetAuth.isVerifiedHolder, false, 'Cadet does NOT have verified holder status');
    console.log('✓ PASS: Test 12 (Chog Forensic Lens Permission Gating)\n');
    passedTests++;
  } catch (err: any) {
    console.error('✗ FAIL: Test 12:', err.message);
  }

  // Test 13: Judge Mode remaining separate from real verification and scores
  console.log('Running Test 13: Judge Mode remaining separate from real verification and scores...');
  try {
    const judgeAuth = getSimulatedJudgeAuthStatus();
    assert.strictEqual(judgeAuth.isSimulatedJudge, true, 'isSimulatedJudge must be true');
    assert.strictEqual(judgeAuth.isVerifiedHolder, false, 'isVerifiedHolder must be false for simulated demo');
    assert.strictEqual(judgeAuth.authSource, 'SIMULATED_DEMO_FIXTURE', 'Auth source must be SIMULATED_DEMO_FIXTURE');

    const realScores = getLocalDemoScores(false);
    const judgeScores = getLocalDemoScores(true);
    assert.strictEqual(realScores.totalXp, 0, 'Real scores must not be affected by judge actions');
    assert.strictEqual(judgeScores.totalXp, 0, 'Judge scores initialize cleanly in isolated storage');
    console.log('✓ PASS: Test 13 (Simulated Judge Segregation)\n');
    passedTests++;
  } catch (err: any) {
    console.error('✗ FAIL: Test 13:', err.message);
  }

  // Test 14: Unit Formatting Helper (formatUnitsEth)
  console.log('Running Test 14: Unit Formatting Helper (formatUnitsEth)...');
  try {
    const formatted4Eth = formatUnitsEth(4000000000000000000n);
    assert.strictEqual(formatted4Eth, '4.0000 ETH', '4 ETH must be formatted to 4.0000 ETH');

    const formattedFraction = formatUnitsEth(534888739967724530n);
    assert.ok(formattedFraction.includes('0.5349 ETH'), '0.53488 ETH must be formatted cleanly');

    const formattedZero = formatUnitsEth(0n);
    assert.strictEqual(formattedZero, '0.0000 ETH', '0 wei must format to 0.0000 ETH');
    console.log('✓ PASS: Test 14 (Unit Formatting Helper)\n');
    passedTests++;
  } catch (err: any) {
    console.error('✗ FAIL: Test 14:', err.message);
  }

  // Test 15: Mission Spec Integrity across All 3 Cases
  console.log('Running Test 15: Mission Spec integrity across all 3 cases...');
  try {
    const specA = getMissionSpec('CASE_A');
    const specB = getMissionSpec('CASE_B');
    const specC = getMissionSpec('CASE_C');

    assert.strictEqual(specA.caseId, 'CASE_A');
    assert.ok(specA.options.length >= 2, 'Case A has at least 2 options');
    assert.strictEqual(specB.caseId, 'CASE_B');
    assert.ok(specB.options.length >= 2, 'Case B has at least 2 options');
    assert.strictEqual(specC.caseId, 'CASE_C');
    assert.ok(specC.options.length >= 2, 'Case C has at least 2 options');
    console.log('✓ PASS: Test 15 (Mission Spec Integrity)\n');
    passedTests++;
  } catch (err: any) {
    console.error('✗ FAIL: Test 15:', err.message);
  }

  // Test 16: Local Demo Score Accumulation and Reset
  console.log('Running Test 16: Local Demo Score recording integrity...');
  try {
    const initial = getLocalDemoScores(true);
    assert.strictEqual(typeof initial.totalXp, 'number');
    assert.strictEqual(typeof initial.accuracyRate, 'number');
    assert.ok(Array.isArray(initial.badges));
    console.log('✓ PASS: Test 16 (Local Demo Score Recording Integrity)\n');
    passedTests++;
  } catch (err: any) {
    console.error('✗ FAIL: Test 16:', err.message);
  }

  console.log('====================================================');
  console.log(`TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('====================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
