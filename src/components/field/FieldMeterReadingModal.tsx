import React, { useEffect, useState } from 'react';
import {
  Camera,
  X,
  Gauge,
  Wifi,
  WifiOff
} from 'lucide-react';
import { WorkOrder } from '../../types';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { MeterReadingWorkspace } from '../common/MeterReadingWorkspace';
import { getVisibleFieldQueue } from '../../utils/offlineFieldSync';

interface Props {
  workOrder: WorkOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FieldMeterReadingModal: React.FC<Props> = ({ workOrder, isOpen, onClose }) => {
  const { activeUser, isOfflineSimulated } = useApp();
  const { t } = useLanguage();
  const mp = t.meterPhase11;
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  useEffect(() => {
    if (isOpen && activeUser?.email) {
      const items = getVisibleFieldQueue(activeUser.email);
      setOfflineQueueCount(items.length);
    }
  }, [isOpen, activeUser?.email]);

  if (!isOpen || !workOrder) return null;

  const isOffline = isOfflineSimulated || !navigator.onLine;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
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
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
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
          <div className="p-3.5 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900/40 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-600 shrink-0" />
              <span className="text-cyan-950 dark:text-cyan-200 font-medium">
                {mp.fldAssignedOrderBadge}: <strong>{workOrder.consumerNo}</strong> — {mp.fldModalSubtitle}
              </span>
            </div>
            {offlineQueueCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                {offlineQueueCount} {mp.wsOfflineQueuedCount}
              </span>
            )}
          </div>

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
