import React, { useState } from 'react';
import {
  Zap,
  Activity,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Info,
  ShieldAlert,
  Flame,
  SunMedium,
  Wrench,
  Sliders,
  Radio,
  Cpu,
  Layers,
  ChevronRight,
  TrendingUp
} from 'lucide-react';

export type GridScenario =
  | 'normal'
  | 'peak'
  | 'overload'
  | 'outage'
  | 'solar'
  | 'maintenance';

interface EquipmentDetail {
  id: string;
  name: string;
  type: 'substation' | 'feeder' | 'transformer' | 'consumer' | 'solar';
  voltage: string;
  currentAmps: number;
  ratedCapacityAmps: number;
  utilizationPct: number;
  temperatureC?: number;
  frequencyHz: number;
  powerFactor: number;
  status: 'healthy' | 'warning' | 'critical' | 'isolated' | 'maintenance';
  protectionRelay: string;
  notes: string;
}

export const SmartGridDigitalTwin: React.FC = () => {
  const [activeScenario, setActiveScenario] = useState<GridScenario>('normal');
  const [selectedNode, setSelectedNode] = useState<EquipmentDetail | null>(null);

  // Scenario telemetry configurations
  const scenarioData: Record<
    GridScenario,
    {
      title: string;
      badge: string;
      description: string;
      recommendation: string;
      gridFrequency: number;
      systemLoadMw: number;
      feederLoadAmps: number;
      dtrTemp: number;
      voltageLevel: number;
      powerFactor: number;
    }
  > = {
    normal: {
      title: 'Normal Grid Balance (Standard Supply)',
      badge: 'Balanced · 50.02 Hz',
      description:
        'All three 11kV primary feeders operating within 68% rated capacity. System voltages steady at 230V / 415V with power factor 0.96.',
      recommendation:
        'All automated reclosers armed. Optimal distribution state with zero active feeder alarms.',
      gridFrequency: 50.02,
      systemLoadMw: 48.6,
      feederLoadAmps: 248,
      dtrTemp: 52,
      voltageLevel: 231,
      powerFactor: 0.96
    },
    peak: {
      title: 'Evening Peak Demand Surge (19:00 - 22:00)',
      badge: 'High Load · 49.88 Hz',
      description:
        'Residential cooling and domestic lighting surge increases aggregate Mehsana load by 38%. Feeder-1 utilization hits 94%.',
      recommendation:
        'Engaged capacitor bank stage 2. Load dispatch center monitoring reserve margin.',
      gridFrequency: 49.88,
      systemLoadMw: 67.2,
      feederLoadAmps: 372,
      dtrTemp: 74,
      voltageLevel: 224,
      powerFactor: 0.92
    },
    overload: {
      title: 'Distribution Transformer Thermal Overload (DTR-08)',
      badge: 'Thermal Alarm · 88°C',
      description:
        'DTR-08 (Agricultural Tubewell Cluster) exceeded rated 100kVA capacity due to synchronized motor start. Winding temp at 88°C.',
      recommendation:
        'Automatic SCADA alert dispatched to Lineman Vikramaditya Solanki. Auto-staggering agricultural pump feeders.',
      gridFrequency: 49.92,
      systemLoadMw: 61.4,
      feederLoadAmps: 310,
      dtrTemp: 88,
      voltageLevel: 218,
      powerFactor: 0.88
    },
    outage: {
      title: '11kV Feeder Tripped / Tree Branch Fault',
      badge: 'VCB Tripped · Auto-Isolated',
      description:
        'Vacuum Circuit Breaker VCB-03 tripped on overcurrent at 11kV Visnagar Road Feeder due to conductor short. 1,420 consumers affected.',
      recommendation:
        'Automated Ring Main Unit (RMU) isolated faulted section DP-14. Re-routing un-faulted segments via Radhanpur Tie-Switch.',
      gridFrequency: 50.08,
      systemLoadMw: 36.1,
      feederLoadAmps: 0,
      dtrTemp: 44,
      voltageLevel: 0,
      powerFactor: 0.98
    },
    solar: {
      title: 'Distributed Rooftop Solar Reverse-Feed Surge',
      badge: 'Midday Solar · Reverse Flow',
      description:
        'Midday clear sky at 13:00 generates 4.8 MW surplus solar feed-in from residential & agricultural grid-tied inverters. Local voltage spikes.',
      recommendation:
        'Substation On-Load Tap Changer (OLTC) stepped down 1 tap (-1.25%) to maintain 230V statutory boundary.',
      gridFrequency: 50.14,
      systemLoadMw: 29.3,
      feederLoadAmps: 180,
      dtrTemp: 48,
      voltageLevel: 242,
      powerFactor: 0.99
    },
    maintenance: {
      title: 'Permit-to-Work (PTW) Scheduled Maintenance',
      badge: 'Safe Isolation · Earthing Closed',
      description:
        'Planned feeder reconductoring and DT bushing replacement on Feeder-2. Lineman team active with certified earth grounding.',
      recommendation:
        'Permit-to-Work PTW-8819 logged in ERP. Consumer outage notifications broadcasted via SMS simulation.',
      gridFrequency: 50.01,
      systemLoadMw: 41.5,
      feederLoadAmps: 110,
      dtrTemp: 40,
      voltageLevel: 230,
      powerFactor: 0.95
    }
  };

  const current = scenarioData[activeScenario];

  // Equipment library data
  const equipmentCatalog: Record<string, EquipmentDetail> = {
    substation: {
      id: 'SS-MEH-66/11',
      name: 'Mehsana City North 66/11kV Substation',
      type: 'substation',
      voltage: '66kV Incoming / 11kV Busbar',
      currentAmps: current.feederLoadAmps,
      ratedCapacityAmps: 450,
      utilizationPct: Math.round((current.feederLoadAmps / 450) * 100),
      temperatureC: current.dtrTemp - 12,
      frequencyHz: current.gridFrequency,
      powerFactor: current.powerFactor,
      status: activeScenario === 'overload' ? 'warning' : 'healthy',
      protectionRelay: 'Differential 87T & Overcurrent 50/51 Numerical Relay',
      notes: 'Dual 15 MVA Power Transformers stepping down GETCO 66kV transmission grid.'
    },
    feeder1: {
      id: 'FDR-11K-01',
      name: '11kV Visnagar Road Feeder',
      type: 'feeder',
      voltage: activeScenario === 'outage' ? '0 kV (De-energized)' : '11.0 kV',
      currentAmps: activeScenario === 'outage' ? 0 : Math.round(current.feederLoadAmps * 0.45),
      ratedCapacityAmps: 200,
      utilizationPct: activeScenario === 'outage' ? 0 : Math.round(((current.feederLoadAmps * 0.45) / 200) * 100),
      frequencyHz: current.gridFrequency,
      powerFactor: current.powerFactor,
      status: activeScenario === 'outage' ? 'critical' : activeScenario === 'peak' ? 'warning' : 'healthy',
      protectionRelay: 'ABB REF615 Feeder Protection & Automation Unit',
      notes: 'Supplies 1,420 consumers across residential societies and commercial markets.'
    },
    feeder2: {
      id: 'FDR-11K-02',
      name: '11kV GIDC Industrial Express Feeder',
      type: 'feeder',
      voltage: activeScenario === 'maintenance' ? '0 kV (Isolated)' : '11.1 kV',
      currentAmps: activeScenario === 'maintenance' ? 0 : Math.round(current.feederLoadAmps * 0.35),
      ratedCapacityAmps: 250,
      utilizationPct: activeScenario === 'maintenance' ? 0 : Math.round(((current.feederLoadAmps * 0.35) / 250) * 100),
      frequencyHz: current.gridFrequency,
      powerFactor: 0.94,
      status: activeScenario === 'maintenance' ? 'maintenance' : 'healthy',
      protectionRelay: 'Schneider Micom P122 Numerical Relay',
      notes: 'Dedicated 3-phase feeder serving MSME fabrication and plastic manufacturing units.'
    },
    dtr08: {
      id: 'DTR-11/0.4-08',
      name: '100kVA Distribution Transformer (Agri Cluster)',
      type: 'transformer',
      voltage: activeScenario === 'outage' ? '0V' : `${current.voltageLevel}V (LT Phase)`,
      currentAmps: activeScenario === 'overload' ? 148 : 82,
      ratedCapacityAmps: 139,
      utilizationPct: activeScenario === 'overload' ? 106 : 59,
      temperatureC: current.dtrTemp,
      frequencyHz: current.gridFrequency,
      powerFactor: activeScenario === 'overload' ? 0.84 : 0.91,
      status: activeScenario === 'overload' ? 'critical' : 'healthy',
      protectionRelay: 'Horn Gap (HG) Fuse 15A & Thermal Sensor Link',
      notes: 'Powers 18 agricultural irrigation tubewells. High reactive load during synchronized pump duty.'
    },
    solarUnit: {
      id: 'SOLAR-GRID-04',
      name: '150kWp Rooftop Solar Micro-Generator',
      type: 'solar',
      voltage: `${current.voltageLevel}V AC Output`,
      currentAmps: activeScenario === 'solar' ? 210 : 65,
      ratedCapacityAmps: 220,
      utilizationPct: activeScenario === 'solar' ? 95 : 30,
      frequencyHz: current.gridFrequency,
      powerFactor: 0.99,
      status: 'healthy',
      protectionRelay: 'Anti-Islanding Protection (IEEE 1547 compliant)',
      notes: 'Surplus power fed back into UGVCL grid under Gujarat Net-Metering Policy.'
    }
  };

  const handleSelectEquipment = (key: string) => {
    if (equipmentCatalog[key]) {
      setSelectedNode(equipmentCatalog[key]);
    }
  };

  // Color mapping based on scenario
  const getWireStroke = (line: 'feeder1' | 'feeder2' | 'agri' | 'solar') => {
    if (line === 'feeder1' && activeScenario === 'outage') return '#EF4444'; // Red fault
    if (line === 'feeder2' && activeScenario === 'maintenance') return '#F59E0B'; // Amber maintenance
    if (line === 'agri' && activeScenario === 'overload') return '#F97316'; // Orange overload
    if (line === 'solar' && activeScenario === 'solar') return '#0D9488'; // Teal solar influx
    if (activeScenario === 'peak') return '#38BDF8'; // High electric blue
    return '#3B82F6'; // Standard blue
  };

  return (
    <div className="space-y-6">
      {/* Simulation Scenario Toolbar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                UGVCL Smart Grid Digital Twin & SCADA Simulator
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Interactive 66kV/11kV/415V distribution network. Select operational scenarios to evaluate real-time grid behavior, voltage stability, and automated protection protocols.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveScenario('normal')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
              title="Reset to normal baseline operation"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-500" />
              <span>Reset Grid</span>
            </button>
          </div>
        </div>

        {/* 6 Scenario Selector Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {(
            [
              { key: 'normal', label: '1. Normal Balance', icon: CheckCircle2, activeColor: 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' },
              { key: 'peak', label: '2. Peak Surge', icon: TrendingUp, activeColor: 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300' },
              { key: 'overload', label: '3. Transformer Overload', icon: Flame, activeColor: 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' },
              { key: 'outage', label: '4. Feeder Trip Outage', icon: ShieldAlert, activeColor: 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300' },
              { key: 'solar', label: '5. Solar Reverse Flow', icon: SunMedium, activeColor: 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300' },
              { key: 'maintenance', label: '6. Maintenance PTW', icon: Wrench, activeColor: 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' }
            ] as const
          ).map(s => {
            const Icon = s.icon;
            const isActive = activeScenario === s.key;
            return (
              <button
                key={s.key}
                onClick={() => {
                  setActiveScenario(s.key);
                  setSelectedNode(null);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                  isActive
                    ? s.activeColor + ' shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-inherit' : 'text-slate-400'}`} />
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                </div>
                <span className="text-xs font-semibold leading-tight line-clamp-2">
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Scenario Status Banner */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 dark:text-white">
                Scenario: {current.title}
              </span>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                {current.badge}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px]">
              {current.description}
            </p>
          </div>
          <div className="shrink-0 sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-slate-800 sm:border-l sm:pl-4">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Automated Response
            </span>
            <span className="font-medium text-slate-800 dark:text-slate-200 text-[11px]">
              {current.recommendation}
            </span>
          </div>
        </div>
      </div>

      {/* Grid Canvas + Telemetry Metrics Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left 2 Cols: Interactive SVG Power Flow Canvas */}
        <div className="lg:col-span-2 rounded-2xl bg-[#0B1120] border border-slate-800 p-4 sm:p-6 text-white relative overflow-hidden shadow-xl flex flex-col justify-between">
          {/* Canvas Subtitle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 z-10 mb-2">
            <div className="flex items-center gap-2 text-xs">
              <Radio className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
              <span className="font-semibold text-slate-300">
                Live Single-Line Electrical Topology (Click equipment to inspect)
              </span>
            </div>
            <span className="self-start sm:self-auto text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40 shrink-0">
              {current.gridFrequency.toFixed(2)} Hz · {current.systemLoadMw} MW
            </span>
          </div>

          {/* High-Resolution SVG Grid Architecture */}
          <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] flex items-center justify-center">
            <svg
              className="w-full h-full select-none"
              viewBox="0 0 850 480"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <filter id="twinGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* BACKGROUND SUBTLE GRID MATRIX */}
              <g opacity="0.08">
                {Array.from({ length: 17 }).map((_, i) => (
                  <line key={`v-${i}`} x1={i * 50} y1="0" x2={i * 50} y2="480" stroke="#38BDF8" strokeWidth="1" />
                ))}
                {Array.from({ length: 10 }).map((_, i) => (
                  <line key={`h-${i}`} x1="0" y1={i * 50} x2="850" y2={i * 50} stroke="#38BDF8" strokeWidth="1" />
                ))}
              </g>

              {/* 1. TRANSMISSION INCOMING BUS (66kV GETCO Grid -> Substation) */}
              <path
                d="M 50 160 L 160 160"
                stroke="#64748B"
                strokeWidth="3"
                strokeDasharray="4 2"
              />
              <text x="60" y="145" fill="#94A3B8" fontSize="10" fontWeight="bold">
                66kV Grid (GETCO)
              </text>

              {/* 2. SUBSTATION POWER TRANSFORMER & 11kV BUSBAR (Clickable) */}
              <g
                onClick={() => handleSelectEquipment('substation')}
                className="cursor-pointer group"
                transform="translate(170, 110)"
              >
                <rect
                  x="0"
                  y="0"
                  width="130"
                  height="100"
                  rx="10"
                  fill="#101C35"
                  stroke={activeScenario === 'overload' ? '#F59E0B' : '#38BDF8'}
                  strokeWidth="2"
                  filter="url(#twinGlow)"
                  className="transition-all group-hover:stroke-cyan-300"
                />
                {/* Dual Transformer Coils */}
                <circle cx="45" cy="45" r="20" fill="none" stroke="#60A5FA" strokeWidth="2.5" />
                <circle cx="85" cy="45" r="20" fill="none" stroke="#38BDF8" strokeWidth="2.5" />
                <text x="65" y="49" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold">
                  66/11kV
                </text>
                <text x="65" y="85" textAnchor="middle" fill="#94A3B8" fontSize="9" fontWeight="600">
                  Mehsana North SS
                </text>
              </g>

              {/* 11kV Busbar Trunk Line */}
              <line x1="330" y1="60" x2="330" y2="420" stroke="#38BDF8" strokeWidth="4" />
              <text x="338" y="75" fill="#38BDF8" fontSize="10" fontWeight="bold">
                11kV Substation Busbar (248A)
              </text>

              {/* 3. FEEDER 1: 11kV Visnagar Road Feeder (Top Branch) */}
              <path
                d="M 330 110 L 460 110"
                stroke={getWireStroke('feeder1')}
                strokeWidth={activeScenario === 'outage' ? '2' : '3'}
                strokeDasharray={activeScenario === 'outage' ? '6 4' : '8 6'}
                className={activeScenario !== 'outage' ? 'animate-pulse' : ''}
              />
              <g
                onClick={() => handleSelectEquipment('feeder1')}
                className="cursor-pointer group"
                transform="translate(470, 75)"
              >
                <rect
                  x="0"
                  y="0"
                  width="150"
                  height="70"
                  rx="8"
                  fill="#101C35"
                  stroke={getWireStroke('feeder1')}
                  strokeWidth="1.5"
                  className="group-hover:stroke-white transition-all"
                />
                <text x="12" y="24" fill="#FFFFFF" fontSize="11" fontWeight="bold">
                  Feeder-1 (Visnagar Rd)
                </text>
                <text x="12" y="42" fill="#94A3B8" fontSize="9">
                  Residential & Commercial
                </text>
                <text
                  x="12"
                  y="58"
                  fill={activeScenario === 'outage' ? '#EF4444' : '#38BDF8'}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {activeScenario === 'outage' ? 'TRIPPED · 0 Amps' : '11kV · 168 Amps'}
                </text>
              </g>

              {/* Connected Consumer Node: Residential Smart Meters */}
              <path
                d="M 620 110 L 710 110"
                stroke={getWireStroke('feeder1')}
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              <g transform="translate(710, 85)" className="cursor-pointer">
                <rect x="0" y="0" width="110" height="50" rx="6" fill="#131D31" stroke="#334155" strokeWidth="1" />
                <text x="10" y="22" fill="#38BDF8" fontSize="10" fontWeight="bold">
                  Urban Consumers
                </text>
                <text x="10" y="38" fill="#94A3B8" fontSize="8" fontFamily="monospace">
                  {activeScenario === 'outage' ? 'Outage: 1,420 HH' : '1,420 Smart Meters'}
                </text>
              </g>

              {/* 4. FEEDER 2: 11kV GIDC Industrial Express (Middle Branch) */}
              <path
                d="M 330 240 L 460 240"
                stroke={getWireStroke('feeder2')}
                strokeWidth="3"
                strokeDasharray={activeScenario === 'maintenance' ? '4 4' : '8 6'}
              />
              <g
                onClick={() => handleSelectEquipment('feeder2')}
                className="cursor-pointer group"
                transform="translate(470, 205)"
              >
                <rect
                  x="0"
                  y="0"
                  width="150"
                  height="70"
                  rx="8"
                  fill="#101C35"
                  stroke={getWireStroke('feeder2')}
                  strokeWidth="1.5"
                  className="group-hover:stroke-white transition-all"
                />
                <text x="12" y="24" fill="#FFFFFF" fontSize="11" fontWeight="bold">
                  Feeder-2 (GIDC Express)
                </text>
                <text x="12" y="42" fill="#94A3B8" fontSize="9">
                  Industrial HT/LT Demand
                </text>
                <text
                  x="12"
                  y="58"
                  fill={activeScenario === 'maintenance' ? '#F59E0B' : '#0D9488'}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {activeScenario === 'maintenance' ? 'PTW ISOLATED' : '11kV · 142 Amps'}
                </text>
              </g>

              {/* Industrial Plant Load Node */}
              <path
                d="M 620 240 L 710 240"
                stroke={getWireStroke('feeder2')}
                strokeWidth="2"
              />
              <g transform="translate(710, 215)">
                <rect x="0" y="0" width="110" height="50" rx="6" fill="#131D31" stroke="#334155" strokeWidth="1" />
                <text x="10" y="22" fill="#0D9488" fontSize="10" fontWeight="bold">
                  GIDC MSME Units
                </text>
                <text x="10" y="38" fill="#94A3B8" fontSize="8" fontFamily="monospace">
                  48 Industrial Units
                </text>
              </g>

              {/* 5. FEEDER 3: 11kV Unjha Agricultural Feeder (Bottom Branch) */}
              <path
                d="M 330 370 L 460 370"
                stroke={getWireStroke('agri')}
                strokeWidth="3"
                strokeDasharray="8 6"
              />
              <g
                onClick={() => handleSelectEquipment('dtr08')}
                className="cursor-pointer group"
                transform="translate(470, 335)"
              >
                <rect
                  x="0"
                  y="0"
                  width="150"
                  height="70"
                  rx="8"
                  fill="#101C35"
                  stroke={activeScenario === 'overload' ? '#F97316' : '#38BDF8'}
                  strokeWidth="1.5"
                  className="group-hover:stroke-white transition-all"
                />
                <text x="12" y="24" fill="#FFFFFF" fontSize="11" fontWeight="bold">
                  DTR-08 (100kVA Transformer)
                </text>
                <text x="12" y="42" fill="#94A3B8" fontSize="9">
                  Unjha Ag Tubewell Cluster
                </text>
                <text
                  x="12"
                  y="58"
                  fill={activeScenario === 'overload' ? '#F97316' : '#10B981'}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {activeScenario === 'overload' ? '106% LOAD · 88°C ALARM' : '415V · 82 Amps · 52°C'}
                </text>
              </g>

              {/* Agricultural Borewell Cluster */}
              <path
                d="M 620 370 L 710 370"
                stroke={getWireStroke('agri')}
                strokeWidth="2"
              />
              <g transform="translate(710, 345)">
                <rect x="0" y="0" width="110" height="50" rx="6" fill="#131D31" stroke="#334155" strokeWidth="1" />
                <text x="10" y="22" fill="#F59E0B" fontSize="10" fontWeight="bold">
                  Agri Tubewells
                </text>
                <text x="10" y="38" fill="#94A3B8" fontSize="8" fontFamily="monospace">
                  18 Submersible Pumps
                </text>
              </g>

              {/* 6. SOLAR ROOFTOP GENERATION REVERSE FEED (Top Right Influx) */}
              <g
                onClick={() => handleSelectEquipment('solarUnit')}
                className="cursor-pointer group"
                transform="translate(470, 5)"
              >
                <rect
                  x="0"
                  y="0"
                  width="150"
                  height="50"
                  rx="6"
                  fill="#0D2825"
                  stroke={activeScenario === 'solar' ? '#14B8A6' : '#0D9488'}
                  strokeWidth="1"
                  className="group-hover:stroke-cyan-300 transition-all"
                />
                <text x="10" y="20" fill="#2DD4BF" fontSize="10" fontWeight="bold">
                  Solar Micro-Gen (150kWp)
                </text>
                <text x="10" y="36" fill="#94A3B8" fontSize="8" fontFamily="monospace">
                  {activeScenario === 'solar' ? 'Surplus Export: +180A' : 'Midday Feed: 65A'}
                </text>
              </g>
              <path
                d="M 470 30 L 400 30 L 400 110"
                stroke={getWireStroke('solar')}
                strokeWidth="2"
                strokeDasharray="6 4"
                opacity="0.8"
              />
            </svg>
          </div>

          {/* Bottom Interactive Legend */}
          <div className="z-10 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-1 bg-blue-500 rounded-sm" /> 11kV Active Feeder
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-1 bg-teal-500 rounded-sm" /> Distributed Solar
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-1 bg-rose-500 rounded-sm" /> Tripped / Isolated
              </span>
            </div>
            <span className="italic text-slate-500">
              Click any substation, feeder, or transformer node for technical diagnostic inspection
            </span>
          </div>
        </div>

        {/* Right Col: Live SCADA Telemetry & Equipment Inspection Panel */}
        <div className="rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-500" />
                  <span>SCADA Diagnostic Telemetry</span>
                </h4>
                <span className="text-[11px] text-slate-400">
                  Real-time simulated telemetry feeds
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                RTU-14 Sync
              </span>
            </div>

            {/* Live Parameter Matrix */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                  Grid Frequency
                </span>
                <span className="font-mono text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                  {current.gridFrequency.toFixed(2)} Hz
                </span>
                <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">
                  IEGC Band: 49.90 - 50.05
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                  System Load
                </span>
                <span className="font-mono text-lg font-bold text-blue-600 dark:text-cyan-400 tabular-nums">
                  {current.systemLoadMw} MW
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Max Peak: 72.0 MW
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                  Phase Voltage (LT)
                </span>
                <span className={`font-mono text-lg font-bold tabular-nums ${
                  current.voltageLevel === 0
                    ? 'text-rose-600'
                    : current.voltageLevel > 240
                    ? 'text-amber-500'
                    : 'text-slate-900 dark:text-white'
                }`}>
                  {current.voltageLevel} V
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Standard: 230V ± 6%
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                  Transformer Temp
                </span>
                <span className={`font-mono text-lg font-bold tabular-nums ${
                  current.dtrTemp > 80
                    ? 'text-rose-600'
                    : current.dtrTemp > 70
                    ? 'text-amber-500'
                    : 'text-emerald-600'
                }`}>
                  {current.dtrTemp}°C
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Trip Threshold: 95°C
                </span>
              </div>
            </div>

            {/* Clicked Equipment Inspection Drawer */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {selectedNode ? selectedNode.name : 'Equipment Inspection'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {selectedNode ? selectedNode.id : 'Click a Node'}
                </span>
              </div>

              {selectedNode ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-800 pb-1">
                    <span className="text-slate-500">Operating Voltage:</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">{selectedNode.voltage}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-800 pb-1">
                    <span className="text-slate-500">Current / Capacity:</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {selectedNode.currentAmps}A / {selectedNode.ratedCapacityAmps}A ({selectedNode.utilizationPct}%)
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-800 pb-1">
                    <span className="text-slate-500">Protection Relay:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] truncate max-w-[160px]">
                      {selectedNode.protectionRelay}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1">
                    {selectedNode.notes}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 leading-relaxed py-2">
                  Select any substation transformer, 11kV feeder branch, or distribution node in the diagram to inspect relay protections, rated conductor amperages, and real-time load headroom.
                </p>
              )}
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
            <strong>Protocol:</strong> IEC 61850 substation automation standard & DNP3 telemetry simulation.
          </div>
        </div>
      </div>
    </div>
  );
};
