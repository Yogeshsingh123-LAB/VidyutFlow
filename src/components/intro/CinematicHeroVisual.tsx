import React from 'react';
import { Zap, Radio, Activity, Shield, Cpu } from 'lucide-react';

export const CinematicHeroVisual: React.FC = () => {
  return (
    <div className="relative w-full h-[420px] sm:h-[480px] lg:h-[520px] rounded-3xl overflow-hidden bg-gradient-to-b from-[#0A101D] via-[#101C35] to-[#0B1220] border border-blue-900/40 shadow-2xl flex items-center justify-center select-none">
      {/* Twilight Sky & Radial Light Atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-blue-600/15 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[250px] bg-cyan-400/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#0B1220] to-transparent" />
      </div>

      {/* Grid Mesh Backplane */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(56, 189, 248, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.2) 1px, transparent 1px)',
          backgroundSize: '56px 56px'
        }}
      />

      {/* Cinematic Vector Electricity Infrastructure (Transmission Towers & Substation) */}
      <div className="relative w-full h-full max-w-6xl mx-auto flex items-end justify-center px-4">
        <svg
          className="w-full h-full"
          viewBox="0 0 1200 520"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Electric Blue Energy Glow */}
            <filter id="heroPulseGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gradient Catenary Lines */}
            <linearGradient id="powerLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1E3A8A" stopOpacity="0.3" />
              <stop offset="25%" stopColor="#38BDF8" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#0D9488" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.4" />
            </linearGradient>

            <linearGradient id="towerMetalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>
          </defs>

          {/* BACKGROUND DISTANT HIGHWAY / HORIZON SILHOUETTES */}
          <path
            d="M 0 460 Q 300 440 600 450 T 1200 460 L 1200 520 L 0 520 Z"
            fill="#090E17"
          />

          {/* 1. LEFT TRANSMISSION TOWER (400kV Pylon Structure) */}
          <g transform="translate(140, 160)">
            {/* Steel lattice pylon legs */}
            <path
              d="M 60 300 L 95 60 L 130 300 M 75 200 L 115 200 M 85 130 L 105 130 M 70 260 L 120 260 M 95 60 L 95 20"
              stroke="url(#towerMetalGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Cross arms for 3 phases */}
            <path
              d="M 40 80 L 150 80 M 30 120 L 160 120 M 45 160 L 145 160"
              stroke="#475569"
              strokeWidth="2"
            />
            {/* Insulator strings */}
            <circle cx="40" cy="88" r="3.5" fill="#38BDF8" />
            <circle cx="150" cy="88" r="3.5" fill="#38BDF8" />
            <circle cx="30" cy="128" r="3.5" fill="#38BDF8" />
            <circle cx="160" cy="128" r="3.5" fill="#38BDF8" />
            {/* Aviation warning beacon */}
            <circle cx="95" cy="18" r="3" fill="#EF4444" className="animate-ping" />
            <circle cx="95" cy="18" r="3" fill="#EF4444" />
          </g>

          {/* 2. RIGHT TRANSMISSION TOWER (400kV Pylon Structure) */}
          <g transform="translate(930, 160)">
            <path
              d="M 60 300 L 95 60 L 130 300 M 75 200 L 115 200 M 85 130 L 105 130 M 70 260 L 120 260 M 95 60 L 95 20"
              stroke="url(#towerMetalGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M 40 80 L 150 80 M 30 120 L 160 120 M 45 160 L 145 160"
              stroke="#475569"
              strokeWidth="2"
            />
            <circle cx="40" cy="88" r="3.5" fill="#38BDF8" />
            <circle cx="150" cy="88" r="3.5" fill="#38BDF8" />
            <circle cx="30" cy="128" r="3.5" fill="#38BDF8" />
            <circle cx="160" cy="128" r="3.5" fill="#38BDF8" />
            <circle cx="95" cy="18" r="3" fill="#EF4444" className="animate-ping" />
            <circle cx="95" cy="18" r="3" fill="#EF4444" />
          </g>

          {/* CATENARY HIGH-VOLTAGE TRANSMISSION LINES (Pulsing Energy Arcs) */}
          <path
            d="M 180 248 Q 580 340 1080 248"
            stroke="#1E293B"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M 180 248 Q 580 340 1080 248"
            stroke="url(#powerLineGrad)"
            strokeWidth="3.5"
            strokeDasharray="90 280"
            filter="url(#heroPulseGlow)"
            fill="none"
            className="animate-pulse"
          />

          <path
            d="M 170 288 Q 580 380 1090 288"
            stroke="#1E293B"
            strokeWidth="2.5"
            fill="none"
          />
          <path
            d="M 170 288 Q 580 380 1090 288"
            stroke="#0D9488"
            strokeWidth="2.5"
            strokeDasharray="60 220"
            filter="url(#heroPulseGlow)"
            fill="none"
            opacity="0.85"
          />

          {/* 3. CENTER: 66/11kV SUBSTATION TRANSFORMER BAY & GIS YARD */}
          <g transform="translate(430, 260)">
            {/* Substation Base Foundation */}
            <rect x="20" y="140" width="300" height="60" rx="4" fill="#0D1525" stroke="#1E293B" strokeWidth="2" />
            
            {/* Main Power Transformer Tank */}
            <rect x="70" y="60" width="200" height="90" rx="6" fill="#131D31" stroke="#334155" strokeWidth="2" />
            {/* Cooling Radiator Fins */}
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={i} x1={85 + i * 22} y1="70" x2={85 + i * 22} y2="140" stroke="#1E293B" strokeWidth="4" />
            ))}
            {/* Oil Conservator Drum */}
            <rect x="95" y="32" width="150" height="20" rx="10" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
            {/* High-Voltage Bushings & Terminals */}
            <path d="M 115 32 L 115 10 M 170 32 L 170 10 M 225 32 L 225 10" stroke="#94A3B8" strokeWidth="3" />
            <circle cx="115" cy="8" r="4" fill="#38BDF8" filter="url(#heroPulseGlow)" />
            <circle cx="170" cy="8" r="4" fill="#60A5FA" filter="url(#heroPulseGlow)" />
            <circle cx="225" cy="8" r="4" fill="#0D9488" filter="url(#heroPulseGlow)" />

            {/* Substation Nameplate Tag */}
            <text x="170" y="105" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold" letterSpacing="1">
              UGVCL 66/11kV
            </text>
            <text x="170" y="122" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="monospace">
              MEHSANA NORTH BAY
            </text>
          </g>

          {/* TELEMETRY DATA NODES OVERLAY */}
          <g transform="translate(560, 210)">
            <circle r="16" fill="#101C35" stroke="#38BDF8" strokeWidth="2" filter="url(#heroPulseGlow)" />
            <Zap className="w-4 h-4 text-cyan-400" x="-8" y="-8" />
          </g>
        </svg>

        {/* Floating Precision Telemetry Badges */}
        <div className="absolute top-6 left-6 hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-xs text-slate-300 shadow-lg">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="font-mono text-[11px] text-cyan-300">SCADA RTU-01</span>
          <span className="text-slate-500">·</span>
          <span>50.02 Hz Stable</span>
        </div>

        <div className="absolute top-6 right-6 hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-xs text-slate-300 shadow-lg">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono text-[11px] text-emerald-300">11kV Feeder Bus</span>
          <span className="text-slate-500">·</span>
          <span>Normal 99.96% Uptime</span>
        </div>
      </div>
    </div>
  );
};
