import { useEffect, useState } from 'react';
import { dashboardApi } from '@/services/adminApi';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PageHeader from '@/components/ui/PageHeader';
import { Link } from 'react-router-dom';

interface StatCard {
  label: string;
  total: number;
  active: number;
  inactive: number;
  path: string;
  color: string;
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  green: 'bg-green-50 text-green-600 border-green-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-100',
  orange: 'bg-orange-50 text-orange-600 border-orange-100',
  red: 'bg-red-50 text-red-600 border-red-100',
  teal: 'bg-teal-50 text-teal-600 border-teal-100',
  pink: 'bg-pink-50 text-pink-600 border-pink-100',
  yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
};

export default function Dashboard() {
  const [stats, setStats] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getStats()
      .then(({ data }) => setStats(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const cards: StatCard[] = [
    { label: 'Top Banners', ...stats?.totalBanner, path: '/home/top-banner', color: 'blue' },
    { label: 'Brands', ...stats?.totalBrand, path: '/home/brands', color: 'purple' },
    { label: 'Service Departments', ...stats?.totalServiceDept, path: '/home/service-department', color: 'green' },
    { label: 'Service Category', ...stats?.totalServiceCat, path: '/home/service-category', color: 'teal' },
    { label: 'Videos', ...stats?.totalVideo, path: '/home/video', color: 'orange' },
    { label: 'Clients', ...stats?.totalClient, path: '/home/client', color: 'pink' },
    { label: 'Marketing Categories', ...stats?.totalMarketingCategory, path: '/marketing/category', color: 'red' },
    { label: 'Marketing Campaigns', ...stats?.totalMarketingItem, path: '/marketing/item', color: 'yellow' },
    { label: 'Creative Categories', ...stats?.totalCreativeCategory, path: '/creative/category', color: 'indigo' },
    { label: 'Creative Items', ...stats?.totalCreativeItem, path: '/creative/item', color: 'blue' },
    { label: 'Blog Categories', ...stats?.totalBlogCategory, path: '/blog/category', color: 'green' },
    { label: 'Blog Posts', ...stats?.totalBlogItem, path: '/blog/item', color: 'purple' },
    { label: 'Job Listings', ...stats?.totalJobList, path: '/jobs/list', color: 'orange' },
    { label: 'Job Applicants', ...stats?.totalApplicants, path: '/jobs/applicants', color: 'teal' },
    { label: 'Contact Submissions', ...stats?.totalContacts, path: '/contact/contact-us', color: 'red' },
    { label: 'Hire Us Items', ...stats?.totalHireUs, path: '/templates/user-choice', color: 'pink' },
    { label: 'Authors', ...stats?.totalAuthor, path: '/templates/author', color: 'yellow' },
    { label: 'Book Calls', ...stats?.totalBookCall, path: '/templates/book-call', color: 'indigo' },
    { label: 'Our Advantages', ...stats?.totalOurAdvantage, path: '/templates/our-advantage', color: 'blue' },
    { label: 'Consultations', ...stats?.totalConsultation, path: '/contact/free-consultation', color: 'green' },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" breadcrumbs={[{ label: 'Dashboard' }]} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.path}
            className={`card border flex flex-col gap-3 hover:shadow-md transition-shadow ${colorMap[card.color] || ''}`}
          >
            <p className="text-sm font-semibold">{card.label}</p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold">{card.total ?? 0}</span>
              <div className="text-right text-xs space-y-0.5">
                <p className="text-green-600 font-medium">Active: {card.active ?? 0}</p>
                <p className="text-red-500 font-medium">Inactive: {card.inactive ?? 0}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
