import { useItemScopedCrud } from '@/hooks/useItemScopedCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell } from '@/components/ui/MediaCell';
import { marketingHouseContentCarouselApi } from '@/services/adminApi';
import ContentCarouselForm from './ContentCarouselForm';

export default function ContentCarouselList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useItemScopedCrud(marketingHouseContentCarouselApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await marketingHouseContentCarouselApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'image', label: 'Image', render: (row: any) => <ImageCell src={row.image} /> },
    { key: 'carousel_order', label: 'Carousel Order', sortable: true },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Content Carousels" breadcrumbs={[{ label: 'Marketing House' }, { label: 'Content Carousels' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <ContentCarouselForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Content Carousel' : 'Add Content Carousel'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
