import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { whatsappTemplateApi } from '@/services/adminApi';
import WhatsappTemplateForm from './WhatsappTemplateForm';

export default function WhatsappTemplateList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(whatsappTemplateApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await whatsappTemplateApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'template_name', label: 'Template Name', sortable: true },
    { key: 'template_type', label: 'Type', sortable: true },
    { key: 'template_body', label: 'Body', render: (row: any) => <span className="text-xs text-gray-600 line-clamp-2 max-w-xs">{row.template_body || 'N/A'}</span> },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="WhatsApp Templates" breadcrumbs={[{ label: 'Templates' }, { label: 'WhatsApp' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS} onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <WhatsappTemplateForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit WhatsApp Template' : 'Add WhatsApp Template'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
