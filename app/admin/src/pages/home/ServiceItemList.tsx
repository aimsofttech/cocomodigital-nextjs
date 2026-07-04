import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import CrudListPage from '@/components/ui/CrudListPage';
import StatusToggle from '@/components/ui/StatusToggle';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDateTime, DetailImage } from '@/components/ui/ViewDetailsModal';
import toast from 'react-hot-toast';
import { ImageCell, VideoCell } from '@/components/ui/MediaCell';
import { serviceItemApi, serviceCategoryApi } from '@/services/adminApi';
import ServiceItemForm from './ServiceItemForm';

export default function ServiceItemList() {
  const { data, loading, submitting, pagination, remove, setSearch, setPage, setFilterParams, fetchAll } = useCrud(serviceItemApi);

  // Departments for the "Service Department" filter dropdown.
  const [departments, setDepartments] = useState<any[]>([]);
  useEffect(() => {
    serviceCategoryApi.getAll({ limit: 200 })
      .then(({ data }) => setDepartments(data.data || []))
      .catch(() => setDepartments([]));
  }, []);

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      await serviceItemApi.update(id, { status: newStatus });
      toast.success('Status updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const FILTER_FIELDS = [
    { key: 'status', label: 'Status', type: 'status' as const },
    {
      key: 'serviceCategoryId',
      label: 'Service Department',
      type: 'select' as const,
      options: [
        { value: '', label: 'All Departments' },
        ...departments.map((d: any) => ({ value: String(d._id), label: d.name })),
      ],
    },
  ];
  const columns = [
    /* Service images are wide banner cards — render them large (384×192)
       with a reserved min-width so the table cell can't squeeze them
       (Tailwind preflight gives img max-width:100%). The wide columns
       overflow the card and scroll horizontally via .table-container. */
    { key: 'image', label: 'Image', className: 'min-w-[12rem]', render: (row: any) => <ImageCell src={row.image} size="w-40 h-22" /> },
    { key: 'videoUrl', label: 'Video', className: 'min-w-[10rem]', render: (row: any) => <VideoCell src={row.videoUrl} thumbnail={row.image} /> },
    { key: 'department_name', label: 'Department', render: (row: any) => row.department_name || 'N/A' },
    { key: 'title', label: 'Category Name', sortable: true },
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
                to={`/group-service/top-banner?serviceItemId=${row._id}`}
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
      title="Service Categories"
      breadcrumbs={[{ label: 'Home' }, { label: 'Service Categories' }]}
      columns={columns}
      data={data}
      loading={loading}
      submitting={submitting}
      pagination={pagination}
      onPageChange={setPage}
      onSearch={setSearch} onDelete={remove}
      filterFields={FILTER_FIELDS}
      onServerFilterChange={setFilterParams}
      viewDetails={(row: any) => ({
        title: 'Service Category Details',
        size: 'xl',
        media: <DetailImage src={row.image} alt="Service image" />,
        fields: [
          { label: 'Category Name', value: row.title, full: true },
          { label: 'Department', value: row.department_name },
          { label: 'Slug', value: row.slug },
          {
            label: 'Video URL',
            full: true,
            value: row.videoUrl ? (
              <a href={row.videoUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
                {row.videoUrl}
              </a>
            ) : undefined,
          },
          { label: 'Button Text', value: row.buttonText },
          { label: 'Button URL', value: row.buttonUrl },
          { label: 'Display Order', value: row.displayOrder },
          { label: 'Status', value: <StatusBadge status={row.status} /> },
          { label: 'Created At', value: formatDateTime(row.createdAt) },
          { label: 'Updated At', value: formatDateTime(row.updatedAt) },
        ],
      })}
      renderModal={({ id, onSuccess, onCancel }) => <ServiceItemForm editId={id} onSuccess={onSuccess} onCancel={onCancel} />}
      modalTitle={(mode) => mode === 'edit' ? 'Edit Service Category' : 'Add Service Category'}
      modalSize="xl" onRefresh={fetchAll} />
  );
}
