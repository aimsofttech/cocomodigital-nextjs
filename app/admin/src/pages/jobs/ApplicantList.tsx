import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { jobApplicantApi } from '@/services/adminApi';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import TableFilter, {
  FilterField, FilterValues, applyClientFilters, isEmptyValue,
} from '@/components/ui/TableFilter';

const FILTER_FIELDS: FilterField[] = [
  { key: 'createdAt', label: 'Applied Date Range', type: 'date-range', serverSide: false },
];

function getSessionKey(p: string) { return `crud_filter_${p.replace(/\//g, '_')}`; }

export default function ApplicantList() {
  const { pathname } = useLocation();
  const sk = getSessionKey(pathname);

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(() => { try { return parseInt(sessionStorage.getItem(sk + '_ps') || '20'); } catch { return 20; } });
  const [pagination, setPagination] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValues>(() => { try { return JSON.parse(sessionStorage.getItem(sk) || '{}'); } catch { return {}; } });

  useEffect(() => {
    setLoading(true);
    (jobApplicantApi as any).getAllApplications({ page, limit, search })
      .then(({ data: res }: any) => { setData(res.data || []); setPagination(res.pagination); })
      .finally(() => setLoading(false));
  }, [page, limit, search]);

  const handleFilterChange = (key: string, value: any) => {
    const next = { ...filterValues, [key]: value };
    setFilterValues(next);
    try { sessionStorage.setItem(sk, JSON.stringify(next)); } catch { /* noop */ }
  };
  const handleFilterReset = () => { setFilterValues({}); try { sessionStorage.removeItem(sk); } catch { /* noop */ } };
  const handlePageSizeChange = (s: number) => { setLimit(s); setPage(1); try { sessionStorage.setItem(sk + '_ps', String(s)); } catch { /* noop */ } };

  const activeCount = FILTER_FIELDS.filter((f) => !isEmptyValue(filterValues[f.key])).length;
  const filteredData = applyClientFilters(data, filterValues, FILTER_FIELDS);

  const columns = [
    { key: 'name', label: 'Name', sortable: true, render: (row: any) => (
      <Link to={`/jobs/applicants/${row._id}`} className="text-primary-600 hover:underline font-medium">
        {`${row.first_name || ''} ${row.last_name || ''}`.trim() || '—'}
      </Link>
    )},
    { key: 'email', label: 'Email', sortable: true },
    { key: 'phone_no', label: 'Phone', sortable: true },
    { key: 'experience', label: 'Experience', sortable: true },
    { key: 'job_prefrence', label: 'Preference', sortable: true },
    { key: 'createdAt', label: 'Applied', sortable: true, render: (row: any) => new Date(row.createdAt).toLocaleDateString() },
  ];

  return (
    <div>
      <PageHeader title="Job Applicants" breadcrumbs={[{ label: 'Jobs' }, { label: 'Applicants' }]} />
      <TableFilter fields={FILTER_FIELDS} values={filterValues} onChange={handleFilterChange} onReset={handleFilterReset} activeCount={activeCount} loading={loading} />
      <div className="card">
        <DataTable
          columns={columns}
          data={filteredData}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          onSearch={setSearch}
          pageSize={limit}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </div>
  );
}
