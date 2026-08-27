import { ReactNode, useEffect, useState, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  HomeIcon, UserGroupIcon, UsersIcon, BriefcaseIcon, PhoneIcon,
  InboxIcon, CheckCircleIcon, ClockIcon, ChartBarIcon, Cog6ToothIcon,
  BoltIcon, BellIcon, ArrowRightStartOnRectangleIcon, DocumentTextIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { logout, can } from '@/features/auth/authSlice';
import { get, patch } from '@/services/api';
import { fmtDate } from '@/components/ui';

const NAV = [
  { to: '/', label: 'Dashboard', icon: HomeIcon, perm: 'dashboard:view' },
  { to: '/leads', label: 'Leads', icon: UserGroupIcon, perm: 'leads:read' },
  { to: '/contacts', label: 'Customers', icon: UsersIcon, perm: 'contacts:read' },
  { to: '/deals', label: 'Deals', icon: BriefcaseIcon, perm: 'deals:read' },
  { to: '/calls', label: 'Calls', icon: PhoneIcon, perm: 'calls:read' },
  { to: '/inbox', label: 'Inbox', icon: InboxIcon, perm: 'messages:read' },
  { to: '/tasks', label: 'Tasks', icon: CheckCircleIcon, perm: 'tasks:read' },
  { to: '/followups', label: 'Follow-ups', icon: ClockIcon, perm: 'followups:manage' },
  { to: '/calendar', label: 'Calendar', icon: CalendarDaysIcon, perm: 'dashboard:view' },
  { to: '/templates', label: 'Templates', icon: DocumentTextIcon, perm: 'messages:read' },
  { to: '/automations', label: 'Automations', icon: BoltIcon, perm: 'automations:manage' },
  { to: '/reports', label: 'Reports', icon: ChartBarIcon, perm: 'reports:view' },
  { to: '/settings', label: 'Settings', icon: Cog6ToothIcon, perm: 'settings:manage' },
];

const NotificationBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await get('/crm/api/notifications', { limit: 12 });
      setItems(res.data as any[]);
      setUnread(res.meta?.unread || 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);   // live-ish bell without websockets
    return () => clearInterval(t);
  }, [load]);

  const openItem = async (n: any) => {
    setOpen(false);
    await patch(`/crm/api/notifications/${n._id}/read`).catch(() => {});
    load();
    if (n.entity?.kind === 'lead' && n.entity?.id) navigate(`/leads/${n.entity.id}`);
    else if (n.entity?.kind === 'contact' && n.entity?.id) navigate(`/contacts/${n.entity.id}`);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100">
        <BellIcon className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 card max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            <button
              className="text-xs text-primary-600 hover:underline"
              onClick={async () => { await patch('/crm/api/notifications/read-all').catch(() => {}); load(); }}
            >
              Mark all read
            </button>
          </div>
          {items.length === 0 && <p className="p-4 text-center text-sm text-gray-400">No notifications</p>}
          {items.map((n) => (
            <button
              key={n._id}
              onClick={() => openItem(n)}
              className={clsx('block w-full border-b border-gray-50 px-3 py-2.5 text-left hover:bg-gray-50', !n.isRead && 'bg-primary-50/50')}
            >
              <p className="text-sm font-medium text-gray-800">{n.title}</p>
              {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{n.body}</p>}
              <p className="mt-0.5 text-[11px] text-gray-400">{fmtDate(n.createdAt)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Layout = ({ children }: { children: ReactNode }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);

  const doLogout = async () => {
    if (!window.confirm('Log out of the CRM?')) return;
    await dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 w-56 border-r border-gray-200 bg-white">
        <div className="flex h-14 items-center gap-2 border-b border-gray-100 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-extrabold text-white">C</div>
          <span className="text-sm font-bold">Cocoma <span className="text-primary-600">CRM</span></span>
        </div>
        <nav className="space-y-0.5 p-2">
          {NAV.filter((n) => can(user, n.perm)).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                clsx('flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium',
                  isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50')}
            >
              <n.icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="ml-56 flex-1">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-end gap-3 border-b border-gray-200 bg-white px-5">
          <NotificationBell />
          <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
              {user?.name?.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold leading-tight">{user?.name}</p>
              <p className="text-[11px] text-gray-400 leading-tight">{user?.role}</p>
            </div>
            <button onClick={doLogout} title="Logout" className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
              <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
            </button>
          </div>
        </header>
        <main className="p-5">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
