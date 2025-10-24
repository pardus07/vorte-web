/**
 * Error display component for RFC 9457 Problem Details.
 */
import { ProblemDetails } from '@/lib/api/client';

interface ErrorDisplayProps {
  error: Error & { problem?: ProblemDetails; status?: number; needsRefresh?: boolean };
  onRetry?: () => void;
  onRefresh?: () => void;
}

export function ErrorDisplay({ error, onRetry, onRefresh }: ErrorDisplayProps) {
  const problem = error.problem;
  
  // 409 Conflict - needs refresh
  if (error.status === 409 || error.needsRefresh) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              {problem?.title || 'Resource Modified'}
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>{problem?.detail || error.message}</p>
            </div>
            {onRefresh && (
              <div className="mt-4">
                <button
                  onClick={onRefresh}
                  className="rounded-md bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-800 hover:bg-yellow-100"
                >
                  Refresh and Try Again
                </button>
              </div>
            )}
            {problem?.traceId && (
              <p className="mt-2 text-xs text-yellow-600">
                Trace ID: {problem.traceId}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // 428 Precondition Required
  if (error.status === 428) {
    return (
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-orange-800">
              {problem?.title || 'Precondition Required'}
            </h3>
            <div className="mt-2 text-sm text-orange-700">
              <p>{problem?.detail || error.message}</p>
            </div>
            {onRetry && (
              <div className="mt-4">
                <button
                  onClick={onRetry}
                  className="rounded-md bg-orange-50 px-3 py-2 text-sm font-medium text-orange-800 hover:bg-orange-100"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // 429 Rate Limit
  if (error.status === 429) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              {problem?.title || 'Rate Limit Exceeded'}
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{problem?.detail || error.message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Generic error
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            {problem?.title || 'Error'}
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{problem?.detail || error.message}</p>
          </div>
          {onRetry && (
            <div className="mt-4">
              <button
                onClick={onRetry}
                className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
              >
                Try Again
              </button>
            </div>
          )}
          {problem?.traceId && (
            <p className="mt-2 text-xs text-red-600">
              Trace ID: {problem.traceId}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
