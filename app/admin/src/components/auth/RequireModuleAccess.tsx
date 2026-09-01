import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { usePermissions } from '@/features/auth/permissions';

/**
 * Blocks a route the signed-in user's role cannot open.
 *
 * Wraps the whole protected area rather than being repeated on ~200 route
 * elements: it reads the path itself, resolves the module and checks the view
 * permission, so a route added later is covered without anyone remembering to
 * guard it.
 *
 * This is the interface half only. The same decision is made again on the
 * server for every request, so typing a URL gets the user to this screen and
 * an API call behind it gets a 403.
 */
export default function RequireModuleAccess({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { canOpenPath } = usePermissions();

  if (!canOpenPath(pathname)) {
    return <Navigate to="/unauthorized" replace state={{ from: pathname }} />;
  }
  return <>{children}</>;
}
