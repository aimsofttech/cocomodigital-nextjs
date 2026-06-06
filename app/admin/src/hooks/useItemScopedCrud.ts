import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useCrud } from './useCrud';

/**
 * Like useCrud, but scopes the list to a parent id taken from the route.
 * Used by marketing-item sub-modules (rendered at /marketing/item/:itemId/...),
 * so each list only shows the records belonging to that item. Create/update/
 * delete pass through unchanged (the forms set the parent id on create).
 */
export function useItemScopedCrud<T = any>(
  service: any,
  paramKey = 'marketing_house_item_id',
  routeParam = 'itemId',
) {
  const params = useParams();
  const scopeId = params[routeParam];
  const scoped = useMemo(() => ({
    ...service,
    getAll: (p?: Record<string, any>) =>
      service.getAll({ ...p, ...(scopeId ? { [paramKey]: scopeId } : {}) }),
  }), [service, scopeId]);
  return useCrud<T>(scoped);
}
