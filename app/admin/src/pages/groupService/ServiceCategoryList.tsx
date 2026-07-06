import { Link } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import toast from 'react-hot-toast';
import { groupServiceCategoryApi } from '@/services/adminApi';
import ServiceCategoryForm from './ServiceCategoryForm';

// Pages reachable from a group service category. Opens scoped to this category
// via a query param the target list reads and filters on.
const targetHref = (_segment: string, row: any) =>
  `/group-service/item?groupServiceCategoryId=${row._id}`;

export default function ServiceCategoryList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(groupServiceCategoryApi);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await groupServiceCategoryApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [{ key: 'status', label: 'Status', type: 'status' as const }];
  const columns = [
    { key: 'name', label: 'Group Service Categories', sortable: true },
    { key: 'departmentName', label: 'Department', render: (row: any) => row.departmentName || 'N/A' },
    { key: 'categoryName', label: 'Service Categories', render: (row: any) => row.categoryName || 'N/A' },
    { key: 'displayDirection', label: 'Direction', sortable: true },
    { key: 'displayOrder', label: 'Order', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row: any) => <StatusToggle status={row.status} onConfirm={(newStatus) => handleStatusChange(row._id, newStatus)} /> },
    {
      key: 'navigate', label: 'Navigate To', render: (row: any) => {
        const targets = Array.isArray(row.navigation) ? row.navigation : [];
        if (!targets.length) return '-';
        return (
          <div className="flex flex-col gap-1.5">
            {targets.map((t: any) => (
              <Link
                key={t.segment}
                to={targetHref(t.segment, row)}
                title={typeof t.count === 'number' ? `${t.label}: ${t.count} record(s)` : t.label}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md bg-primary-600 text-white hover:bg-primary-700 text-xs font-medium whitespace-nowrap transition-colors"
              >
                <span>{t.label}{typeof t.count === 'number' ? ` ( ${t.count} )` : ''}</span>
              </Link>
            ))}
          </div>
        );
      },
    },
  ];
  return (
    <CrudListPage
      title="Group Service Categories"
      breadcrumbs={[{ label: 'Group Service' },
      { label: 'Categories' }]}
      columns={columns}
      data={data}
      loading={loading}
      submitting={submitting}
      pagination={pagination}
      onPageChange={setPage}
      onSearch={setSearch}
      onDelete={remove}
      filterFields={FILTER_FIELDS}
      onServerFilterChange={setFilterParams}
      renderModal={({ id, onSuccess, onCancel }) => <ServiceCategoryForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Group Service Category' : 'Add Group Service Category'}
      modalSize="xl"
      onRefresh={fetchAll}
    />
  );
}
