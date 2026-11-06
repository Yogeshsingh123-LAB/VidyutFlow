import React, { useEffect, useState, useCallback } from 'react';
import {
  Camera,
  X,
  Gauge,
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { WorkOrder } from '../../types';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { MeterReadingWorkspace } from '../common/MeterReadingWorkspace';
import {
  getVisibleFieldQueue,
  flushOfflineFieldQueue,
  dismissFieldQueueConflict,
  type OfflineFieldQueueItem
} from '../../utils/offlineFieldSync';
import type { MeterReadingRecord } from '../../services/meterReading';

interface Props {
  workOrder: WorkOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FieldMeterReadingModal: React.FC<Props> = ({ workOrder, isOpen, onClose }) => {
  const { activeUser, isOfflineSimulated, showToast } = useApp();
  const { t } = useLanguage();
  const mp = t.meterPhase11;
  const [queueItems, setQueueItems] = useState<OfflineFieldQueueItem[]>([]);
  const [rereadRequests, setRereadRequests] = useState<MeterReadingRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshQueueAndRereads = useCallback(async () => {
    if (!isOpen || !workOrder) return;
    if (activeUser?.email) {
      const items = getVisibleFieldQueue(activeUser.email);
      setQueueItems(items);
    }
    const isOffline = isOfflineSimulated || !navigator.onLine;
    if (!isOffline) {
      try {
        const res = await fetch('/api/meter-readings', { credentials: 'same-origin' });
        if (res.ok) {
          const data = await res.json();
          const list = (data.readings || []) as MeterReadingRecord[];
          setRereadRequests(
            list.filter(r => r.consumerNo === workOrder.consumerNo && r.status === 'REREAD_REQUESTED')
          );
        }
      } catch {
        // Offline or network error
      }
    }
  }, [isOpen, workOrder, activeUser?.email, isOfflineSimulated]);

  useEffect(() => {
    void refreshQueueAndRereads();
  }, [refreshQueueAndRereads]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !workOrder) return null;

  const isOffline = isOfflineSimulated || !navigator.onLine;
  const conflictItems = queueItems.filter(item => item.sync_state === 'CONFLICT');

  const handleSyncOfflineQueue = async () => {
    if (!activeUser?.email || isOffline) return;
    setIsSyncing(true);
    try {
      const result = await flushOfflineFieldQueue({ actorEmail: activeUser.email });
      showToast(`${mp.wsSyncQueue}: ${result.syncedCount}`, 'success');
      await refreshQueueAndRereads();
    } catch {
      showToast('Queue sync failed', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDismissConflict = (clientUuid: string) => {
    if (!activeUser?.email) return;
    dismissFieldQueueConflict(clientUuid);
    setQueueItems(getVisibleFieldQueue(activeUser.email));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="field-meter-reading-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className="bg-white dark:bg-[#101C35] rounded-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-cyan-600 dark:text-cyan-400">
                  {workOrder.id}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {mp.fldModalBadge}
                </span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded ${
                  isOffline
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                }`}>
                  {isOffline ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                  <span>{isOffline ? mp.wsQueueOffline : mp.wsSyncQueue}</span>
                </span>
              </div>
              <p id="field-meter-reading-modal-title" className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {mp.fldModalTitle} · <strong>{workOrder.consumerName}</strong> ({workOrder.consumerNo}) · <strong>{workOrder.feederName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 self-end sm:self-center transition-colors cursor-pointer"
            aria-label={mp.fldCloseModal}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* WORKSPACE EMBED */}
        <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto space-y-4">
          {/* RE-READ REQUESTED ALERT BANNER */}
          {rereadRequests.length > 0 && (
            <div className="p-3.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-300 dark:border-orange-800 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-orange-900 dark:text-orange-200">
                <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                <span>{mp.fldRereadAlertTitle} ({rereadRequests.length})</span>
              </div>
              <p className="text-orange-800 dark:text-orange-300 text-[11px]">
                {mp.fldRereadAlertDesc}
              </p>
              {rereadRequests.map(req => (
                <div key={req.id} className="p-2 rounded bg-white/80 dark:bg-slate-900/60 border border-orange-200 dark:border-orange-900/50 text-[11px] flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-orange-700 dark:text-orange-300">{req.id} ({req.displayedReading} kWh)</span>
                  {req.reviewNote && <span className="text-slate-600 dark:text-slate-300">{req.reviewNote}</span>}
                </div>
              ))}
            </div>
          )}

          {/* OFFLINE QUEUE & CONFLICT RESOLUTION BAR */}
          <div className="p-3.5 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900/40 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-600 shrink-0" />
              <span className="text-cyan-950 dark:text-cyan-200 font-medium">
                {mp.fldAssignedOrderBadge}: <strong>{workOrder.consumerNo}</strong> — {mp.fldModalSubtitle}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {queueItems.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                  {queueItems.length} {mp.wsOfflineQueuedCount}
                </span>
              )}
              {queueItems.length > 0 && !isOffline && (
                <button
                  type="button"
                  onClick={() => void handleSyncOfflineQueue()}
                  disabled={isSyncing}
                  className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-700 text-white text-[11px] font-semibold flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{mp.wsSyncQueue}</span>
                </button>
              )}
            </div>
          </div>

          {conflictItems.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs space-y-2">
              {conflictItems.map(item => (
                <div key={item.client_uuid} className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-rose-700 dark:text-rose-300">{item.request_id}</span>
                    <span className="text-rose-800 dark:text-rose-200 ml-2">{item.conflict_reason}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDismissConflict(item.client_uuid)}
                    className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-semibold"
                  >
                    {t.common.close}
                  </button>
                </div>
              ))}
            </div>
          )}

          <MeterReadingWorkspace
            initialOpen={true}
            initialConnectionNo={workOrder.consumerNo}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};

