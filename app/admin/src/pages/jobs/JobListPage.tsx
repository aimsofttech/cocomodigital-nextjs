import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { jobListApi } from '@/services/adminApi';
import JobListForm from './JobListForm';

export default function JobListPage() {
  // When navigated from the Job Categories page, scope to a single category
  // (and pre-select it in the add/edit form).
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get('jobCategoryId') || '';
  const scopeFilter = categoryId ? { job_category_id: categoryId } : {};

  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } =
    useCrud(jobListApi, true, scopeFilter);

  // Re-apply the scope only when the URL category actually changes.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setFilterParams(scopeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, setFilterParams]);

  const handleFilterChange = (params: Record<string, any>) =>
    setFilterParams({ ...scopeFilter, ...params });

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await jobListApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [
    { key: 'status', label: 'Status', type: 'status' as const },
    {
      key: 'job_type', label: 'Job Type', type: 'select' as const, options: [
        { value: 'full-time', label: 'Full Time' },
        { value: 'part-time', label: 'Part Time' },
        { value: 'contract', label: 'Contract' },
        { value: 'internship', label: 'Internship' },
      ]
    },
    {
      key: 'workplace_type', label: 'Workplace', type: 'select' as const, options: [
        { value: 'remote', label: 'Remote' },
        { value: 'on-site', label: 'On-site' },
        { value: 'hybrid', label: 'Hybrid' },
      ]
    },
  ];
  const columns = [
    { key: 'job_title', label: 'Job Title', sortable: true, className: 'min-w-[220px] max-w-[260px]' },
    { key: 'job_category_name', label: 'Category', className: 'min-w-[160px]', render: (row: any) => row.job_category_name || 'N/A' },
    { key: 'job_type', label: 'Type', className: 'min-w-[220px]', render: (row: any) => (Array.isArray(row.job_type) ? row.job_type.join(', ') : row.job_type) || 'N/A' },
    { key: 'workplace_type', label: 'Workplace', className: 'min-w-[180px]', render: (row: any) => (Array.isArray(row.workplace_type) ? row.workplace_type.join(', ') : row.workplace_type) || 'N/A' },
    { key: 'job_location', label: 'Location', sortable: true, className: 'min-w-[140px]' },
    { key: 'experience', label: 'Experience', className: 'min-w-[220px]', render: (row: any) => (Array.isArray(row.experience) ? row.experience.join(', ') : row.experience) || 'N/A' },
    { key: 'display_order', label: 'Order', sortable: true, className: 'min-w-[90px] whitespace-nowrap' },
    { key: 'status', label: 'Status', sortable: true, className: 'min-w-[140px] whitespace-nowrap', render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage
      title="Job Listings"
      breadcrumbs={[{ label: 'Jobs' }, { label: 'Listings' }]}
      columns={columns}
      data={data}
      loading={loading}
      submitting={submitting}
      pagination={pagination}
      onPageChange={setPage}
      onSearch={setSearch}
      onDelete={remove}
      filterFields={FILTER_FIELDS}
      onServerFilterChange={handleFilterChange}
      renderModal={({ id, onSuccess, onCancel }) => <JobListForm editId={id} lockedCategoryId={categoryId || undefined} onSuccess={onSuccess}
        onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Job Listing' : 'Add Job Listing'}
      modalSize="xl" onRefresh={fetchAll} />
  );
}
