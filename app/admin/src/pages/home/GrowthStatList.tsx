import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDateTime } from '@/components/ui/ViewDetailsModal';
import { growthStatApi } from '@/services/adminApi';
import toast from 'react-hot-toast';
import GrowthStatForm from './GrowthStatForm';

const statText = (row: any) => `${row.prefix || ''}${row.value ?? ''}${row.suffix || ''}`;

export default function GrowthStatList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(growthStatApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await growthStatApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'value', label: 'Stat', sortable: true, render: (row: any) => <span className="text-lg font-bold text-gray-900">{statText(row)}</span> },
    { key: 'label', label: 'Label', sortable: true },
    { key: 'displayOrder', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} label={row.label} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Growth Numbers" breadcrumbs={[{ label: 'Home' }, { label: 'Growth at Glance' }, { label: 'Growth Numbers' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      viewDetails={(row: any) => ({
        title: 'Growth Number Details',
        size: 'xl',
        fields: [
          { label: 'Stat', value: <span className="text-xl font-bold">{statText(row)}</span> },
          { label: 'Label', value: row.label },
          { label: 'Prefix', value: row.prefix },
          { label: 'Value', value: row.value },
          { label: 'Suffix', value: row.suffix },
          { label: 'Display Order', value: row.displayOrder },
          { label: 'Status', value: <StatusBadge status={row.status} /> },
          { label: 'Created At', value: formatDateTime(row.createdAt) },
          { label: 'Updated At', value: formatDateTime(row.updatedAt) },
        ],
      })}
      renderModal={({ id, onSuccess, onCancel }) => <GrowthStatForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Growth Number' : 'Add Growth Number'}
      modalSize="xl" onRefresh={fetchAll} />
  );
}
