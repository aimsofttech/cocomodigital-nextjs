import toast from 'react-hot-toast';

interface UseRowReorderArgs {
  api: { update?: (id: string, data: any) => Promise<any> };
  data: any[];
  setData: React.Dispatch<React.SetStateAction<any[]>>;
  pagination: { page: number; limit: number } | null;
  fetchAll: (params?: Record<string, any>) => void;
  /** Stored order field name — defaults to the camelCase `displayOrder`;
   *  legacy modules pass 'display_order'. */
  orderField?: string;
}

/**
 * Shared drag-and-drop reorder handler for CrudListPage tables.
 *
 * Moves the row optimistically, renumbers the page's rows sequentially
 * (offset by the page start so pagination stays consistent), persists only
 * the rows whose order actually changed, then re-syncs from the server.
 * On failure the list is refetched so it rolls back to the stored order.
 */
export function useRowReorder({
  api, data, setData, pagination, fetchAll, orderField = 'displayOrder',
}: UseRowReorderArgs) {
  return async (fromIndex: number, toIndex: number) => {
    if (!api.update) return;
    const next = [...data];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    const base = pagination ? (pagination.page - 1) * pagination.limit : 0;
    const changes = next
      .map((row: any, idx: number) => ({ row, newOrder: base + idx }))
      .filter(({ row, newOrder }) => row[orderField] !== newOrder);

    setData(next.map((row: any, idx: number) => ({ ...row, [orderField]: base + idx })));
    try {
      await Promise.all(changes.map(({ row, newOrder }) =>
        api.update!(row._id, { [orderField]: newOrder })));
      toast.success('Display order updated');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update display order');
      fetchAll(); // roll back to the server's order
    }
  };
}
