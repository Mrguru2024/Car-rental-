'use client'

import { Component, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error) => boolean // Return false to suppress error UI
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Suppress findDOMNode errors - they're deprecation warnings, not breaking errors
    if (error.message?.includes('findDOMNode') || error.stack?.includes('findDOMNode')) {
      // Don't log findDOMNode errors - they're expected with react-quill v2.0.0
      // The component will still work despite the warning
      return
    }
    console.error('RichTextEditor Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      // Check if error should be suppressed
      if (this.props.onError && this.state.error && !this.props.onError(this.state.error)) {
        // Suppress error - return children anyway (for findDOMNode errors)
        return this.props.children
      }
      
      if (this.props.fallback) {
        return this.props.fallback
      }
      
      return (
        <div className="min-h-[400px] border border-red-200 dark:border-red-800 rounded-lg p-6 flex flex-col items-center justify-center">
          <div className="text-red-600 dark:text-red-400 text-center">
            <svg
              className="w-12 h-12 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="font-medium mb-2">Editor failed to load</p>
            <p className="text-sm mb-4 text-brand-gray dark:text-brand-white/70">
              The rich text editor encountered an error. Please use the textarea below as an alternative.
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
