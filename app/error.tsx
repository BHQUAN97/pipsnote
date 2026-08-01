'use client';

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-7 text-center">
      <p className="font-mono text-sm text-gray-mid">Error</p>
      <h1 className="text-h1 leading-tight">Something went wrong</h1>
      <p className="text-sm leading-relaxed text-gray-mid">
        An unexpected error occurred. Please try again.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="inline-flex min-h-[44px] items-center rounded-sm bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        Try again
      </button>
    </div>
  );
}
