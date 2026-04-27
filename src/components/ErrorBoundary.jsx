import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { fallback } = this.props;
    if (fallback) return fallback;

    return (
      <div className="min-h-[40vh] flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-500/15 rounded-2xl
                          flex items-center justify-center mx-auto mb-4 text-3xl">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">
            This section failed to load. Try refreshing the page.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white
                         text-sm font-semibold rounded-xl transition-colors">
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 border border-gray-200 dark:border-slate-700
                         text-gray-600 dark:text-slate-400 text-sm font-medium
                         rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              Reload page
            </button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <details className="mt-4 text-left">
              <summary className="text-xs text-gray-400 cursor-pointer">Error details (dev)</summary>
              <pre className="text-[10px] text-red-500 mt-2 overflow-auto max-h-32 bg-red-50
                              dark:bg-red-500/10 rounded-xl p-3 whitespace-pre-wrap">
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}