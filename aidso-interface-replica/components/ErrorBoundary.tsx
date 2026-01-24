import React from 'react';

export class ErrorBoundary extends React.Component<
  { title?: string; children: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: { title?: string; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error('ErrorBoundary caught error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const message = String(this.state.error?.message || this.state.error || 'Unknown error');

    return (
      <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100 bg-red-50/40">
          <div className="text-sm font-extrabold text-gray-900">{this.props.title || '页面渲染失败'}</div>
          <div className="text-xs text-gray-600 mt-1">请刷新页面，或把下面的错误信息发我，我帮你修。</div>
        </div>
        <div className="p-6">
          <pre className="text-xs bg-gray-50 border border-gray-100 rounded-lg p-4 overflow-auto whitespace-pre-wrap text-gray-700">
            {message}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }
}

