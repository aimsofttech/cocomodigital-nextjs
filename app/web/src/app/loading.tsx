export default function Loading() {
  return (
    <main className="min-h-screen animate-pulse bg-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-8">
        <div className="h-16 rounded bg-neutral-100" />
        <div className="grid flex-1 gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded bg-neutral-100" />
          <div className="rounded bg-neutral-100" />
        </div>
      </div>
    </main>
  );
}
