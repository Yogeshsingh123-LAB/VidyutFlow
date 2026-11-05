/**
 * Phase 12 Distribution Transformer (DTR) Demo Data & Offline Fixtures.
 *
 * Guardrail Notice:
 * `src/data/mockData.ts` is strictly protected by SHA-256 fingerprinting
 * in tests/demo-data-integrity.test.ts. All Phase 12 static/fallback fixtures
 * are maintained in this isolated file.
 */

export interface DemoTransformerAsset {
  id: string;
  utility_asset_code: string;
  feeder_id: string;
  substation_id: string;
  zone: 'North' | 'South' | 'Central';
  rated_kva: number;
  phases: number;
  voltage_class: string;
  commissioning_date: string;
  manufacturer: string;
  serial_number: string;
  latitude: number;
  longitude: number;
  coordinate_source: string;
  status: 'IN_SERVICE' | 'MAINTENANCE' | 'FAULT' | 'RETIRED' | 'OFFLINE';
  load_utilization_pct: number;
  oil_temp_c: number;
  winding_temp_c: number;
  vibration_mms: number;
  active_alerts_count: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  prediction_horizon: '7D' | '30D';
  telemetry_status?: 'LIVE' | 'DEMO' | 'STALE' | 'OFFLINE';
  last_updated_at?: string;
  recommended_action?: string;
  explainable_risk_factors?: string[];
}

export interface DemoTransformerSensor {
  id: string;
  transformer_id: string;
  sensor_type: 'LOAD_KVA' | 'OIL_TEMP' | 'WINDING_TEMP' | 'VIBRATION' | 'CURRENT_R' | 'CURRENT_Y' | 'CURRENT_B' | 'VOLTAGE';
  unit: string;
  channel_phase: string;
  last_seen_at: string;
  source_system: 'SCADA' | 'AMI' | 'IOT' | 'SIMULATED_DEMO';
  quality_state: 'GOOD' | 'QUESTIONABLE' | 'BAD';
  active: boolean;
}

export interface DemoTransformerAlert {
  id: string;
  transformer_id: string;
  utility_asset_code: string;
  zone: string;
  alert_type: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  first_seen_at: string;
  last_seen_at: string;
  description: string;
}

export interface DemoTelemetryPoint {
  timestamp: string;
  timeLabel: string;
  load_kva: number;
  rated_kva: number;
  oil_temp_c: number;
  winding_temp_c: number;
  vibration_mms: number;
}

export const DEMO_TRANSFORMERS: DemoTransformerAsset[] = [
  {
    id: 'tr-north-01-uuid',
    utility_asset_code: 'DEMO-TR-NORTH-01',
    feeder_id: '11KV-NORTH-IND-01',
    substation_id: 'SS-MEHSANA-66KV-01',
    zone: 'North',
    rated_kva: 315.0,
    phases: 3,
    voltage_class: '11kV/415V',
    commissioning_date: '2019-04-15',
    manufacturer: 'Voltamp Transformers Ltd',
    serial_number: 'VT-2019-315-0842',
    latitude: 23.5880,
    longitude: 72.3693,
    coordinate_source: 'FIELD_GPS',
    status: 'IN_SERVICE',
    load_utilization_pct: 94.6,
    oil_temp_c: 88.5,
    winding_temp_c: 98.2,
    vibration_mms: 4.8,
    active_alerts_count: 2,
    risk_level: 'HIGH',
    prediction_horizon: '7D',
    telemetry_status: 'DEMO',
    last_updated_at: '2026-11-05T07:45:00Z',
    recommended_action: 'Urgent: Dispatch maintenance crew for thermal camera scan, load redistribution & tap adjustment.',
    explainable_risk_factors: [
      'Peak utilization at 94.6% (>90% critical threshold)',
      'Top-oil temperature 88.5°C approaching 90°C thermal runaway threshold',
      'Winding temperature 98.2°C indicates accelerated paper insulation aging'
    ]
  },
  {
    id: 'tr-north-02-uuid',
    utility_asset_code: 'DEMO-TR-NORTH-02',
    feeder_id: '11KV-NORTH-RES-02',
    substation_id: 'SS-MEHSANA-66KV-01',
    zone: 'North',
    rated_kva: 250.0,
    phases: 3,
    voltage_class: '11kV/415V',
    commissioning_date: '2022-03-10',
    manufacturer: 'Schneider Electric India',
    serial_number: 'SE-2022-250-1092',
    latitude: 23.5910,
    longitude: 72.3720,
    coordinate_source: 'FIELD_GPS',
    status: 'IN_SERVICE',
    load_utilization_pct: 48.0,
    oil_temp_c: 54.0,
    winding_temp_c: 62.5,
    vibration_mms: 1.8,
    active_alerts_count: 0,
    risk_level: 'LOW',
    prediction_horizon: '30D',
    telemetry_status: 'DEMO',
    last_updated_at: '2026-11-05T07:58:00Z',
    recommended_action: 'Nominal condition: Continue standard preventive inspection schedule (Next: 90 days).',
    explainable_risk_factors: [
      'Healthy load profile at 48% well within 70% optimal operating band',
      'Top-oil temperature 54°C shows excellent thermal margin (>26°C below warning)',
      'Vibration 1.8 mm/s indicates balanced core clamping and good mechanical health'
    ]
  },
  {
    id: 'tr-north-03-uuid',
    utility_asset_code: 'DEMO-TR-NORTH-03',
    feeder_id: '11KV-NORTH-COMM-03',
    substation_id: 'SS-MEHSANA-66KV-01',
    zone: 'North',
    rated_kva: 400.0,
    phases: 3,
    voltage_class: '11kV/415V',
    commissioning_date: '2020-11-18',
    manufacturer: 'ABB India Ltd',
    serial_number: 'ABB-2020-400-3341',
    latitude: 23.5840,
    longitude: 72.3650,
    coordinate_source: 'FIELD_GPS',
    status: 'IN_SERVICE',
    load_utilization_pct: 81.0,
    oil_temp_c: 76.0,
    winding_temp_c: 85.4,
    vibration_mms: 3.2,
    active_alerts_count: 1,
    risk_level: 'MEDIUM',
    prediction_horizon: '30D',
    telemetry_status: 'DEMO',
    last_updated_at: '2026-11-05T07:50:00Z',
    recommended_action: 'Advisory: Monitor commercial peak loads; schedule breather silica-gel and oil sample test within 14 days.',
    explainable_risk_factors: [
      'Elevated peak utilization at 81.0% crossing warning threshold (80%)',
      'Top-oil temperature 76.0°C within 4°C of 80°C threshold',
      'Load ramp velocity indicates commercial HVAC surge during afternoon peak'
    ]
  },
  {
    id: 'tr-north-04-uuid',
    utility_asset_code: 'DEMO-TR-NORTH-04',
    feeder_id: '11KV-NORTH-RURAL-04',
    substation_id: 'SS-MEHSANA-66KV-01',
    zone: 'North',
    rated_kva: 100.0,
    phases: 3,
    voltage_class: '11kV/415V',
    commissioning_date: '2018-07-22',
    manufacturer: 'Crompton Greaves Ltd',
    serial_number: 'CG-2018-100-0554',
    latitude: 23.5790,
    longitude: 72.3580,
    coordinate_source: 'GIS_PORTAL',
    status: 'OFFLINE',
    load_utilization_pct: 67.0,
    oil_temp_c: 64.0,
    winding_temp_c: 71.0,
    vibration_mms: 2.1,
    active_alerts_count: 1,
    risk_level: 'MEDIUM',
    prediction_horizon: '30D',
    telemetry_status: 'STALE',
    last_updated_at: '2026-11-04T22:15:00Z',
    recommended_action: 'Telemetry loss: Dispatch field technician to verify modem power supply, SIM connection, and RTU battery.',
    explainable_risk_factors: [
      'Telemetry heartbeat missing for over 9 hours (Last received: 04-Nov 22:15 UTC)',
      'Last recorded load was 67.0% with 64.0°C oil temperature',
      'Communication failure risk: Grid SCADA cannot verify current agricultural load state'
    ]
  },
  {
    id: 'tr-south-01-uuid',
    utility_asset_code: 'DEMO-TR-SOUTH-01',
    feeder_id: '11KV-SOUTH-AGRI-02',
    substation_id: 'SS-MEHSANA-66KV-02',
    zone: 'South',
    rated_kva: 250.0,
    phases: 3,
    voltage_class: '11kV/415V',
    commissioning_date: '2021-08-10',
    manufacturer: 'BHEL Power Grid',
    serial_number: 'BHEL-250-9941',
    latitude: 23.5700,
    longitude: 72.3800,
    coordinate_source: 'GIS_PORTAL',
    status: 'IN_SERVICE',
    load_utilization_pct: 68.2,
    oil_temp_c: 72.0,
    winding_temp_c: 81.4,
    vibration_mms: 2.4,
    active_alerts_count: 0,
    risk_level: 'LOW',
    prediction_horizon: '30D',
    telemetry_status: 'DEMO',
    last_updated_at: '2026-11-05T07:30:00Z',
    recommended_action: 'Nominal condition: Continue seasonal agricultural feeder monitoring.',
    explainable_risk_factors: [
      'Load utilization 68.2% within safe limits',
      'Oil and winding temperatures normal'
    ]
  },
  {
    id: 'tr-central-01-uuid',
    utility_asset_code: 'DEMO-TR-CENTRAL-01',
    feeder_id: '11KV-CENTRAL-COMM-01',
    substation_id: 'SS-MEHSANA-66KV-01',
    zone: 'Central',
    rated_kva: 500.0,
    phases: 3,
    voltage_class: '11kV/415V',
    commissioning_date: '2020-01-20',
    manufacturer: 'ABB India Ltd',
    serial_number: 'ABB-500-1102',
    latitude: 23.5950,
    longitude: 72.3750,
    coordinate_source: 'FIELD_GPS',
    status: 'IN_SERVICE',
    load_utilization_pct: 79.4,
    oil_temp_c: 78.6,
    winding_temp_c: 88.0,
    vibration_mms: 3.1,
    active_alerts_count: 1,
    risk_level: 'MEDIUM',
    prediction_horizon: '30D',
    telemetry_status: 'DEMO',
    last_updated_at: '2026-11-05T07:40:00Z',
    recommended_action: 'Advisory: Monitor high ambient temperatures during summer midday cycles.',
    explainable_risk_factors: [
      'Load utilization 79.4% near 80% threshold',
      'Oil temperature 78.6°C within normal summer range'
    ]
  },
];

export const DEMO_TELEMETRY_SERIES: DemoTelemetryPoint[] = [
  { timestamp: '2026-11-04T12:00:00Z', timeLabel: '12:00', load_kva: 240, rated_kva: 315, oil_temp_c: 74, winding_temp_c: 82, vibration_mms: 3.2 },
  { timestamp: '2026-11-04T13:00:00Z', timeLabel: '13:00', load_kva: 260, rated_kva: 315, oil_temp_c: 78, winding_temp_c: 86, vibration_mms: 3.5 },
  { timestamp: '2026-11-04T14:00:00Z', timeLabel: '14:00', load_kva: 285, rated_kva: 315, oil_temp_c: 82, winding_temp_c: 91, vibration_mms: 3.9 },
  { timestamp: '2026-11-04T15:00:00Z', timeLabel: '15:00', load_kva: 305, rated_kva: 315, oil_temp_c: 85, winding_temp_c: 95, vibration_mms: 4.2 },
  { timestamp: '2026-11-04T16:00:00Z', timeLabel: '16:00', load_kva: 318, rated_kva: 315, oil_temp_c: 88, winding_temp_c: 98, vibration_mms: 4.8 },
  { timestamp: '2026-11-04T17:00:00Z', timeLabel: '17:00', load_kva: 298, rated_kva: 315, oil_temp_c: 86, winding_temp_c: 96, vibration_mms: 4.4 },
];

export const DEMO_TRANSFORMER_ALERTS: DemoTransformerAlert[] = [
  {
    id: 'alt-01',
    transformer_id: 'tr-north-01-uuid',
    utility_asset_code: 'DEMO-TR-NORTH-01',
    zone: 'North',
    alert_type: 'OVERLOAD_WARNING',
    severity: 'WARN',
    status: 'ACTIVE',
    first_seen_at: '2026-11-04T15:30:00Z',
    last_seen_at: '2026-11-04T17:00:00Z',
    description: 'Load reached 318 kVA (101% of 315 kVA rated capacity). Continuous operation over 100% threshold.',
  },
  {
    id: 'alt-02',
    transformer_id: 'tr-north-01-uuid',
    utility_asset_code: 'DEMO-TR-NORTH-01',
    zone: 'North',
    alert_type: 'OIL_TEMP_HIGH',
    severity: 'WARN',
    status: 'ACTIVE',
    first_seen_at: '2026-11-04T16:15:00Z',
    last_seen_at: '2026-11-04T17:00:00Z',
    description: 'Top oil temperature reached 88.5 deg C (warning threshold 80.0 deg C).',
  },
  {
    id: 'alt-03',
    transformer_id: 'tr-north-03-uuid',
    utility_asset_code: 'DEMO-TR-NORTH-03',
    zone: 'North',
    alert_type: 'ELEVATED_COMMERCIAL_PEAK',
    severity: 'INFO',
    status: 'ACTIVE',
    first_seen_at: '2026-11-05T06:30:00Z',
    last_seen_at: '2026-11-05T07:50:00Z',
    description: 'Load utilization reached 81.0% (324 kVA of 400 kVA rated capacity) with oil temp at 76.0°C.',
  },
  {
    id: 'alt-04',
    transformer_id: 'tr-north-04-uuid',
    utility_asset_code: 'DEMO-TR-NORTH-04',
    zone: 'North',
    alert_type: 'TELEMETRY_HEARTBEAT_LOSS',
    severity: 'WARN',
    status: 'ACTIVE',
    first_seen_at: '2026-11-04T22:15:00Z',
    last_seen_at: '2026-11-05T07:45:00Z',
    description: 'Modem telemetry heartbeat missing for >9 hours. Last reported load 67 kVA (67% of 100 kVA), 64.0°C.',
  },
];

export function getTransformerTelemetrySeries(tr: DemoTransformerAsset): DemoTelemetryPoint[] {
  const rated = tr.rated_kva;
  const currentLoad = Math.round((tr.load_utilization_pct / 100) * rated);
  const currentOil = tr.oil_temp_c;
  const currentWinding = tr.winding_temp_c;
  const currentVib = tr.vibration_mms;

  return [
    {
      timestamp: '2026-11-05T02:00:00Z',
      timeLabel: '02:00',
      load_kva: Math.round(currentLoad * 0.72),
      rated_kva: rated,
      oil_temp_c: Math.round((currentOil - 8.5) * 10) / 10,
      winding_temp_c: Math.round((currentWinding - 9.0) * 10) / 10,
      vibration_mms: Math.max(1.0, Math.round((currentVib - 0.8) * 10) / 10),
    },
    {
      timestamp: '2026-11-05T04:00:00Z',
      timeLabel: '04:00',
      load_kva: Math.round(currentLoad * 0.78),
      rated_kva: rated,
      oil_temp_c: Math.round((currentOil - 6.0) * 10) / 10,
      winding_temp_c: Math.round((currentWinding - 6.5) * 10) / 10,
      vibration_mms: Math.max(1.0, Math.round((currentVib - 0.5) * 10) / 10),
    },
    {
      timestamp: '2026-11-05T06:00:00Z',
      timeLabel: '06:00',
      load_kva: Math.round(currentLoad * 0.88),
      rated_kva: rated,
      oil_temp_c: Math.round((currentOil - 3.2) * 10) / 10,
      winding_temp_c: Math.round((currentWinding - 3.5) * 10) / 10,
      vibration_mms: Math.max(1.0, Math.round((currentVib - 0.3) * 10) / 10),
    },
    {
      timestamp: '2026-11-05T07:00:00Z',
      timeLabel: '07:00',
      load_kva: Math.round(currentLoad * 0.95),
      rated_kva: rated,
      oil_temp_c: Math.round((currentOil - 1.2) * 10) / 10,
      winding_temp_c: Math.round((currentWinding - 1.5) * 10) / 10,
      vibration_mms: currentVib,
    },
    {
      timestamp: '2026-11-05T07:45:00Z',
      timeLabel: '07:45',
      load_kva: currentLoad,
      rated_kva: rated,
      oil_temp_c: currentOil,
      winding_temp_c: currentWinding,
      vibration_mms: currentVib,
    },
  ];
}

export interface InspectionChecklistItem {
  id: string;
  label: string;
  category: 'OIL_AND_TANK' | 'ELECTRICAL' | 'BREATHER_AND_SEALS' | 'SAFETY';
  status: 'PASS' | 'FAIL' | 'NEEDS_ATTENTION' | 'PENDING';
  notes?: string;
}

export const DEFAULT_INSPECTION_CHECKLIST: InspectionChecklistItem[] = [
  { id: 'chk-1', label: 'Conservator tank oil level within nominal mark', category: 'OIL_AND_TANK', status: 'PASS' },
  { id: 'chk-2', label: 'Silica gel breather color check (Blue = dry / Pink = saturated)', category: 'BREATHER_AND_SEALS', status: 'PASS' },
  { id: 'chk-3', label: 'Bushing insulators free from flashover cracks & dirt accumulation', category: 'ELECTRICAL', status: 'PASS' },
  { id: 'chk-4', label: 'Earth resistance test on neutral & body grounding (< 2.0 Ohms)', category: 'SAFETY', status: 'PASS' },
  { id: 'chk-5', label: 'Tank body weld seams and drain valves free from oil seepage', category: 'OIL_AND_TANK', status: 'PASS' },
  { id: 'chk-6', label: 'Thermographic infrared scan for terminal connection hotspots', category: 'ELECTRICAL', status: 'PASS' },
];

