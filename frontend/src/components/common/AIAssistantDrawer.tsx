import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  X,
  Send,
  Info,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  Cpu,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';
import { SafeMarkdown } from './SafeMarkdown';
import { generateUtilityGroundedResponse } from '../../utils/utilityAiEngine';
import { AGENTIC_PERSONAS } from '../../server/agenticPersonas';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  isError?: boolean;
  isFallback?: boolean;
  executedTools?: string[];
  personaName?: string;
  contextTag?: 'account-record' | 'tariff-guidance' | 'system';
}

export const formatToolChipName = (toolName: string): string => {
  const map: Record<string, string> = {
    getConsumerBillDetails: 'Checked Billing Ledgers',
    calculateTariffEstimate: 'Calculated GERC Slabs',
    getConsumerConnectionDetails: 'Verified Connection Technicals',
    getConsumerPaymentHistory: 'Queried Payment Transactions',
    getConsumerComplaints: 'Inspected Grievance Tickets',
    getConsumerApplications: 'Tracked Connection Applications',
    listPendingApplications: 'Scanned Application Queue',
    getComplaintSlaRisks: 'Evaluated SLA Breach Risks',
    getConsumerLedgerSummary: 'Summarized Consumer Ledger',
    listPendingApprovals: 'Checked Approval Queue',
    getAssignedWorkOrders: 'Retrieved Assigned Work Orders',
    getFeederAndTransformerStatus: 'Queried 11kV Feeder Telemetry',
    getSiteFeasibilityQueue: 'Checked Site Feasibility Queue',
    getSafetyProtocolGuidelines: 'Loaded CEA Safety Protocols',
    getExecutiveKpiSummary: 'Synthesized Discom KPIs',
    getFeederOverloadAnalytics: 'Analyzed Overloaded Feeders',
    getRevenueRealizationLedger: 'Inspected Revenue Ledger',
    getDiscomComplaintTrends: 'Computed Grievance Trends',
    querySystemAuditLogs: 'Scrutinized Security Audit Trail',
    getSecurityAccessMatrix: 'Audited RBAC Access Matrix',
    getSystemTelemetryStatus: 'Polled Infrastructure Telemetry',
    getRecentAuthEvents: 'Checked Authentication Events'
  };
  return map[toolName] || toolName.replace(/([A-Z])/g, ' $1').trim();
};

export const ROLE_ALLOWED_TABS: Record<string, string[]> = {
  consumer: ['dashboard', 'connections', 'new-connection', 'bills', 'payments', 'complaints', 'requests', 'notifications', 'profile'],
  employee: ['dashboard', 'applications', 'consumers', 'complaints', 'approvals', 'coordination', 'reports'],
  field: ['dashboard', 'workorders', 'inspections', 'maintenance', 'offline', 'history'],
  management: ['dashboard', 'analytics', 'sla', 'feeders', 'ai-insights', 'reports'],
  admin: ['overview', 'users', 'access', 'audit', 'integrations', 'infra', 'settings']
};

export const AIAssistantDrawer: React.FC = () => {
  const {
    isAIAssistantOpen,
    setIsAIAssistantOpen,
    currentRole,
    activeUser,
    userConnections,
    userBills,
    userPayments,
    userComplaints,
    userApplications,
    roleIncidents,
    recommendations,
    openApprovalModal,
    setActiveTab,
    showToast
  } = useApp();

  const currentPersona = AGENTIC_PERSONAS[currentRole] || AGENTIC_PERSONAS.consumer;

  const buildWelcomeMessage = (name: string, role = currentRole): ChatMessage => {
    const p = AGENTIC_PERSONAS[role] || AGENTIC_PERSONAS.consumer;
    return {
      id: `msg-welcome-${Date.now()}`,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: p.welcomeMessage(name),
      personaName: p.name,
      contextTag: 'system'
    };
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => [buildWelcomeMessage(activeUser.name, currentRole)]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shouldAutoScrollRef = useRef<boolean>(true);
  const isSubmittingRef = useRef<boolean>(false);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const activeTimeoutHandleRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up any pending network timeouts on unmount
  useEffect(() => {
    return () => {
      if (activeTimeoutHandleRef.current) {
        clearTimeout(activeTimeoutHandleRef.current);
      }
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
      }
    };
  }, []);

  // Reset conversation when authenticated user or role changes to prevent cross-session leakage
  useEffect(() => {
    if (activeTimeoutHandleRef.current) {
      clearTimeout(activeTimeoutHandleRef.current);
      activeTimeoutHandleRef.current = null;
    }
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }
    isSubmittingRef.current = false;
    setIsLoading(false);
    setMessages([buildWelcomeMessage(activeUser.name, currentRole)]);
    setLastFailedQuery(null);
    setInputVal('');
  }, [activeUser.email, activeUser.name, currentRole]);

  // Monitor user scrolling to avoid jarring auto-scroll when user is reading past messages
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // User is near bottom if within 80px
    shouldAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 80;
  };

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Build authorized, PII-minimized account-scoped context
  const accountContext = useMemo(() => {
    if (currentRole !== 'consumer') {
      return {
        consumerName: activeUser.name,
        role: currentRole,
        designation: activeUser.designation,
        hasLinkedConnections: true
      };
    }

    const hasLinked = userConnections.length > 0;
    return {
      consumerName: activeUser.name,
      hasLinkedConnections: hasLinked,
      selectedConnectionNo: userConnections[0]?.consumerNo || null,
      connections: userConnections.map(c => {
        const connBills = userBills.filter(b => b.consumerNo === c.consumerNo);
        const connComplaints = userComplaints.filter(cmp => cmp.consumerNo === c.consumerNo);
        return {
          consumerNo: c.consumerNo,
          connectionId: c.connectionId,
          consumerName: c.consumerName,
          category: c.tariffCategory,
          tariffCategory: c.tariffCategory,
          sanctionedLoadKw: c.sanctionedLoadKw,
          phase: c.phase,
          meterNo: c.meterNo,
          subdivision: c.subdivision,
          feederName: c.feederName,
          status: c.status,
          lastReadingDate: c.lastReadingDate,
          currentReadingKwh: c.currentReadingKwh,
          previousReadingKwh: c.previousReadingKwh,
          averageMonthlyKwh: c.averageMonthlyKwh,
          bills: connBills.map(b => ({
            billNo: b.billNo,
            billMonth: b.billMonth,
            billDate: b.billDate,
            dueDate: b.dueDate,
            unitsConsumed: b.unitsConsumed,
            totalAmount: b.totalAmount,
            energyCharges: b.energyCharges,
            fixedCharges: b.fixedCharges,
            fuelPriceAdjustment: b.fuelPriceAdjustment,
            electricityDuty: b.electricityDuty,
            rebateOrSubsidy: b.rebateOrSubsidy,
            status: b.status,
            paidDate: b.paidDate || null,
            transactionRef: b.transactionRef || null,
            slabBreakdown: b.slabBreakdown
          })),
          complaints: connComplaints.map(cmp => ({
            id: cmp.id,
            category: cmp.category,
            status: cmp.status,
            description: cmp.description
          }))
        };
      }),
      payments: userPayments.map(p => ({
        txId: p.txId,
        consumerNo: p.consumerNo,
        billNo: p.billNo,
        date: p.date,
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        status: p.status
      })),
      complaints: userComplaints.map(cmp => ({
        id: cmp.id,
        consumerNo: cmp.consumerNo,
        category: cmp.category,
        status: cmp.status,
        description: cmp.description
      })),
      applications: userApplications.map(app => ({
        id: app.id,
        category: app.category,
        status: app.status,
        loadKw: app.requestedLoadKw
      })),
      incidents:
        currentRole === 'consumer'
          ? []
          : roleIncidents.map(inc => ({
              id: inc.id,
              title: inc.title,
              severity: inc.severity,
              status: inc.status,
              module: inc.module,
              entityType: inc.entityType,
              entityId: inc.entityId,
              recommendedAction: inc.recommendedAction
            }))
    };
  }, [currentRole, activeUser, userConnections, userBills, userPayments, userComplaints, userApplications, roleIncidents]);

  // Suggested prompts based on active role and connections
  const suggestedPrompts = useMemo(() => {
    if (currentRole === 'consumer') {
      if (userConnections.length === 0) {
        return [
          'How do I link my electricity connection number?',
          'What documents are needed to apply for a new residential connection?',
          'Explain UGVCL RGP residential tariff slabs',
          'Where do I submit a power outage complaint?'
        ];
      }

      const primaryConn = userConnections[0];
      const primaryBills = userBills.filter(b => b.consumerNo === primaryConn.consumerNo);
      const latestBill = primaryBills[0];

      const prompts = [
        latestBill
          ? `Explain my ${latestBill.billMonth} electricity bill of ₹${latestBill.totalAmount.toLocaleString('en-IN')}.`
          : 'Explain my latest electricity bill',
        `Explain tariff slabs for my ${primaryConn.tariffCategory} connection`,
        'Requirements for 5kW rooftop solar net-metering under Surya Gujarat',
        'How do I submit an evening voltage fluctuation grievance?'
      ];

      // If user has a 2nd connection, add comparison prompt
      if (userConnections.length > 1) {
        prompts[1] = `Explain ${userConnections[1].consumerNo} (Commercial) September 2026 bill`;
      }

      return prompts;
    }

    return currentPersona.suggestedPrompts;
  }, [currentRole, currentPersona, userConnections, userBills]);

  if (!isAIAssistantOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text || isLoading || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    shouldAutoScrollRef.current = true;
    setLastFailedQuery(null);

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text
    };

    const recentHistory = messages
      .filter(m => !m.isError && m.contextTag !== 'system')
      .slice(-6)
      .map(m => ({ sender: m.sender, text: m.text }));

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputVal('');
    setIsLoading(true);

    // Finite client-side request timeout using AbortController (8 seconds)
    const REQUEST_TIMEOUT_MS = 8000;
    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;

    const timeoutHandle = setTimeout(() => {
      abortController.abort();
    }, REQUEST_TIMEOUT_MS);
    activeTimeoutHandleRef.current = timeoutHandle;

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: abortController.signal,
        body: JSON.stringify({
          message: text,
          role: currentRole,
          accountContext,
          history: recentHistory
        })
      });

      const rawText = await response.text();

      // Clear the timeout handle once full response body has been received
      if (activeTimeoutHandleRef.current) {
        clearTimeout(activeTimeoutHandleRef.current);
        activeTimeoutHandleRef.current = null;
      }

      let data: any = {};
      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          throw new Error('Invalid JSON response received from AI endpoint.');
        }
      }

      if (!response.ok && !data.reply) {
        throw new Error(data.error || `HTTP ${response.status}: Failed to reach AI service.`);
      }

      const replyText =
        typeof data.reply === 'string' && data.reply.trim().length > 0
          ? data.reply
          : generateUtilityGroundedResponse(text, currentRole, accountContext);

      const executedTools = Array.isArray(data.executedTools) ? data.executedTools : [];
      const personaName = data.persona?.name || currentPersona.name;

      const aiMsg: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: replyText,
        executedTools,
        personaName,
        isFallback: Boolean(data.isFallback || !(typeof data.reply === 'string' && data.reply.trim().length > 0)),
        contextTag: text.toLowerCase().includes('bill') || text.toLowerCase().includes('meter') ? 'account-record' : 'tariff-guidance'
      };

      // Ensure assistant response is committed to messages state
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      if (activeTimeoutHandleRef.current) {
        clearTimeout(activeTimeoutHandleRef.current);
        activeTimeoutHandleRef.current = null;
      }

      const isAbort = err?.name === 'AbortError';
      console.warn(
        `[${currentPersona.name}] ${isAbort ? 'Request timed out after 8s' : 'Offline/quota fallback activated'} — using local utility grounded engine.`
      );

      // Seamlessly fall back to client-side utility grounded engine rather than showing raw error JSON
      let fallbackReply: string;
      try {
        fallbackReply = generateUtilityGroundedResponse(text, currentRole, accountContext);
      } catch {
        fallbackReply =
          `### ${currentPersona.name} Utility Service\n\nNamaste. ${currentPersona.name} is currently experiencing a temporary service interruption. For urgent assistance with your electricity connection, billing, or power grievances, please contact the UGVCL 24x7 Toll-Free Helpline at **19122** or **1800 233 155335**.\n\n[Open Dashboard](action:dashboard)`;
      }

      const aiMsg: ChatMessage = {
        id: `msg-ai-fb-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: fallbackReply,
        personaName: currentPersona.name,
        isFallback: true,
        contextTag: text.toLowerCase().includes('bill') || text.toLowerCase().includes('meter') ? 'account-record' : 'tariff-guidance'
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      if (activeTimeoutHandleRef.current) {
        clearTimeout(activeTimeoutHandleRef.current);
        activeTimeoutHandleRef.current = null;
      }
      activeAbortControllerRef.current = null;
      isSubmittingRef.current = false;
      setIsLoading(false);
      // Refocus input
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNavigateTab = (tabId: string) => {
    const allowedTabs = ROLE_ALLOWED_TABS[currentRole] || [];
    if (!allowedTabs.includes(tabId)) {
      showToast(`Navigation target "${tabId}" is not available in the ${currentRole} portal.`, 'warning');
      return;
    }
    setActiveTab(tabId);
    showToast(`Navigated to ${tabId.replace('-', ' ')}`, 'info');
  };

  const handleResetChat = () => {
    if (activeTimeoutHandleRef.current) {
      clearTimeout(activeTimeoutHandleRef.current);
      activeTimeoutHandleRef.current = null;
    }
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }
    isSubmittingRef.current = false;
    setIsLoading(false);
    setMessages([buildWelcomeMessage(activeUser.name, currentRole)]);
    setLastFailedQuery(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in"
      onClick={() => setIsAIAssistantOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-assistant-drawer-title"
        className="w-full max-w-xl bg-white border-l border-slate-200 shadow-2xl h-full flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${currentPersona.avatarBg} flex items-center justify-center text-white shadow-sm shrink-0`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="ai-assistant-drawer-title" className="text-sm font-bold text-slate-900">
                  {currentPersona.name}
                </h3>
                <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-mono">
                  {currentPersona.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {currentPersona.title} · UGVCL ERP Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleResetChat}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Reset conversation"
              aria-label="Reset conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsAIAssistantOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close assistant"
              aria-label="Close assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Security & Grounding Status Bar */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-600 shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">
              Authorized for: <strong className="font-semibold text-slate-800">{activeUser.name}</strong>
              {currentRole === 'consumer' && (
                <span className="text-slate-400 ml-1 font-mono">
                  ({userConnections.length} connection{userConnections.length !== 1 ? 's' : ''})
                </span>
              )}
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-semibold shrink-0">
            Account-Grounded
          </span>
        </div>

        {/* Message Stream */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          role="log"
          aria-live="polite"
          aria-label="AI Assistant Conversation History"
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAFBFD]"
        >
          {messages.map(m => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[92%] rounded-xl p-3.5 shadow-2xs ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : m.isError
                      ? 'bg-rose-50 border border-rose-200 text-rose-900'
                      : 'bg-white border border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-[10px] opacity-75 mb-1.5 border-b pb-1 border-current/10">
                  <span className="font-semibold flex items-center gap-1.5">
                    {m.sender === 'user' ? (
                      activeUser.name
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-teal-600 shrink-0" />
                        <span>{m.personaName || currentPersona.name}</span>
                        {m.isFallback && (
                          <span className="text-[9px] font-mono font-medium text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                            Grounded Engine
                          </span>
                        )}
                      </>
                    )}
                  </span>
                  <span className="font-mono text-[9px]">{m.timestamp}</span>
                </div>

                {m.sender === 'user' ? (
                  <p className="text-xs leading-relaxed whitespace-pre-wrap font-sans">{m.text}</p>
                ) : (
                  <>
                    <SafeMarkdown content={m.text} onNavigateTab={handleNavigateTab} />
                    {m.executedTools && m.executedTools.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5 pt-2 border-t border-slate-100">
                        {m.executedTools.map((tool, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            <Zap className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                            <span>{formatToolChipName(tool)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center gap-2.5 text-xs text-slate-600 p-3 rounded-lg bg-teal-50/80 border border-teal-200 w-fit animate-pulse">
              <Sparkles className="w-4 h-4 text-teal-600 animate-spin" />
              <span>{currentPersona.name} is inspecting authorized ERP records & telemetry...</span>
            </div>
          )}

          {/* Retry Button for Failed Calls */}
          {lastFailedQuery && !isLoading && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="flex-1">The previous inquiry encountered an issue.</span>
              <button
                onClick={() => handleSend(lastFailedQuery)}
                className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Human-in-the-Loop Action Recommendations Banner */}
        {recommendations.filter(r => r.status === 'PENDING_APPROVAL' && (r.requiredApprovingRole === currentRole || currentRole === 'management' || currentRole === 'admin')).length > 0 && (
          <div className="px-4 py-2.5 bg-indigo-50/70 border-t border-indigo-100 shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>AI Action Recommendations (Human Concurrence Required)</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                {recommendations.filter(r => r.status === 'PENDING_APPROVAL' && (r.requiredApprovingRole === currentRole || currentRole === 'management' || currentRole === 'admin')).length} Pending
              </span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {recommendations
                .filter(r => r.status === 'PENDING_APPROVAL' && (r.requiredApprovingRole === currentRole || currentRole === 'management' || currentRole === 'admin'))
                .slice(0, 3)
                .map(rec => (
                  <div
                    key={rec.id}
                    className="p-2.5 rounded-lg bg-white border border-indigo-200/80 shadow-3xs flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] font-bold text-indigo-600">{rec.id}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          rec.riskLevel === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-700'
                            : rec.riskLevel === 'HIGH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {rec.riskLevel}
                        </span>
                        <span className="font-semibold text-slate-800 truncate text-[11px]">{rec.title}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        Diff: <span className="line-through">{rec.previousValue}</span> → <strong>{rec.proposedValue}</strong> · Approver: {rec.requiredApprovingRole.toUpperCase()}
                      </p>
                    </div>

                    <button
                      onClick={() => openApprovalModal(rec)}
                      className="px-2.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] shrink-0 shadow-3xs cursor-pointer flex items-center gap-1"
                    >
                      <span>Review &amp; Authorize</span>
                    </button>
                  </div>
                ))}
            </div>

            <p className="text-[10px] text-slate-500 italic">
              AI recommendations remain unexecuted until authorized by an authenticated human operator.
            </p>
          </div>
        )}

        {/* Suggested Operational Inquiries */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Suggested {currentPersona.name} inquiries:
            </span>
            <Lightbulb className="w-3 h-3 text-amber-500" />
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {suggestedPrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSend(p)}
                disabled={isLoading}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-teal-500 hover:text-teal-700 hover:bg-teal-50/40 transition-colors text-left disabled:opacity-50 cursor-pointer shadow-3xs"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form with Multiline Textarea */}
        <div className="p-3 border-t border-slate-100 bg-white shrink-0">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end gap-2"
          >
            <div className="flex-1 relative">
              <textarea
                id="ai-assistant-query-input"
                ref={textareaRef}
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                rows={2}
                aria-label={`Ask ${currentPersona.name}`}
                placeholder={`Ask ${currentPersona.name} about ${currentRole === 'consumer' ? 'bills, tariff slabs, solar, or outages' : currentRole === 'employee' ? 'applications, approvals, or SLA risks' : currentRole === 'field' ? 'work orders, 11kV feeders, or safety norms' : currentRole === 'management' ? 'AT&C loss, demand peaks, or revenue' : 'system telemetry, audit logs, or RBAC'}... (Enter to send)`}
                className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent font-medium disabled:opacity-60 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={!inputVal.trim() || isLoading}
              className="h-10 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center disabled:opacity-40 transition-colors shadow-2xs cursor-pointer shrink-0"
              aria-label="Send inquiry"
              title="Send inquiry (Enter)"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span>Press <kbd className="px-1 py-0.2 rounded bg-slate-100 border border-slate-200 font-mono text-[9px]">Enter</kbd> to send, <kbd className="px-1 py-0.2 rounded bg-slate-100 border border-slate-200 font-mono text-[9px]">Shift+Enter</kbd> for line break</span>
            <span>Grounded in GERC Regulations</span>
          </div>
        </div>
      </div>
    </div>
  );
};
