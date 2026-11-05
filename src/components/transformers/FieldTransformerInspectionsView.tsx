import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ClipboardCheck,
  Camera,
  MapPin,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  FileCheck,
  Send,
  X,
  Plus
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  DEMO_TRANSFORMERS,
  DEFAULT_INSPECTION_CHECKLIST,
  InspectionChecklistItem,
  DemoTransformerAsset
} from '../../data/transformerDemoData';
import {
  storeInspectionPhoto,
  enqueueOfflineInspection,
  getOfflineInspections,
  syncOfflineInspections,
  OfflineInspectionRecord
} from '../../utils/transformerInspectionStore';

export const FieldTransformerInspectionsView: React.FC = () => {
  const { activeUser, showToast } = useApp();
  const { t } = useLanguage();
  const tr = t.transformers;
  const userZone = activeUser?.zone || 'North';

  // State
  const [transformers, setTransformers] = useState<DemoTransformerAsset[]>(DEMO_TRANSFORMERS);
  const [selectedTrId, setSelectedTrId] = useState<string>('tr-north-01-uuid');
  const [checklist, setChecklist] = useState<InspectionChecklistItem[]>(DEFAULT_INSPECTION_CHECKLIST);
  const [observations, setObservations] = useState('');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(4.2);
  const [photoPreviews, setPhotoPreviews] = useState<{ id: string; url: string }[]>([]);
  const [photoBlobs, setPhotoBlobs] = useState<Blob[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingQueue, setPendingQueue] = useState<OfflineInspectionRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load pending offline queue count
  const refreshQueue = useCallback(async () => {
    const q = await getOfflineInspections();
    setPendingQueue(q);
  }, []);

  useEffect(() => {
    refreshQueue();
  }, [refreshQueue]);

  // Zone-filtered transformers
  const zoneTransformers = useMemo(() => {
    return transformers.filter((t) => t.zone.toLowerCase() === userZone.toLowerCase());
  }, [transformers, userZone]);

  const activeTransformer = useMemo(() => {
    return zoneTransformers.find((t) => t.id === selectedTrId) || zoneTransformers[0];
  }, [zoneTransformers, selectedTrId]);

  // Checklist status toggle
  const toggleChecklistItem = (id: string, status: 'PASS' | 'FAIL' | 'NEEDS_ATTENTION') => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
  };

  // Capture photo & store in IndexedDB
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const photoId = `photo-${Date.now()}-${i}`;
      await storeInspectionPhoto(photoId, file);
      const url = URL.createObjectURL(file);
      setPhotoPreviews((prev) => [...prev, { id: photoId, url }]);
      setPhotoBlobs((prev) => [...prev, file]);
    }
    showToast?.('Inspection photo saved to local IndexedDB store', 'info');
  };

  // Submit Inspection (Direct or Offline Enqueue)
  const handleSubmitInspection = async () => {
    if (!activeTransformer) return;
    setIsSubmitting(true);

    const clientUuid = `insp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const checklistMap = checklist.reduce<Record<string, string>>((acc, item) => {
      acc[item.label] = item.status;
      return acc;
    }, {});

    const record: OfflineInspectionRecord = {
      client_uuid: clientUuid,
      transformer_id: activeTransformer.id,
      work_order_id: `WO-TR-${activeTransformer.utility_asset_code}-FLD`,
      checklist: checklistMap,
      observations: observations || 'Routine field inspection completed.',
      photo_refs: photoPreviews.map((p) => p.id),
      photoBlobs: photoBlobs,
      gps_accuracy: gpsAccuracy || 5.0,
      latitude: activeTransformer.latitude,
      longitude: activeTransformer.longitude,
      signature: `SIG-${activeUser?.name || 'FIELD-ENG'}-${Date.now()}`,
      review_status: 'VERIFIED',
      queued_at: new Date().toISOString(),
      status: 'PENDING',
    };

    try {
      if (isOnline) {
        // Attempt direct submission to backend
        const res = await fetch(`/api/v1/transformers/${activeTransformer.id}/inspections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            client_uuid: clientUuid,
            work_order_id: record.work_order_id,
            checklist: checklistMap,
            observations: record.observations,
            photo_refs: record.photo_refs,
            gps_accuracy: record.gps_accuracy,
            signature: record.signature,
            review_status: 'VERIFIED',
          }),
        });

        if (res.ok) {
          showToast?.(`Inspection verified for ${activeTransformer.utility_asset_code}`, 'success');
          setObservations('');
          setPhotoPreviews([]);
          setPhotoBlobs([]);
          setIsSubmitting(false);
          return;
        }
      }

      // Offline or network error: Enqueue to IndexedDB
      await enqueueOfflineInspection(record);
      await refreshQueue();
      showToast?.(`Offline: Inspection queued locally in IndexedDB (${clientUuid.slice(0, 12)}...)`, 'warning');
      setObservations('');
      setPhotoPreviews([]);
      setPhotoBlobs([]);
    } catch {
      await enqueueOfflineInspection(record);
      await refreshQueue();
      showToast?.('Network error: Inspection stored offline in IndexedDB', 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual Trigger for Syncing Offline Queue
  const handleSyncQueue = async () => {
    setIsSyncing(true);
    try {
      const result = await syncOfflineInspections();
      await refreshQueue();
      showToast?.(`Sync finished: ${result.synced} uploaded, ${result.failed} pending`, 'info');
    } catch {
      showToast?.('Sync failed: backend unreachable', 'warning');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Distribution Transformer Field Inspections
            </h1>
            <p className="text-xs text-slate-500">
              Assigned Subdivision: <strong className="text-slate-700">{userZone} Subdivision</strong> • Lineman Mobile Console
            </p>
          </div>
        </div>

        {/* Connectivity & Offline Queue Badge */}
        <div className="flex items-center gap-3">
          <div
            role="status"
            aria-live="polite"
            aria-label={isOnline ? 'Online - Ready to sync' : 'Offline mode - Queuing locally'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {isOnline ? <Wifi aria-hidden="true" className="w-3.5 h-3.5 text-emerald-600" /> : <WifiOff aria-hidden="true" className="w-3.5 h-3.5 text-amber-600" />}
            {isOnline ? 'ONLINE' : 'OFFLINE MODE'}
          </div>

          {pendingQueue.length > 0 && (
            <button
              onClick={handleSyncQueue}
              disabled={isSyncing}
              aria-label={`Sync ${pendingQueue.length} queued records`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors"
            >
              <UploadCloud aria-hidden="true" className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
              Sync ({pendingQueue.length} Queued)
            </button>
          )}
        </div>
      </div>

      {/* Target Asset Selector */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
          Select Target Transformer in {userZone} Zone
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Target Transformer selection">
          {zoneTransformers.map((transformerItem) => (
            <div
              key={transformerItem.id}
              role="radio"
              tabIndex={0}
              aria-checked={activeTransformer?.id === transformerItem.id}
              onClick={() => setSelectedTrId(transformerItem.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedTrId(transformerItem.id);
                }
              }}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                activeTransformer?.id === transformerItem.id
                  ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">{transformerItem.utility_asset_code}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {transformerItem.rated_kva} kVA
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Feeder: {transformerItem.feeder_id}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Structured Field Checklist */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Standard DTR Verification Checklist
        </h2>
        <div className="divide-y divide-slate-100">
          {checklist.map((item) => (
            <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-medium text-slate-800">{item.label}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleChecklistItem(item.id, 'PASS')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                    item.status === 'PASS'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Pass
                </button>
                <button
                  type="button"
                  onClick={() => toggleChecklistItem(item.id, 'NEEDS_ATTENTION')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                    item.status === 'NEEDS_ATTENTION'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Attention
                </button>
                <button
                  type="button"
                  onClick={() => toggleChecklistItem(item.id, 'FAIL')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                    item.status === 'FAIL'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Fail
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Observation Notes & Photo Capture */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Field Evidence & Observations
        </h2>

        <div>
          <label htmlFor="lineman-physical-notes" className="text-xs font-semibold text-slate-600 block mb-1">Lineman Physical Notes</label>
          <textarea
            id="lineman-physical-notes"
            rows={3}
            placeholder="Record oil seepage, breather silica gel state, terminal rust..."
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Camera Upload with IndexedDB Blob Store */}
        <div>
          <label htmlFor="field-photo-input" className="text-xs font-semibold text-slate-600 block mb-2">
            Inspection Photos (Persisted in IndexedDB)
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="field-photo-input" className="flex flex-col items-center justify-center w-28 h-24 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl cursor-pointer bg-slate-50 transition-colors">
              <Camera aria-hidden="true" className="w-5 h-5 text-slate-400 mb-1" />
              <span className="text-[11px] text-slate-600 font-medium">+ Add Photo</span>
              <input id="field-photo-input" type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" aria-label="Upload inspection photo" />
            </label>

            {photoPreviews.map((p, idx) => (
              <div key={p.id} className="relative w-28 h-24 rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                <img src={p.url} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => {
                    setPhotoPreviews((prev) => prev.filter((item) => item.id !== p.id));
                  }}
                  className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* GPS Stamping Info */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span>GPS Fix: {activeTransformer?.latitude.toFixed(4)}° N, {activeTransformer?.longitude.toFixed(4)}° E</span>
          </div>
          <span className="font-semibold text-emerald-700">Accuracy: ±{gpsAccuracy}m</span>
        </div>
      </div>

      {/* Submission Footer */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={handleSubmitInspection}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50"
        >
          <FileCheck className="w-4 h-4" />
          {isSubmitting ? 'Recording Inspection...' : isOnline ? 'Submit Verified Inspection' : 'Save Offline to IndexedDB'}
        </button>
      </div>
    </div>
  );
};

