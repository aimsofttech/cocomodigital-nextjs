import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell } from '@/components/ui/MediaCell';
import { marketingHouseImageApi } from '@/services/adminApi';
import PosterMediaForm from './PosterMediaForm';

export default function PosterMediaList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(marketingHouseImageApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await marketingHouseImageApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'image', label: 'Image', render: (row: any) => <ImageCell src={row.image} alt={row.image_title} /> },
    { key: 'image_title', label: 'Title', sortable: true },
    { key: 'marketing_house_category_name', label: 'Category', render: (row: any) => row.marketing_house_category_name || '—' },
    { key: 'marketing_house_item_name', label: 'Item', render: (row: any) => row.marketing_house_item_name || '—' },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Poster Media" breadcrumbs={[{ label: 'Marketing House' }, { label: 'Item Sections' }, { label: 'Poster Media' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <PosterMediaForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Poster Media' : 'Add Poster Media'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
