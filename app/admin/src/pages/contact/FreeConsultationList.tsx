import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { freeConsultationApi } from '@/services/adminApi';
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

export default function FreeConsultationList() {
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
    freeConsultationApi.getSubmissions({ page, limit, search })
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
      await freeConsultationApi.deleteSubmission(deleteId);
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
    { key: 'name', label: 'Name', sortable: true, render: (row: any) => row.name || `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'N/A' },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'phone', label: 'Phone', sortable: true, render: (row: any) => row.phone || row.phoneNo || 'N/A' },
    { key: 'company', label: 'Company', sortable: true, render: (row: any) => row.company || row.companyName || 'N/A' },
    { key: 'budget', label: 'Budget', sortable: true, render: (row: any) => row.budget || 'N/A' },
    { key: 'createdAt', label: 'Submitted', sortable: true, render: (row: any) => {
      const d = row.createdAt;
      return d ? new Date(d).toLocaleDateString() : 'N/A';
    } },
  ];

  return (
    <div>
      <PageHeader title="Free Consultation Bookings" breadcrumbs={[{ label: 'Contact' }, { label: 'Free Consultation' }]} />
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
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Consultation Details" size="lg">
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-gray-500">Name</p><p className="font-medium">{selected.name || `${selected.firstName || ''} ${selected.lastName || ''}`.trim() || 'N/A'}</p></div>
              <div><p className="text-xs text-gray-500">Email</p><p>{selected.email || 'N/A'}</p></div>
              <div><p className="text-xs text-gray-500">Phone</p><p>{selected.phone || selected.phoneNo || 'N/A'}</p></div>
              <div><p className="text-xs text-gray-500">Company</p><p>{selected.company || selected.companyName || 'N/A'}</p></div>
              <div><p className="text-xs text-gray-500">Budget</p><p>{selected.budget || 'N/A'}</p></div>
              <div><p className="text-xs text-gray-500">Submitted</p><p>{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : 'N/A'}</p></div>
            </div>
            {(selected.message || selected.msg) && <div><p className="text-xs text-gray-500 mb-1">Message</p><p className="bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{selected.message || selected.msg}</p></div>}
          </div>
        )}
      </Modal>
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        message="Are you sure you want to delete this consultation booking? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
