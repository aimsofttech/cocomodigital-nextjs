'use strict';

const router = require('express').Router();
const { CrmRole, CrmUser } = require('../models');
const { crmProtect, requirePermission } = require('../middleware/crmAuth');
const { ok, created, bad, notFound } = require('./_helpers');

router.use(crmProtect, requirePermission('roles:manage'));

router.get('/', async (req, res) => {
  const roles = await CrmRole.find().sort({ createdAt: 1 }).lean();
  const counts = await CrmUser.aggregate([
    { $group: { _id: '$roleId', users: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.users]));
  return ok(res, roles.map((r) => ({ ...r, userCount: countMap[String(r._id)] || 0 })));
});

router.post('/', async (req, res) => {
  const { name, permissions, ownScope } = req.body;
  if (!name) return bad(res, 'Role name is required');
  const exists = await CrmRole.findOne({ name });
  if (exists) return bad(res, 'Role already exists', 409);
  const role = await CrmRole.create({ name, permissions: permissions || [], ownScope: !!ownScope });
  return created(res, role, 'Role created');
});

router.put('/:id', async (req, res) => {
  const role = await CrmRole.findById(req.params.id);
  if (!role) return notFound(res, 'Role');
  const { name, permissions, ownScope } = req.body;
  if (name !== undefined && !role.isSystem) role.name = name;
  if (permissions !== undefined) role.permissions = permissions;
  if (ownScope !== undefined) role.ownScope = !!ownScope;
  await role.save();
  return ok(res, role);
});

router.delete('/:id', async (req, res) => {
  const role = await CrmRole.findById(req.params.id);
  if (!role) return notFound(res, 'Role');
  if (role.isSystem) return bad(res, 'System roles cannot be deleted');
  const inUse = await CrmUser.countDocuments({ roleId: role._id });
  if (inUse) return bad(res, `Role is assigned to ${inUse} user(s)`);
  await role.deleteOne();
  return ok(res, null);
});

module.exports = router;
