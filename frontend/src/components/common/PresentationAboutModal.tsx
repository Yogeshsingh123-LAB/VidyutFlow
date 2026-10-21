import React from 'react';
import {
  X,
  ShieldCheck,
  Info,
  Building,
  CheckCircle2,
  AlertTriangle,
  Server,
  ExternalLink
} from 'lucide-react';

interface PresentationAboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PresentationAboutModal: React.FC<PresentationAboutModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white p-1 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center shrink-0">
              <img src="/assets/ugvcl-logo.png" alt="UGVCL Official Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                About VidyutOne — UGVCL Architecture
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-gujarati truncate">
                ઉત્તર ગુજરાત વીજ કંપની લિમિટેડ · Platform Demonstration
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {/* Institutional Statement */}
          <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-2">
            <span className="font-bold text-blue-900 dark:text-blue-300 text-xs flex items-center gap-1.5">
              <Building className="w-4 h-4 text-blue-600" />
              <span>Institutional Statement of Intent</span>
            </span>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
              <strong>VidyutOne</strong> is an advanced electricity utility demonstration platform proposing an integrated, unified IT architecture and automated ERP ecosystem tailored specifically to the operational structure of <strong>Uttar Gujarat Vij Company Limited (UGVCL)</strong> and its holding company, <strong>Gujarat Urja Vikas Nigam Limited (GUVNL)</strong>.
            </p>
          </div>

          {/* UGVCL Jurisdictional Scope */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Target Utility Operational Context
            </h4>
            <p>
              UGVCL delivers electricity across the North Gujarat territory spanning 6 administrative districts: <strong>Mehsana, Gandhinagar, Sabarkantha, Banaskantha, Patan, and Aravalli</strong>. Distribution involves transforming high-voltage bulk energy received from GETCO 220kV/66kV grid substations down through thousands of 11kV primary distribution feeders, distribution transformers (DTRs), and LT lines serving over 3.8 million registered agricultural, industrial, and domestic consumers.
            </p>
          </div>

          {/* Prototype Simulation Disclosures */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Technical & Demonstration Governance
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Simulated SCADA Telemetry
                </span>
                <p className="text-slate-500">
                  Grid frequency, feeder loads, and transformer temperatures use mathematical engineering models for real-time visualization.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Demonstration Payments
                </span>
                <p className="text-slate-500">
                  Quick Pay checkout simulates Bharat BillPay / UPI confirmation and issues authentic receipts without deducting bank funds.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  AI Energy Forecasting
                </span>
                <p className="text-slate-500">
                  Load projection uses explainable regression models with temperature sensitivity and solar offsets.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Local Storage State
                </span>
                <p className="text-slate-500">
                  Data persists across page refreshes via client storage. A &quot;Reset Demo&quot; button restores default seed records at any time.
                </p>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200">
            <strong>Important Notice:</strong> VidyutOne is an independent electricity utility platform demonstration. It is not an officially deployed or operated software product of UGVCL or GUVNL. Production deployment would interface with state data centers, MDAS/AMI servers, and regulatory GERC sanction protocols.
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            VidyutOne · Unified Utility ERP Demonstration Platform
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
