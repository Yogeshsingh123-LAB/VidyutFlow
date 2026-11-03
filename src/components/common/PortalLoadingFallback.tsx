import React from 'react';
import { UserRole } from '../../types';

interface PortalLoadingFallbackProps {
  role?: UserRole;
  message?: string;
}

const ROLE_THEME_MAP: Record<UserRole, { badgeColor: string; title: string; subtitle: string }> = {
  consumer: {
    badgeColor: 'bg-emerald-600',
    title: 'Consumer Self-Service Portal',
    subtitle: 'Connecting to UGVCL Consumer Services...'
  },
  employee: {
    badgeColor: 'bg-blue-600',
    title: 'Subdivision Operations ERP',
    subtitle: 'Loading Sub-divisional Queue & Service Orders...'
  },
  field: {
    badgeColor: 'bg-amber-600',
    title: 'Field Engineer Mobile Hub',
    subtitle: 'Initializing Inspection Orders & Offline Store...'
  },
  management: {
    badgeColor: 'bg-indigo-600',
    title: 'Circle Executive & Analytical Cockpit',
    subtitle: 'Aggregating Circle-Wide Utility KPIs & Discom Trends...'
  },
  admin: {
    badgeColor: 'bg-purple-600',
    title: 'Discom Master Governance & Security',
    subtitle: 'Loading System Audits & Protection Console...'
  }
};

export const PortalLoadingFallback: React.FC<PortalLoadingFallbackProps> = ({ role = 'consumer', message }) => {
  const theme = ROLE_THEME_MAP[role] || ROLE_THEME_MAP.consumer;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="w-full space-y-6 animate-pulse"
    >
      {/* Top Banner Skeleton */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${theme.badgeColor}`} aria-hidden="true" />
              <div className="h-4 w-40 bg-slate-200 rounded-md" />
            </div>
            <div className="h-7 w-64 bg-slate-200 rounded-lg" />
            <p className="text-xs text-slate-500 font-medium">
              {message || theme.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-24 bg-slate-100 rounded-xl" />
            <div className="h-9 w-32 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>

      {/* KPI Stats Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(idx => (
          <div
            key={idx}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 bg-slate-200 rounded" />
              <div className="w-8 h-8 rounded-xl bg-slate-100" />
            </div>
            <div className="h-7 w-20 bg-slate-200 rounded-lg" />
            <div className="h-3 w-32 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="h-5 w-48 bg-slate-200 rounded-md" />
          <div className="h-8 w-28 bg-slate-100 rounded-xl" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map(idx => (
            <div
              key={idx}
              className="h-12 w-full bg-slate-50 border border-slate-100 rounded-xl flex items-center px-4 justify-between"
            >
              <div className="h-4 w-1/3 bg-slate-200 rounded" />
              <div className="h-4 w-1/4 bg-slate-200 rounded" />
              <div className="h-6 w-16 bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Loading {theme.title}... Please wait.</span>
    </div>
  );
};
