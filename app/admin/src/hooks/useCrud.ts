import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';

interface CrudService {
  getAll: (params?: Record<string, any>) => Promise<any>;
  getOne?: (id: string) => Promise<any>;
  create?: (data: any) => Promise<any>;
  update?: (id: string, data: any) => Promise<any>;
  delete?: (id: string) => Promise<any>;
}

interface PaginationState {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UseCrudReturn<T> {
  data: T[];
  item: T | null;
  loading: boolean;
  submitting: boolean;
  pagination: PaginationState | null;
  search: string;
  filterParams: Record<string, any>;
  fetchAll: (params?: Record<string, any>) => void;
  fetchOne: (id: string) => void;
  create: (data: any) => Promise<boolean>;
  update: (id: string, data: any) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  setSearch: (s: string) => void;
  setPage: (p: number) => void;
  /** Update server-side filter params — resets to page 1 and triggers refetch */
  setFilterParams: (params: Record<string, any>) => void;
  /** Directly replace the current rows (e.g. optimistic drag-and-drop reorder). */
  setData: React.Dispatch<React.SetStateAction<T[]>>;
}

export function useCrud<T = any>(service: CrudService, autoFetch = true, initialFilter: Record<string, any> = {}): UseCrudReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [item, setItem] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState<PaginationState | null>(null);
  const [search, setSearchValue] = useState('');
  const [page, setPageValue] = useState(1);
  // Seed the filter so the very first fetch is already scoped — avoids an extra
  // unfiltered request when the page is scoped by a URL param.
  const [filterParams, setFilterParamsState] = useState<Record<string, any>>(initialFilter);

  // Stable string key so useEffect doesn't fire on object reference equality
  const filterKey = useMemo(() => JSON.stringify(filterParams), [filterParams]);

  const fetchAll = useCallback(async (overrides?: Record<string, any>) => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 20, ...filterParams, ...overrides };
      if (search) params.search = search;
      const { data: res } = await service.getAll(params);
      setData(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, filterKey]);

  const fetchOne = useCallback(async (id: string) => {
    if (!service.getOne) return;
    setLoading(true);
    try {
      const { data: res } = await service.getOne(id);
      setItem(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch item');
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (formData: any): Promise<boolean> => {
    if (!service.create) return false;
    setSubmitting(true);
    try {
      const { data: res } = await service.create(formData);
      toast.success(res.message || 'Created successfully');
      fetchAll();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [fetchAll]);

  const update = useCallback(async (id: string, formData: any): Promise<boolean> => {
    if (!service.update) return false;
    setSubmitting(true);
    try {
      const { data: res } = await service.update(id, formData);
      toast.success(res.message || 'Updated successfully');
      fetchAll();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [fetchAll]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    if (!service.delete) return false;
    setSubmitting(true);
    try {
      await service.delete(id);
      toast.success('Deleted successfully');
      setData((prev) => prev.filter((d: any) => d._id !== id));
      if (pagination) setPagination((p) => p ? { ...p, total: p.total - 1 } : p);
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [pagination]);

  const setSearch = useCallback((s: string) => {
    setSearchValue(s);
    setPageValue(1);
  }, []);

  const setPage = useCallback((p: number) => setPageValue(p), []);

  /** Set server-side filter params — resets to page 1 and triggers refetch */
  const setFilterParams = useCallback((params: Record<string, any>) => {
    setFilterParamsState(params);
    setPageValue(1);
  }, []);

  useEffect(() => {
    if (autoFetch) fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, filterKey]);

  return {
    data, item, loading, submitting, pagination, search,
    filterParams, fetchAll, fetchOne, create, update, remove,
    setSearch, setPage, setFilterParams, setData,
  };
}
