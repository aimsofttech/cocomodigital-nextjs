import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDateTime, DetailImage } from '@/components/ui/ViewDetailsModal';
import toast from 'react-hot-toast';
import { ImageCell } from '@/components/ui/MediaCell';
import { clientApi } from '@/services/adminApi';
import ClientForm from './ClientForm';
import { useRowReorder } from '@/hooks/useReorder';

export default function ClientList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll, setData } = useCrud(clientApi);

  // Drag-and-drop rows to renumber displayOrder (shared hook).
  const handleReorder = useRowReorder({ api: clientApi, data, setData, pagination, fetchAll });

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await clientApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'image', label: 'Image', render: (row: any) => <ImageCell src={row.image} alt={row.title} size="w-36 h-24" /> },
    { key: 'title', label: 'Success Stories Title', sortable: true },
    { key: 'displayOrder', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Success Stories" breadcrumbs={[{ label: 'Home' }, { label: 'Success Stories' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove} onReorder={handleReorder}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      viewDetails={(row: any) => ({
        title: 'Success Story Details',
        size: 'xl',
        media: <DetailImage src={row.image} alt="Success story image" />,
        fields: [
          { label: 'Title', value: row.title, full: true },
          { label: 'Slug', value: row.slug, full: true },
          {
            label: 'Description',
            full: true,
            value: row.description ? (
              <div
                className="prose prose-sm max-w-none max-h-64 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: row.description }}
              />
            ) : undefined,
          },
          { label: 'Display Order', value: row.displayOrder },
          { label: 'Service Order', value: row.serviceDisplayOrder },
          { label: 'Status', value: <StatusBadge status={row.status} /> },
          { label: 'Created At', value: formatDateTime(row.createdAt) },
          { label: 'Updated At', value: formatDateTime(row.updatedAt) },
        ],
      })}
      renderModal={({ id, onSuccess, onCancel }) => <ClientForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Success Stories' : 'Add Success Stories'}
      modalSize="xl" onRefresh={fetchAll} />
  );
}
