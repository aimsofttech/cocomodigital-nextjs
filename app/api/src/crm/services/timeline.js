'use strict';

/**
 * Single writer for the CRM activity timeline (crm_activities) — every module
 * records history through this function so entries stay consistent.
 * Also bumps lastActivityAt on the anchor lead/contact.
 */

const { CrmActivity, CrmLead, CrmContact } = require('../models');
const logger = require('../../utils/logger');

/**
 * @param {{ entity: {kind:string, id:any}, also?: Array<{kind:string,id:any}>,
 *           type: string, title: string, meta?: object,
 *           actor?: {kind?:string, userId?:any, label?:string} }} entry
 */
const record = async (entry) => {
  try {
    const doc = await CrmActivity.create({
      entity: entry.entity,
      also: (entry.also || []).filter((a) => a && a.id),
      type: entry.type,
      title: entry.title,
      meta: entry.meta || {},
      actor: entry.actor || { kind: 'system' },
    });

    const now = new Date();
    const touch = [entry.entity, ...(entry.also || [])].filter(Boolean);
    for (const t of touch) {
      if (t.kind === 'lead') await CrmLead.updateOne({ _id: t.id }, { $set: { lastActivityAt: now } });
      if (t.kind === 'contact') await CrmContact.updateOne({ _id: t.id }, { $set: { lastActivityAt: now } });
    }
    return doc;
  } catch (err) {
    // Timeline writes must never break the main flow.
    logger.error(`CRM timeline record failed: ${err.message}`);
    return null;
  }
};

/** Paginated timeline for one entity (includes mirrored entries). */
const forEntity = async (kind, id, { page = 1, limit = 30, types } = {}) => {
  const q = {
    $or: [
      { 'entity.kind': kind, 'entity.id': id },
      { also: { $elemMatch: { kind, id } } },
    ],
  };
  if (types && types.length) q.type = { $in: types };
  const skip = (Math.max(1, page) - 1) * limit;
  const [items, total] = await Promise.all([
    CrmActivity.find(q).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    CrmActivity.countDocuments(q),
  ]);
  return { items, total, page: Number(page), limit: Number(limit) };
};

module.exports = { record, forEntity };
