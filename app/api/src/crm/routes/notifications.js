'use strict';

const router = require('express').Router();
const { CrmNotification } = require('../models');
const { crmProtect } = require('../middleware/crmAuth');
const { ok, parsePaging } = require('./_helpers');

router.use(crmProtect);

// GET /crm/api/notifications?unread=1
router.get('/', async (req, res) => {
  const { page, limit, skip } = parsePaging(req, 15);
  const q = { userId: req.crmUser._id };
  if (req.query.unread === '1') q.isRead = false;
  const [items, total, unread] = await Promise.all([
    CrmNotification.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    CrmNotification.countDocuments(q),
    CrmNotification.countDocuments({ userId: req.crmUser._id, isRead: false }),
  ]);
  return ok(res, items, { page, limit, total, unread });
});

// PATCH /crm/api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  await CrmNotification.updateOne(
    { _id: req.params.id, userId: req.crmUser._id },
    { $set: { isRead: true } }
  );
  return ok(res, null);
});

// PATCH /crm/api/notifications/read-all
router.patch('/read-all', async (req, res) => {
  await CrmNotification.updateMany(
    { userId: req.crmUser._id, isRead: false },
    { $set: { isRead: true } }
  );
  return ok(res, null);
});

module.exports = router;
