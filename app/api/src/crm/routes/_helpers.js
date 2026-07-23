'use strict';

/** Shared helpers for CRM route modules — same response envelope as the
 *  existing API: { status: 'success'|'error', message?, data?, meta? } */

const parsePaging = (req, defLimit = 20) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || defLimit));
  return { page, limit, skip: (page - 1) * limit };
};

const ok = (res, data, meta) => res.json({ status: 'success', data, ...(meta ? { meta } : {}) });
const created = (res, data, message) => res.status(201).json({ status: 'success', message, data });
const bad = (res, message, code = 400) => res.status(code).json({ status: 'error', message });
const notFound = (res, what = 'Record') => bad(res, `${what} not found`, 404);

/** Standard list endpoint: filter + search + paging + sort. */
const listOf = async (Model, req, res, { filter = {}, searchFields = [], sort = { createdAt: -1 }, populate = [] } = {}) => {
  const { page, limit, skip } = parsePaging(req);
  const q = { ...filter };
  if (req.query.q && searchFields.length) {
    const rx = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    q.$or = searchFields.map((f) => ({ [f]: rx }));
  }
  let query = Model.find(q).sort(sort).skip(skip).limit(limit);
  for (const p of populate) query = query.populate(p.path || p, p.select);
  const [items, total] = await Promise.all([query.lean(), Model.countDocuments(q)]);
  return ok(res, items, { page, limit, total, pages: Math.ceil(total / limit) });
};

module.exports = { parsePaging, ok, created, bad, notFound, listOf };
