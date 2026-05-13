import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🛡️ Widget Crash caught by Boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#0f0f11] border border-red-500/20 rounded-[32px] p-8 text-center w-full max-w-[380px] mx-auto shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6 border border-red-500/20">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h3 className="text-white font-bold text-lg mb-2">Something went wrong</h3>
          <p className="text-white/40 text-sm mb-8 leading-relaxed">
            The tipping engine encountered an unexpected error. This has been logged for review.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full h-14 rounded-xl bg-white/5 border border-white/10 text-white font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
          >
            <RotateCcw size={18} /> Reload Widget
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
