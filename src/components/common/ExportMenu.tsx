import React, { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileJson, ChevronDown, Check, Database, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useApp } from '../../context/AppContext';
import {
  ExportDatasetKey,
  ExportFormat,
  ExportScope,
  ExportDataSourceClassification,
  ExportColumnDefinition,
  ExportActorIdentity,
  executeDatasetExport,
  getExportUiTranslations,
  normalizeExportDataSource,
} from '../../utils/exportEngine';
import { UserRole } from '../../types';

export interface ExportMenuProps<T = any> {
  datasetKey: ExportDatasetKey;
  filteredRecords: readonly T[];
  allAuthorizedRecords?: readonly T[];
  selectedRecords?: readonly T[];
  dataSource?: ExportDataSourceClassification | string;
  customColumns?: ExportColumnDefinition<T>[];
  roleOverride?: UserRole;
  actorOverride?: Partial<ExportActorIdentity>;
  variant?: 'default' | 'compact' | 'dark';
  labelOverride?: string;
  className?: string;
}

export const ExportMenu = <T extends Record<string, any> = Record<string, any>>({
  datasetKey,
  filteredRecords,
  allAuthorizedRecords,
  selectedRecords,
  dataSource = 'DEMO',
  customColumns,
  roleOverride,
  actorOverride,
  variant = 'default',
  labelOverride,
  className = '',
}: ExportMenuProps<T>) => {
  const { language } = useLanguage();
  const { currentRole, activeUser, userConnections, showToast } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedScope, setSelectedScope] = useState<ExportScope>('filtered');
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const t = getExportUiTranslations(language);
  const effectiveRole: UserRole = roleOverride || currentRole;
  const normalizedDataSource: ExportDataSourceClassification = normalizeExportDataSource(dataSource);

  const hasSelectedRecords = Array.isArray(selectedRecords) && selectedRecords.length > 0;
  const hasAllAuthorizedOption =
    Array.isArray(allAuthorizedRecords) &&
    allAuthorizedRecords.length > 0 &&
    allAuthorizedRecords.length !== filteredRecords.length;

  // Keep selectedScope valid when props change
  useEffect(() => {
    if (selectedScope === 'selected' && !hasSelectedRecords) {
      setSelectedScope('filtered');
    } else if (selectedScope === 'all_authorized' && !hasAllAuthorizedOption) {
      setSelectedScope('filtered');
    }
  }, [selectedScope, hasSelectedRecords, hasAllAuthorizedOption]);

  // Outside click & Escape handler
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const activeRecordsForScope: readonly T[] =
    selectedScope === 'selected' && hasSelectedRecords
      ? selectedRecords!
      : selectedScope === 'all_authorized' && Array.isArray(allAuthorizedRecords)
      ? allAuthorizedRecords
      : filteredRecords;

  const ownedConsumerNos = userConnections.map((c) => c.consumerNo);

  const actor: ExportActorIdentity = {
    id: actorOverride?.id || activeUser.id || `${effectiveRole}_user`,
    name: actorOverride?.name || activeUser.name,
    role: effectiveRole,
    email: actorOverride?.email || activeUser.email,
    subdivision: actorOverride?.subdivision || activeUser.subdivision,
    consumerNo: actorOverride?.consumerNo || ownedConsumerNos[0],
    ownedConsumerNos: actorOverride?.ownedConsumerNos || ownedConsumerNos,
    assignedFeederIds: actorOverride?.assignedFeederIds,
  };

  const handleExport = (format: ExportFormat) => {
    const result = executeDatasetExport<T>({
      role: effectiveRole,
      actor,
      datasetKey,
      format,
      scope: selectedScope,
      records: activeRecordsForScope,
      language,
      dataSource: normalizedDataSource,
      customColumns,
    });

    setIsOpen(false);

    if (!result.success) {
      showToast(result.message, result.unauthorized ? 'error' : 'warning');
      return;
    }

    showToast(`${result.message} • ${result.filename}`, 'success');
  };

  const buttonClasses =
    variant === 'dark'
      ? 'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40'
      : variant === 'compact'
      ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40'
      : 'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40';

  const sourceBadgeColor =
    normalizedDataSource === 'LIVE'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
      : normalizedDataSource === 'FORECAST'
      ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800'
      : normalizedDataSource === 'SIMULATED'
      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
      : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`${labelOverride || t.exportBtn} — ${t.datasetLabels[datasetKey] || datasetKey}`}
        className={buttonClasses}
      >
        <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
        <span className="truncate">{labelOverride || t.exportBtn}</span>
        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 tabular-nums">
          {activeRecordsForScope.length}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/90 shadow-xl z-50 p-3 text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header with Dataset & Data Source Badge */}
          <div className="pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                {t.datasetLabels[datasetKey] || datasetKey}
              </p>
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${sourceBadgeColor}`}
              >
                <Database className="w-2.5 h-2.5" />
                {normalizedDataSource}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span>
                {t.recordCountLabel}:{' '}
                <strong className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                  {activeRecordsForScope.length}
                </strong>
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                UTF-8 • RFC 4180
              </span>
            </div>
          </div>

          {/* Scope selector if multiple scopes exist */}
          {(hasAllAuthorizedOption || hasSelectedRecords) && (
            <div className="mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                {t.scopeLabel}
              </p>
              <div className="space-y-1">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={selectedScope === 'filtered'}
                  onClick={() => setSelectedScope('filtered')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedScope === 'filtered'
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Check
                      className={`w-3.5 h-3.5 ${
                        selectedScope === 'filtered' ? 'opacity-100 text-blue-600 dark:text-blue-400' : 'opacity-0'
                      }`}
                    />
                    {t.exportFiltered}
                  </span>
                  <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    ({filteredRecords.length})
                  </span>
                </button>

                {hasAllAuthorizedOption && (
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={selectedScope === 'all_authorized'}
                    onClick={() => setSelectedScope('all_authorized')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedScope === 'all_authorized'
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Check
                        className={`w-3.5 h-3.5 ${
                          selectedScope === 'all_authorized'
                            ? 'opacity-100 text-blue-600 dark:text-blue-400'
                            : 'opacity-0'
                        }`}
                      />
                      {t.exportAllAuthorized}
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      ({allAuthorizedRecords!.length})
                    </span>
                  </button>
                )}

                {hasSelectedRecords && (
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={selectedScope === 'selected'}
                    onClick={() => setSelectedScope('selected')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedScope === 'selected'
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Check
                        className={`w-3.5 h-3.5 ${
                          selectedScope === 'selected' ? 'opacity-100 text-blue-600 dark:text-blue-400' : 'opacity-0'
                        }`}
                      />
                      {t.exportSelected}
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      ({selectedRecords!.length})
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Empty state notice or Format Download Actions */}
          {activeRecordsForScope.length === 0 ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{t.noRecordsToExport}</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                role="menuitem"
                onClick={() => handleExport('csv')}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span>{t.exportCsv}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleExport('json')}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <FileJson className="w-4 h-4 shrink-0" />
                <span>{t.exportJson}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
