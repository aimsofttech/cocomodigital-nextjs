import { Suspense, useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ContentLoader from '@/components/ui/ContentLoader';

const COLLAPSED_KEY = 'sidebar_collapsed';

// ── Top progress bar — thin line that sweeps across on every navigation ───────

function TopProgressBar() {
  const { pathname } = useLocation();
  const [key, setKey] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setKey((k) => k + 1);
    setVisible(true);
    // Hide after the sweep animation finishes (0.5 s sweep + 0.15 s hold)
    const timer = setTimeout(() => setVisible(false), 700);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div
      className={`fixed top-0 left-0 right-0 h-[3px] z-50 overflow-hidden pointer-events-none transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Re-key restarts the CSS animation on every navigation */}
      <div key={key} className="h-full bg-primary-600 animate-progress-bar" />
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function Layout() {
  const { pathname } = useLocation();

  // Desktop collapsed state — persisted across refreshes
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(COLLAPSED_KEY) === 'true'
  );

  // Mobile drawer state — resets on navigation
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleToggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top progress bar — rendered at root so it sits above everything */}
      <TopProgressBar />

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Persistent sidebar — NEVER inside a Suspense boundary */}
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main area — shifts right on desktop */}
      <div
        className={`flex flex-col min-h-screen transition-all duration-300 ${
          collapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}
      >
        {/* Persistent header — NEVER inside a Suspense boundary */}
        <Header
          collapsed={collapsed}
          onToggleSidebar={handleToggleCollapsed}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />

        {/*
          Page content area — the ONLY part that shows a loader during navigation.
          Inner <Suspense> catches lazy-load suspensions from <Outlet> children.
          The sidebar and header above are completely unaffected.
        */}
        <main className="flex-1 mt-16">
          <div className="p-4 sm:p-6">
            <Suspense fallback={<ContentLoader />}>
              {/*
                Key = pathname so the fade-in animation replays on every navigation.
                For already-cached pages this is instant (just re-animates).
                For first-visit lazy chunks, Suspense shows ContentLoader instead.
              */}
              <div key={pathname} className="animate-page-in">
                <Outlet />
              </div>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
