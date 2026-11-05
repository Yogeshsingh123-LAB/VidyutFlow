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
  status: 'IN_SERVICE' | 'MAINTENANCE' | 'FAULT' | 'RETIRED';
  load_utilization_pct: number;
  oil_temp_c: number;
  winding_temp_c: number;
  vibration_mms: number;
  active_alerts_count: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  prediction_horizon: '7D' | '30D';
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
];

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

