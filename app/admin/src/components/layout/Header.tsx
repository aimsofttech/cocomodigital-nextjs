import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { logout } from '@/features/auth/authSlice';
import {
  Bars3Icon, ArrowRightOnRectangleIcon, UserCircleIcon,
  ChevronLeftIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface HeaderProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileMenu: () => void;
}

export default function Header({ collapsed, onToggleSidebar, onOpenMobileMenu }: HeaderProps) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 gap-4 transition-all duration-300 left-0 ${
        collapsed ? 'lg:left-16' : 'lg:left-64'
      }`}
    >
      {/* Left: toggle buttons */}
      <div className="flex items-center gap-2">
        {/* Mobile: opens the slide-over drawer */}
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
          aria-label="Open menu"
        >
          <Bars3Icon className="w-5 h-5 text-gray-600" />
        </button>

        {/* Desktop: collapse / expand sidebar */}
        <button
          onClick={onToggleSidebar}
          className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 transition-colors items-center justify-center"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <ChevronRightIcon className="w-4 h-4 text-gray-600" />
            : <ChevronLeftIcon  className="w-4 h-4 text-gray-600" />}
        </button>

        <span className="text-sm font-semibold text-gray-700 hidden sm:block select-none">
          Cocoma Admin
        </span>
      </div>

      {/* Right: user menu */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <UserCircleIcon className="w-6 h-6 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 hidden sm:block max-w-[140px] truncate">
            {user?.name}
          </span>
        </button>

        {showDropdown && (
          <>
            {/* Click-outside backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
            <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-3 py-2.5 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
              </div>
              <button
                onClick={() => { setShowDropdown(false); dispatch(logout()); }}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
