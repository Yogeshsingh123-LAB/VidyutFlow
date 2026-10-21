import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Zap, SkipForward, ArrowRight } from 'lucide-react';

export const CinematicIntro: React.FC = () => {
  const { isIntroActive, setIsIntroActive } = useApp();
  const [elapsed, setElapsed] = useState(0);

  const handleFinish = useCallback(() => {
    setIsIntroActive(false);
  }, [setIsIntroActive]);

  // Stage derived directly from elapsed time (pure and synchronous):
  // 0: Initial transmission lines & electric pulse (0 - 1.0s)
  // 1: Smart-grid network branching (1.0 - 2.2s)
  // 2: Converging energy into VidyutOne bolt (2.2 - 3.4s)
  // 3: VidyutOne reveal + Tagline (3.4 - 4.3s)
  const stage: 0 | 1 | 2 | 3 =
    elapsed >= 3400 ? 3 :
    elapsed >= 2200 ? 2 :
    elapsed >= 1000 ? 1 : 0;

  // Check prefers-reduced-motion and manage timer
  useEffect(() => {
    if (!isIntroActive) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      handleFinish();
      return;
    }

    const startTime = Date.now();
    const totalDuration = 4300;

    const intervalId = window.setInterval(() => {
      const current = Date.now() - startTime;
      if (current >= totalDuration) {
        window.clearInterval(intervalId);
        setElapsed(totalDuration);
        handleFinish();
      } else {
        setElapsed(current);
      }
    }, 40);

    // Keyboard escape or space to skip
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        window.clearInterval(intervalId);
        handleFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isIntroActive, handleFinish]);

  if (!isIntroActive) return null;

  const progressPercent = Math.min(100, Math.round((elapsed / 4200) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-[#101C35] text-white flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-300">
      {/* Background ambient radial gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/15 blur-[120px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-cyan-400/10 blur-[80px]" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              'linear-gradient(rgba(56, 189, 248, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.15) 1px, transparent 1px)',
            backgroundSize: '48px 48px'
          }}
        />
      </div>

      {/* Top Header / Skip Button */}
      <div className="relative z-20 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-0.5 rounded">
            UGVCL Smart Grid & Intelligent ERP Suite
          </span>
        </div>

        <button
          onClick={handleFinish}
          className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-slate-200 hover:text-white transition-all shadow-sm"
          title="Skip opening animation (Esc)"
        >
          <span>Skip Intro</span>
          <SkipForward className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
          <kbd className="hidden sm:inline-block ml-1 px-1 py-0.2 rounded bg-black/40 text-[10px] text-slate-400 font-mono">
            ESC
          </kbd>
        </button>
      </div>

      {/* Center Cinematic Stage */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
        {/* SVG Smart Grid Network Canvas */}
        <div className="relative w-full max-w-4xl h-80 sm:h-96 flex items-center justify-center">
          <svg
            className="w-full h-full"
            viewBox="0 0 800 400"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Electric Pulse Glow Filters */}
              <filter id="electricGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur1" />
                <feGaussianBlur stdDeviation="8" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="coreSpark" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Linear Gradients for Transmission Lines */}
              <linearGradient id="lineGradPrimary" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1E3A8A" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#2563EB" stopOpacity="0.5" />
              </linearGradient>

              <linearGradient id="lineGradTeal" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0D9488" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            {/* STAGE 0 & 1: Stylized Power Transmission Towers (Left and Right) */}
            <g opacity={stage >= 2 ? 0.35 : 0.85} className="transition-opacity duration-700">
              {/* Left Pylon / Substation Tower */}
              <path
                d="M 60 340 L 100 120 L 140 340 M 80 220 L 120 220 M 70 280 L 130 280 M 100 120 L 100 80 M 60 160 L 140 160 M 70 120 L 130 120"
                stroke="#334155"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="100" cy="80" r="3" fill="#38BDF8" />

              {/* Right Pylon / Substation Tower */}
              <path
                d="M 660 340 L 700 120 L 740 340 M 680 220 L 720 220 M 670 280 L 730 280 M 700 120 L 700 80 M 660 160 L 740 160 M 670 120 L 730 120"
                stroke="#334155"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="700" cy="80" r="3" fill="#38BDF8" />

              {/* Static Transmission Catenary Cables */}
              <path
                d="M 100 160 Q 400 240 700 160"
                stroke="#1E293B"
                strokeWidth="2"
                fill="none"
              />
              <path
                d="M 100 120 Q 400 200 700 120"
                stroke="#1E293B"
                strokeWidth="2"
                fill="none"
              />
            </g>

            {/* STAGE 0: High-Voltage Surge Pulse Across Transmission Line (0-1.0s) */}
            <path
              d="M 100 160 Q 400 240 700 160"
              stroke="url(#lineGradPrimary)"
              strokeWidth={stage === 0 ? 3.5 : 2}
              strokeDasharray="80 320"
              strokeDashoffset={stage === 0 ? 400 - (elapsed / 1000) * 400 : 0}
              filter="url(#electricGlow)"
              fill="none"
              className={stage === 0 ? '' : 'opacity-40 transition-opacity'}
            />

            {/* STAGE 1+: Connected Smart Grid Network Branches (1.0s - 2.2s) */}
            <g
              opacity={stage >= 1 ? 1 : 0}
              className="transition-opacity duration-500"
            >
              {/* Branch to Central Grid Hub (400, 200) */}
              <path
                d="M 100 160 C 220 180, 280 200, 400 200"
                stroke="#38BDF8"
                strokeWidth="2"
                strokeDasharray="8 6"
                filter="url(#electricGlow)"
                fill="none"
              />
              <path
                d="M 700 160 C 580 180, 520 200, 400 200"
                stroke="#38BDF8"
                strokeWidth="2"
                strokeDasharray="8 6"
                filter="url(#electricGlow)"
                fill="none"
              />

              {/* Branch 1: Node Top-Left -> Citizen Consumer Smart Meter (220, 100) */}
              <path
                d="M 400 200 Q 300 140 220 100"
                stroke="url(#lineGradTeal)"
                strokeWidth="2"
                strokeDasharray="6 4"
                fill="none"
              />
              {/* Branch 2: Node Top-Right -> Sub-Divisional ERP (580, 100) */}
              <path
                d="M 400 200 Q 500 140 580 100"
                stroke="url(#lineGradTeal)"
                strokeWidth="2"
                strokeDasharray="6 4"
                fill="none"
              />
              {/* Branch 3: Node Bottom-Left -> Field Engineer Lineman (220, 300) */}
              <path
                d="M 400 200 Q 300 260 220 300"
                stroke="url(#lineGradTeal)"
                strokeWidth="2"
                strokeDasharray="6 4"
                fill="none"
              />
              {/* Branch 4: Node Bottom-Right -> Executive SCADA Control (580, 300) */}
              <path
                d="M 400 200 Q 500 260 580 300"
                stroke="url(#lineGradTeal)"
                strokeWidth="2"
                strokeDasharray="6 4"
                fill="none"
              />
              {/* Branch 5: Center Bottom -> State Data Center Security (400, 320) */}
              <path
                d="M 400 200 L 400 320"
                stroke="#38BDF8"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                fill="none"
              />

              {/* NODE 1: Citizen Consumer (220, 100) */}
              <g transform="translate(220, 100)">
                <circle r="18" fill="#131D31" stroke="#38BDF8" strokeWidth="2" filter="url(#coreSpark)" />
                <circle r="24" fill="none" stroke="#38BDF8" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" className="animate-spin origin-center" />
                <text x="0" y="4" textAnchor="middle" fill="#38BDF8" fontSize="10" fontWeight="bold">LT</text>
                <text x="0" y="36" textAnchor="middle" fill="#94A3B8" fontSize="10" fontWeight="600">Citizen Portal</text>
              </g>

              {/* NODE 2: Office ERP (580, 100) */}
              <g transform="translate(580, 100)">
                <circle r="18" fill="#131D31" stroke="#0D9488" strokeWidth="2" filter="url(#coreSpark)" />
                <circle r="24" fill="none" stroke="#0D9488" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
                <text x="0" y="4" textAnchor="middle" fill="#0D9488" fontSize="10" fontWeight="bold">ERP</text>
                <text x="0" y="36" textAnchor="middle" fill="#94A3B8" fontSize="10" fontWeight="600">Subdivision Ops</text>
              </g>

              {/* NODE 3: Field Engineer (220, 300) */}
              <g transform="translate(220, 300)">
                <circle r="18" fill="#131D31" stroke="#F59E0B" strokeWidth="2" filter="url(#coreSpark)" />
                <text x="0" y="4" textAnchor="middle" fill="#F59E0B" fontSize="10" fontWeight="bold">JE</text>
                <text x="0" y="34" textAnchor="middle" fill="#94A3B8" fontSize="10" fontWeight="600">Field Line App</text>
              </g>

              {/* NODE 4: Management SCADA (580, 300) */}
              <g transform="translate(580, 300)">
                <circle r="18" fill="#131D31" stroke="#6366F1" strokeWidth="2" filter="url(#coreSpark)" />
                <text x="0" y="4" textAnchor="middle" fill="#6366F1" fontSize="10" fontWeight="bold">HQ</text>
                <text x="0" y="34" textAnchor="middle" fill="#94A3B8" fontSize="10" fontWeight="600">Executive Cockpit</text>
              </g>

              {/* NODE 5: State Data Center Security (400, 320) */}
              <g transform="translate(400, 320)">
                <circle r="14" fill="#131D31" stroke="#10B981" strokeWidth="1.5" />
                <text x="0" y="3" textAnchor="middle" fill="#10B981" fontSize="9" fontWeight="bold">SEC</text>
                <text x="0" y="26" textAnchor="middle" fill="#64748B" fontSize="9">Data Center</text>
              </g>
            </g>

            {/* STAGE 2: Energy Convergence Arcs Inward (2.2s - 3.4s) */}
            {stage >= 2 && (
              <g>
                {/* Shockwave Rings Radiating Outward */}
                <circle
                  cx="400"
                  cy="200"
                  r={stage === 2 ? 20 + ((elapsed - 2200) / 1200) * 80 : 90}
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="2"
                  opacity={stage === 2 ? 1 - (elapsed - 2200) / 1200 : 0.2}
                />
                <circle
                  cx="400"
                  cy="200"
                  r={stage === 2 ? 10 + ((elapsed - 2200) / 1200) * 140 : 120}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="1.5"
                  opacity={stage === 2 ? 0.8 - (elapsed - 2200) / 1200 : 0}
                />
              </g>
            )}

            {/* Central Convergence Point: VidyutOne Emblem Center (400, 200) */}
            <g transform="translate(400, 200)">
              {/* Glow backdrop aura */}
              <circle
                r={stage >= 2 ? 46 : 28}
                fill={stage >= 2 ? 'rgba(37, 99, 235, 0.4)' : 'rgba(30, 41, 59, 0.8)'}
                filter="url(#electricGlow)"
                className="transition-all duration-500"
              />

              {/* Central Lightning Bolt Icon */}
              <path
                d="M -4 -24 L -18 2 L -4 2 L -8 24 L 18 -2 L 4 -2 Z"
                fill={stage >= 2 ? '#38BDF8' : '#94A3B8'}
                filter={stage >= 2 ? 'url(#coreSpark)' : undefined}
                className="transition-all duration-300 transform scale-110"
              />
            </g>
          </svg>
        </div>

        {/* STAGE 3: Brand Reveal & Tagline (3.4s+) */}
        <div
          className={`text-center space-y-3 max-w-xl px-4 transition-all duration-700 transform ${
            stage >= 3
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
          }`}
        >
          <div className="flex items-center justify-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white p-1 border border-slate-700 shadow-lg flex items-center justify-center shrink-0">
              <img src="/assets/ugvcl-logo.png" alt="UGVCL Official Logo" className="w-full h-full object-contain" />
            </div>
            <div className="text-left">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Uttar Gujarat Vij Company Limited
              </h1>
              <p className="text-xs text-slate-300 font-gujarati">
                ઉત્તર ગુજરાત વીજ કંપની લિમિટેડ · VidyutOne Demo
              </p>
            </div>
          </div>

          <p className="text-base sm:text-lg font-medium text-slate-200 tracking-wide">
            One Grid. One Platform. Infinite Possibilities.
          </p>

          <p className="text-xs text-slate-400">
            Intelligent IT Infrastructure & Automated ERP Ecosystem for Uttar Gujarat Vij Company Limited
          </p>

          <div className="pt-2">
            <button
              onClick={handleFinish}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
            >
              <span>Explore Ecosystem</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Progress Bar */}
      <div className="relative z-20 px-6 py-4 flex flex-col gap-1.5 border-t border-slate-800/80 bg-[#0B1120]/60 backdrop-blur-sm">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Synchronizing Smart Grid Telemetry...</span>
          </span>
          <span className="font-mono text-cyan-400">{progressPercent}%</span>
        </div>

        <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-teal-400 rounded-full transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
