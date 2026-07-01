import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertOctagon, RotateCcw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error captured by layout boundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#08142D] flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="max-w-md w-full bg-[#0F172A] border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            {/* Background warning pattern */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
              <AlertOctagon className="text-red-500" size={28} />
            </div>

            <h1 className="text-white font-extrabold text-lg mb-2 font-['Manrope']">
              Something went wrong
            </h1>
            <p className="text-[#64748B] text-xs leading-relaxed mb-6">
              A layout crash occurred in this section. We have captured the details and are automatically recovering.
            </p>

            {this.state.error && (
              <div className="bg-[#1E293B]/40 border border-white/5 rounded-xl p-3 text-left font-mono text-[10px] text-red-300/80 mb-6 overflow-x-auto max-h-24 leading-normal">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md shadow-blue-500/10"
              >
                <RotateCcw size={13} />
                Reload App
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-[#1E293B] text-[#94A3B8] hover:text-white border border-white/6 font-bold px-4 py-3 rounded-xl text-xs transition-all"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
