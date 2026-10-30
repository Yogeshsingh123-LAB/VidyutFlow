import React, { useCallback, useState } from 'react';
import { AlertTriangle, CheckCircle2, Layers, RefreshCw, RotateCw, Send } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { getAdminUiDictionary } from '../../i18n/adminContentTranslations';
import {
  CANONICAL_ERP_FIELD_MAPPINGS,
  ErpSyncLogItem,
  fetchErpMappings,
  fetchErpSyncLogs,
  fetchLiveRequests,
  retryLiveErpSyncLog,
  triggerLiveErpSync,
  useLivePoll,
} from '../../utils/liveData';

const SANDBOX_FALLBACK_LOGS: ErpSyncLogItem[] = [
  {
    id: 'sim-erp-log-02',
    request_id: 'APP-2026-0845',
    applicant_name: 'Patel Kirana Store',
    zone: 'North',
    request_status: 'ASSIGNED',
    event_type: 'SANCTION_PRECHECK',
    status: 'FAILED',
    attempt_count: 1,
    erp_reference_id: '',
    mapped_payload: {
      EXT_SERVICE_ORDER_ID: 'APP-2026-0845',
      DISCOM_CIRCLE_CODE: 'UGVCL-CIR-N01',
      ISU_RATE_CATEGORY: 'LT_COM_NRGP',
    },
    error_message:
      'Simulated ERP gateway timeout (HTTP 503) — queued in failed-sync log for operator retry',
    last_attempt_at: '2026-10-30T09:15:00Z',
    synced_at: null,
    created_at: '2026-10-30T09:15:00Z',
    is_simulated: true,
  },
  {
    id: 'sim-erp-log-01',
    request_id: 'APP-2026-0842',
    applicant_name: 'Smt. Meenaben Patel',
    zone: 'North',
    request_status: 'APPROVED',
    event_type: 'SANCTION_APPROVED',
    status: 'SYNCED',
    attempt_count: 1,
    erp_reference_id: 'SIM-ERP-N01-APP20260-1',
    mapped_payload: {
      EXT_SERVICE_ORDER_ID: 'APP-2026-0842',
      DISCOM_CIRCLE_CODE: 'UGVCL-CIR-N01',
      ISU_RATE_CATEGORY: 'LT_DOM_RGPU',
    },
    error_message: '',
    last_attempt_at: '2026-10-30T08:40:00Z',
    synced_at: '2026-10-30T08:40:00Z',
    created_at: '2026-10-30T08:40:00Z',
    is_simulated: true,
  },
];

export const LiveErpAdapterPanel: React.FC = () => {
  const { showToast } = useApp();
  const { language } = useLanguage();
  const ad = getAdminUiDictionary(language);

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FAILED' | 'SYNCED'>('ALL');
  const [selectedRequestId, setSelectedRequestId] = useState<string>('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [meterInputs, setMeterInputs] = useState<Record<string, string>>({});
  const [sandboxLogs, setSandboxLogs] = useState<ErpSyncLogItem[]>(SANDBOX_FALLBACK_LOGS);

  const mappingsRes = useLivePoll(fetchErpMappings);
  const fetchAllLogs = useCallback(() => fetchErpSyncLogs('ALL'), []);
  const logsRes = useLivePoll(fetchAllLogs);
  const requestsRes = useLivePoll(fetchLiveRequests);

  const isLiveBackend = logsRes.data !== null;
  const mappings = mappingsRes.data?.mappings || CANONICAL_ERP_FIELD_MAPPINGS;
  const allLogs = isLiveBackend ? logsRes.data!.items : sandboxLogs;

  const syncedCount = isLiveBackend
    ? logsRes.data!.summary.synced
    : sandboxLogs.filter((x) => x.status === 'SYNCED').length;
  const failedCount = isLiveBackend
    ? logsRes.data!.summary.failed_queue
    : sandboxLogs.filter((x) => x.status === 'FAILED').length;

  const visibleLogs =
    statusFilter === 'ALL' ? allLogs : allLogs.filter((item) => item.status === statusFilter);

  const liveRequests = requestsRes.data || [];
  const effectiveRequestId = selectedRequestId || liveRequests[0]?.id || '';

  const handleManualSync = async (simulateFailure: boolean) => {
    if (isLiveBackend && effectiveRequestId) {
      setBusyId(simulateFailure ? 'sim-fail' : 'sync');
      try {
        const created = await triggerLiveErpSync(effectiveRequestId, simulateFailure);
        logsRes.refresh();
        showToast(
          created.status === 'SYNCED'
            ? `ERP sync succeeded (${created.erp_reference_id})`
            : `ERP handoff queued in Failed Queue (${created.error_message})`,
          created.status === 'SYNCED' ? 'success' : 'warning'
        );
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'ERP sync failed', 'error');
      } finally {
        setBusyId(null);
      }
      return;
    }

    // Client sandbox fallback
    const idSuffix = String(sandboxLogs.length + 1).padStart(2, '0');
    const nowIso = new Date().toISOString();
    const newRow: ErpSyncLogItem = {
      id: `sim-erp-log-${idSuffix}`,
      request_id: `APP-2026-08${40 + sandboxLogs.length}`,
      applicant_name: simulateFailure ? 'Shakti Textiles Unit 2' : 'Demo Consumer',
      zone: 'North',
      request_status: 'APPROVED',
      event_type: 'MANUAL_SYNC',
      status: simulateFailure ? 'FAILED' : 'SYNCED',
      attempt_count: 1,
      erp_reference_id: simulateFailure ? '' : `SIM-ERP-N01-MANUAL-${idSuffix}`,
      mapped_payload: { _adapter_simulated: true },
      error_message: simulateFailure
        ? 'Simulated ERP gateway timeout (HTTP 503) — queued in failed-sync log for operator retry'
        : '',
      last_attempt_at: nowIso,
      synced_at: simulateFailure ? null : nowIso,
      created_at: nowIso,
      is_simulated: true,
    };
    setSandboxLogs((prev) => [newRow, ...prev]);
    showToast(
      simulateFailure
        ? 'Injected simulated 503 timeout into Failed Queue'
        : `ERP sync succeeded (${newRow.erp_reference_id})`,
      simulateFailure ? 'warning' : 'success'
    );
  };

  const handleRetry = async (item: ErpSyncLogItem) => {
    if (isLiveBackend) {
      setBusyId(item.id);
      try {
        const retried = await retryLiveErpSyncLog(item.id, meterInputs[item.id] || '');
        logsRes.refresh();
        requestsRes.refresh();
        showToast(
          retried.status === 'SYNCED'
            ? `Retry #${retried.attempt_count} succeeded (${retried.erp_reference_id})`
            : `Retry #${retried.attempt_count} still requires field correction: ${retried.error_message}`,
          retried.status === 'SYNCED' ? 'success' : 'warning'
        );
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Retry failed', 'error');
      } finally {
        setBusyId(null);
      }
      return;
    }

    // Client sandbox retry
    const nowIso = new Date().toISOString();
    setSandboxLogs((prev) =>
      prev.map((row) =>
        row.id === item.id
          ? {
              ...row,
              status: 'SYNCED',
              attempt_count: row.attempt_count + 1,
              erp_reference_id: `SIM-ERP-N01-RETRY-${row.attempt_count + 1}`,
              error_message: '',
              last_attempt_at: nowIso,
              synced_at: nowIso,
            }
          : row
      )
    );
    showToast(`Retry #${item.attempt_count + 1} succeeded (Sandbox)`, 'success');
  };

  return (
    <div className="space-y-4 min-w-0">
      {/* Header + Honest Simulation Disclosure */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {ad.erpAdapterTitle}
                </h2>
                <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold uppercase tracking-wider">
                  {ad.erpSimulatedBadge}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {ad.erpAdapterSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              mappingsRes.refresh();
              logsRes.refresh();
              requestsRes.refresh();
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{allLogs.length}</span>
          </button>
        </div>

        <div className="rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-200">
          {ad.erpDisclosureBanner}
        </div>
      </div>

      {/* Sync Log & Failed-Sync Queue */}
      <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden space-y-0">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {ad.erpSyncLogHeading}
            </h3>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {ad.erpFilterAll} ({allLogs.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('FAILED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  statusFilter === 'FAILED'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {ad.erpFilterFailedQueue} ({failedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('SYNCED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  statusFilter === 'SYNCED'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                }`}
              >
                {ad.erpFilterSynced} ({syncedCount})
              </button>
            </div>
          </div>

          {/* Manual Outbound Sync & Failure-Injection Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-1">
            {isLiveBackend && liveRequests.length > 0 && (
              <select
                aria-label={ad.erpBtnSyncRequest}
                value={effectiveRequestId}
                onChange={(e) => setSelectedRequestId(e.target.value)}
                className="min-h-9 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white min-w-[240px]"
              >
                {liveRequests.map((req) => (
                  <option key={req.id} value={req.id}>
                    [{req.id.slice(0, 8)}] {req.applicant_name} ({req.status} · {req.zone})
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              disabled={busyId !== null}
              onClick={() => void handleManualSync(false)}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {ad.erpBtnSyncRequest}
            </button>
            <button
              type="button"
              disabled={busyId !== null}
              onClick={() => void handleManualSync(true)}
              className="px-3.5 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {ad.erpBtnSimulateFailure}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[740px] text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5 font-semibold whitespace-nowrap">{ad.erpColApplicant}</th>
                <th className="p-3.5 font-semibold whitespace-nowrap">{ad.erpColEvent}</th>
                <th className="p-3.5 font-semibold whitespace-nowrap">{ad.colStatus}</th>
                <th className="p-3.5 font-semibold whitespace-nowrap">{ad.erpColAttempts}</th>
                <th className="p-3.5 font-semibold">{ad.erpColRefOrError}</th>
                <th className="p-3.5 font-semibold text-right whitespace-nowrap">{ad.erpColAction}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {visibleLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    {ad.erpEmptyLogs}
                  </td>
                </tr>
              ) : (
                visibleLogs.map((log) => {
                  const needsMeterSerial =
                    log.status === 'FAILED' && log.error_message.includes('ISU_DEVICE_SERIAL_NO');
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {log.applicant_name || log.request_id.slice(0, 8)}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {log.request_id.slice(0, 12)} {log.zone ? `· ${log.zone}` : ''}
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] whitespace-nowrap">
                        {log.event_type}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {log.status === 'SYNCED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            {ad.erpStatusSynced}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            {ad.erpStatusFailed}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono tabular-nums whitespace-nowrap">
                        {log.attempt_count}
                      </td>
                      <td className="p-3.5">
                        {log.status === 'SYNCED' ? (
                          <span className="font-mono text-emerald-700 dark:text-emerald-400">
                            {log.erp_reference_id}
                          </span>
                        ) : (
                          <div className="space-y-1.5">
                            <p className="text-rose-700 dark:text-rose-300 text-[11px]">
                              {log.error_message}
                            </p>
                            {needsMeterSerial && (
                              <input
                                type="text"
                                aria-label="ISU_DEVICE_SERIAL_NO"
                                placeholder="UGVCL-MTR-2026-01"
                                value={meterInputs[log.id] || ''}
                                onChange={(e) =>
                                  setMeterInputs((prev) => ({ ...prev, [log.id]: e.target.value }))
                                }
                                className="min-h-8 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[11px] text-slate-900 dark:text-white"
                              />
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        {log.status === 'FAILED' ? (
                          <button
                            type="button"
                            disabled={busyId === log.id}
                            onClick={() => void handleRetry(log)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
                          >
                            <RotateCw className={`w-3.5 h-3.5 ${busyId === log.id ? 'animate-spin' : ''}`} />
                            {ad.erpBtnRetrySync}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Canonical Field Mapping Table */}
      <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {ad.erpMappingHeading}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[740px] text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5 font-semibold whitespace-nowrap">{ad.erpColSourceField}</th>
                <th className="p-3.5 font-semibold whitespace-nowrap">{ad.erpColTargetField}</th>
                <th className="p-3.5 font-semibold">{ad.erpColTransformRule}</th>
                <th className="p-3.5 font-semibold whitespace-nowrap">{ad.erpColRequiredStage}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {mappings.map((m) => (
                <tr key={m.source_field} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="p-3.5 font-mono font-semibold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                    {m.source_field}
                  </td>
                  <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                    {m.erp_field}
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-300">{m.transform_rule}</td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                      {m.required_on}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
