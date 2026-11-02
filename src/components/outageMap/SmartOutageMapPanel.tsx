import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  Layers,
  Maximize2,
  RotateCcw,
  WifiOff,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { LanguageCode } from '../../i18n/types';
import { OUTAGE_MAP_TRANSLATIONS } from '../../i18n/outageMapTranslations';
import {
  clusterOutageMarkers,
  computeBoundsForOutages,
  resolveDisplayPoint,
  validateGeoJsonPolygon,
} from '../../outageMap/geoValidation';
import type { OutageCluster, OutageMapRecord, OutageSeverity } from '../../outageMap/types';

export interface SmartOutageMapPanelProps {
  records: OutageMapRecord[];
  selectedOutageId: string | null;
  onSelectOutage: (outageId: string) => void;
  language: LanguageCode;
  isOffline?: boolean;
  isConsumerView?: boolean;
}

const DEFAULT_NORTH_GUJARAT_CENTER: [number, number] = [23.52, 72.44];
const DEFAULT_ZOOM = 9;

function getNonColorMarkerGlyph(record: OutageMapRecord): string {
  if (record.status === 'RESOLVED_CLOSED' || record.status === 'CANCELLED_FALSE_ALARM') {
    return '✓';
  }
  if (!record.isConfirmedOutage) {
    return '?';
  }
  if (record.severity === 'CRITICAL') return '▲';
  if (record.severity === 'HIGH') return '◆';
  return '●';
}

function getMarkerPalette(
  severity: OutageSeverity | undefined,
  isResolved: boolean,
  isConfirmed: boolean,
): { bg: string; border: string; text: string } {
  if (isResolved) {
    return { bg: '#059669', border: '#a7f3d0', text: '#ffffff' };
  }
  if (!isConfirmed) {
    return { bg: '#475569', border: '#cbd5e1', text: '#ffffff' };
  }
  switch (severity) {
    case 'CRITICAL':
      return { bg: '#dc2626', border: '#fecaca', text: '#ffffff' };
    case 'HIGH':
      return { bg: '#d97706', border: '#fde68a', text: '#ffffff' };
    case 'MEDIUM':
      return { bg: '#0284c7', border: '#bae6fd', text: '#ffffff' };
    default:
      return { bg: '#2563eb', border: '#bfdbfe', text: '#ffffff' };
  }
}

export const SmartOutageMapPanel: React.FC<SmartOutageMapPanelProps> = ({
  records,
  selectedOutageId,
  onSelectOutage,
  language,
  isOffline = false,
  isConsumerView = false,
}) => {
  const t = OUTAGE_MAP_TRANSLATIONS[language] || OUTAGE_MAP_TRANSLATIONS.en;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const overlayLayerRef = useRef<L.LayerGroup | null>(null);

  const [zoomLevel, setZoomLevel] = useState<number>(DEFAULT_ZOOM);
  const [tileErrorDetected, setTileErrorDetected] = useState<boolean>(false);
  const [simulatedTileFailure, setSimulatedTileFailure] = useState<boolean>(false);

  const fallbackActive = isOffline || tileErrorDetected || simulatedTileFailure;

  const clusters: OutageCluster[] = useMemo(
    () => clusterOutageMarkers(records, zoomLevel),
    [records, zoomLevel],
  );

  // Initialize Leaflet map when external tiles are permitted and fallback is inactive
  useEffect(() => {
    if (fallbackActive) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        overlayLayerRef.current = null;
      }
      return;
    }

    const el = mapContainerRef.current;
    if (!el || mapInstanceRef.current) return;

    try {
      const map = L.map(el, {
        center: DEFAULT_NORTH_GUJARAT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: false,
        attributionControl: false,
      });

      // Strictly static tile template — zero session tokens, consumer IDs, or PII sent externally
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        minZoom: 6,
      });

      let tileErrors = 0;
      tileLayer.on('tileerror', () => {
        tileErrors += 1;
        if (tileErrors >= 2) {
          setTileErrorDetected(true);
        }
      });

      tileLayer.addTo(map);
      const layerGroup = L.layerGroup().addTo(map);

      map.on('zoomend', () => {
        setZoomLevel(map.getZoom());
      });

      mapInstanceRef.current = map;
      overlayLayerRef.current = layerGroup;
    } catch {
      setTileErrorDetected(true);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        overlayLayerRef.current = null;
      }
    };
  }, [fallbackActive]);

  // Render validated simulated polygons and cluster/outage markers onto Leaflet
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = overlayLayerRef.current;
    if (!map || !group || fallbackActive) return;

    group.clearLayers();

    // 1. Validated simulated service-area polygons
    for (const rec of records) {
      if (!rec.impactAreaGeoJSON) continue;
      const valid = validateGeoJsonPolygon(rec.impactAreaGeoJSON.geometry);
      if (!valid) continue;

      const latLngRing = valid.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number]);
      const isSelected = rec.id === selectedOutageId;
      const poly = L.polygon(latLngRing, {
        color: isSelected ? '#0284c7' : '#6366f1',
        weight: isSelected ? 2.5 : 1.5,
        dashArray: '6 4',
        fillColor: isSelected ? '#38bdf8' : '#818cf8',
        fillOpacity: isSelected ? 0.22 : 0.1,
      });
      poly.on('click', () => onSelectOutage(rec.id));
      poly.addTo(group);
    }

    // 2. Deterministic clusters & individual markers (using text-free glyph divIcons; no raw HTML injection)
    for (const cluster of clusters) {
      if (cluster.records.length > 1) {
        const containsSelected = cluster.records.some((r) => r.id === selectedOutageId);
        const palette = getMarkerPalette(cluster.highestSeverity, !cluster.hasActiveOutage, true);
        const countText = String(cluster.records.length);
        const icon = L.divIcon({
          className: 'vf-outage-cluster-icon',
          html: `<div style="width:38px;height:38px;border-radius:9999px;background:${palette.bg};border:3px solid ${
            containsSelected ? '#facc15' : palette.border
          };color:${palette.text};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;box-shadow:0 4px 12px rgba(15,23,42,0.35);">${countText}</div>`,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });
        const marker = L.marker([cluster.center.latitude, cluster.center.longitude], { icon });
        marker.on('click', () => {
          map.setView(
            [cluster.center.latitude, cluster.center.longitude],
            Math.min(14, map.getZoom() + 2),
          );
          onSelectOutage(cluster.records[0].id);
        });
        marker.addTo(group);
      } else {
        const rec = cluster.records[0];
        const isSelected = rec.id === selectedOutageId;
        const isResolved =
          rec.status === 'RESOLVED_CLOSED' || rec.status === 'CANCELLED_FALSE_ALARM';
        const palette = getMarkerPalette(rec.severity, isResolved, rec.isConfirmedOutage);
        const glyph = getNonColorMarkerGlyph(rec);
        const size = isSelected ? 36 : 30;
        const icon = L.divIcon({
          className: 'vf-outage-marker-icon',
          html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${palette.bg};border:${
            isSelected ? '3px solid #facc15' : `2px solid ${palette.border}`
          };color:${palette.text};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;box-shadow:0 3px 10px rgba(15,23,42,0.35);">${glyph}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
        const marker = L.marker([cluster.center.latitude, cluster.center.longitude], { icon });
        marker.on('click', () => onSelectOutage(rec.id));
        marker.addTo(group);
      }
    }
  }, [records, clusters, selectedOutageId, fallbackActive, onSelectOutage]);

  // Pan smoothly when selectedOutageId changes
  useEffect(() => {
    if (!selectedOutageId || fallbackActive || !mapInstanceRef.current) return;
    const target = records.find((r) => r.id === selectedOutageId);
    if (!target) return;
    const pt = resolveDisplayPoint(target);
    if (!pt) return;
    mapInstanceRef.current.panTo([pt.latitude, pt.longitude], { animate: true });
  }, [selectedOutageId, records, fallbackActive]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current && !fallbackActive) {
      mapInstanceRef.current.zoomIn();
    } else {
      setZoomLevel((z) => Math.min(16, z + 2));
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current && !fallbackActive) {
      mapInstanceRef.current.zoomOut();
    } else {
      setZoomLevel((z) => Math.max(7, z - 2));
    }
  };

  const handleFitVisible = () => {
    const bounds = computeBoundsForOutages(records);
    if (!bounds) return;
    if (mapInstanceRef.current && !fallbackActive) {
      if (bounds.minLat === bounds.maxLat && bounds.minLng === bounds.maxLng) {
        mapInstanceRef.current.setView([bounds.minLat, bounds.minLng], 13);
      } else {
        mapInstanceRef.current.fitBounds(
          [
            [bounds.minLat, bounds.minLng],
            [bounds.maxLat, bounds.maxLng],
          ],
          { padding: [36, 36], maxZoom: 13 },
        );
      }
    } else {
      setZoomLevel(13);
    }
  };

  const handleResetView = () => {
    setZoomLevel(DEFAULT_ZOOM);
    if (mapInstanceRef.current && !fallbackActive) {
      mapInstanceRef.current.setView(DEFAULT_NORTH_GUJARAT_CENTER, DEFAULT_ZOOM);
    }
  };

  // Schematic coordinate projection for North Gujarat (lat 23.05..23.95, lng 72.00..72.80)
  const projectToPercent = (lat: number, lng: number) => {
    const x = Math.min(92, Math.max(8, ((lng - 72.02) / (72.76 - 72.02)) * 84 + 8));
    const y = Math.min(90, Math.max(10, ((23.92 - lat) / (23.92 - 23.12)) * 80 + 10));
    return { x, y };
  };

  return (
    <div
      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
      data-testid="smart-outage-map-panel"
    >
      {/* Map Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
          <Compass className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden="true" />
          <span>{t.simulatedAreaBadge}</span>
          {isConsumerView && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 text-[11px]">
              <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
              {t.approximatePointBadge}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label="Zoom in outage map"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs"
          >
            <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            aria-label="Zoom out outage map"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs"
          >
            <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleFitVisible}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium"
          >
            <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.btnFitVisible}</span>
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.btnResetView}</span>
          </button>
          <button
            type="button"
            data-testid="toggle-tile-fallback-btn"
            onClick={() => {
              if (fallbackActive && !isOffline) {
                setSimulatedTileFailure(false);
                setTileErrorDetected(false);
              } else {
                setSimulatedTileFailure(true);
              }
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-xs font-medium"
          >
            <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              {fallbackActive && !isOffline ? t.btnRestoreTileMap : t.btnSimulateTileFailure}
            </span>
          </button>
        </div>
      </div>

      {/* Scenario 6: Graceful Tile Failure / Offline Schematic Fallback Notice */}
      {fallbackActive && (
        <div
          role="status"
          data-testid="map-tile-fallback-banner"
          className="flex items-start gap-2.5 px-3.5 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200"
        >
          {isOffline ? (
            <WifiOff className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
          ) : (
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
          )}
          <div>
            <p className="font-semibold">{t.tileFallbackBannerTitle}</p>
            <p className="text-amber-800 dark:text-amber-300 mt-0.5">{t.tileFallbackBannerBody}</p>
          </div>
        </div>
      )}

      {/* Map Viewport */}
      <div className="relative h-[370px] w-full bg-slate-100 dark:bg-slate-950">
        {!fallbackActive ? (
          <div
            ref={mapContainerRef}
            data-testid="leaflet-map-canvas"
            className="h-full w-full z-0"
          />
        ) : (
          /* Interactive Schematic Grid Fallback when offline or tile server fails */
          <div
            data-testid="schematic-map-fallback"
            className="relative h-full w-full overflow-hidden bg-gradient-to-br from-slate-100 via-sky-50/50 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
          >
            <svg
              className="absolute inset-0 h-full w-full pointer-events-none opacity-45"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {[20, 40, 60, 80].map((pos) => (
                <React.Fragment key={pos}>
                  <line
                    x1={pos}
                    y1={0}
                    x2={pos}
                    y2={100}
                    stroke="currentColor"
                    strokeWidth="0.2"
                    className="text-slate-400 dark:text-slate-700"
                  />
                  <line
                    x1={0}
                    y1={pos}
                    x2={100}
                    y2={pos}
                    stroke="currentColor"
                    strokeWidth="0.2"
                    className="text-slate-400 dark:text-slate-700"
                  />
                </React.Fragment>
              ))}
              {records.map((rec) => {
                if (!rec.impactAreaGeoJSON) return null;
                const valid = validateGeoJsonPolygon(rec.impactAreaGeoJSON.geometry);
                if (!valid) return null;
                const pts = valid.coordinates[0]
                  .map(([lng, lat]) => {
                    const p = projectToPercent(lat, lng);
                    return `${p.x},${p.y}`;
                  })
                  .join(' ');
                return (
                  <polygon
                    key={`poly-${rec.id}`}
                    points={pts}
                    fill={rec.id === selectedOutageId ? 'rgba(14,165,233,0.24)' : 'rgba(99,102,241,0.14)'}
                    stroke={rec.id === selectedOutageId ? '#0284c7' : '#6366f1'}
                    strokeWidth="0.5"
                    strokeDasharray="1.5 1"
                  />
                );
              })}
            </svg>

            {clusters.map((cluster) => {
              const pos = projectToPercent(cluster.center.latitude, cluster.center.longitude);
              if (cluster.records.length > 1) {
                const hasSelected = cluster.records.some((r) => r.id === selectedOutageId);
                return (
                  <button
                    key={cluster.clusterId}
                    type="button"
                    data-testid={`map-cluster-${cluster.clusterId}`}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    onClick={() => {
                      setZoomLevel((z) => Math.min(14, z + 3));
                      onSelectOutage(cluster.records[0].id);
                    }}
                    aria-label={`${t.clusterMarkerAriaPrefix} ${cluster.records.length}`}
                    className={`-translate-x-1/2 -translate-y-1/2 absolute inline-flex items-center justify-center w-9 h-9 rounded-full font-bold text-xs shadow-md transition-transform hover:scale-105 ${
                      hasSelected
                        ? 'ring-4 ring-amber-400 bg-rose-600 text-white'
                        : 'bg-indigo-600 text-white border-2 border-white'
                    }`}
                  >
                    {cluster.records.length}
                  </button>
                );
              }

              const rec = cluster.records[0];
              const isSelected = rec.id === selectedOutageId;
              const isResolved =
                rec.status === 'RESOLVED_CLOSED' || rec.status === 'CANCELLED_FALSE_ALARM';
              const glyph = getNonColorMarkerGlyph(rec);
              const statusLabel = t.statuses[rec.status];

              return (
                <button
                  key={rec.id}
                  type="button"
                  data-testid={`map-marker-${rec.id}`}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  onClick={() => onSelectOutage(rec.id)}
                  aria-pressed={isSelected}
                  aria-label={`${rec.id} — ${rec.affectedAreaLabel} — ${statusLabel}`}
                  className={`-translate-x-1/2 -translate-y-1/2 absolute inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold shadow-md transition-transform hover:scale-105 ${
                    isResolved
                      ? 'bg-emerald-600 text-white'
                      : !rec.isConfirmedOutage
                      ? 'bg-slate-600 text-white'
                      : rec.severity === 'CRITICAL'
                      ? 'bg-rose-600 text-white'
                      : rec.severity === 'HIGH'
                      ? 'bg-amber-600 text-white'
                      : 'bg-sky-600 text-white'
                  } ${isSelected ? 'ring-4 ring-amber-400 scale-110 z-20' : 'z-10'}`}
                >
                  <span aria-hidden="true">{glyph}</span>
                  <span className="max-w-[110px] truncate">{rec.subdivisionId || rec.id}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Accessible Keyboard Quick-Pin Strip (always available even over WebGL/Leaflet canvas) */}
        {records.length > 0 && !fallbackActive && (
          <div
            aria-label="Keyboard accessible map marker strip"
            className="absolute bottom-2 left-2 right-2 z-[400] flex items-center gap-1.5 overflow-x-auto py-1 px-2 rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-700 shadow"
          >
            {records.map((rec) => {
              const isSelected = rec.id === selectedOutageId;
              const glyph = getNonColorMarkerGlyph(rec);
              return (
                <button
                  key={`quick-pin-${rec.id}`}
                  type="button"
                  data-testid={`map-marker-${rec.id}`}
                  onClick={() => onSelectOutage(rec.id)}
                  aria-pressed={isSelected}
                  aria-label={`${rec.id} — ${rec.affectedAreaLabel} — ${t.statuses[rec.status]}`}
                  className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                    isSelected
                      ? 'bg-sky-600 text-white border-sky-700'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span aria-hidden="true">{glyph}</span>
                  <span>{rec.complaintId || rec.incidentId}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Non-Color-Only Legend & OpenStreetMap Attribution Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300">
        <div className="flex flex-wrap items-center gap-3">
          {!isConsumerView && (
            <>
              <span className="inline-flex items-center gap-1">
                <span className="font-bold text-rose-600 dark:text-rose-400">▲</span>
                {t.severities.CRITICAL}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="font-bold text-amber-600 dark:text-amber-400">◆</span>
                {t.severities.HIGH}
              </span>
            </>
          )}
          <span className="inline-flex items-center gap-1">
            <span className="font-bold text-sky-600 dark:text-sky-400">●</span>
            {t.confirmedOutageBadge}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="font-bold text-slate-600 dark:text-slate-400">?</span>
            {t.unverifiedReportBadge}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">✓</span>
            {t.statuses.RESOLVED_CLOSED}
          </span>
        </div>
        <span data-testid="osm-attribution-text" className="text-slate-500 dark:text-slate-400">
          {t.osmAttributionNote}
        </span>
      </div>
    </div>
  );
};
