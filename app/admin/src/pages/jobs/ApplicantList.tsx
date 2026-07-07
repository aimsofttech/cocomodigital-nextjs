import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { EyeIcon, TrashIcon } from '@heroicons/react/24/outline';
import { jobApplicantApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Tooltip from '@/components/ui/Tooltip';
import toast from 'react-hot-toast';
import TableFilter, {
  FilterField, FilterValues, applyClientFilters, isEmptyValue,
} from '@/components/ui/TableFilter';

const FILTER_FIELDS: FilterField[] = [
  { key: 'createdAt', label: 'Applied Date Range', type: 'date-range', serverSide: false },
];

const STATUS_BADGES: Record<string, string> = {
  pending: 'badge-warning',
  reviewed: 'badge-info',
  shortlisted: 'badge-success',
  rejected: 'badge-danger',
  hired: 'badge-success',
};

function getSessionKey(p: string) { return `crud_filter_${p.replace(/\//g, '_')}`; }

export default function ApplicantList() {
  const { pathname } = useLocation();
  const sk = getSessionKey(pathname);

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(() => { try { return parseInt(sessionStorage.getItem(sk + '_ps') || '20'); } catch { return 20; } });
  const [pagination, setPagination] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValues>(() => { try { return JSON.parse(sessionStorage.getItem(sk) || '{}'); } catch { return {}; } });

  const [viewRow, setViewRow] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = () => {
    setLoading(true);
    (jobApplicantApi as any).getAllApplications({ page, limit, search })
      .then(({ data: res }: any) => { setData(res.data || []); setPagination(res.pagination); })
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, [page, limit, search]);

  const handleFilterChange = (key: string, value: any) => {
    const next = { ...filterValues, [key]: value };
    setFilterValues(next);
    try { sessionStorage.setItem(sk, JSON.stringify(next)); } catch { /* noop */ }
  };
  const handleFilterReset = () => { setFilterValues({}); try { sessionStorage.removeItem(sk); } catch { /* noop */ } };
  const handlePageSizeChange = (s: number) => { setLimit(s); setPage(1); try { sessionStorage.setItem(sk + '_ps', String(s)); } catch { /* noop */ } };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await jobApplicantApi.remove(deleteId);
      toast.success('Applicant deleted');
      setDeleteId(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete applicant');
    } finally {
      setDeleting(false);
    }
  };

  const activeCount = FILTER_FIELDS.filter((f) => !isEmptyValue(filterValues[f.key])).length;
  const filteredData = applyClientFilters(data, filterValues, FILTER_FIELDS);

  const columns = [
    { key: 'name', label: 'Name', sortable: true, render: (row: any) => (
      <button type="button" onClick={() => setViewRow(row)} className="text-primary-600 hover:underline font-medium text-left">
        {row.name || 'N/A'}
      </button>
    )},
    { key: 'email', label: 'Email', sortable: true },
    { key: 'phone', label: 'Phone', sortable: true, render: (row: any) => row.phone || 'N/A' },
    { key: 'jobTitle', label: 'Applied For', render: (row: any) => row.jobListId?.title || 'N/A' },
    { key: 'experience', label: 'Experience', sortable: true, render: (row: any) => row.experience || 'N/A' },
    { key: 'applicationStatus', label: 'Status', render: (row: any) => (
      <span className={`badge ${STATUS_BADGES[row.applicationStatus] || 'badge-warning'} capitalize`}>{row.applicationStatus}</span>
    )},
    { key: 'createdAt', label: 'Applied', sortable: true, render: (row: any) => new Date(row.createdAt).toLocaleDateString() },
  ];

  return (
    <div>
      <PageHeader title="Job Applicants" breadcrumbs={[{ label: 'Jobs' }, { label: 'Applicants' }]} />
      <TableFilter fields={FILTER_FIELDS} values={filterValues} onChange={handleFilterChange} onReset={handleFilterReset} activeCount={activeCount} loading={loading} />
      <div className="card">
        <DataTable
          columns={columns}
          data={filteredData}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          onSearch={setSearch}
          pageSize={limit}
          onPageSizeChange={handlePageSizeChange}
          actions={(row: any) => (
            <div className="flex items-center justify-start gap-1">
              <Tooltip content="View">
                <button
                  type="button"
                  onClick={() => setViewRow(row)}
                  className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 transition-colors"
                >
                  <EyeIcon className="w-4 h-4" />
                </button>
              </Tooltip>
              <Tooltip content="Delete">
                <button
                  type="button"
                  onClick={() => setDeleteId(row._id)}
                  className="p-1.5 rounded-md hover:bg-red-50 text-red-500 transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </Tooltip>
            </div>
          )}
        />
      </div>

      <Modal isOpen={!!viewRow} onClose={() => setViewRow(null)} title="Applicant Details" size="lg">
        {viewRow && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500">Applied For</p><p className="font-semibold">{viewRow.jobListId?.title || 'N/A'}</p></div>
              <div><p className="text-xs text-gray-500">Name</p><p className="font-semibold">{viewRow.name || 'N/A'}</p></div>
              <div><p className="text-xs text-gray-500">Email</p><p className="font-semibold">{viewRow.email || 'N/A'}</p></div>
              <div><p className="text-xs text-gray-500">Phone</p><p>{viewRow.phone || 'N/A'}</p></div>
              <div><p className="text-xs text-gray-500">Experience</p><p>{viewRow.experience || 'N/A'}</p></div>
              <div><p className="text-xs text-gray-500">Location</p><p>{[viewRow.state, viewRow.country].filter(Boolean).join(', ') || 'N/A'}</p></div>
              <div><p className="text-xs text-gray-500">Status</p><span className={`badge ${STATUS_BADGES[viewRow.applicationStatus] || 'badge-warning'} capitalize`}>{viewRow.applicationStatus}</span></div>
              <div><p className="text-xs text-gray-500">Applied On</p><p>{new Date(viewRow.createdAt).toLocaleDateString()}</p></div>
              <div><p className="text-xs text-gray-500">Current CTC</p><p>{viewRow.currentCtc || 'N/A'}</p></div>
              <div><p className="text-xs text-gray-500">Expected CTC</p><p>{viewRow.annualCtc || 'N/A'}</p></div>
              <div><p className="text-xs text-gray-500">Notice Period (days)</p><p>{viewRow.noticePeriodDays || 'N/A'}</p></div>
              <div><p className="text-xs text-gray-500">Employment Preference</p><p className="capitalize">{viewRow.jobPrefrence || 'N/A'}</p></div>
              <div><p className="text-xs text-gray-500">Work Preference</p><p className="capitalize">{viewRow.workType || 'N/A'}</p></div>
            </div>
            {viewRow.coverLetter && (
              <div><p className="text-xs text-gray-500 mb-1">Cover Letter</p><p className="text-sm bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{viewRow.coverLetter}</p></div>
            )}
            <div className="flex flex-wrap gap-3">
              {viewRow.resume && (
                <a href={viewRow.resume} target="_blank" rel="noreferrer" className="btn-primary btn-sm">View Resume</a>
              )}
              {viewRow.linkedinUrl && (
                <a href={viewRow.linkedinUrl} target="_blank" rel="noreferrer" className="text-sm text-primary-600 hover:underline self-center">LinkedIn</a>
              )}
              {viewRow.portfolioUrl && (
                <a href={viewRow.portfolioUrl} target="_blank" rel="noreferrer" className="text-sm text-primary-600 hover:underline self-center">Portfolio</a>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Applicant"
        message="Are you sure you want to delete this applicant? This action cannot be undone."
      />
    </div>
  );
}
