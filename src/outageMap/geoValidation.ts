import type {
  GeoJsonPolygonGeometry,
  GeoPoint,
  OutageCluster,
  OutageMapRecord,
  OutageSeverity,
  ValidatedServicePolygon,
} from './types';

/**
 * Validates finite WGS-84 coordinates and rejects NaN, Infinity, out-of-range values,
 * and (0, 0) null-island placeholders.
 */
export function isValidGeoPoint(candidate: unknown): candidate is GeoPoint {
  if (!candidate || typeof candidate !== 'object') return false;
  const { latitude, longitude } = candidate as Partial<GeoPoint>;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return false;
  if (Math.abs(latitude) < 1e-6 && Math.abs(longitude) < 1e-6) return false;
  return true;
}

export function normalizeGeoPoint(lat?: number | null, lng?: number | null): GeoPoint | undefined {
  if (typeof lat !== 'number' || typeof lng !== 'number') return undefined;
  const candidate: GeoPoint = {
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lng.toFixed(6)),
  };
  return isValidGeoPoint(candidate) ? candidate : undefined;
}

/**
 * Sanitizes text rendered in map markers, popups, and timeline entries.
 * Strips HTML tags and control characters; we never inject raw HTML strings into Leaflet popups.
 */
export function sanitizeMapText(input: unknown, maxLen = 280): string {
  if (typeof input !== 'string') return '';
  const cleaned = input
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen - 1)}…` : cleaned;
}

/**
 * Validates a GeoJSON Polygon geometry before rendering on the map:
 * - Must have `type: 'Polygon'`
 * - Each linear ring must contain >= 4 finite `[lng, lat]` pairs
 * - First and last coordinate of each ring must match (closed ring)
 * - Every `[lng, lat]` must lie within valid WGS-84 bounds
 */
export function validateGeoJsonPolygon(input: unknown): GeoJsonPolygonGeometry | null {
  if (!input || typeof input !== 'object') return null;
  const maybeFeature = input as { type?: string; geometry?: unknown; coordinates?: unknown };
  const geom =
    maybeFeature.type === 'Feature' && maybeFeature.geometry
      ? (maybeFeature.geometry as { type?: string; coordinates?: unknown })
      : maybeFeature;

  if (!geom || geom.type !== 'Polygon' || !Array.isArray(geom.coordinates)) {
    return null;
  }
  if (geom.coordinates.length === 0) return null;

  const validatedRings: number[][][] = [];
  for (const ring of geom.coordinates) {
    if (!Array.isArray(ring) || ring.length < 4) return null;
    const cleanRing: number[][] = [];
    for (const pair of ring) {
      if (!Array.isArray(pair) || pair.length < 2) return null;
      const [lng, lat] = pair;
      if (typeof lng !== 'number' || typeof lat !== 'number') return null;
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
      cleanRing.push([Number(lng.toFixed(6)), Number(lat.toFixed(6))]);
    }
    const first = cleanRing[0];
    const last = cleanRing[cleanRing.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      return null;
    }
    validatedRings.push(cleanRing);
  }

  return {
    type: 'Polygon',
    coordinates: validatedRings,
  };
}

/**
 * Coarse DEMO-only subdivision service-area centroids in North Gujarat.
 * Explicitly synthetic/illustrative per Section H (never claimed as actual UGVCL topology).
 */
export const SUBDIVISION_DEMO_CENTROIDS: Record<string, GeoPoint> = {
  'Mehsana City North': { latitude: 23.5985, longitude: 72.3895 },
  'Mehsana Industrial GIDC': { latitude: 23.5825, longitude: 72.4115 },
  'Kadi Division': { latitude: 23.2991, longitude: 72.3338 },
  'Gandhinagar Sub-Division 2': { latitude: 23.2185, longitude: 72.6412 },
  'Visnagar Division': { latitude: 23.6988, longitude: 72.5521 },
  'Patan Urban Zone': { latitude: 23.8493, longitude: 72.1266 },
  'Kalol Sub-Division': { latitude: 23.2418, longitude: 72.4926 },
};

/**
 * Simulated DEMO service polygons for canonical feeders (`isSimulated: true`).
 * Never calculates exact affected consumer counts from a guessed radius (Section C5).
 */
export const SIMULATED_FEEDER_POLYGONS: Record<string, ValidatedServicePolygon> = {
  '11kV Visnagar Road Feeder': {
    isSimulated: true,
    labelKey: 'simulatedPolygonVisnagarRoad',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [72.378, 23.592],
          [72.409, 23.592],
          [72.409, 23.612],
          [72.378, 23.612],
          [72.378, 23.592],
        ],
      ],
    },
  },
  '11kV GIDC-2 Dedicated Feeder': {
    isSimulated: true,
    labelKey: 'simulatedPolygonGidc2',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [72.401, 23.575],
          [72.424, 23.575],
          [72.424, 23.594],
          [72.401, 23.594],
          [72.401, 23.575],
        ],
      ],
    },
  },
  '11kV Kadi-Rural Ag Feeder (Jyotigram)': {
    isSimulated: true,
    labelKey: 'simulatedPolygonKadiAg',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [72.315, 23.285],
          [72.352, 23.285],
          [72.352, 23.314],
          [72.315, 23.314],
          [72.315, 23.285],
        ],
      ],
    },
  },
  '11kV Gandhinagar City-1 Feeder': {
    isSimulated: true,
    labelKey: 'simulatedPolygonGandhinagarCity1',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [72.626, 23.206],
          [72.654, 23.206],
          [72.654, 23.229],
          [72.626, 23.229],
          [72.626, 23.206],
        ],
      ],
    },
  },
  '11kV City-1 Feeder': {
    isSimulated: true,
    labelKey: 'simulatedPolygonGandhinagarCity1',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [72.626, 23.206],
          [72.654, 23.206],
          [72.654, 23.229],
          [72.626, 23.229],
          [72.626, 23.206],
        ],
      ],
    },
  },
};

const SEVERITY_RANK: Record<OutageSeverity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export function resolveDisplayPoint(record: OutageMapRecord): GeoPoint | null {
  if (record.location && isValidGeoPoint(record.location)) {
    return record.location;
  }
  if (record.publicLocation && isValidGeoPoint(record.publicLocation)) {
    return record.publicLocation;
  }
  return null;
}

/**
 * Deterministic spatial clustering for dense outage markers at lower zoom levels.
 * At zoom >= 13, each outage renders individually; at lower zooms, nearby markers
 * within `cellDegrees` group into an accessible cluster badge.
 */
export function clusterOutageMarkers(
  records: OutageMapRecord[],
  zoomLevel: number,
): OutageCluster[] {
  const mappable = records
    .map((r) => ({ record: r, point: resolveDisplayPoint(r) }))
    .filter((x): x is { record: OutageMapRecord; point: GeoPoint } => x.point !== null);

  if (mappable.length === 0) return [];

  if (zoomLevel >= 13) {
    return mappable.map(({ record, point }) => ({
      clusterId: `single-${record.id}`,
      center: point,
      records: [record],
      highestSeverity: record.severity,
      hasActiveOutage:
        record.status !== 'RESOLVED_CLOSED' && record.status !== 'CANCELLED_FALSE_ALARM',
    }));
  }

  const cellDegrees = zoomLevel <= 8 ? 0.35 : zoomLevel <= 10 ? 0.14 : 0.045;
  const buckets = new Map<string, Array<{ record: OutageMapRecord; point: GeoPoint }>>();

  for (const item of mappable) {
    const latKey = Math.floor(item.point.latitude / cellDegrees);
    const lngKey = Math.floor(item.point.longitude / cellDegrees);
    const key = `${latKey}:${lngKey}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.push(item);
    } else {
      buckets.set(key, [item]);
    }
  }

  const clusters: OutageCluster[] = [];
  for (const [key, items] of buckets.entries()) {
    const avgLat =
      items.reduce((acc, cur) => acc + cur.point.latitude, 0) / items.length;
    const avgLng =
      items.reduce((acc, cur) => acc + cur.point.longitude, 0) / items.length;

    let highest: OutageSeverity | undefined;
    for (const { record } of items) {
      if (
        record.severity &&
        (!highest || SEVERITY_RANK[record.severity] > SEVERITY_RANK[highest])
      ) {
        highest = record.severity;
      }
    }

    clusters.push({
      clusterId: items.length === 1 ? `single-${items[0].record.id}` : `cluster-${key}`,
      center: {
        latitude: Number(avgLat.toFixed(6)),
        longitude: Number(avgLng.toFixed(6)),
      },
      records: items.map((i) => i.record),
      highestSeverity: highest,
      hasActiveOutage: items.some(
        ({ record }) =>
          record.status !== 'RESOLVED_CLOSED' && record.status !== 'CANCELLED_FALSE_ALARM',
      ),
    });
  }

  return clusters;
}

export function computeBoundsForOutages(
  records: OutageMapRecord[],
): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null {
  const pts = records
    .map(resolveDisplayPoint)
    .filter((p): p is GeoPoint => p !== null);
  if (pts.length === 0) return null;

  let minLat = pts[0].latitude;
  let maxLat = pts[0].latitude;
  let minLng = pts[0].longitude;
  let maxLng = pts[0].longitude;

  for (const p of pts) {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLng) minLng = p.longitude;
    if (p.longitude > maxLng) maxLng = p.longitude;
  }
  return { minLat, maxLat, minLng, maxLng };
}
