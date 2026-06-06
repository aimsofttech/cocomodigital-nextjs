import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusBadge from '@/components/ui/StatusBadge';
// TODO: Import the correct API service for this module
// import { someApi } from '@/services/adminApi';

export default function Wizard() {
  // TODO: Replace placeholder with real service
  const { data, loading, submitting, pagination, fetchAll, remove, setSearch, setPage } = useCrud(
    { getAll: () => Promise.resolve({ data: { data: [], pagination: null } }), delete: async () => {} },
    true
  );

  const columns = [
    { key: '_id', label: '#', render: (_: any, i: number) => i + 1 },
    { key: 'createdAt', label: 'Created', render: (row: any) => new Date(row.createdAt).toLocaleDateString() },
    { key: 'status', label: 'Status', render: (row: any) => <StatusBadge status={row.status} /> },
  ];

  return (
    <CrudListPage
      title="Creative Wizard"
      breadcrumbs={[{ label: 'Creative Wizard' }]}
      columns={columns}
      data={data}
      loading={loading}
      submitting={submitting}
      pagination={pagination}
      onPageChange={setPage}
      onSearch={setSearch}
      onDelete={remove}
      addPath="wizard/add"
      editPath={(row: any) => `edit/${row._id}`}
    />
  );
}
