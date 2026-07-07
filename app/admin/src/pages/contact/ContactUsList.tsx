import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { contactUsApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import TableFilter, {
  FilterField, FilterValues, applyClientFilters, isEmptyValue,
} from '@/components/ui/TableFilter';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Tooltip from '@/components/ui/Tooltip';
import { EyeIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const FILTER_FIELDS: FilterField[] = [
  { key: 'createdAt', label: 'Date Range', type: 'date-range', serverSide: false },
];

function getSessionKey(p: string) { return `crud_filter_${p.replace(/\//g, '_')}`; }

export default function ContactUsList() {
  const { pathname } = useLocation();
  const sk = getSessionKey(pathname);

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(() => { try { return parseInt(sessionStorage.getItem(sk + '_ps') || '20'); } catch { return 20; } });
  const [pagination, setPagination] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filterValues, setFilterValues] = useState<FilterValues>(() => { try { return JSON.parse(sessionStorage.getItem(sk) || '{}'); } catch { return {}; } });

  const fetchData = () => {
    setLoading(true);
    contactUsApi.getAll({ page, limit, search })
      .then(({ data: res }: any) => { setData(res.data || []); setPagination(res.pagination); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [page, limit, search]);

  const handleFilterChange = (key: string, value: any) => {
    const next = { ...filterValues, [key]: value };
    setFilterValues(next);
    try { sessionStorage.setItem(sk, JSON.stringify(next)); } catch { /* noop */ }
  };
  const handleFilterReset = () => { setFilterValues({}); try { sessionStorage.removeItem(sk); } catch { /* noop */ } };
  const handlePageSizeChange = (s: number) => { setLimit(s); setPage(1); try { sessionStorage.setItem(sk + '_ps', String(s)); } catch { /* noop */ } };

  const activeCount = FILTER_FIELDS.filter((f) => !isEmptyValue(filterValues[f.key])).length;
  const filteredData = applyClientFilters(data, filterValues, FILTER_FIELDS);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await contactUsApi.delete(deleteId);
      toast.success('Deleted');
      setDeleteId(null);
      fetchData();
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Name', sortable: true, render: (row: any) => `${row.firstName || ''} ${row.lastName || ''}`.trim() || row.name || 'N/A' },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'phoneNo', label: 'Phone', sortable: true, render: (row: any) => row.phoneNo || row.phone || 'N/A' },
    { key: 'companyName', label: 'Company', sortable: true, render: (row: any) => row.companyName || 'N/A' },
    { key: 'mediaBudget', label: 'Budget', sortable: true, render: (row: any) => row.mediaBudget || 'N/A' },
    { key: 'createdAt', label: 'Date', sortable: true, render: (row: any) => {
      const d = row.createdAt;
      return d ? new Date(d).toLocaleDateString() : 'N/A';
    } },
  ];

  return (
    <div>
      <PageHeader title="Contact Submissions" breadcrumbs={[{ label: 'Contact' }, { label: 'Contact Us' }]} />
      <TableFilter fields={FILTER_FIELDS} values={filterValues} onChange={handleFilterChange} onReset={handleFilterReset} activeCount={activeCount} loading={loading} />
      <div className="card">
        <DataTable columns={columns} data={filteredData} loading={loading} pagination={pagination}
          onPageChange={setPage} onSearch={setSearch} pageSize={limit} onPageSizeChange={handlePageSizeChange}
          actions={(row: any) => (
            <div className="flex gap-1 justify-start">
              <Tooltip content="View"><button onClick={() => setSelected(row)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><EyeIcon className="w-4 h-4" /></button></Tooltip>
              <Tooltip content="Delete"><button onClick={() => setDeleteId(row._id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><TrashIcon className="w-4 h-4" /></button></Tooltip>
            </div>
          )}
        />
      </div>
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Contact Detail" size="md">
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-gray-500">Name</p><p className="font-medium">{`${selected.firstName || ''} ${selected.lastName || ''}`.trim() || selected.name || ''}</p></div>
              <div><p className="text-xs text-gray-500">Email</p><p>{selected.email}</p></div>
              {(selected.phoneNo || selected.phone) && <div><p className="text-xs text-gray-500">Phone</p><p>{selected.phoneNo || selected.phone}</p></div>}
              {selected.companyName && <div><p className="text-xs text-gray-500">Company</p><p>{selected.companyName}</p></div>}
              {selected.mediaBudget && <div><p className="text-xs text-gray-500">Media Budget</p><p>{selected.mediaBudget}</p></div>}
            </div>
            {selected.message && <div><p className="text-xs text-gray-500 mb-1">Message</p><p className="bg-gray-50 p-3 rounded-lg">{selected.message}</p></div>}
          </div>
        )}
      </Modal>
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        message="Are you sure you want to delete this contact submission? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
