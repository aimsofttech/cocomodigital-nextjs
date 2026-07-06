import { useParams } from 'react-router-dom';
import { useItemScopedCrud } from '@/hooks/useItemScopedCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell, VideoCell } from '@/components/ui/MediaCell';
import { marketingHouseOtherActivityItemApi } from '@/services/adminApi';
import OtherActivityItemForm from './OtherActivityItemForm';

export default function OtherActivityItemList() {
  const { itemId } = useParams();
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useItemScopedCrud(marketingHouseOtherActivityItemApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await marketingHouseOtherActivityItemApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'image1', label: 'Image 1', render: (row: any) => <ImageCell src={row.image1} /> },
    { key: 'video1', label: 'Video 1', render: (row: any) => <VideoCell src={row.video1} thumbnail={row.image1} /> },
    { key: 'title', label: 'Title', sortable: true },
    { key: 'displayOrder', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Add-on Activities Items" breadcrumbs={[{ label: 'Marketing Campaigns' }, { label: 'Add-on Activities Items' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <OtherActivityItemForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Update Add-on Activities Item' : 'Add Add-on Activities Item'}
      csv={{
        api: marketingHouseOtherActivityItemApi,
        exportParams: itemId ? { marketingHouseItemId: itemId } : undefined,
        importFields: itemId ? { marketingHouseItemId: itemId } : undefined,
        filename: 'other-activity-items',
      }}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
