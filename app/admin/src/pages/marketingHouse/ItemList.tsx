import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell, VideoCell } from '@/components/ui/MediaCell';
import { marketingHouseItemApi } from '@/services/adminApi';
import ItemForm from './ItemForm';

export default function ItemList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(marketingHouseItemApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await marketingHouseItemApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }, { key: 'year', label: 'Year', type: 'year' as const }];
  const columns = [
    { key: 'poster_image', label: 'Poster', render: (row: any) => <ImageCell src={row.poster_image} alt={row.title} /> },
    { key: 'marketing_video', label: 'Video', render: (row: any) => <VideoCell src={row.marketing_video} thumbnail={row.poster_image} /> },
    { key: 'title', label: 'Title', sortable: true },
    { key: 'year', label: 'Year', sortable: true },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Marketing Items" breadcrumbs={[{ label: 'Marketing House' }, { label: 'Items' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <ItemForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Marketing Item' : 'Add Marketing Item'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
