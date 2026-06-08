import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell, VideoCell } from '@/components/ui/MediaCell';
import { marketingHouseContentItemApi } from '@/services/adminApi';
import ContentItemModuleForm from './ContentItemModuleForm';

export default function ContentItemModuleList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(marketingHouseContentItemApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await marketingHouseContentItemApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'item_image', label: 'Image', render: (row: any) => <ImageCell src={row.item_image || row.image} alt={row.item_title} /> },
    { key: 'item_video_url', label: 'Video', render: (row: any) => <VideoCell src={row.item_video_url} thumbnail={row.item_image || row.image} /> },
    { key: 'item_title', label: 'Title', sortable: true, render: (row: any) => row.item_title || row.title || '—' },
    { key: 'content_created_category_name', label: 'Content Category', render: (row: any) => row.content_created_category_name || '—' },
    { key: 'marketing_house_category_name', label: 'Marketing Category', render: (row: any) => row.marketing_house_category_name || '—' },
    { key: 'marketing_house_item_name', label: 'Marketing Item', render: (row: any) => row.marketing_house_item_name || '—' },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Content Items" breadcrumbs={[{ label: 'Marketing House' }, { label: 'Item Sections' }, { label: 'Content Items' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <ContentItemModuleForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Content Item' : 'Add Content Item'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
