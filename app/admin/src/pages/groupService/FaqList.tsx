import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { groupServiceItemFaqApi, groupServiceItemApi } from '@/services/adminApi';
import FaqForm from './FaqForm';
import { useRowReorder } from '@/hooks/useReorder';

export default function FaqList() {
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('groupServiceItemId') || '';

  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll, setData } = useCrud(groupServiceItemFaqApi, true, itemId ? { groupServiceItemId: itemId } : {});

  // Drag-and-drop rows to renumber displayOrder (shared hook).
  const handleReorder = useRowReorder({ api: groupServiceItemFaqApi, data, setData, pagination, fetchAll });

  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setFilterParams(itemId ? { groupServiceItemId: itemId } : {});
  }, [itemId, setFilterParams]);

  const handleFilterChange = (params: Record<string, any>) =>
    setFilterParams({ ...(itemId ? { groupServiceItemId: itemId } : {}), ...params });

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await groupServiceItemFaqApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  // All group service items for the server-side Item filter dropdown.
  const [itemOptions, setItemOptions] = useState<any[]>([]);
  useEffect(() => {
    groupServiceItemApi.getAll({ limit: 500 })
      .then(({ data }) => setItemOptions(data.data || []))
      .catch(() => {});
  }, []);

  const FILTER_FIELDS = [
    { key: 'status', label: 'Status', type: 'status' as const },
    {
      key: 'groupServiceItemId', label: 'Item', type: 'select' as const,
      options: [{ value: '', label: 'All Items' }, ...itemOptions.map((it: any) => ({ value: String(it._id), label: it.title || it.slug || it._id }))],
    },
    { key: 'createdAt', label: 'Created Date', type: 'date-range' as const, serverSide: true },
  ];
  const columns = [
    {
      key: 'question', label: 'Question', sortable: true, className: 'min-w-[220px] max-w-[320px]',
      render: (row: any) => <span className="block truncate" title={row.question}>{row.question || 'N/A'}</span>,
    },
    {
      key: 'answer', label: 'Answer', className: 'min-w-[260px] max-w-[420px]',
      render: (row: any) => <span className="block truncate" title={row.answer}>{row.answer || 'N/A'}</span>,
    },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Group Service FAQs" breadcrumbs={[{ label: 'Group Service' }, { label: 'FAQs' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove} onReorder={handleReorder}
      filterFields={FILTER_FIELDS} onServerFilterChange={handleFilterChange}
      renderModal={({ id, onSuccess, onCancel }) => <FaqForm editId={id} lockedItemId={itemId || undefined} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit FAQ' : 'Add FAQ'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
