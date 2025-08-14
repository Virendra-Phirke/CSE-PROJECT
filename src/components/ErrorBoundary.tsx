import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary flex items-center justify-center p-4">
          <div className="card p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />
              <h2 className="text-xl font-bold text-red-600">Something went wrong</h2>
            </div>
            <p className="text-gray-600 dark:text-dark-text-secondary mb-4">
              An error occurred while loading the application.
            </p>
            <details className="mb-4">
              <summary className="cursor-pointer text-sm text-gray-500">Error details</summary>
              <pre className="text-xs mt-2 p-2 bg-gray-100 dark:bg-dark-bg-secondary rounded overflow-auto">
                {this.state.error?.message}
                {'\n\n'}
                {this.state.error?.stack}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary w-full"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
