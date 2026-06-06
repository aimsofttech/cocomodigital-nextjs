/**
 * AppLoader — Full-screen branded loader used by the outer <Suspense> in App.tsx.
 * Shown when the entire app shell or the Login page chunk is being loaded.
 * Matches the HTML initial loader so the transition is invisible to the user.
 */
export default function AppLoader() {
  return (
    <div className="fixed inset-0 z-[9998] flex flex-col items-center justify-center gap-8 bg-white">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-[10px] bg-primary-600 flex items-center justify-center text-white font-extrabold text-lg tracking-tight select-none">
          C
        </div>
        <span className="text-[1.375rem] font-bold tracking-tight text-gray-900 select-none">
          Cocoma <span className="text-primary-600">Digital</span>
        </span>
      </div>

      {/* Animated dots */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary-600 animate-app-dot"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>

      <p className="text-xs text-gray-400 tracking-widest uppercase select-none -mt-2">
        Loading admin panel&hellip;
      </p>
    </div>
  );
}
