import { Link, useParams } from 'react-router-dom';
import { useItemScopedCrud } from '@/hooks/useItemScopedCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell } from '@/components/ui/MediaCell';
import { marketingHouseContentItemApi } from '@/services/adminApi';
import ContentItemForm from './ContentItemForm';

export default function ContentItemList() {
  const { itemId } = useParams();
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useItemScopedCrud(marketingHouseContentItemApi);

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
    { key: 'image', label: 'Image', render: (row: any) => <ImageCell src={row.image} /> },
    { key: 'url', label: 'URL', sortable: true, render: (row: any) => row.url ? <Link to={row.url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline text-xs">{row.url}</Link> : 'N/A' },
    { key: 'displayOrder', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Content Items" breadcrumbs={[{ label: 'Marketing Campaigns' }, { label: 'Content Items' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <ContentItemForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Update Content Item' : 'Add Content Item'}
      csv={{
        api: marketingHouseContentItemApi,
        exportParams: itemId ? { marketingHouseItemId: itemId } : undefined,
        importFields: itemId ? { marketingHouseItemId: itemId } : undefined,
        filename: 'content-items',
      }}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
