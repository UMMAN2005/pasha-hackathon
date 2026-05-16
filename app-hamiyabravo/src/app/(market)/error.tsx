"use client";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function MarketError({ error, reset }: ErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
        <h2 className="text-lg font-semibold text-red-900 mb-2">Error occurred</h2>
        <p className="text-sm text-red-700 mb-4">
          An error occurred loading the market. Please try again.
        </p>
        {error.message && (
          <p className="text-xs text-red-600 mb-4 font-mono">{error.message}</p>
        )}
        <button
          onClick={reset}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
