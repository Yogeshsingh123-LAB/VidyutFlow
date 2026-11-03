import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  BACKUP_FORMAT_ID,
  BACKUP_FORMAT_VERSION,
  BACKUP_APPLICATION_VERSION,
  BACKUP_SCHEMA_VERSION,
  EXCLUDED_SENSITIVE_OR_PREFERENCE_STORAGE_KEYS,
  AdminRbacStateSnapshot,
  BackupActorIdentity,
  DemoBackupEnvelope,
  BackupValidationResult,
  DemoRestorePreview,
  OfflineQueueRestorePolicy,
  ExecuteSafeRestoreResult,
  BackupAuditRecord,
  createDemoBackup,
  triggerBackupJsonDownload,
  validateDemoBackup,
  generateDemoRestorePreview,
  executeSafeDemoRestore,
  recoverFromPreRestoreSnapshot,
  getStoredPreRestoreRecoverySnapshot,
  getBackupAuditHistory,
  getDemoBackupUiDictionary,
} from '../../utils/demoBackupEngine';
import {
  Database,
  Download,
  Upload,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  RotateCcw,
  FileCheck2,
  History,
  Lock,
  WifiOff,
  Info,
} from 'lucide-react';

export interface AdminDemoBackupCenterProps {
  adminRbacState: AdminRbacStateSnapshot;
  onRestoreAdminRbacState: (nextState: AdminRbacStateSnapshot) => void;
}

type BackupCenterTab = 'create' | 'validate' | 'preview' | 'restore' | 'audit';

export const AdminDemoBackupCenter: React.FC<AdminDemoBackupCenterProps> = ({
  adminRbacState,
  onRestoreAdminRbacState,
}) => {
  const {
    currentRole,
    activeUser,
    consumers,
    connections,
    bills,
    payments,
    applications,
    complaints,
    workOrders,
    employees,
    fieldEngineers,
    incidents,
    notifications,
    auditLogs,
    recommendations,
    fieldOfflineQueue,
    applyRestoredDemoBackupState,
    addAuditEvent,
    showToast,
  } = useApp();

  const { language } = useLanguage();
  const dict = getDemoBackupUiDictionary(language);

  const [activeSubTab, setActiveSubTab] = useState<BackupCenterTab>('create');
  const [generatedBackup, setGeneratedBackup] = useState<{
    envelope: DemoBackupEnvelope;
    serializedJson: string;
    filename: string;
    byteSize: number;
  } | null>(null);

  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [validationResult, setValidationResult] = useState<BackupValidationResult | null>(null);
  const [offlinePolicy, setOfflinePolicy] =
    useState<OfflineQueueRestorePolicy>('BLOCK_IF_PENDING');
  const [explicitConfirmChecked, setExplicitConfirmChecked] = useState<boolean>(false);
  const [confirmKeyword, setConfirmKeyword] = useState<string>('');
  const [lastRestoreResult, setLastRestoreResult] = useState<ExecuteSafeRestoreResult | null>(null);
  const [auditHistory, setAuditHistory] = useState<BackupAuditRecord[]>(() =>
    getBackupAuditHistory()
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const actor = useMemo<BackupActorIdentity>(
    () => ({
      id: activeUser.id || 'USR-ADM-001',
      name: activeUser.name || 'Anand Patel',
      role: currentRole,
      subdivision: activeUser.subdivision || 'Gujarat State Data Center',
    }),
    [activeUser, currentRole]
  );

  const liveStateSnapshot = useMemo(
    () => ({
      consumers,
      connections,
      bills,
      payments,
      applications,
      complaints,
      workOrders,
      employees,
      fieldEngineers,
      incidents,
      notifications,
      auditLogs,
      aiRecommendations: recommendations,
      fieldOfflineQueue,
      adminRbacState,
    }),
    [
      consumers,
      connections,
      bills,
      payments,
      applications,
      complaints,
      workOrders,
      employees,
      fieldEngineers,
      incidents,
      notifications,
      auditLogs,
      recommendations,
      fieldOfflineQueue,
      adminRbacState,
    ]
  );

  // Generate an initial previewable backup envelope on mount for immediate inspection
  useEffect(() => {
    if (currentRole === 'admin' && !generatedBackup) {
      const res = createDemoBackup({
        actor,
        liveState: liveStateSnapshot,
      });
      if (res.success && res.envelope && res.serializedJson && res.filename) {
        setGeneratedBackup({
          envelope: res.envelope,
          serializedJson: res.serializedJson,
          filename: res.filename,
          byteSize: res.byteSize || 0,
        });
        setAuditHistory(getBackupAuditHistory());
      }
    }
  }, [currentRole]);

  const storedRecoverySnapshot = useMemo(
    () => getStoredPreRestoreRecoverySnapshot(),
    [lastRestoreResult, auditHistory]
  );

  // Compute live restore preview whenever a validated backup or policy changes
  const restorePreview = useMemo<DemoRestorePreview | null>(() => {
    const candidateEnvelope =
      validationResult?.parsedEnvelope || generatedBackup?.envelope;
    if (!candidateEnvelope || currentRole !== 'admin') return null;
    return generateDemoRestorePreview({
      actor,
      backupInput: candidateEnvelope,
      currentState: liveStateSnapshot,
      offlineQueuePolicy: offlinePolicy,
      recordAudit: false,
    });
  }, [
    validationResult,
    generatedBackup,
    currentRole,
    actor,
    liveStateSnapshot,
    offlinePolicy,
  ]);

  if (currentRole !== 'admin') {
    return (
      <div
        data-testid="admin-backup-unauthorized-notice"
        className="p-5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-3"
      >
        <Lock className="w-5 h-5 shrink-0 text-rose-600" />
        <span>{dict.rbacFrontendNotice}</span>
      </div>
    );
  }

  const handleGenerateFreshBackup = () => {
    const res = createDemoBackup({
      actor,
      liveState: liveStateSnapshot,
    });
    setAuditHistory(getBackupAuditHistory());
    if (res.success && res.envelope && res.serializedJson && res.filename) {
      setGeneratedBackup({
        envelope: res.envelope,
        serializedJson: res.serializedJson,
        filename: res.filename,
        byteSize: res.byteSize || 0,
      });
      addAuditEvent(
        'DEMO_BACKUP_CREATED',
        res.envelope.backupId,
        `Generated portable DEMO backup (${res.envelope.categoryManifest.length} categories).`,
        actor.name,
        'SUCCESS'
      );
      showToast(`DEMO Backup ${res.envelope.backupId} created`, 'success');
    } else {
      showToast(res.error || 'Backup creation failed', 'error');
    }
  };

  const handleDownloadBackupJson = () => {
    if (!generatedBackup) {
      handleGenerateFreshBackup();
      return;
    }
    const downloaded = triggerBackupJsonDownload(
      generatedBackup.serializedJson,
      generatedBackup.filename
    );
    if (downloaded) {
      addAuditEvent(
        'DEMO_BACKUP_DOWNLOADED',
        generatedBackup.envelope.backupId,
        `Downloaded portable backup file ${generatedBackup.filename} (${generatedBackup.byteSize} bytes).`,
        actor.name,
        'SUCCESS'
      );
      showToast(`Downloaded ${generatedBackup.filename}`, 'success');
    }
  };

  const handleValidateCurrentSnapshot = () => {
    if (!generatedBackup) return;
    const vRes = validateDemoBackup({
      actor,
      backupInput: generatedBackup.serializedJson,
      recordAudit: true,
    });
    setUploadedFileName(generatedBackup.filename);
    setValidationResult(vRes);
    setAuditHistory(getBackupAuditHistory());
    setActiveSubTab('validate');
    showToast(
      vRes.isValid ? dict.validationStatusValid : dict.validationStatusInvalid,
      vRes.isValid ? 'success' : 'error'
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const vRes = validateDemoBackup({
        actor,
        backupInput: content,
        recordAudit: true,
      });
      setValidationResult(vRes);
      setAuditHistory(getBackupAuditHistory());
      setExplicitConfirmChecked(false);
      setConfirmKeyword('');
      showToast(
        vRes.isValid ? dict.validationStatusValid : dict.validationStatusInvalid,
        vRes.isValid ? 'success' : 'error'
      );
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = () => {
    const targetEnvelope =
      validationResult?.parsedEnvelope || generatedBackup?.envelope;
    if (!targetEnvelope) {
      showToast('Please validate or generate a backup first.', 'warning');
      return;
    }

    const res = executeSafeDemoRestore({
      actor,
      backupInput: targetEnvelope,
      currentState: liveStateSnapshot,
      explicitConfirmation: explicitConfirmChecked,
      confirmationText: confirmKeyword,
      offlineQueuePolicy: offlinePolicy,
      onApplyRestoredState: (restoredState) => {
        applyRestoredDemoBackupState(restoredState);
        onRestoreAdminRbacState(restoredState.adminRbacState);
      },
    });

    setLastRestoreResult(res);
    setAuditHistory(getBackupAuditHistory());

    if (res.success) {
      setExplicitConfirmChecked(false);
      setConfirmKeyword('');
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleRecoverPreRestoreSnapshot = () => {
    const res = recoverFromPreRestoreSnapshot({
      actor,
      onApplyRestoredState: (restoredState) => {
        applyRestoredDemoBackupState(restoredState);
        onRestoreAdminRbacState(restoredState.adminRbacState);
      },
    });
    setLastRestoreResult(res);
    setAuditHistory(getBackupAuditHistory());
    showToast(res.message, res.success ? 'success' : 'error');
  };

  const totalBackedUpRecords = useMemo(() => {
    if (!generatedBackup) return 0;
    return Object.values(generatedBackup.envelope.recordCounts).reduce(
      (sum, c) => sum + c,
      0
    );
  }, [generatedBackup]);

  return (
    <section
      data-testid="admin-demo-backup-recovery-center"
      aria-label={dict.sectionTitle}
      className="rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden"
    >
      {/* Header Banner */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Database className="w-5 h-5 text-blue-600 shrink-0" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {dict.sectionTitle}
              </h2>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {dict.demoScopeBadge}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {dict.sectionSubtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              data-testid="admin-create-demo-backup-btn"
              onClick={handleGenerateFreshBackup}
              className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{dict.generateBackupBtn}</span>
            </button>
            <button
              type="button"
              data-testid="admin-download-demo-backup-btn"
              onClick={handleDownloadBackupJson}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{dict.downloadBackupJsonBtn}</span>
            </button>
          </div>
        </div>

        {/* Mandatory DEMO & Checksum Disclosures */}
        <div className="mt-3.5 grid grid-cols-1 lg:grid-cols-2 gap-2.5 text-[11px]">
          <div className="p-2.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/70 text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{dict.demoLimitationsNotice}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>{dict.checksumDisclosureNotice}</span>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div
          role="tablist"
          aria-label={dict.sectionTitle}
          className="mt-4 flex flex-wrap gap-1.5 pt-3 border-t border-slate-200/80 dark:border-slate-800"
        >
          {(
            [
              { id: 'create', label: dict.tabCreateBackup, icon: <Database className="w-3.5 h-3.5" /> },
              { id: 'validate', label: dict.tabValidateBackup, icon: <FileCheck2 className="w-3.5 h-3.5" /> },
              { id: 'preview', label: dict.tabRestorePreview, icon: <Eye className="w-3.5 h-3.5" /> },
              { id: 'restore', label: dict.tabExecuteRestore, icon: <RotateCcw className="w-3.5 h-3.5" /> },
              { id: 'audit', label: dict.tabAuditHistory, icon: <History className="w-3.5 h-3.5" /> },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={activeSubTab === tab.id}
              data-testid={`admin-backup-tab-${tab.id}`}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeSubTab === tab.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: CREATE & EXPORT BACKUP */}
      {activeSubTab === 'create' && generatedBackup && (
        <div className="p-4 sm:p-5 space-y-5">
          {/* Envelope Metadata Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {dict.formatIdLabel}
              </span>
              <div className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-1 break-all">
                {generatedBackup.envelope.backupId}
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {BACKUP_FORMAT_ID}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {dict.schemaVersionLabel}
              </span>
              <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1 tabular-nums">
                Schema v{BACKUP_SCHEMA_VERSION} · Format {BACKUP_FORMAT_VERSION}
              </div>
              <span className="text-[11px] text-slate-500">
                App v{BACKUP_APPLICATION_VERSION}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {dict.totalCategoriesLabel} / {dict.totalRecordsLabel}
              </span>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                {generatedBackup.envelope.categoryManifest.length} Categories ·{' '}
                {totalBackedUpRecords} Records
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {(generatedBackup.byteSize / 1024).toFixed(1)} KB JSON
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {dict.lastGeneratedAtLabel}
              </span>
              <div className="text-xs font-mono font-semibold text-slate-900 dark:text-white mt-1">
                {generatedBackup.envelope.createdAt}
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                SHA/FNV256: {generatedBackup.envelope.integrity.checksum.slice(0, 14)}…
              </span>
            </div>
          </div>

          {/* Category Manifest Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {dict.includedCategoriesHeading}
            </h3>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-2.5 font-semibold">{dict.colCategoryName}</th>
                    <th className="p-2.5 font-semibold">{dict.colStorageKey}</th>
                    <th className="p-2.5 font-semibold">{dict.colClassification}</th>
                    <th className="p-2.5 font-semibold text-right">{dict.colRecordCount}</th>
                    <th className="p-2.5 font-semibold text-right">{dict.colChecksumPrefix}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {generatedBackup.envelope.categoryManifest.map((item) => (
                    <tr
                      key={item.category}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                    >
                      <td className="p-2.5 font-semibold text-slate-900 dark:text-white">
                        {dict.categoryLabels[item.category] || item.category}
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-500">
                        {item.storageKey}
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded ${
                            item.classification === 'CANONICAL_PERSISTENT'
                              ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                              : 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                          }`}
                        >
                          {item.classification === 'CANONICAL_PERSISTENT'
                            ? dict.classCanonical
                            : dict.classDerived}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold tabular-nums text-slate-800 dark:text-slate-200">
                        {item.recordCount}
                      </td>
                      <td className="p-2.5 text-right font-mono text-[11px] text-slate-400">
                        {item.checksum.slice(0, 12)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Excluded Security & Session Keys */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {dict.excludedStoresHeading}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {EXCLUDED_SENSITIVE_OR_PREFERENCE_STORAGE_KEYS.map((item) => (
                <div
                  key={item.key}
                  className="p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 flex flex-col gap-0.5"
                >
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {item.key}
                  </span>
                  <span className="text-[11px] text-slate-500">{item.reason}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INSPECT & VALIDATE BACKUP */}
      {activeSubTab === 'validate' && (
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {dict.validateBackupTitle}
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {dict.readOnlyValidationBadge}
                </span>
              </div>
              <p className="text-xs text-slate-500">{dict.validateBackupDesc}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                data-testid="admin-upload-backup-input"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{dict.selectBackupFileBtn}</span>
              </button>
              <button
                type="button"
                data-testid="admin-validate-current-snapshot-btn"
                onClick={handleValidateCurrentSnapshot}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
              >
                {dict.validateLoadedSampleBtn}
              </button>
            </div>
          </div>

          {validationResult && (
            <div
              data-testid="admin-backup-validation-result"
              className="space-y-4"
            >
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  validationResult.isValid
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {validationResult.isValid ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {validationResult.isValid
                        ? dict.validationStatusValid
                        : dict.validationStatusInvalid}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      {uploadedFileName || validationResult.backupId || 'Backup JSON'} ·{' '}
                      {validationResult.fileSizeBytes.toLocaleString()} bytes ·{' '}
                      {validationResult.totalRecordsCount} records
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span
                    className={`px-2.5 py-1 rounded font-semibold ${
                      validationResult.schemaCompatible
                        ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                        : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200'
                    }`}
                  >
                    {validationResult.schemaCompatible
                      ? dict.schemaCompatibleYes
                      : dict.schemaCompatibleNo}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded font-semibold ${
                      validationResult.integrityVerified
                        ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                        : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200'
                    }`}
                  >
                    {validationResult.integrityVerified
                      ? dict.integrityVerifiedYes
                      : dict.integrityVerifiedNo}
                  </span>
                </div>
              </div>

              {validationResult.issues.length === 0 ? (
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  ✓ {dict.noIssuesFound}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {validationResult.issues.map((iss, idx) => (
                    <div
                      key={`${iss.code}-${idx}`}
                      className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-mono font-bold mr-1.5">[{iss.code}]</span>
                        <span>{iss.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {validationResult.historicalDemoNotes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {dict.historicalNotesHeading}
                  </h4>
                  <div className="space-y-1.5">
                    {validationResult.historicalDemoNotes.map((note, idx) => (
                      <div
                        key={`${note.recordId}-${note.code}-${idx}`}
                        className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200"
                      >
                        <span className="font-mono font-bold mr-1.5">
                          [{note.recordId} · {note.code}]
                        </span>
                        <span>{note.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RESTORE IMPACT PREVIEW */}
      {activeSubTab === 'preview' && restorePreview && (
        <div
          data-testid="admin-backup-restore-preview"
          className="p-4 sm:p-5 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {dict.restorePreviewTitle}
              </h3>
              <p className="text-xs text-slate-500">
                {dict.restorePreviewDesc} ({restorePreview.backupId} ·{' '}
                {restorePreview.backupCreatedAt})
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-lg text-xs font-bold ${
                restorePreview.canRestoreSafely
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {restorePreview.canRestoreSafely
                ? dict.canRestoreSafelyYes
                : dict.canRestoreSafelyNo}
            </span>
          </div>

          {/* Summary Diff Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800">
              <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                {dict.diffAddedLabel}
              </span>
              <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">
                +{restorePreview.totalAdded}
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800">
              <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300">
                {dict.diffReplacedLabel}
              </span>
              <div className="text-xl font-extrabold text-blue-700 dark:text-blue-300 tabular-nums">
                ~{restorePreview.totalReplaced}
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800">
              <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">
                {dict.diffRemovedLabel}
              </span>
              <div className="text-xl font-extrabold text-amber-700 dark:text-amber-300 tabular-nums">
                -{restorePreview.totalRemoved}
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-slate-500">
                {dict.diffUnchangedLabel}
              </span>
              <div className="text-xl font-extrabold text-slate-800 dark:text-slate-200 tabular-nums">
                {restorePreview.totalUnchanged}
              </div>
            </div>
          </div>

          {/* Field Engineer Offline Queue Protection Panel */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                {dict.offlineQueueSafetyTitle}
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {restorePreview.offlineQueueConflict.warningMessage}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="offlineQueuePolicy"
                  checked={offlinePolicy === 'BLOCK_IF_PENDING'}
                  onChange={() => setOfflinePolicy('BLOCK_IF_PENDING')}
                />
                <span>{dict.offlinePolicyBlockLabel}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="offlineQueuePolicy"
                  checked={offlinePolicy === 'PRESERVE_LIVE_PENDING'}
                  onChange={() => setOfflinePolicy('PRESERVE_LIVE_PENDING')}
                />
                <span>{dict.offlinePolicyPreserveLabel}</span>
              </label>
            </div>
          </div>

          {/* Category Diff Table */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-2.5 font-semibold">{dict.colCategoryName}</th>
                  <th className="p-2.5 font-semibold text-right">{dict.colCurrentCount}</th>
                  <th className="p-2.5 font-semibold text-right">{dict.colBackupCount}</th>
                  <th className="p-2.5 font-semibold text-right text-emerald-600">{dict.colAdded}</th>
                  <th className="p-2.5 font-semibold text-right text-blue-600">{dict.colReplaced}</th>
                  <th className="p-2.5 font-semibold text-right text-amber-600">{dict.colRemoved}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {restorePreview.categoryDiffs.map((diff) => (
                  <tr key={diff.category}>
                    <td className="p-2.5 font-semibold text-slate-900 dark:text-white">
                      {dict.categoryLabels[diff.category] || diff.category}
                    </td>
                    <td className="p-2.5 text-right font-mono tabular-nums">{diff.currentCount}</td>
                    <td className="p-2.5 text-right font-mono tabular-nums">{diff.backupCount}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-emerald-600 tabular-nums">
                      {diff.addedCount}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-blue-600 tabular-nums">
                      {diff.replacedCount}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-amber-600 tabular-nums">
                      {diff.removedCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SAFE RESTORE & PRE-RESTORE SNAPSHOT RECOVERY */}
      {activeSubTab === 'restore' && (
        <div className="p-4 sm:p-5 space-y-4">
          <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">{dict.restoreSectionTitle}</div>
              <p>{dict.preRestoreWarningBanner}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3.5 text-xs">
            <label className="flex items-start gap-2.5 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                data-testid="admin-restore-confirm-checkbox"
                checked={explicitConfirmChecked}
                onChange={(e) => setExplicitConfirmChecked(e.target.checked)}
                className="mt-0.5"
              />
              <span>{dict.explicitConfirmCheckboxLabel}</span>
            </label>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <label
                htmlFor="admin-restore-confirm-input"
                className="font-semibold text-slate-700 dark:text-slate-300"
              >
                {dict.confirmKeywordPrompt}
              </label>
              <input
                id="admin-restore-confirm-input"
                data-testid="admin-restore-confirm-input"
                type="text"
                value={confirmKeyword}
                onChange={(e) => setConfirmKeyword(e.target.value)}
                placeholder="RESTORE"
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs w-44"
              />
              <button
                type="button"
                data-testid="admin-execute-safe-restore-btn"
                disabled={
                  !explicitConfirmChecked ||
                  confirmKeyword.trim().toUpperCase() !== 'RESTORE'
                }
                onClick={handleExecuteRestore}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{dict.executeSafeRestoreBtn}</span>
              </button>
            </div>
          </div>

          {/* Pre-Restore Recovery Snapshot Card */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                {storedRecoverySnapshot
                  ? `${dict.recoverySnapshotAvailableLabel} ${storedRecoverySnapshot.snapshotId}`
                  : dict.noRecoverySnapshotLabel}
              </span>
              {storedRecoverySnapshot && (
                <span className="text-[11px] text-slate-500 font-mono">
                  Captured: {storedRecoverySnapshot.capturedAt} · Target:{' '}
                  {storedRecoverySnapshot.capturedForBackupId}
                </span>
              )}
            </div>
            {storedRecoverySnapshot && (
              <button
                type="button"
                data-testid="admin-recover-snapshot-btn"
                onClick={handleRecoverPreRestoreSnapshot}
                className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 text-white font-semibold text-xs shrink-0 cursor-pointer"
              >
                {dict.recoverFromSnapshotBtn}
              </button>
            )}
          </div>

          {lastRestoreResult && (
            <div
              data-testid="admin-restore-outcome-banner"
              className={`p-3.5 rounded-xl border text-xs ${
                lastRestoreResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div className="font-bold">[{lastRestoreResult.status}]</div>
              <div className="mt-0.5">{lastRestoreResult.message}</div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: BACKUP & RESTORE AUDIT HISTORY */}
      {activeSubTab === 'audit' && (
        <div className="p-4 sm:p-5 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {dict.auditHistoryTitle}
            </h3>
            <p className="text-xs text-slate-500">{dict.auditHistoryDesc}</p>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-2.5 font-semibold">{dict.colAuditId}</th>
                  <th className="p-2.5 font-semibold">{dict.colAuditTimestamp}</th>
                  <th className="p-2.5 font-semibold">{dict.colAuditOperation}</th>
                  <th className="p-2.5 font-semibold">{dict.colAuditActor}</th>
                  <th className="p-2.5 font-semibold">{dict.colAuditOutcome}</th>
                  <th className="p-2.5 font-semibold">{dict.colAuditSummary}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {auditHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-5 text-center text-slate-500">
                      {dict.noBackupAuditRecords}
                    </td>
                  </tr>
                ) : (
                  auditHistory.map((rec) => (
                    <tr key={rec.id}>
                      <td className="p-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {rec.id}
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {rec.timestamp}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {rec.operationType}
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {rec.actorName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {rec.actorId} ({rec.actorRole})
                        </div>
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                            rec.outcome === 'SUCCESS'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : rec.outcome === 'WARNING'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {rec.outcome}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-700 dark:text-slate-300">
                        <div className="font-semibold">{rec.summary}</div>
                        <div className="text-[11px] text-slate-500">{rec.details}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
