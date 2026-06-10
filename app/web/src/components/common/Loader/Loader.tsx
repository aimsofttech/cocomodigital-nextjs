// @ts-nocheck
/**
 * <Loader />
 *
 * Full-page brand loader. Used as a temporary replacement while
 * a route's primary data fetch is in flight (marketing portfolio,
 * single video, creative house, web series individual, etc.).
 *
 * Visual idiom is harmonised with the in-section skeleton spinners
 * on the home + service pages: white surface, yellow brand spinner
 * ring on a soft neutral track.
 */
const Loader = () => {
  return (
    <div
      className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-page px-section-x py-section"
      role="status"
      aria-live="polite"
    >
      <div
        className="size-14 animate-spin rounded-full border-4 border-[rgba(17,17,17,0.1)] border-t-brand motion-reduce:animate-none"
        aria-hidden="true"
      />
      <p className="m-0 font-primary text-[length:var(--fs-eyebrow)] font-bold uppercase tracking-[var(--tracking-wider)] text-muted">
        Loading...
      </p>
    </div>
  );
};

export default Loader;
