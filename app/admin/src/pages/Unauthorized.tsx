import { Link, useLocation } from 'react-router-dom';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { usePermissions } from '@/features/auth/permissions';

/**
 * Where a user lands after asking for a module their role does not include.
 * Deliberately plain and non-alarming: reaching this is usually a stale
 * bookmark, not an attack.
 */
export default function Unauthorized() {
  const location = useLocation();
  const { roleName } = usePermissions();
  const from = (location.state as { from?: string } | null)?.from;

  return (
    <div className="flex items-center justify-center py-20">
      <div className="card max-w-md text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
          <LockClosedIcon className="w-6 h-6 text-gray-400" />
        </div>
        <h1 className="mt-4 text-base font-semibold text-gray-900">
          You don’t have access to this area
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {from ? <>Your role{roleName ? ` (${roleName})` : ''} doesn’t include <span className="font-medium text-gray-700">{from}</span>. </> : null}
          Ask a Super Admin if you need it.
        </p>
        <Link to="/dashboard" className="btn-primary btn-sm inline-flex mt-5">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
