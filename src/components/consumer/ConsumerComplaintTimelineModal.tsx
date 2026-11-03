import React, { useState } from 'react';
import { ComplaintRecord, ComplaintFeedback } from '../../types';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { sanitizeConsumerTimelineEntry } from '../common/CaseDetailDrawer';
import {
  localizeComplaintCategory,
  localizeComplaintStatus
} from '../../i18n/consumerContentTranslations';
import {
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Star,
  Send,
  ShieldCheck,
  FileText,
  CornerDownRight
} from 'lucide-react';

interface ConsumerComplaintTimelineModalProps {
  complaint: ComplaintRecord;
  isOpen: boolean;
  onClose: () => void;
  onReopened?: (newCmp: ComplaintRecord) => void;
}

export const ConsumerComplaintTimelineModal: React.FC<ConsumerComplaintTimelineModalProps> = ({
  complaint,
  isOpen,
  onClose,
  onReopened
}) => {
  const {
    submitComplaintFeedback,
    reopenComplaint,
    complaints,
    showToast
  } = useApp();
  const { language, t } = useLanguage();

  const [rating, setRating] = useState<number>(5);
  const [confirmedSatisfaction, setConfirmedSatisfaction] = useState<boolean>(true);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const [showReopenBox, setShowReopenBox] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [isSubmittingReopen, setIsSubmittingReopen] = useState(false);

  if (!isOpen) return null;

  // Retrieve fresh record in case state changed
  const currentRecord = complaints.find(c => c.id === complaint.id) || complaint;

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingFeedback(true);
    try {
      const fb: ComplaintFeedback = {
        rating,
        confirmedSatisfaction,
        comments: feedbackComments.trim() || undefined,
        submittedAt: new Date().toISOString()
      };
      submitComplaintFeedback(currentRecord.id, fb);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleReopenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanReason = reopenReason.trim();
    if (!cleanReason) {
      showToast('Please specify why the problem persists.', 'error');
      return;
    }
    setIsSubmittingReopen(true);
    try {
      const newCmp = reopenComplaint(currentRecord.id, cleanReason);
      if (newCmp) {
        setShowReopenBox(false);
        setReopenReason('');
        onReopened?.(newCmp);
      }
    } finally {
      setIsSubmittingReopen(false);
    }
  };

  // Determine stage status
  const isTerminal = currentRecord.status === 'Resolved' || currentRecord.status === 'Closed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/80 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {currentRecord.id}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {localizeComplaintCategory(currentRecord.category, language)}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {localizeComplaintStatus(currentRecord.status, language)}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
              Complaint Transparency Timeline
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Honest status history and progress tracking for your registered grievance.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reopened relationships notices */}
        {currentRecord.reopenedFromComplaintId && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900/40 text-xs flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <CornerDownRight className="w-4 h-4 shrink-0" />
            <span>
              Follow-up grievance reopened from previous ticket{' '}
              <strong className="font-mono">{currentRecord.reopenedFromComplaintId}</strong>.
            </span>
          </div>
        )}

        {currentRecord.followUpComplaintId && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/40 text-xs flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <RotateCcw className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              This grievance has been reopened as follow-up ticket{' '}
              <strong className="font-mono">{currentRecord.followUpComplaintId}</strong>.
            </span>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Grievance Description Summary */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Consumer: <strong>{currentRecord.consumerName}</strong> ({currentRecord.consumerNo})</span>
              <span>SLA Target: <strong>{currentRecord.slaTargetHours} hours</strong></span>
            </div>
            <p className="text-slate-700 dark:text-slate-300">
              {currentRecord.description}
            </p>
          </div>

          {/* Chronological Safe Timeline */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              Verified Event Timeline
            </h4>

            <div className="relative border-l-2 border-blue-500/30 ml-3 pl-4 space-y-4">
              {currentRecord.timeline.map((item, idx) => {
                const sanitized = sanitizeConsumerTimelineEntry(item, language);
                const isUnderVerification = item.stage === 'Under Verification';
                const isPending = isUnderVerification && currentRecord.status !== 'Resolved' && currentRecord.status !== 'Closed';

                return (
                  <div key={idx} className="relative">
                    <div
                      className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                        isPending
                          ? 'bg-amber-500 animate-pulse'
                          : 'bg-blue-600'
                      }`}
                    />
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        {sanitized.stage}
                        <span className="text-slate-400 font-normal">
                          • {sanitized.actorLabel}
                        </span>
                        {isPending && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold">
                            Pending Employee Verification
                          </span>
                        )}
                      </span>
                      <span>{sanitized.time}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {sanitized.remark}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feedback Section (when Resolved or Closed) */}
          {isTerminal && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500" />
                Service Quality & Feedback
              </h4>

              {currentRecord.feedback ? (
                <div className="space-y-1.5 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= currentRecord.feedback!.rating
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 ml-1.5">
                        {currentRecord.feedback.rating} / 5 Stars
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {currentRecord.feedback.confirmedSatisfaction ? 'Satisfaction Confirmed' : 'Issues Reported'}
                    </span>
                  </div>
                  {currentRecord.feedback.comments && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic pt-1">
                      &quot;{currentRecord.feedback.comments}&quot;
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} className="space-y-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Rate Resolution Quality:
                    </label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="p-1 cursor-pointer hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              star <= rating
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-slate-300 dark:text-slate-600'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 ml-2">
                        {rating} Star{rating > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="satisfaction"
                        checked={confirmedSatisfaction}
                        onChange={() => setConfirmedSatisfaction(true)}
                        className="text-blue-600"
                      />
                      <span className="text-slate-700 dark:text-slate-300">
                        Problem is fully solved (Close ticket)
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="satisfaction"
                        checked={!confirmedSatisfaction}
                        onChange={() => setConfirmedSatisfaction(false)}
                        className="text-blue-600"
                      />
                      <span className="text-slate-700 dark:text-slate-300">
                        Unresolved aspects remain
                      </span>
                    </label>
                  </div>

                  <div>
                    <textarea
                      rows={2}
                      placeholder="Optional feedback comments on service quality..."
                      value={feedbackComments}
                      onChange={e => setFeedbackComments(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingFeedback}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Feedback</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Reopen Action (when terminal and no active follow-up) */}
          {isTerminal && !currentRecord.followUpComplaintId && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              {!showReopenBox ? (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">
                    Did the problem recur or remain unresolved?
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowReopenBox(true)}
                    className="px-3.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Problem Persists? Reopen Grievance</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReopenSubmit} className="space-y-3 bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200 dark:border-amber-900/40">
                  <div className="flex items-center justify-between">
                    <strong className="text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Request Grievance Reopening
                    </strong>
                    <button
                      type="button"
                      onClick={() => setShowReopenBox(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    Per utility policy, a new linked follow-up ticket will be opened referencing this resolution history, and dispatched to the sub-divisional operations desk.
                  </p>
                  <textarea
                    rows={2}
                    required
                    placeholder="Describe how or why the issue persists (e.g. voltage drop returned during peak evening load)..."
                    value={reopenReason}
                    onChange={e => setReopenReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowReopenBox(false)}
                      className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingReopen}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isSubmittingReopen ? 'Opening Follow-up...' : 'Confirm Reopen'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
