import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, Copy, Check, ShieldAlert } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  scope?: 'app' | 'portal' | 'drawer' | 'widget';
  onReset?: () => void;
  showHomeAction?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // Safe diagnostic log without sensitive secrets
    console.error(
      `[VidyutFlow ErrorBoundary:${this.props.scope || 'general'}] Runtime exception intercepted:`,
      error.message
    );
  }

  private handleReset = (): void => {
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch {
        // Ignore reset callback error
      }
    }
    this.setState({ hasError: false, error: null, errorInfo: null, copied: false });
  };

  private handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleCopyDiagnostic = (): void => {
    const diagnostic = [
      `VidyutFlow 2.0 Diagnostic Report`,
      `Scope: ${this.props.scope || 'general'}`,
      `Timestamp: ${new Date().toISOString()}`,
      `Error: ${this.state.error?.name || 'Error'}: ${this.state.error?.message || 'Unknown error'}`,
      `Component Stack: ${this.state.errorInfo?.componentStack?.slice(0, 500) || 'None'}`
    ].join('\n');

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(diagnostic).then(() => {
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2000);
      }).catch(() => {});
    }
  };

  public render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { scope = 'general', fallbackTitle, fallbackMessage } = this.props;

    // Compact fallback for widgets or small sections
    if (scope === 'widget') {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 rounded-xl border border-red-200 bg-red-50/70 text-slate-800 text-xs my-2 flex flex-col gap-2"
        >
          <div className="flex items-center gap-2 text-red-700 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{fallbackTitle || 'Component Encountered an Issue'}</span>
          </div>
          <p className="text-slate-600">
            {fallbackMessage || 'This section was isolated to prevent interruption to the rest of the workspace.'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-red-300 text-red-700 font-medium hover:bg-red-50 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" aria-hidden="true" />
            <span>Retry Section</span>
          </button>
        </div>
      );
    }

    // Portal or App level fallback
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="min-h-[360px] p-6 sm:p-8 rounded-2xl border border-red-200 bg-white shadow-sm flex flex-col items-center justify-center text-center my-6 max-w-2xl mx-auto"
      >
        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 mb-4 ring-8 ring-red-50">
          <ShieldAlert className="w-7 h-7" aria-hidden="true" />
        </div>

        <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-full mb-2 border border-red-100">
          UGVCL VidyutFlow Fault Isolation
        </span>

        <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
          {fallbackTitle || (scope === 'portal' ? 'Portal View Isolation Active' : 'Application Resilience Safeguard')}
        </h3>

        <p className="text-xs sm:text-sm text-slate-600 max-w-md mt-2 leading-relaxed">
          {fallbackMessage ||
            'A runtime exception was intercepted safely. Your DEMO records, bills, connection profiles, and offline actions remain completely protected in state.'}
        </p>

        {this.state.error?.message && (
          <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 max-w-md text-left font-mono text-[11px] text-slate-700 overflow-x-auto w-full">
            <span className="text-red-600 font-bold">Error:</span> {this.state.error.message}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#0A5C36] text-white hover:bg-[#074729] shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Retry Portal View</span>
          </button>

          <button
            type="button"
            onClick={this.handleReload}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reload Application</span>
          </button>

          <button
            type="button"
            onClick={this.handleCopyDiagnostic}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Copy non-sensitive diagnostic report"
          >
            {this.state.copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Diagnostic Info</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }
}
