import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell } from '@/components/ui/MediaCell';
import { brandApi } from '@/services/adminApi';
import BrandForm from './BrandForm';

export default function BrandList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(brandApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await brandApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    {
      key: 'image',
      label: 'Logo',
      render: (row: any) => <ImageCell src={row.image} alt={row.name} size="w-40 h-18" />
    },
    { key: 'name', label: 'Brand Name', sortable: true, render: (row: any) => <span className="capitalize">{row.name || 'N/A'}</span> },
    { key: 'websiteUrl', label: 'Website', sortable: true, render: (row: any) => row.websiteUrl ? <a href={row.websiteUrl} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline text-xs">{row.websiteUrl}</a> : 'N/A' },
    { key: 'displayOrder', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage
      title="Brands"
      breadcrumbs={[{ label: 'Home' }, { label: 'Brands' }]}
      columns={columns}
      data={data}
      loading={loading}
      submitting={submitting}
      pagination={pagination}
      onPageChange={setPage}
      onSearch={setSearch}
      onDelete={remove}
      filterFields={FILTER_FIELDS}
      onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <BrandForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Brand' : 'Add Brand'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
