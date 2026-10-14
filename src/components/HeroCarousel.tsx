'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { CaseId } from '@/types';
import {
  Shield,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Cpu,
  Clock,
  Coins,
  FileSearch,
  Sparkles,
  Layers,
  Activity,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface HeroCarouselProps {
  onSelectCase: (caseId: CaseId) => void;
  onEnterArena: (caseId?: CaseId) => void;
  telemetryReady: boolean;
  activeCaseId: CaseId;
}

interface SlideItem {
  id: string;
  caseId?: CaseId;
  caseNumber: string;
  category: string;
  title: string;
  tagline: string;
  description: string;
  ghostWord: string;
  accent: {
    name: string;
    border: string;
    glow: string;
    text: string;
    bgBadge: string;
    bgRadial: string;
  };
  icon: React.ReactNode;
}

const SLIDES: SlideItem[] = [
  {
    id: 'slide-case-a',
    caseId: 'CASE_A',
    caseNumber: '01',
    category: 'ON-CHAIN RESERVE PROOF',
    title: 'Curve Graduation & Reserve Proof',
    tagline: 'Compare authoritative Multicall3 reserves against upstream indexing',
    description:
      'Audit live bonding-curve reserves on Robinhood Testnet. Detect discrepancies between upstream board API figures and authoritative on-chain graduation units before snipers frontrun.',
    ghostWord: 'INVESTIGATE',
    accent: {
      name: 'cyan',
      border: 'border-cyan-500/50',
      glow: 'shadow-[0_0_35px_rgba(6,182,212,0.18)]',
      text: 'text-cyan-400',
      bgBadge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
      bgRadial: 'radial-gradient(ellipse at 50% 45%, rgba(6,182,212,0.14) 0%, rgba(11,12,16,0) 70%)'
    },
    icon: <Cpu className="w-8 h-8 text-cyan-400" />
  },
  {
    id: 'slide-case-b',
    caseId: 'CASE_B',
    caseNumber: '02',
    category: 'ORACLE TIMING & CALENDAR',
    title: 'Ghost Market Oracle Trap',
    tagline: 'Cross-examine 24/7 curve activity against Wall Street session clocks',
    description:
      'Bonding curves trade 24/7, but Real-World Asset (RWA) and equity pairs depend on US market sessions. Detect off-market equity oracle disconnect while curves trade without reference price updates.',
    ghostWord: 'ORACLE',
    accent: {
      name: 'amber',
      border: 'border-amber-500/50',
      glow: 'shadow-[0_0_35px_rgba(245,158,11,0.18)]',
      text: 'text-amber-400',
      bgBadge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      bgRadial: 'radial-gradient(ellipse at 50% 45%, rgba(245,158,11,0.14) 0%, rgba(11,12,16,0) 70%)'
    },
    icon: <Clock className="w-8 h-8 text-amber-400" />
  },
  {
    id: 'slide-case-c',
    caseId: 'CASE_C',
    caseNumber: '03',
    category: 'CREATOR ECONOMICS AUDIT',
    title: 'Creator Tax Extraction Audit',
    tagline: 'Inspect on-chain baseTaxBps to expose predatory fee friction',
    description:
      'Extract authoritative on-chain baseTaxBps parameters directly from curve bytecode. Determine whether a token launch enforces fair 0% tax, baseline 1.5% friction, or aggressive creator extraction.',
    ghostWord: 'EXTRACT',
    accent: {
      name: 'crimson',
      border: 'border-rose-500/50',
      glow: 'shadow-[0_0_35px_rgba(244,63,94,0.18)]',
      text: 'text-rose-400',
      bgBadge: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
      bgRadial: 'radial-gradient(ellipse at 50% 45%, rgba(244,63,94,0.14) 0%, rgba(11,12,16,0) 70%)'
    },
    icon: <Coins className="w-8 h-8 text-rose-400" />
  },
  {
    id: 'slide-briefing',
    caseNumber: '04',
    category: 'DETECTIVE PROTOCOL',
    title: 'Chog Forensic Bureau Protocol',
    tagline: 'Cryptographic Monad identity, advanced Lens, deterministic grading',
    description:
      'Holding an authentic Chog Genesis NFT on Monad Mainnet unlocks the deep Forensic Lens with raw calldata math. Submit verified verdicts and build your local demo record.',
    ghostWord: 'SIGNAL',
    accent: {
      name: 'lime',
      border: 'border-emerald-500/50',
      glow: 'shadow-[0_0_35px_rgba(16,185,129,0.18)]',
      text: 'text-emerald-400',
      bgBadge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      bgRadial: 'radial-gradient(ellipse at 50% 45%, rgba(16,185,129,0.14) 0%, rgba(11,12,16,0) 70%)'
    },
    icon: <FileSearch className="w-8 h-8 text-emerald-400" />
  }
];

export default function HeroCarousel({
  onSelectCase,
  onEnterArena,
  telemetryReady,
  activeCaseId
}: HeroCarouselProps) {
  // Sync active slide initially with activeCaseId
  const getInitialIndex = (): number => {
    if (activeCaseId === 'CASE_B') return 1;
    if (activeCaseId === 'CASE_C') return 2;
    return 0;
  };

  const [activeIndex, setActiveIndex] = useState<number>(getInitialIndex);
  const touchStartXRef = useRef<number | null>(null);
  const lastNavTimeRef = useRef<number>(0);

  // Debounced Navigation Handlers
  const handleNext = useCallback(() => {
    const now = Date.now();
    if (now - lastNavTimeRef.current < 250) return;
    lastNavTimeRef.current = now;
    setActiveIndex((prev) => (prev + 1) % SLIDES.length);
  }, []);

  const handlePrev = useCallback(() => {
    const now = Date.now();
    if (now - lastNavTimeRef.current < 250) return;
    lastNavTimeRef.current = now;
    setActiveIndex((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  // Touch Swipe Handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartXRef.current;
    if (Math.abs(diff) > 40) {
      if (diff < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartXRef.current = null;
  };

  const currentSlide = SLIDES[activeIndex];

  // CTA Handoff Handlers
  const handleEnterClick = () => {
    if (currentSlide.caseId) {
      onSelectCase(currentSlide.caseId);
      onEnterArena(currentSlide.caseId);
    } else {
      onEnterArena();
    }
  };

  const handleViewCasesClick = () => {
    if (currentSlide.caseId) {
      onSelectCase(currentSlide.caseId);
      onEnterArena(currentSlide.caseId);
    } else {
      onSelectCase('CASE_A');
      onEnterArena('CASE_A');
    }
  };

  return (
    <section
      aria-label="ChogSignal Arena Cinematic Showcase"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="relative min-h-[92vh] md:min-h-[96vh] flex flex-col justify-between overflow-hidden rounded-3xl border border-gray-800/80 p-5 md:p-10 select-none bg-noise"
      style={{
        background: `${currentSlide.accent.bgRadial}, #08090d`,
        transition: 'background 650ms cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {/* OVERSIZED GHOST BACKGROUND TYPOGRAPHY */}
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none"
      >
        <span
          key={currentSlide.ghostWord}
          className="text-[15vw] md:text-[18vw] font-black tracking-tighter text-white/[0.035] leading-none transition-all duration-[650ms] ease-[cubic-bezier(0.4,0,0.2,1)] uppercase translate-y-4"
        >
          {currentSlide.ghostWord}
        </span>
      </div>

      {/* SUBTLE FORENSIC GRID BACKGROUND ACCENTS */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* TOP HEADER / BRANDING BAR */}
      <header className="relative z-30 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20 shadow-sm flex items-center justify-center">
            <Shield className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base md:text-lg font-black tracking-wider text-white">
                CHOGSIGNAL ARENA
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Phase 2
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-mono">
              On-Chain Forensic Investigation · Powered by vibe/vibe & Monad
            </p>
          </div>
        </div>

        {/* TRUTHFUL LIVE STATUS & NETWORK INFO */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="hidden md:flex items-center gap-2 bg-gray-950/80 px-3 py-1.5 rounded-xl border border-gray-800 text-gray-400 text-[11px]">
            <span className="text-purple-300">Monad (143)</span>
            <span>·</span>
            <span className="text-cyan-400">Robinhood Testnet (46630)</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold ${
              telemetryReady
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                telemetryReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>{telemetryReady ? 'RPC LENS READY' : 'CONNECTING LENS...'}</span>
          </div>
        </div>
      </header>

      {/* CENTRAL 4-POSITION CAROUSEL STAGE */}
      <div className="relative z-20 my-auto py-8 md:py-12 flex items-center justify-center perspective-1200 w-full min-h-[360px] md:min-h-[440px]">
        {SLIDES.map((slide, index) => {
          // Relative position calculation (0 = active center, 1 = right, 3 = left, 2 = far background)
          const offset = (index - activeIndex + SLIDES.length) % SLIDES.length;

          let positionStyle: React.CSSProperties = {};
          let isInteractive = false;

          if (offset === 0) {
            // CENTER / PROMINENT FOREGROUND
            positionStyle = {
              transform: 'translate3d(0, 0, 0) scale(1)',
              opacity: 1,
              zIndex: 30,
              filter: 'blur(0px)'
            };
            isInteractive = true;
          } else if (offset === 1) {
            // RIGHT SIDE VISUAL
            positionStyle = {
              transform: 'translate3d(58%, 0, -120px) scale(0.78)',
              opacity: 0.5,
              zIndex: 20,
              filter: 'blur(0.5px)'
            };
          } else if (offset === 2) {
            // FAR BACKGROUND VISUAL
            positionStyle = {
              transform: 'translate3d(0, -25px, -240px) scale(0.58)',
              opacity: 0.18,
              zIndex: 10,
              filter: 'blur(2px)'
            };
          } else if (offset === 3) {
            // LEFT SIDE VISUAL
            positionStyle = {
              transform: 'translate3d(-58%, 0, -120px) scale(0.78)',
              opacity: 0.5,
              zIndex: 20,
              filter: 'blur(0.5px)'
            };
          }

          return (
            <div
              key={slide.id}
              onClick={() => {
                if (offset !== 0) setActiveIndex(index);
              }}
              style={positionStyle}
              className={`absolute w-[86%] sm:w-[68%] md:w-[480px] rounded-3xl bg-gray-950/85 border p-6 md:p-8 backdrop-blur-md transition-carousel cursor-pointer select-none ${
                offset === 0
                  ? `${slide.accent.border} ${slide.accent.glow} ring-1 ring-white/10`
                  : 'border-gray-800 hover:border-gray-700'
              }`}
            >
              {/* Card Header Pill */}
              <div className="flex items-center justify-between border-b border-gray-800/80 pb-4">
                <span
                  className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg border ${slide.accent.bgBadge}`}
                >
                  {slide.category}
                </span>
                <span className="text-xs font-mono font-bold text-gray-500">
                  {slide.caseNumber} / 04
                </span>
              </div>

              {/* Graphic Icon & Visual Feature */}
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
                <div
                  className={`p-4 rounded-2xl bg-gray-900/90 border border-gray-800/80 shadow-inner flex items-center justify-center`}
                >
                  {slide.icon}
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black tracking-tight text-white">
                    {slide.title}
                  </h3>
                  <p className={`text-xs font-mono mt-1 ${slide.accent.text}`}>
                    {slide.tagline}
                  </p>
                </div>
              </div>

              {/* Forensic Metric Line & Details */}
              <div className="p-3.5 bg-gray-900/70 border border-gray-800/80 rounded-2xl text-[11px] text-gray-400 space-y-1.5 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Data Lens:</span>
                  <span className="text-gray-200">Robinhood Multicall3</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Grading Rule:</span>
                  <span className="text-gray-200">Deterministic Proof</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Access Tier:</span>
                  <span className="text-purple-300">Chog Genesis Holder / Judge</span>
                </div>
              </div>

              {/* Action Hint on Center Slide */}
              {isInteractive && (
                <div className="pt-4 flex items-center justify-between text-[11px] text-gray-400">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Evidence Live on Chain</span>
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEnterClick();
                    }}
                    className={`font-bold hover:underline flex items-center gap-1 ${slide.accent.text}`}
                  >
                    <span>Inspect Case</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* BOTTOM CONTROLS & CALL TO ACTION ROW */}
      <footer className="relative z-30 pt-4 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        {/* Bottom-Left: Title, Narrative & Circular Previous/Next Buttons */}
        <div className="max-w-xl space-y-3">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${currentSlide.accent.bgBadge}`}
            >
              CASE {currentSlide.caseNumber}
            </span>
            <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">
              {currentSlide.category}
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
            {currentSlide.title}
          </h2>

          <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
            {currentSlide.description}
          </p>

          {/* Navigation Controls: Circular Buttons & Indicators */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handlePrev}
              aria-label="Previous Investigation Slide"
              className="p-2.5 rounded-full bg-gray-900/90 hover:bg-gray-800 text-gray-200 hover:text-white border border-gray-700 transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={handleNext}
              aria-label="Next Investigation Slide"
              className="p-2.5 rounded-full bg-gray-900/90 hover:bg-gray-800 text-gray-200 hover:text-white border border-gray-700 transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Pagination Indicators */}
            <div className="flex items-center gap-1.5 ml-2">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === activeIndex
                      ? 'w-6 bg-white'
                      : 'w-2 bg-gray-700 hover:bg-gray-500'
                  }`}
                />
              ))}
            </div>

            <span className="text-xs font-mono text-gray-500 ml-2">
              0{activeIndex + 1} / 04
            </span>
          </div>
        </div>

        {/* Bottom-Right: Prominent Dual Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleViewCasesClick}
            className="px-5 py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white text-xs md:text-sm font-bold border border-gray-700 transition flex items-center justify-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span>VIEW CASES</span>
          </button>

          <button
            onClick={handleEnterClick}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs md:text-sm font-extrabold tracking-wide transition shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 border border-purple-400/30 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <span>ENTER THE ARENA</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </section>
  );
}
