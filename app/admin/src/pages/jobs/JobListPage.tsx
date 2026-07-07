import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { jobListApi } from '@/services/adminApi';
import JobListForm from './JobListForm';
import { useRowReorder } from '@/hooks/useReorder';

export default function JobListPage() {
  // When navigated from the Job Categories page, scope to a single category
  // (and pre-select it in the add/edit form).
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get('jobCategoryId') || '';
  const scopeFilter = categoryId ? { jobCategoryId: categoryId } : {};

  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll, setData } = useCrud(jobListApi, true, scopeFilter);

  // Drag-and-drop rows to renumber displayOrder (shared hook).
  const handleReorder = useRowReorder({ api: jobListApi, data, setData, pagination, fetchAll });

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
      key: 'jobType', label: 'Job Type', type: 'select' as const, options: [
        { value: 'full-time', label: 'Full Time' },
        { value: 'part-time', label: 'Part Time' },
        { value: 'contract', label: 'Contract' },
        { value: 'internship', label: 'Internship' },
      ]
    },
    {
      key: 'workplaceType', label: 'Workplace', type: 'select' as const, options: [
        { value: 'remote', label: 'Remote' },
        { value: 'on-site', label: 'On-site' },
        { value: 'hybrid', label: 'Hybrid' },
      ]
    },
  ];
  const columns = [
    { key: 'title', label: 'Job Title', sortable: true, className: 'min-w-[220px] max-w-[260px]' },
    { key: 'jobCategoryName', label: 'Category', className: 'min-w-[160px]', render: (row: any) => row.jobCategoryName || 'N/A' },
    { key: 'jobType', label: 'Type', className: 'min-w-[220px]', render: (row: any) => (Array.isArray(row.jobType) ? row.jobType.join(', ') : row.jobType) || 'N/A' },
    { key: 'workplaceType', label: 'Workplace', className: 'min-w-[180px]', render: (row: any) => (Array.isArray(row.workplaceType) ? row.workplaceType.join(', ') : row.workplaceType) || 'N/A' },
    { key: 'location', label: 'Location', sortable: true, className: 'min-w-[140px]' },
    { key: 'experience', label: 'Experience', className: 'min-w-[220px]', render: (row: any) => (Array.isArray(row.experience) ? row.experience.join(', ') : row.experience) || 'N/A' },
    { key: 'displayOrder', label: 'Order', sortable: true, className: 'min-w-[90px] whitespace-nowrap' },
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
      onDelete={remove} onReorder={handleReorder}
      filterFields={FILTER_FIELDS}
      onServerFilterChange={handleFilterChange}
      renderModal={({ id, onSuccess, onCancel }) => <JobListForm editId={id} lockedCategoryId={categoryId || undefined} onSuccess={onSuccess}
        onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Job Listing' : 'Add Job Listing'}
      modalSize="xl" onRefresh={fetchAll} />
  );
}
