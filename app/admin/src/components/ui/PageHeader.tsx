import { Link } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

interface Breadcrumb {
  label: string;
  path?: string;
}

interface PageHeaderProps {
  title: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
}

export default function PageHeader({ title, breadcrumbs = [], actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
            <Link to="/dashboard" className="hover:text-gray-700">
              <HomeIcon className="w-3.5 h-3.5" />
            </Link>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRightIcon className="w-3 h-3" />
                {crumb.path ? (
                  <Link to={crumb.path} className="hover:text-gray-700">{crumb.label}</Link>
                ) : (
                  <span className="text-gray-700 font-medium">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
