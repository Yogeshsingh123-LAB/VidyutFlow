import React from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Download,
  CreditCard,
  Lock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import {
  UGVCL_LOGO_ASSET_PATH,
  UGVCL_COMPANY_NAME_EN,
  UGVCL_COMPANY_NAME_GU,
} from './UgvclBrandIdentity';
import { ElectricityBill, ElectricityConnection } from '../../types';
import { Language } from '../../i18n/types';

interface BillVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: ElectricityBill | null;
  connection: ElectricityConnection | null;
  rawReference: string;
  isAuthorized: boolean;
  language: Language;
  onViewBill?: (bill: ElectricityBill) => void;
  onDownloadPdf?: (bill: ElectricityBill) => void;
  onPayBill?: (billNo: string) => void;
}

export const BillVerificationModal: React.FC<BillVerificationModalProps> = ({
  isOpen,
  onClose,
  bill,
  connection,
  rawReference,
  isAuthorized,
  language,
  onViewBill,
  onDownloadPdf,
  onPayBill,
}) => {
  if (!isOpen) return null;

  const isPaid = bill?.status === 'Paid';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="verify-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border-2 border-slate-300 dark:border-slate-700 max-w-lg w-full overflow-hidden shadow-2xl space-y-0 text-slate-900 dark:text-white">
        {/* Verification Masthead */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-5 flex items-center justify-between border-b-2 border-amber-500">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white p-1 border border-slate-200 flex items-center justify-center shrink-0">
              <img
                src={UGVCL_LOGO_ASSET_PATH || '/assets/ugvcl-logo.png'}
                alt="UGVCL Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/ugvcl-logo.png';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>UGVCL Bill Verification Service</span>
              </div>
              <h2 id="verify-modal-title" className="text-sm sm:text-base font-extrabold text-white leading-tight">
                {UGVCL_COMPANY_NAME_EN}
              </h2>
              <p className="text-[11px] text-amber-300">{UGVCL_COMPANY_NAME_GU}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs">
          {bill ? (
            <>
              {/* Authenticity Certificate Banner */}
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-sm block">Authentic UGVCL Bill Record Verified</span>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                    This bill reference has been authenticated against the VidyutFlow 2.0 Utility ERP ledger.
                  </p>
                </div>
              </div>

              {/* Verified Bill Metadata Grid */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-2.5 font-mono">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 font-sans text-[11px] uppercase">Bill Reference:</span>
                  <span className="font-bold text-blue-900 dark:text-cyan-400 text-sm">{bill.billNo}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 font-sans text-[11px] uppercase">Consumer Number:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{bill.consumerNo}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 font-sans text-[11px] uppercase">Billing Cycle:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{bill.billMonth}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 font-sans text-[11px] uppercase">Payment Due Date:</span>
                  <span className="font-bold text-rose-700 dark:text-rose-400">{bill.dueDate}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 font-sans text-[11px] uppercase">Bill Amount:</span>
                  <span className="font-black text-slate-950 dark:text-white text-base">
                    ₹{bill.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-500 font-sans text-[11px] uppercase">Current Status:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-sans ${
                      isPaid
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                    }`}
                  >
                    {isPaid ? 'PAID' : 'UNPAID'}
                  </span>
                </div>
              </div>

              {/* Privacy & Authorization Gate Note */}
              {!isAuthorized && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-2 text-[11px]">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Consumer Privacy Protection</span>
                    <p>
                      Service address and private payment transaction ledger are masked for public scanner view. Log in as registered consumer ({bill.consumerNo}) or authorized UGVCL employee to view the complete bill or execute online payment.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {onViewBill && (
                  <button
                    onClick={() => {
                      onClose();
                      onViewBill(bill);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>View Two-Page Bill</span>
                  </button>
                )}

                {onDownloadPdf && (
                  <button
                    onClick={() => {
                      onDownloadPdf(bill);
                    }}
                    className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download A4 PDF</span>
                  </button>
                )}

                {!isPaid && onPayBill && isAuthorized && (
                  <button
                    onClick={() => {
                      onClose();
                      onPayBill(bill.billNo);
                    }}
                    className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Pay Now</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Bill Reference Not Found
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs">
                The scanned verification reference <code className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{rawReference}</code> does not match any registered bill in the current system.
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold cursor-pointer"
              >
                Close Window
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
