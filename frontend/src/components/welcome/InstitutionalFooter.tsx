import React from 'react';
import {
  PhoneCall,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Award,
  FileText,
  AlertCircle
} from 'lucide-react';
import { UGVCL_CORPORATE_PROFILE } from '../../data/ugvclHistoryData';
import { UgvclBrandIdentity } from '../common/UgvclBrandIdentity';

interface InstitutionalFooterProps {
  onOpenAboutModal: () => void;
  onOpenManifest: () => void;
}

export const InstitutionalFooter: React.FC<InstitutionalFooterProps> = ({
  onOpenAboutModal,
  onOpenManifest
}) => {
  return (
    <footer className="w-full bg-[#050D1C] text-slate-400 border-t border-slate-800 text-left text-xs transition-colors">
      {/* Upper Main Footer Grid */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-10 py-20 sm:py-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        {/* Column 1: Institutional Profile & Address */}
        <div className="space-y-5">
          <UgvclBrandIdentity variant="footer" showMission showDemoBadge />

          <p className="text-slate-300 text-sm leading-relaxed font-normal">
            Distributing 24×7 reliable electrical energy across 6 districts of Northern Gujarat.
            A subsidiary of Gujarat Urja Vikas Nigam Limited (GUVNL).
          </p>

          <div className="space-y-2 text-xs text-slate-400">
            <p className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-200">Corporate Office:</strong> Visnagar Road, Mehsana, Gujarat - 384001, India
              </span>
            </p>
            <p className="font-mono text-xs text-slate-500">
              CIN: {UGVCL_CORPORATE_PROFILE.cin}
            </p>
          </div>
        </div>

        {/* Column 2: Regional Circles & Jurisdiction */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            Operational Circles
          </h4>
          <ul className="space-y-2.5 text-sm">
            {UGVCL_CORPORATE_PROFILE.circles.map((circle) => (
              <li key={circle} className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>{circle} Circle</span>
              </li>
            ))}
          </ul>
          <div className="pt-2 text-xs text-slate-400 leading-relaxed">
            <strong className="text-slate-300">Territory Jurisdiction:</strong> Mehsana, Gandhinagar, Sabarkantha, Banaskantha, Patan, and Aravalli.
          </div>
        </div>

        {/* Column 3: Citizen Services & Governance */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            Consumer Governance
          </h4>
          <ul className="space-y-2.5 text-sm">
            <li>
              <a
                href="#consumer-services"
                className="hover:text-cyan-300 transition-colors flex items-center gap-1.5"
              >
                <span>Citizen Charter 2026</span>
              </a>
            </li>
            <li>
              <a
                href="#consumer-services"
                className="hover:text-cyan-300 transition-colors flex items-center gap-1.5"
              >
                <span>Consumer Grievance Redressal (CGRF)</span>
              </a>
            </li>
            <li>
              <button
                onClick={onOpenManifest}
                className="hover:text-cyan-300 transition-colors flex items-center gap-1.5 cursor-pointer text-left"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verified Asset & Citation Manifest</span>
              </button>
            </li>
            <li>
              <button
                onClick={onOpenAboutModal}
                className="hover:text-cyan-300 transition-colors flex items-center gap-1.5 cursor-pointer text-left"
              >
                <span>Platform Architecture & Overview</span>
              </button>
            </li>
            <li>
              <a
                href={UGVCL_CORPORATE_PROFILE.officialWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-cyan-300 transition-colors flex items-center gap-1.5"
              >
                <span>Official UGVCL Portal (ugvcl.com)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </li>
          </ul>
        </div>

        {/* Column 4: 24x7 Helplines & Emergency Contacts */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            24×7 Emergency Helplines
          </h4>
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
            <span className="text-xs text-cyan-400 uppercase font-bold tracking-wider block">
              Electricity Faults & Outages
            </span>
            <a
              href="tel:19122"
              className="text-lg sm:text-xl font-black text-white hover:text-cyan-300 flex items-center gap-2 font-mono transition-colors break-words"
            >
              <PhoneCall className="w-5 h-5 text-cyan-400" />
              <span>19122 / 1800 233 155335</span>
            </a>
            <p className="text-xs text-slate-400 leading-relaxed">
              Toll-free customer care available 24 hours across all North Gujarat subdivisions.
            </p>
          </div>
        </div>
      </div>

      {/* Strict Independent Prototype Disclosure Strip */}
      <div className="bg-[#030813] border-t border-slate-900 px-4 sm:px-8 py-8 text-center text-xs text-slate-500 space-y-3">
        <div className="max-w-[1360px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5 text-left max-w-4xl">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              <strong className="text-slate-400">Independent Demonstration Platform:</strong> VidyutOne is an independent electricity utility ERP and consumer services platform prototype designed around North Gujarat electricity distribution infrastructure. It is an independent demonstration system and not an officially deployed or operated application of Uttar Gujarat Vij Company Limited.
            </span>
          </div>

          <div className="shrink-0 flex items-center gap-4 text-slate-400">
            <button
              onClick={onOpenManifest}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Photo Manifest
            </button>
            <span>·</span>
            <button
              onClick={onOpenAboutModal}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Platform Disclosure
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-600">
          All trademarks, official logos, and organizational history are property of Uttar Gujarat Vij Company Limited / GUVNL. Built with React, Vite, Tailwind CSS & TypeScript.
        </p>
      </div>
    </footer>
  );
};
