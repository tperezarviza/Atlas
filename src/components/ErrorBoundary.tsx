import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="h-screen w-screen flex items-center justify-center"
          style={{ background: '#000000' }}
        >
          <div
            className="max-w-[500px] rounded-[14px] p-6"
            style={{ background: '#000000', border: '1px solid rgba(255,200,50,0.10)' }}
          >
            <div className="font-title text-[16px] font-bold tracking-[2px] text-critical mb-3">
              ATLAS — RENDER ERROR
            </div>
            <div className="font-data text-[12px] text-text-secondary mb-4 leading-[1.5]">
              A component crashed and the dashboard cannot continue rendering.
            </div>
            <div
              className="font-data text-[10px] text-text-muted p-3 rounded-[2px] mb-4 max-h-[120px] overflow-y-auto"
              style={{ background: 'rgba(255,59,59,.06)', border: '1px solid rgba(255,59,59,.15)' }}
            >
              {this.state.error?.message ?? 'Unknown error'}
            </div>
            <button
              onClick={this.handleReset}
              className="font-data text-[11px] px-4 py-2 rounded-[2px] tracking-[0.5px] cursor-pointer"
              style={{
                border: '1px solid rgba(255,200,50,0.10)',
                background: 'rgba(255,200,50,.1)',
                color: '#ffc832',
              }}
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
