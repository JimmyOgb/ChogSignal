'use client';

import React, { useState, useEffect } from 'react';
import type {
  ChogAuthStatus,
  TelemetryEvidence,
  VerdictChoice,
  GradingResult,
  LocalDemoScoreRecord,
  CaseId
} from '@/types';
import {
  ALL_MISSION_SPECS,
  getMissionSpec
} from '@/lib/mission-engine';
import { getLocalDemoScores, recordVerdictToLocalDemoScores } from '@/lib/scores-storage';
import {
  Shield,
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Wallet,
  Clock,
  Layers,
  Info,
  ExternalLink,
  Cpu,
  Search,
  LogOut,
  Eye,
  Lock,
  Unlock,
  FolderOpen,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import HeroCarousel from '@/components/HeroCarousel';

export default function ArenaPage() {
  // Connected Wallet State (strictly via provider)
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(false);

  // Address Lookup / Cadet Preview State (strictly manual read-only entry)
  const [lookupAddress, setLookupAddress] = useState<string>('');

  // Mode and Auth State
  const [isSimulatedJudge, setIsSimulatedJudge] = useState<boolean>(false);
  const [authStatus, setAuthStatus] = useState<ChogAuthStatus | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Telemetry Evidence State
  const [evidence, setEvidence] = useState<TelemetryEvidence | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState<boolean>(true);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);

  // Multi-Case Docket State
  const [activeCaseId, setActiveCaseId] = useState<CaseId>('CASE_A');
  const [selectedChoice, setSelectedChoice] = useState<VerdictChoice>('ACCURATE_SYNC');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);

  // Forensic Lens State (toggled by verified holders / judges)
  const [forensicLensEnabled, setForensicLensEnabled] = useState<boolean>(true);

  // Inline Toast / Non-Blocking Alert Notification State (replaces window.alert)
  const [inlineNotice, setInlineNotice] = useState<{
    message: string;
    type: 'info' | 'error' | 'success';
  } | null>(null);

  // Browser-local Scores
  const [localScores, setLocalScores] = useState<LocalDemoScoreRecord>({
    totalXp: 0,
    casesAudited: 0,
    correctVerdicts: 0,
    accuracyRate: 0,
    lastVerdictTimestamp: 0,
    badges: []
  });

  // Load Local Demo Scores
  useEffect(() => {
    setLocalScores(getLocalDemoScores(isSimulatedJudge));
  }, [isSimulatedJudge]);

  // Reset default choice whenever active case changes
  useEffect(() => {
    if (activeCaseId === 'CASE_A') {
      setSelectedChoice('ACCURATE_SYNC');
    } else if (activeCaseId === 'CASE_B') {
      setSelectedChoice('REGULAR_SESSION');
    } else if (activeCaseId === 'CASE_C') {
      setSelectedChoice('ZERO_TAX');
    }
    setGradingResult(null);
  }, [activeCaseId]);

  // Disconnect Wallet Helper
  const disconnectWallet = () => {
    setConnectedAddress(null);
    setIsWalletConnected(false);
    setAuthStatus(null);
    setGradingResult(null);
    setInlineNotice({
      message: 'Wallet disconnected. State reverted to Cadet Observer.',
      type: 'info'
    });
  };

  // Connect Wallet via Injected Provider - strictly requests account access on explicit user click
  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts'
        });
        if (accounts && accounts.length > 0) {
          const addr = accounts[0];
          setConnectedAddress(addr);
          setIsWalletConnected(true);
          setLookupAddress(''); // Clear manual lookup to prioritize authenticated wallet
          setGradingResult(null);
          setInlineNotice({
            message: `Connected wallet: ${addr.slice(0, 6)}...${addr.slice(-4)}. Verifying Chog Genesis NFT on Monad...`,
            type: 'success'
          });
        }
      } catch (err: any) {
        setInlineNotice({
          message: `Wallet connection rejected: ${err?.message || 'User cancelled'}`,
          type: 'error'
        });
      }
    } else {
      setInlineNotice({
        message: 'No EVM wallet detected in browser. Use 1-Click Judge Mode above or Address Lookup below for instant evaluation.',
        type: 'info'
      });
    }
  };

  // Revalidate or clear authentication on provider events (account change, network change, disconnect)
  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      return;
    }
    const provider = (window as any).ethereum;

    const handleAccountsChanged = (accounts: string[]) => {
      if (!accounts || accounts.length === 0) {
        disconnectWallet();
      } else {
        const newAddr = accounts[0];
        setConnectedAddress(newAddr);
        setIsWalletConnected(true);
        setLookupAddress('');
        setGradingResult(null);
      }
    };

    const handleChainChanged = () => {
      if (isWalletConnected && connectedAddress) {
        checkAuth(connectedAddress, true, isSimulatedJudge);
      }
    };

    const handleDisconnect = () => {
      disconnectWallet();
    };

    if (provider.on) {
      provider.on('accountsChanged', handleAccountsChanged);
      provider.on('chainChanged', handleChainChanged);
      provider.on('disconnect', handleDisconnect);
    }

    return () => {
      if (provider.removeListener) {
        provider.removeListener('accountsChanged', handleAccountsChanged);
        provider.removeListener('chainChanged', handleChainChanged);
        provider.removeListener('disconnect', handleDisconnect);
      }
    };
  }, [isWalletConnected, connectedAddress, isSimulatedJudge]);

  // Verify Auth Status
  const checkAuth = async (addr: string | null, isConnected: boolean, sim: boolean) => {
    if (sim) {
      setAuthLoading(true);
      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: null, isWalletConnected: false, isSimulatedJudge: true })
        });
        const data = await res.json();
        if (data.success) {
          setAuthStatus(data.auth);
        }
      } catch (err: any) {
        console.error('Judge auth error:', err);
      } finally {
        setAuthLoading(false);
      }
      return;
    }

    if (!addr) {
      setAuthStatus(null);
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: addr, isWalletConnected: isConnected, isSimulatedJudge: false })
      });
      const data = await res.json();
      if (data.success) {
        setAuthStatus(data.auth);
      } else {
        setAuthStatus(null);
      }
    } catch (err: any) {
      console.error('Auth verification error:', err);
      setAuthStatus(null);
    } finally {
      setAuthLoading(false);
    }
  };

  // Revalidate authentication whenever identity inputs change
  useEffect(() => {
    if (isSimulatedJudge) {
      checkAuth(null, false, true);
    } else if (lookupAddress) {
      checkAuth(lookupAddress, false, false);
    } else if (isWalletConnected && connectedAddress) {
      checkAuth(connectedAddress, true, false);
    } else {
      setAuthStatus(null);
    }
  }, [connectedAddress, isWalletConnected, lookupAddress, isSimulatedJudge]);

  // Fetch Live Telemetry Evidence
  const fetchTelemetry = async () => {
    setTelemetryLoading(true);
    setTelemetryError(null);
    try {
      const res = await fetch('/api/telemetry');
      const data = await res.json();
      if (data.success) {
        setEvidence(data.evidence);
      } else {
        setTelemetryError(data.error || 'Failed to ingest on-chain evidence.');
      }
    } catch (err: any) {
      setTelemetryError(err?.message || 'Network error fetching telemetry.');
    } finally {
      setTelemetryLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const timer = setInterval(fetchTelemetry, 10000);
    return () => clearInterval(timer);
  }, []);

  // Submit Mission Verdict
  const handleSubmitVerdict = async () => {
    if (!evidence) return;
    setSubmitting(true);
    try {
      const activeAddress = isSimulatedJudge
        ? '0x000000000000000000000000000000000000dEaD'
        : lookupAddress
        ? lookupAddress
        : connectedAddress;

      const activeIsConnected = isSimulatedJudge
        ? false
        : (lookupAddress ? false : isWalletConnected);

      const res = await fetch('/api/mission/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission: {
            caseId: activeCaseId,
            curveAddress: evidence.curveAddress,
            selectedChoice,
            isSimulatedJudge
          },
          walletAddress: activeAddress,
          isWalletConnected: activeIsConnected,
          isSimulatedJudge
        })
      });
      const data = await res.json();
      if (data.success) {
        setGradingResult(data.grading);
        if (data.grading.recordedToStorage) {
          const updated = recordVerdictToLocalDemoScores(
            data.grading.isCorrect,
            data.grading.scoreAwarded,
            isSimulatedJudge
          );
          setLocalScores(updated);
        }
      } else {
        setInlineNotice({
          message: data.error || 'Submission failed.',
          type: 'error'
        });
      }
    } catch (err: any) {
      setInlineNotice({
        message: `Error submitting verdict: ${err?.message}`,
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Status derivations
  const isHolder = Boolean(
    authStatus?.isVerifiedHolder && isWalletConnected && !isSimulatedJudge && !lookupAddress
  );
  const isManualLookup = Boolean(lookupAddress && !isSimulatedJudge);
  const hasForensicLensAccess = isHolder || isSimulatedJudge;

  // Active mission question spec
  const currentSpec = getMissionSpec(activeCaseId, evidence);

  // Reliable Handoff from Hero Carousel to Arena Workspace
  const handleEnterArena = (caseId?: CaseId) => {
    if (caseId) {
      setActiveCaseId(caseId);
    }
    const target = document.getElementById('arena-workspace');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <main className="min-h-screen p-3 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 text-gray-200">
      {/* Cinematic TOONHUB-Inspired 4-Position Hero Carousel */}
      <HeroCarousel
        onSelectCase={(cid) => setActiveCaseId(cid)}
        onEnterArena={handleEnterArena}
        telemetryReady={Boolean(evidence && !telemetryError)}
        activeCaseId={activeCaseId}
      />

      {/* Main Investigation Arena Workspace Target */}
      <div id="arena-workspace" className="scroll-mt-6 space-y-6">
        {/* JUDGE FAST-TRACK BANNER: Instant First 10 Seconds Onboarding */}
      <section className="bg-gradient-to-r from-purple-950/70 via-gray-900 to-amber-950/50 border border-purple-500/30 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-500/40 flex-shrink-0">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                Chogathon Judge Fast-Track
              </span>
              <span className="text-xs text-gray-400">Zero-Friction Evaluation</span>
            </div>
            <p className="text-xs md:text-sm text-gray-300 mt-0.5">
              Testing without a Monad wallet? Enable <strong>1-Click Judge Mode</strong> to unlock the <strong>Chog Forensic Lens</strong> and evaluate all multi-case dossiers in isolated demo state.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            const next = !isSimulatedJudge;
            setIsSimulatedJudge(next);
            setInlineNotice({
              message: next
                ? 'Simulated Judge Mode activated. Advanced Forensic Lens unlocked (Isolated Demo Storage).'
                : 'Exited Judge Mode. Reverted to standard observation.',
              type: 'info'
            });
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 flex items-center gap-2 shadow-md ${
            isSimulatedJudge
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-purple-600 hover:bg-purple-500 text-white'
          }`}
        >
          {isSimulatedJudge ? (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Judge Mode Active (Click to Exit)</span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              <span>Activate 1-Click Judge Mode</span>
            </>
          )}
        </button>
      </section>

      {/* Accessible Inline Notification Toast */}
      {inlineNotice && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 transition shadow-sm ${
            inlineNotice.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-200'
              : inlineNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {inlineNotice.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            ) : inlineNotice.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
            )}
            <span>{inlineNotice.message}</span>
          </div>
          <button
            onClick={() => setInlineNotice(null)}
            className="text-[11px] underline text-gray-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="border-b border-gray-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20 shadow-sm">
              <Shield className="w-7 h-7" />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                ChogSignal Arena
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Phase 2 Forensic Bureau
                </span>
              </h1>
              <p className="text-xs md:text-sm text-gray-400 mt-0.5">
                On-Chain Forensic Investigation Game · Powered by vibe/vibe Curves & Monad Chog NFT Verification
              </p>
            </div>
          </div>
        </div>

        {/* Global Network and Deadline Metadata */}
        <div className="flex flex-col md:items-end gap-1 text-xs text-gray-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Monad (143)
            </span>
            <span>·</span>
            <span className="text-blue-400">Robinhood Testnet (46630)</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400/90 text-[11px]">
            <Clock className="w-3 h-3" />
            <span>Submission Deadline: Oct 23, 2026 @ 15:00 UTC</span>
          </div>
        </div>
      </header>

      {/* Wallet Connection & Authentication Controls */}
      <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="p-2 bg-gray-800 rounded-lg text-gray-300">
              <Wallet className="w-5 h-5" />
            </div>
            {isWalletConnected && connectedAddress ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-mono bg-gray-950 px-3 py-2 rounded-lg border border-gray-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-gray-300">
                    {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
                  </span>
                  <span className="text-[10px] text-gray-500">(Connected Provider)</span>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-xs font-medium transition border border-gray-700 flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={connectWallet}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-2"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Connect Wallet</span>
                </button>
                <span className="text-xs text-gray-400">
                  Connect via provider to verify Chog Genesis NFT ownership
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-gray-800 pt-3 md:pt-0 md:pl-5">
            <label className="flex items-center gap-2 cursor-pointer text-xs md:text-sm font-medium text-gray-300">
              <input
                type="checkbox"
                checked={isSimulatedJudge}
                onChange={(e) => setIsSimulatedJudge(e.target.checked)}
                className="rounded border-gray-700 text-purple-600 focus:ring-purple-500 bg-gray-950 w-4 h-4 cursor-pointer"
              />
              <span>Simulated Judge Demo Mode</span>
            </label>
          </div>
        </div>

        {/* Address Lookup / Cadet Preview Entry (Read-Only) */}
        <div className="pt-3 border-t border-gray-800/80 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-blue-400" />
              <span>Address Lookup / Cadet Preview</span>
              <span className="text-[11px] font-normal text-amber-400/90">
                (Read-Only Preview · Does NOT confer verified-holder status)
              </span>
            </label>
            {lookupAddress && (
              <button
                onClick={() => setLookupAddress('')}
                className="text-[11px] text-gray-400 hover:text-gray-200 transition underline"
              >
                Clear Preview
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Enter EVM address for Cadet Preview (0x...)"
              value={lookupAddress}
              onChange={(e) => setLookupAddress(e.target.value.trim())}
              className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
        </div>

        {/* Auth Role Banner */}
        {authLoading ? (
          <div className="p-3 bg-gray-800/40 rounded-xl text-xs text-gray-400 flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Verifying Chog NFT ownership on Monad (Chain 143)...</span>
          </div>
        ) : isSimulatedJudge ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-amber-200">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
            <div className="text-xs space-y-1">
              <p className="font-bold tracking-wide uppercase">
                [JUDGE DEMO MODE ACTIVE — SIMULATED HOLDER PRIVILEGES]
              </p>
              <p className="text-amber-300/80">
                You are testing with simulated Chog Lead Investigator privileges. The <strong>Chog Forensic Lens</strong> is unlocked. All verdicts and scores are strictly isolated to temporary Judge Demo storage and do NOT contaminate real Local Demo Scores.
              </p>
            </div>
          </div>
        ) : isHolder ? (
          <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-start gap-3 text-purple-200">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-purple-400" />
            <div className="text-xs space-y-1">
              <p className="font-bold tracking-wide text-sm flex items-center gap-2">
                <span>Verified Chog Lead Investigator</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                  Chog Balance: {authStatus?.chogBalance}
                </span>
              </p>
              <p className="text-purple-300/80">
                Wallet verified via provider. Chog Genesis NFT ownership confirmed on Monad (`0xc96d31F8...`). The <strong>Chog Forensic Lens</strong> is unlocked. Your verdicts are evaluated for real Verified Investigator XP.
              </p>
            </div>
          </div>
        ) : isManualLookup ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-amber-200">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
            <div className="text-xs space-y-1">
              <p className="font-bold tracking-wide text-sm flex items-center gap-2">
                <span>Address Lookup / Cadet Preview (Read-Only)</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  Observed Chog Balance: {authStatus?.chogBalance ?? 0}
                </span>
              </p>
              <p className="text-amber-300/80">
                Inspecting `{lookupAddress.slice(0, 8)}...{lookupAddress.slice(-6)}`. Because this address was entered manually without a verified wallet connection, verified-holder status and score recording are disabled. Connect this wallet to claim verified investigator status.
              </p>
            </div>
          </div>
        ) : isWalletConnected ? (
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start gap-3 text-blue-200">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-400" />
            <div className="text-xs space-y-1">
              <p className="font-bold tracking-wide text-sm">
                Cadet Observer (Connected Wallet - No NFT Detected)
              </p>
              <p className="text-blue-300/80">
                Connected wallet `{connectedAddress?.slice(0, 8)}...{connectedAddress?.slice(-6)}` does not hold a Chog Genesis NFT on Monad. You can inspect live public evidence and practice in the Cadet Sandbox below. Advanced Forensic Lens is locked to NFT holders.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-gray-800/40 border border-gray-700/60 rounded-xl flex items-start gap-3 text-gray-300">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-gray-400" />
            <div className="text-xs space-y-1">
              <p className="font-bold tracking-wide text-sm text-gray-200">
                Cadet Observer (Public Orientation Sandbox)
              </p>
              <p className="text-gray-400">
                No wallet connected. Inspect live public curve evidence below or activate <strong>1-Click Judge Mode</strong> above to test all investigator capabilities.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* MULTI-CASE DOSSIER NAVIGATION TABS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
            <FolderOpen className="w-4 h-4" />
            Active Investigation Dockets
          </span>
          <span className="text-xs text-gray-500">Select a case file to investigate</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(['CASE_A', 'CASE_B', 'CASE_C'] as CaseId[]).map((cid) => {
            const spec = ALL_MISSION_SPECS[cid];
            const isSelected = activeCaseId === cid;
            return (
              <button
                key={cid}
                onClick={() => setActiveCaseId(cid)}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'bg-purple-950/40 border-purple-500 shadow-md ring-1 ring-purple-500/50'
                    : 'bg-gray-900/60 border-gray-800 hover:border-gray-700 text-gray-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    isSelected ? 'bg-purple-500/20 text-purple-300' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {spec.caseNumber}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">● LIVE DATA</span>
                </div>
                <div>
                  <p className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                    {spec.title.split(': ')[1] || spec.title}
                  </p>
                  <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                    {spec.scenario}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Evidence Docket & Forensic Lens */}
        <div className="lg:col-span-2 space-y-6">
          {/* Public Evidence Docket (Anti-Spoil Design) */}
          <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-400" />
                  Live Forensic Evidence Docket
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Verified parameters on Robinhood Testnet (Chain 46630) · Source: {evidence?.evidenceSource || 'QUERYING...'}
                </p>
              </div>
              <button
                onClick={fetchTelemetry}
                disabled={telemetryLoading}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition border border-gray-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${telemetryLoading ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            </div>

            {telemetryLoading && !evidence ? (
              <div className="py-12 text-center space-y-2 text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-400" />
                <p className="text-xs">Querying on-chain Multicall3 lens & board API...</p>
              </div>
            ) : telemetryError ? (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-xs space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-red-400" />
                  Evidence Feed Failure
                </p>
                <p>{telemetryError}</p>
                <button
                  onClick={fetchTelemetry}
                  className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs"
                >
                  Retry Read
                </button>
              </div>
            ) : evidence ? (
              <div className="space-y-4">
                {/* Token Header Pill */}
                <div className="p-3.5 bg-gray-950/70 border border-gray-800 rounded-xl flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-base font-bold text-white">{evidence.tokenName}</span>
                    <span className="ml-2 text-xs font-mono text-purple-400 font-semibold">
                      ${evidence.tokenSymbol}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">
                      Tax: {evidence.taxAvailable ? `${evidence.baseTaxBps / 100}%` : 'Unavailable'}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-mono ${evidence.isGraduated ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'}`}>
                      {evidence.isGraduated ? 'Graduated (DEX)' : 'Active Bonding Curve'}
                    </span>
                  </div>
                </div>

                {/* Evidence Metrics (Human Formatted Quantities) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                  <div className="p-3.5 bg-gray-950/60 border border-gray-800 rounded-xl space-y-1">
                    <span className="text-gray-400 uppercase tracking-wider text-[10px] font-semibold">
                      Current Accumulated Reserves
                    </span>
                    <p className="text-xl font-bold font-mono text-emerald-400">
                      {evidence.pairReserveFormatted}
                    </p>
                    <p className="text-[11px] text-gray-500 font-mono">
                      Target: {evidence.targetPairFormatted}
                    </p>
                  </div>

                  <div className="p-3.5 bg-gray-950/60 border border-gray-800 rounded-xl space-y-1">
                    <span className="text-gray-400 uppercase tracking-wider text-[10px] font-semibold">
                      Wall Street Reference Session
                    </span>
                    <p className="text-xl font-bold font-mono text-amber-400">
                      {evidence.marketSession}
                    </p>
                    <p className="text-[11px] text-gray-500 font-mono">
                      Clock: Deterministic NY Hours
                    </p>
                  </div>
                </div>

                {/* Detailed Provenance Footer */}
                <div className="p-3 bg-gray-950/40 border border-gray-800/80 rounded-xl text-[11px] text-gray-400 space-y-1 font-mono">
                  <div className="flex justify-between items-center truncate">
                    <span className="text-gray-500">Curve Contract:</span>
                    <a
                      href={`https://explorer.testnet.chain.robinhood.com/address/${evidence.curveAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:underline flex items-center gap-1"
                    >
                      {evidence.curveAddress.slice(0, 10)}...{evidence.curveAddress.slice(-8)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Multicall3 Lens:</span>
                    <span className="text-gray-300">0xcA11...CA11 (Chain 46630)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Last Synced:</span>
                    <span>{new Date(evidence.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          {/* CHOG FORENSIC LENS (ACTIVE NFT INVESTIGATOR SUPERPOWER) */}
          <section className="bg-gray-900/60 border border-purple-500/20 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  <Eye className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Chog Forensic Lens
                    {hasForensicLensAccess ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <Unlock className="w-3 h-3" /> UNLOCKED
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> LOCKED TO NFT HOLDERS
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Advanced calldata inspection, exact mathematical proofs, and cross-source variance
                  </p>
                </div>
              </div>

              {hasForensicLensAccess && (
                <button
                  onClick={() => setForensicLensEnabled(!forensicLensEnabled)}
                  className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700"
                >
                  {forensicLensEnabled ? 'Hide Lens' : 'Engage Lens'}
                </button>
              )}
            </div>

            {hasForensicLensAccess ? (
              forensicLensEnabled && evidence ? (
                <div className="space-y-3.5 text-xs font-mono bg-purple-950/20 border border-purple-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between text-purple-300 border-b border-purple-500/20 pb-2">
                    <span className="font-bold flex items-center gap-1.5">
                      🕵️ Active Detective Calldata Stream
                    </span>
                    <span className="text-[10px] text-gray-400">Authoritative Lens</span>
                  </div>

                  {/* Deep Math & Proof Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-950/70 border border-gray-800 rounded-lg space-y-1">
                      <span className="text-[10px] uppercase text-gray-400 font-bold">Authoritative Multicall3 Reading</span>
                      <p className="text-emerald-400 font-bold text-sm">
                        {evidence.onChainProgressPct.toFixed(4)}%
                      </p>
                      <p className="text-[10px] text-gray-500 truncate">
                        pairPrincipal: {evidence.pairReserveUnits} wei
                      </p>
                      <p className="text-[10px] text-gray-500 truncate">
                        targetPairUnits: {evidence.targetPairUnits} wei
                      </p>
                    </div>

                    <div className="p-3 bg-gray-950/70 border border-gray-800 rounded-lg space-y-1">
                      <span className="text-[10px] uppercase text-gray-400 font-bold">Upstream API Reading & Variance</span>
                      <p className="text-blue-400 font-bold text-sm">
                        {evidence.apiReportedProgressPct.toFixed(4)}%
                      </p>
                      <p className="text-[10px] text-purple-300 font-bold">
                        Variance: {Math.abs(evidence.onChainProgressPct - evidence.apiReportedProgressPct).toFixed(4)}% ({evidence.discrepancyBps} bps)
                      </p>
                      <p className="text-[10px] text-gray-500">
                        Tolerance Gate: ±0.05% (5 bps)
                      </p>
                    </div>
                  </div>

                  {/* Curve Lifecycle & Tax Details */}
                  <div className="p-2.5 bg-gray-950/40 rounded border border-purple-500/20 text-[11px] space-y-1 text-gray-300">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Curve Deployment Time:</span>
                      <span>{new Date(evidence.createdAtTimestamp * 1000).toUTCString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">On-Chain baseTaxBps:</span>
                      <span className="text-amber-300 font-bold">
                        {evidence.taxAvailable ? `${evidence.baseTaxBps} bps (${evidence.baseTaxBps / 100}%)` : 'Unavailable'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Proof Formula:</span>
                      <span className="text-purple-300">(pairPrincipal * 1,000,000) / targetPairUnits / 10,000</span>
                    </div>
                  </div>
                </div>
              ) : null
            ) : (
              <div className="p-4 bg-gray-950/80 border border-gray-800 rounded-xl text-center space-y-2">
                <Lock className="w-6 h-6 text-purple-400 mx-auto" />
                <p className="text-xs font-bold text-gray-200">
                  Forensic Lens Locked to Cadet Observers
                </p>
                <p className="text-[11px] text-gray-400 max-w-md mx-auto leading-relaxed">
                  Holding an authentic Chog Genesis NFT on Monad (or activating <strong>1-Click Judge Mode</strong>) equips your detective with raw calldata proofs, exact formula breakdowns, and live variance metrics.
                </p>
                <div className="pt-1">
                  <button
                    onClick={() => setIsSimulatedJudge(true)}
                    className="px-3 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 rounded text-xs font-bold border border-purple-500/40 transition"
                  >
                    Simulate Lens as Judge
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Interactive Mission Verdict Card */}
          <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">{currentSpec.title}</h3>
              </div>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                {currentSpec.scenario}
              </p>
            </div>

            <div className="p-3.5 bg-purple-500/5 border border-purple-500/20 rounded-xl text-xs text-purple-200">
              <p className="font-semibold">{currentSpec.prompt}</p>
            </div>

            {/* Check if case is unavailable */}
            {currentSpec.isAvailable === false ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Case Currently Unavailable on Selected Curve
                </p>
                <p>{currentSpec.unavailableReason || 'Required parameters are not returned by the curve contract.'}</p>
                <p className="text-gray-400 text-[11px]">
                  In accordance with hackathon integrity guidelines, we do not fabricate unverified parameters. Please select Case A or Case B.
                </p>
              </div>
            ) : (
              <>
                {/* Verdict Options */}
                <div className="space-y-2.5">
                  {currentSpec.options.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                        selectedChoice === opt.id
                          ? 'bg-purple-900/20 border-purple-500 text-white'
                          : 'bg-gray-950/60 border-gray-800 hover:border-gray-700 text-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="verdictChoice"
                        value={opt.id}
                        checked={selectedChoice === opt.id}
                        onChange={() => setSelectedChoice(opt.id)}
                        className="mt-1 text-purple-600 focus:ring-purple-500 bg-gray-950 border-gray-700"
                      />
                      <div className="text-xs">
                        <p className="font-bold text-sm">{opt.label}</p>
                        <p className="text-gray-400 mt-0.5">{opt.description}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Verdict Submission Button */}
                <button
                  onClick={handleSubmitVerdict}
                  disabled={submitting || !evidence}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition shadow-md flex items-center justify-center gap-2 ${
                    submitting || !evidence
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : isHolder
                      ? 'bg-purple-600 hover:bg-purple-500 text-white'
                      : isSimulatedJudge
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : isManualLookup
                      ? 'bg-cyan-700 hover:bg-cyan-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Evaluating On-Chain Truth...</span>
                    </>
                  ) : isHolder ? (
                    <span>Submit Authoritative Forensic Verdict (+100 XP)</span>
                  ) : isSimulatedJudge ? (
                    <span>Submit Simulated Judge Verdict (Demo Evaluation)</span>
                  ) : isManualLookup ? (
                    <span>Submit Cadet Practice Verdict (Address Lookup Preview — Unrecorded)</span>
                  ) : (
                    <span>Submit Cadet Practice Verdict (Orientation Sandbox — Unrecorded)</span>
                  )}
                </button>
              </>
            )}

            {/* Grading Result Feedback */}
            {gradingResult && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-2.5 transition ${
                  gradingResult.isCorrect
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-red-500/10 border-red-500/30 text-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm flex items-center gap-2">
                    {gradingResult.isCorrect ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                        <span>[CASE SOLVED 🔍] Accurate Forensic Finding</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-400" />
                        <span>[VERDICT REJECTED ❌] Mathematical Discrepancy</span>
                      </>
                    )}
                  </p>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-black/30">
                    +{gradingResult.scoreAwarded} XP
                  </span>
                </div>

                <p className="leading-relaxed">{gradingResult.explanation}</p>

                <div className="pt-2 border-t border-current/20 flex justify-between text-[11px] font-mono text-gray-300">
                  <span>Case: {gradingResult.caseId}</span>
                  <span>
                    Recorded:{' '}
                    {gradingResult.recordedToStorage
                      ? gradingResult.isSimulatedJudge
                        ? 'Judge Demo Key (+100 XP)'
                        : 'Local Demo Scores (+100 XP)'
                      : isManualLookup
                      ? 'Unrecorded (Preview)'
                      : 'Unrecorded (Cadet Sandbox)'}
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Local Demo Scores & Safety Widget */}
        <div className="space-y-6">
          <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
            <div className="border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-400" />
                Local Demo Scores
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Browser-local demo records · Zero global leaderboard claim
              </p>
            </div>

            {/* Score Grid */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-gray-950/60 border border-gray-800 rounded-xl">
                <span className="text-[10px] uppercase text-gray-500 font-semibold">Total XP</span>
                <p className="text-xl font-bold font-mono text-purple-400">{localScores.totalXp}</p>
              </div>
              <div className="p-3 bg-gray-950/60 border border-gray-800 rounded-xl">
                <span className="text-[10px] uppercase text-gray-500 font-semibold">Accuracy</span>
                <p className="text-xl font-bold font-mono text-emerald-400">{localScores.accuracyRate}%</p>
              </div>
              <div className="p-3 bg-gray-950/60 border border-gray-800 rounded-xl">
                <span className="text-[10px] uppercase text-gray-500 font-semibold">Cases Audited</span>
                <p className="text-base font-bold font-mono text-gray-200">{localScores.casesAudited}</p>
              </div>
              <div className="p-3 bg-gray-950/60 border border-gray-800 rounded-xl">
                <span className="text-[10px] uppercase text-gray-500 font-semibold">Confirmed</span>
                <p className="text-base font-bold font-mono text-gray-200">{localScores.correctVerdicts}</p>
              </div>
            </div>

            {/* Badges Earned */}
            <div className="space-y-2 pt-2 border-t border-gray-800">
              <span className="text-[11px] font-semibold text-gray-400">Forensic Badges:</span>
              <div className="flex flex-wrap gap-1.5">
                {localScores.badges.length > 0 ? (
                  localScores.badges.map((b) => (
                    <span
                      key={b}
                      className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/30 text-purple-300 rounded-full text-[10px] font-semibold"
                    >
                      🛡️ {b}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-gray-600 italic">No badges unlocked yet</span>
                )}
              </div>
            </div>

            {/* Reset Scores Button */}
            <div className="pt-2">
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.localStorage.removeItem(isSimulatedJudge ? 'chogsignal_simulated_judge_demo_scores_v1' : 'chogsignal_local_demo_scores_v1');
                    setLocalScores(getLocalDemoScores(isSimulatedJudge));
                  }
                }}
                className="w-full py-1.5 text-[11px] text-gray-500 hover:text-gray-300 transition"
              >
                Reset Local Demo Scores
              </button>
            </div>
          </section>

          {/* Compliance & Security Guardrail Card */}
          <section className="bg-gray-900/30 border border-gray-800/60 rounded-2xl p-5 text-xs text-gray-400 space-y-2.5">
            <h4 className="font-bold text-gray-300 text-xs flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              Non-Negotiable Safety Invariants
            </h4>
            <ul className="space-y-1.5 text-[11px] list-disc list-inside text-gray-400">
              <li>100% Read-Only interactions; zero blockchain writes.</li>
              <li>$0 Cost: Free public Monad & Robinhood testnet RPCs.</li>
              <li>Zero private keys or seed phrase requests.</li>
              <li>No trading, swaps, or fund custody.</li>
              <li>Scores are strictly client-side Local Demo Scores.</li>
            </ul>
          </section>
        </div>
      </div>
      </div>
    </main>
  );
}
