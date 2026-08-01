'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-7 text-center">
          <p className="font-mono text-sm text-gray-500">Error</p>
          <h1 className="text-3xl font-bold">Something went wrong</h1>
          <p className="text-sm leading-relaxed text-gray-500">
            A critical error occurred. Please try again.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-[44px] items-center rounded-sm bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
