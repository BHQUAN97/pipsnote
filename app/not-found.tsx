import Link from 'next/link';

export default function RootNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-7 text-center">
      <p className="font-mono text-sm text-gray-mid">404</p>
      <h1 className="text-h1 leading-tight">Page not found</h1>
      <p className="text-sm leading-relaxed text-gray-mid">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-[44px] items-center rounded-sm bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        Back to homepage
      </Link>
    </div>
  );
}
