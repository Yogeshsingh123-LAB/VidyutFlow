import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  localizeIncidentTitle,
  localizeIncidentDescription,
  localizeIncidentSopAction,
  localizeIncidentSeverity
} from '../../i18n/incidentLocalization';
import { formatAccessibleSeverityLabel } from '../../utils/designTokens';
import {
  AlertTriangle,
  Flame,
  X,
  CheckCircle,
  ExternalLink,
  ShieldAlert,
  Volume2,
  VolumeX,
  ArrowRight
} from 'lucide-react';

export const CriticalIncidentModal: React.FC = () => {
  const {
    activeCriticalModalIncident,
    dismissCriticalModal,
    acknowledgeIncident,
    setIsNotificationDrawerOpen,
    audioAlertsEnabled,
    toggleAudio,
    currentRole,
    demoSession
  } = useApp();

  const { t, language } = useLanguage();
  const effectiveRole = demoSession ? demoSession.role : currentRole;
  const isConsumerSession = effectiveRole === 'consumer' || currentRole === 'consumer';

  useEffect(() => {
    if (!activeCriticalModalIncident || isConsumerSession) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismissCriticalModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCriticalModalIncident, dismissCriticalModal, isConsumerSession]);

  if (!activeCriticalModalIncident || isConsumerSession) return null;

  const incident = activeCriticalModalIncident;
  const isSimulated = incident.isSimulated;

  const handleAcknowledge = () => {
    acknowledgeIncident(incident.id, `Acknowledged via urgent alert popup by ${currentRole.toUpperCase()}`);
  };

  const handleOpenDrawer = () => {
    dismissCriticalModal();
    setIsNotificationDrawerOpen(true);
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="critical-incident-title"
      aria-describedby="critical-incident-description"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={dismissCriticalModal}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#101C35] rounded-2xl border-2 border-rose-500/80 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Urgent Header Banner */}
        <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border border-white/20">
              <Flame className="w-6 h-6 text-amber-300 animate-pulse" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                  {localizeIncidentSeverity(incident.severity, language)}
                </span>
                {isSimulated && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-slate-900">
                    {t.incident.alertDemoSimulationBadge}
                  </span>
                )}
              </div>
              <h2 id="critical-incident-title" className="text-base font-bold text-white leading-tight truncate mt-0.5">
                {t.incident.alertAnomalyDetectedTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={toggleAudio}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title={audioAlertsEnabled ? t.incident.alertMuteSoundTitle : t.incident.alertUnmuteSoundTitle}
              aria-label={audioAlertsEnabled ? t.incident.alertMuteSoundTitle : t.incident.alertUnmuteSoundTitle}
            >
              {audioAlertsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-200" />}
            </button>
            <button
              onClick={dismissCriticalModal}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label={t.incident.alertBtnDismiss}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 text-slate-800 dark:text-slate-100">
          <div>
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">{incident.id}</span>
              <span>{incident.module}</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
              {localizeIncidentTitle(incident.title, language)}
            </h3>
            <p
              id="critical-incident-description"
              className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800"
            >
              {localizeIncidentDescription(incident.description, language)}
            </p>
          </div>

          {/* Recommended SOP Next Action */}
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{t.incident.alertSopResponseLabel}</span>
            </div>
            <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              {localizeIncidentSopAction(incident.recommendedAction, language)}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div className="bg-slate-100 dark:bg-slate-800/60 p-2.5 rounded-lg">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">{t.incident.alertAffectedEntityLabel}</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white capitalize">
                {incident.entityType}: {incident.entityId}
              </span>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800/60 p-2.5 rounded-lg">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">{t.incident.alertTargetRolesLabel}</span>
              <span className="font-medium text-slate-900 dark:text-white uppercase font-mono">
                {incident.responsibleRoles.join(', ')}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleOpenDrawer}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            <span>{t.incident.alertBtnViewAll}</span>
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <button
              type="button"
              onClick={dismissCriticalModal}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              {t.incident.alertBtnDismiss}
            </button>
            <button
              type="button"
              onClick={handleAcknowledge}
              className="flex-1 sm:flex-initial px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4 text-white" />
              <span>{t.incident.alertBtnAcknowledge}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
