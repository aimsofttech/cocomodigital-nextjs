import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  HomeIcon, ChartBarIcon, MegaphoneIcon, PaintBrushIcon, CodeBracketIcon,
  BuildingStorefrontIcon, BookOpenIcon, BriefcaseIcon, PhotoIcon,
  DocumentTextIcon, EnvelopeIcon, ChevronRightIcon, XMarkIcon,
  RectangleGroupIcon, TagIcon, BuildingOffice2Icon, Squares2X2Icon,
  VideoCameraIcon, StarIcon, FilmIcon, RectangleStackIcon, ListBulletIcon,
  RocketLaunchIcon, ClipboardDocumentListIcon, SparklesIcon, UserGroupIcon,
  QuestionMarkCircleIcon, NewspaperIcon, UsersIcon, UserIcon, PhoneIcon,
  CursorArrowRaysIcon, TrophyIcon, ChatBubbleLeftRightIcon, CalendarIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';

// ── Nav tree ────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  path?: string;
  icon?: React.ElementType;
  children?: NavItem[];
  /** Show the item but make it non-clickable (greyed out). */
  disabled?: boolean;
}

const navigation: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: ChartBarIcon },
  {
    label: 'Home', icon: HomeIcon,
    children: [
      { label: 'Top Banner', path: '/home/top-banner', icon: RectangleGroupIcon },
      { label: 'Brands', path: '/home/brands', icon: TagIcon },
      {
        label: 'Services', icon: BriefcaseIcon,
        children: [
          { label: 'Service Departments', path: '/home/service-department', icon: BuildingOffice2Icon },
          { label: 'Service Categories', path: '/home/service-category', icon: Squares2X2Icon },
        ],
      },
      {
        label: 'Growth at Glance', icon: ChartBarIcon,
        children: [
          { label: 'Growth Numbers', path: '/home/growth-stats', icon: TrophyIcon },
          { label: 'Video', path: '/home/video', icon: VideoCameraIcon },
        ],
      },
      {
        label: 'Media Portfolio', icon: FilmIcon,
        children: [
          { label: 'Categories', path: '/settings/home-sections', icon: RectangleStackIcon },
          { label: 'Items', path: '/settings/home-section-items', icon: ListBulletIcon },
        ],
      },
      { label: 'Success Stories', path: '/home/client', icon: StarIcon },
    ],
  },
  {
    label: 'Marketing Campaigns', icon: MegaphoneIcon,
    children: [
      { label: 'Categories', path: '/marketing/category', icon: TagIcon },
      { label: 'Campaigns', path: '/marketing/item', icon: ListBulletIcon },
      { label: 'Bulk Upload', path: '/marketing/bulk-upload', icon: ArrowUpTrayIcon },
      {
        label: 'Campaigns Section', icon: RectangleStackIcon,
        children: [
          { label: 'Poster Media', path: '/marketing/poster-media', icon: PhotoIcon },
          { label: 'Highlights', path: '/marketing/highlights', icon: StarIcon },
          { label: 'Our Activities', path: '/marketing/idea-strategy-planning', icon: SparklesIcon },
          { label: 'Add-on Activities Categories', path: '/marketing/add-on-activities-category', icon: Squares2X2Icon },
          { label: 'Add-on Activities Items', path: '/marketing/add-on-activities-item', icon: ListBulletIcon },
          { label: 'Content Categories', path: '/marketing/content-category', icon: TagIcon },
          { label: 'Content Items', path: '/marketing/content-item', icon: RectangleStackIcon },
          { label: 'Performance', path: '/marketing/performance', icon: ChartBarIcon },
          { label: 'Continuity Category', path: '/marketing/community-program', icon: UserGroupIcon },
          { label: 'Continuity Items', path: '/marketing/community-program-item', icon: ListBulletIcon },
          { label: 'FAQ', path: '/marketing/faq', icon: QuestionMarkCircleIcon },
        ],
      },
    ],
  },
  {
    label: 'Creative House', icon: PaintBrushIcon,
    children: [
      { label: 'Categories', path: '/creative/category', icon: TagIcon },
      { label: 'Items', path: '/creative/item', icon: ListBulletIcon },
      {
        label: 'Item Sections', icon: RectangleStackIcon,
        children: [
          { label: 'Creative Approach', path: '/creative/approach', icon: SparklesIcon },
          { label: 'Project Media', path: '/creative/final-output', icon: FilmIcon },
        ],
      },
      { label: 'Projects', path: '/creative/project', icon: RocketLaunchIcon },
    ],
  },
  // Development House is shown but disabled — not consumed by the web app yet.
  { label: 'Development House', icon: CodeBracketIcon, disabled: true },
  {
    label: 'Group Services', icon: BuildingStorefrontIcon,
    children: [
      { label: 'Top Banner', path: '/group-service/top-banner', icon: RectangleGroupIcon },
      { label: 'Service Departments', path: '/group-service/service-department', icon: BuildingOffice2Icon },
      { label: 'Service Categories', path: '/group-service/service-category', icon: Squares2X2Icon },
      { label: 'Group Categories', path: '/group-service/category', icon: TagIcon },
      { label: 'Group Service Items', path: '/group-service/item', icon: ListBulletIcon },
      {
        label: 'Item Section', icon: RectangleStackIcon,
        children: [
          { label: 'Service Media', path: '/group-service/single-service-image', icon: PhotoIcon },
          { label: 'Recent Work', path: '/group-service/recent-work', icon: FilmIcon },
          { label: 'Portfolio Category', path: '/group-service/portfolio-category', icon: BriefcaseIcon },
          { label: 'Portfolio Items', path: '/group-service/portfolio-item', icon: ListBulletIcon },
          { label: 'FAQ', path: '/group-service/faq', icon: QuestionMarkCircleIcon },
        ],
      },
    ],
  },
  {
    label: 'Blog', icon: BookOpenIcon,
    children: [
      { label: 'Categories', path: '/blog/category', icon: TagIcon },
      { label: 'Sub Categories', path: '/blog/sub-category', icon: Squares2X2Icon },
      { label: 'Posts', path: '/blog/item', icon: NewspaperIcon },
    ],
  },
  {
    label: 'Jobs', icon: BriefcaseIcon,
    children: [
      { label: 'Categories', path: '/jobs/category', icon: TagIcon },
      { label: 'Job Listings', path: '/jobs/list', icon: ListBulletIcon },
      { label: 'Applicants', path: '/jobs/applicants', icon: UsersIcon },
    ],
  },
  {
    label: 'Gallery', icon: PhotoIcon,
    children: [
      { label: 'Images', path: '/gallery/images', icon: PhotoIcon },
      { label: 'Videos', path: '/gallery/videos', icon: VideoCameraIcon },
    ],
  },
  {
    label: 'Templates', icon: DocumentTextIcon,
    children: [
      { label: 'Author', path: '/templates/author', icon: UserIcon },
      { label: 'Banner Title', path: '/templates/banner-title', icon: RectangleGroupIcon },
      { label: 'Book Call', path: '/templates/book-call', icon: PhoneIcon },
      { label: 'User Choice', path: '/templates/user-choice', icon: CursorArrowRaysIcon },
      { label: 'Our Advantage', path: '/templates/our-advantage', icon: TrophyIcon },
      { label: 'Success Stories', path: '/templates/success-stories-project', icon: StarIcon },
      { label: 'FAQs', path: '/templates/faq', icon: QuestionMarkCircleIcon },
      { label: 'WhatsApp Templates', path: '/templates/whatsapp', icon: ChatBubbleLeftRightIcon },
      { label: 'Admin Posts', path: '/templates/admin-post', icon: NewspaperIcon },
      { label: 'Pages', path: '/templates/page', icon: DocumentTextIcon },
    ],
  },
  {
    label: 'Contact', icon: EnvelopeIcon,
    children: [
      { label: 'Contact Us', path: '/contact/contact-us', icon: EnvelopeIcon },
      { label: 'Free Consultation', path: '/contact/free-consultation', icon: CalendarIcon },
      { label: 'Meeting Requests', path: '/contact/meetings', icon: PhoneIcon },
      { label: 'Form Submissions', path: '/marketing/form-submissions', icon: ClipboardDocumentListIcon },
    ],
  },
];

// ── NavGroup — handles a single item (leaf or collapsible group) ─────────────

interface NavGroupProps {
  item: NavItem;
  level?: number;
}

// Whether any descendant path (at any nesting depth) matches the given
// pathname (prefix-match so /marketing/item/123/images counts as matching
// /marketing/item).
const hasActiveDescendant = (item: NavItem, pathname: string): boolean =>
  !!item.children?.some(
    (c) => (c.path && pathname.startsWith(c.path)) || hasActiveDescendant(c, pathname)
  );

function NavGroup({ item, level = 0 }: NavGroupProps) {
  const location = useLocation();

  const isChildActive = hasActiveDescendant(item, location.pathname);

  // Start open when a child is active; user can manually toggle after that.
  const [open, setOpen] = useState(isChildActive);

  // Auto-open when navigating into this group from outside.
  useEffect(() => {
    if (isChildActive) setOpen(true);
  }, [isChildActive]);

  const Icon = item.icon;
  const indent = level > 0 ? 'pl-8 text-xs' : '';

  // ── Disabled (shown but not clickable) ──────────────────────────────────────
  if (item.disabled) {
    return (
      <div
        className={`sidebar-link ${indent} opacity-50 cursor-not-allowed select-none`}
        title="Coming soon"
        aria-disabled="true"
      >
        {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
        <span className="truncate">{item.label}</span>
      </div>
    );
  }

  // ── Leaf (no children) ──────────────────────────────────────────────────────
  if (!item.children) {
    return (
      <NavLink
        to={item.path!}
        end={item.path === '/dashboard'}
        className={({ isActive }) =>
          `${isActive ? 'sidebar-link-active' : 'sidebar-link'} ${indent}`
        }
      >
        {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
        <span className="truncate">{item.label}</span>
      </NavLink>
    );
  }

  // ── Group (has children) ────────────────────────────────────────────────────
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`sidebar-link w-full justify-between ${indent} ${isChildActive ? 'text-primary-700 bg-primary-50' : ''
          }`}
      >
        <span className="flex items-center gap-3 min-w-0">
          {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
          <span className="truncate text-sm font-medium">{item.label}</span>
        </span>
        <span className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>
          <ChevronRightIcon className="w-3.5 h-3.5" />
        </span>
      </button>

      {/* Child list with smooth height animation */}
      <div
        className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-[1500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
      >
        <div className="mt-0.5 space-y-0.5 pl-2 pb-1">
          {item.children.map((child) => (
            <NavGroup key={child.label} item={child} level={level + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Collapsed icon item (desktop icon-only mode) ─────────────────────────────

interface CollapsedItemProps {
  item: NavItem;
}

function CollapsedItem({ item }: CollapsedItemProps) {
  const location = useLocation();
  const Icon = item.icon;
  if (!Icon) return null;

  // Disabled: render a greyed, non-clickable icon (with tooltip).
  if (item.disabled) {
    return (
      <div className="relative group">
        <div
          title={item.label}
          aria-disabled="true"
          className="flex items-center justify-center w-10 h-10 mx-auto rounded-lg text-gray-300 opacity-50 cursor-not-allowed"
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-lg">
          {item.label}
        </div>
      </div>
    );
  }

  const path = item.path ?? item.children?.[0]?.path ?? '#';
  const isActive = item.path
    ? location.pathname === item.path || location.pathname.startsWith(item.path + '/')
    : hasActiveDescendant(item, location.pathname);

  return (
    <div className="relative group">
      <NavLink
        to={path}
        title={item.label}
        className={`flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-colors ${isActive
          ? 'bg-primary-50 text-primary-700'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
          }`}
      >
        <Icon className="w-5 h-5" />
      </NavLink>

      {/* Tooltip */}
      <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-lg">
        {item.label}
        {/* Arrow */}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ collapsed, mobileOpen, onMobileClose }: SidebarProps) {
  return (
    <aside
      className={[
        // Base: fixed panel on the left
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200',
        'transition-all duration-300',
        // Mobile: full-width drawer, slides in/out
        'w-72',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        // Desktop (lg+): always visible, width depends on collapsed state
        collapsed ? 'lg:w-16 lg:translate-x-0' : 'lg:w-64 lg:translate-x-0',
      ].join(' ')}
    >
      {/* ── Logo / brand ───────────────────────────────────────── */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 flex-shrink-0">
        {/* Mobile: always show full logo + close button */}
        <span className={`text-xl font-bold text-gray-900 lg:hidden`}>
          Cocoma <span className="text-primary-600">Digital</span>
        </span>
        {/* Desktop: logo switches with collapsed state */}
        <span className={`hidden lg:block text-xl font-bold ${collapsed ? 'text-primary-600' : 'text-gray-900'}`}>
          {collapsed ? 'C' : <>Cocoma <span className="text-primary-600">Digital</span></>}
        </span>

        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
          aria-label="Close menu"
        >
          <XMarkIcon className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* ── Full nav (mobile always, desktop when not collapsed) ── */}
      <nav
        className={`flex-1 overflow-y-auto p-3 space-y-0.5 ${collapsed ? 'lg:hidden' : 'block'
          }`}
      >
        {navigation.map((item) => (
          <NavGroup key={item.label} item={item} />
        ))}
      </nav>

      {/* ── Icon-only nav (desktop collapsed mode only) ─────────── */}
      <nav
        className={`hidden flex-col flex-1 overflow-y-auto py-3 px-1 space-y-1 ${collapsed ? 'lg:flex' : ''
          }`}
      >
        {navigation.map((item) => (
          <CollapsedItem key={item.label} item={item} />
        ))}
      </nav>

      {/* ── Footer (version / info — hidden when collapsed) ─────── */}
      <div className={`flex-shrink-0 border-t border-gray-100 px-4 py-3 ${collapsed ? 'lg:hidden' : ''}`}>
        <p className="text-xs text-gray-400 text-center">Cocoma Admin v1.0</p>
      </div>
    </aside>
  );
}
