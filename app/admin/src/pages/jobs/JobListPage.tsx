import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { jobListApi } from '@/services/adminApi';
import JobListForm from './JobListForm';

export default function JobListPage() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(jobListApi);

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
    { key: 'job_type', label: 'Job Type', type: 'select' as const, options: [
      { value: 'full-time', label: 'Full Time' },
      { value: 'part-time', label: 'Part Time' },
      { value: 'contract', label: 'Contract' },
      { value: 'internship', label: 'Internship' },
    ]},
    { key: 'workplace_type', label: 'Workplace', type: 'select' as const, options: [
      { value: 'remote', label: 'Remote' },
      { value: 'on-site', label: 'On-site' },
      { value: 'hybrid', label: 'Hybrid' },
    ]},
  ];
  const columns = [
    { key: 'job_title', label: 'Job Title', sortable: true },
    { key: 'job_type', label: 'Type', sortable: true },
    { key: 'workplace_type', label: 'Workplace', sortable: true },
    { key: 'job_location', label: 'Location', sortable: true },
    { key: 'job_experience', label: 'Experience', sortable: true },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Job Listings" breadcrumbs={[{ label: 'Jobs' }, { label: 'Listings' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <JobListForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Job Listing' : 'Add Job Listing'}
      modalSize="xl" onRefresh={fetchAll} />
  );
}
