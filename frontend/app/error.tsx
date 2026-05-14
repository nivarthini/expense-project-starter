'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-950">Something went wrong</h1>
        <button
          onClick={reset}
          className="mt-5 h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
