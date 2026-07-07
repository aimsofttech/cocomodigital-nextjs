import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { ImageCell } from '@/components/ui/MediaCell';
import { homePageSectionItemApi, homePageSectionApi } from '@/services/adminApi';
import HomePageSectionItemForm from './HomePageSectionItemForm';
import { useRowReorder } from '@/hooks/useReorder';

export default function HomePageSectionItemList() {
  // Scoped to a Home Page Section when navigated from the sections table.
  const [searchParams] = useSearchParams();
  const sectionId = searchParams.get('sectionId') || '';

  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll, setData } = useCrud(homePageSectionItemApi, true, sectionId ? { home_page_section_id: sectionId } : {});

  // Drag-and-drop rows to renumber display_order (shared hook).
  const handleReorder = useRowReorder({ api: homePageSectionItemApi, data, setData, pagination, fetchAll, orderField: 'display_order' });

  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setFilterParams(sectionId ? { home_page_section_id: sectionId } : {});
  }, [sectionId, setFilterParams]);

  const handleFilterChange = (params: Record<string, any>) =>
    setFilterParams({ ...(sectionId ? { home_page_section_id: sectionId } : {}), ...params });

  // Section categories for the "Category" filter dropdown.
  const [sections, setSections] = useState<any[]>([]);
  useEffect(() => {
    homePageSectionApi.getAll({ limit: 200 })
      .then(({ data }) => setSections(data.data || []))
      .catch(() => setSections([]));
  }, []);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await homePageSectionItemApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [
    { key: 'status', label: 'Status', type: 'status' as const },
    {
      key: 'home_page_section_id',
      label: 'Category',
      type: 'select' as const,
      /* TableFilter prepends its own "All Category" placeholder option. */
      options: sections.map((s: any) => ({ value: String(s._id), label: s.name })),
    },
  ];
  const columns = [
    { key: 'image', label: 'Image', render: (row: any) => <ImageCell src={row.image} /> },
    { key: 'category_name', label: 'Category', render: (row: any) => row.category_name || 'N/A' },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'url', label: 'URL', render: (row: any) => row.url ? <a href={row.url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline text-xs">{row.url}</a> : 'N/A' },
    { key: 'display_order', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
  ];
  return (
    <CrudListPage title="Home Section Items" breadcrumbs={[{ label: 'Settings' }, { label: 'Section Items' }]}
      columns={columns} data={data} loading={loading} submitting={submitting} pagination={pagination}
      onPageChange={setPage} onSearch={setSearch} onDelete={remove} onReorder={handleReorder}
      filterFields={FILTER_FIELDS} onServerFilterChange={handleFilterChange}
      renderModal={({ id, onSuccess, onCancel }) => <HomePageSectionItemForm editId={id} lockedSectionId={sectionId || undefined} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Section Item' : 'Add Section Item'}
      modalSize="lg" onRefresh={fetchAll} />
  );
}
