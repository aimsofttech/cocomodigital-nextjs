"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-white px-6 text-center">
      <div>
        <h1 className="text-3xl font-semibold text-neutral-950">
          Something went wrong
        </h1>
        <p className="mt-3 max-w-md text-neutral-600">
          The page could not load cleanly. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded bg-neutral-950 px-5 py-3 text-sm font-medium text-white"
        >
          Retry
        </button>
      </div>
    </main>
  );
}
