import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { marketingFormApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import TableFilter, {
  FilterField, FilterValues, applyClientFilters, isEmptyValue,
} from '@/components/ui/TableFilter';
import Modal from '@/components/ui/Modal';
import { EyeIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const FILTER_FIELDS: FilterField[] = [
  { key: 'createdAt', label: 'Date Range', type: 'date-range', serverSide: false },
];

function getSessionKey(p: string) { return `crud_filter_${p.replace(/\//g, '_')}`; }

export default function FormList() {
  const { pathname } = useLocation();
  const sk = getSessionKey(pathname);

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(() => { try { return parseInt(sessionStorage.getItem(sk + '_ps') || '20'); } catch { return 20; } });
  const [pagination, setPagination] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [filterValues, setFilterValues] = useState<FilterValues>(() => { try { return JSON.parse(sessionStorage.getItem(sk) || '{}'); } catch { return {}; } });

  const fetchData = () => {
    setLoading(true);
    marketingFormApi.getAll({ page, limit, search })
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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this submission?')) return;
    await marketingFormApi.delete(id);
    toast.success('Deleted');
    fetchData();
  };

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'whatsapp_no', label: 'WhatsApp', sortable: true },
    { key: 'campaign_budget', label: 'Budget', sortable: true },
    { key: 'realease_date', label: 'Release Date', sortable: true },
    { key: 'createdAt', label: 'Submitted', sortable: true, render: (row: any) => new Date(row.createdAt).toLocaleDateString() },
  ];

  return (
    <div>
      <PageHeader title="Marketing Form Submissions" breadcrumbs={[{ label: 'Marketing House' }, { label: 'Forms' }]} />
      <TableFilter fields={FILTER_FIELDS} values={filterValues} onChange={handleFilterChange} onReset={handleFilterReset} activeCount={activeCount} loading={loading} />
      <div className="card">
        <DataTable columns={columns} data={filteredData} loading={loading} pagination={pagination}
          onPageChange={setPage} onSearch={setSearch} pageSize={limit} onPageSizeChange={handlePageSizeChange}
          actions={(row: any) => (
            <div className="flex gap-1 justify-end">
              <button onClick={() => setSelected(row)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><EyeIcon className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(row._id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><TrashIcon className="w-4 h-4" /></button>
            </div>
          )}
        />
      </div>
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Form Submission Detail" size="md">
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-gray-500">Name</p><p className="font-medium">{selected.name}</p></div>
              <div><p className="text-xs text-gray-500">Email</p><p>{selected.email}</p></div>
              <div><p className="text-xs text-gray-500">WhatsApp</p><p>{selected.whatsapp_no || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Budget</p><p>{selected.campaign_budget || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Release Date</p><p>{selected.realease_date || '—'}</p></div>
            </div>
            {selected.about_message && <div><p className="text-xs text-gray-500 mb-1">Message</p><p className="bg-gray-50 p-3 rounded-lg">{selected.about_message}</p></div>}
          </div>
        )}
      </Modal>
    </div>
  );
}
