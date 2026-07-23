'use strict';

const router = require('express').Router();
const { CrmUser, CrmRole } = require('../models');
const { crmProtect, requirePermission } = require('../middleware/crmAuth');
const { PERMISSIONS } = require('../services/permissions');
const { ok, created, bad, notFound, listOf } = require('./_helpers');

router.use(crmProtect);

// PUT /crm/api/users/me/notification-prefs (any logged-in user)
router.put('/me/notification-prefs', async (req, res) => {
  const { inApp, email } = req.body || {};
  req.crmUser.notificationPrefs = {
    inApp: inApp !== false,
    email: email !== false,
  };
  await req.crmUser.save();
  return ok(res, req.crmUser.notificationPrefs);
});

router.use(requirePermission('users:manage'));

// GET /crm/api/users
router.get('/', (req, res) =>
  listOf(CrmUser, req, res, {
    searchFields: ['name', 'email'],
    populate: [{ path: 'roleId', select: 'name ownScope' }],
  }));

// GET /crm/api/users/permissions — catalog for the role editor
router.get('/permissions', (req, res) => ok(res, PERMISSIONS));

// POST /crm/api/users
router.post('/', async (req, res) => {
  const { name, email, password, phone, roleId } = req.body;
  if (!name || !email || !password || !roleId) return bad(res, 'name, email, password and roleId are required');
  const exists = await CrmUser.findOne({ email: String(email).toLowerCase() });
  if (exists) return bad(res, 'A user with this email already exists', 409);
  const role = await CrmRole.findById(roleId);
  if (!role) return bad(res, 'Role not found');
  const user = await CrmUser.create({ name, email, password, phone, roleId });
  return created(res, user, 'User created');
});

// GET /crm/api/users/:id
router.get('/:id', async (req, res) => {
  const user = await CrmUser.findById(req.params.id).populate('roleId', 'name');
  if (!user) return notFound(res, 'User');
  return ok(res, user);
});

// PUT /crm/api/users/:id
router.put('/:id', async (req, res) => {
  const user = await CrmUser.findById(req.params.id).select('+password');
  if (!user) return notFound(res, 'User');
  const { name, email, phone, roleId, isActive, password } = req.body;
  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (phone !== undefined) user.phone = phone;
  if (roleId !== undefined) user.roleId = roleId;
  if (isActive !== undefined) user.isActive = !!isActive;
  if (password) user.password = password;   // pre-save hook re-hashes
  await user.save();
  return ok(res, user);
});

// DELETE /crm/api/users/:id (deactivate — keeps ownership history intact)
router.delete('/:id', async (req, res) => {
  if (String(req.params.id) === String(req.crmUser._id)) return bad(res, 'You cannot deactivate yourself');
  const user = await CrmUser.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!user) return notFound(res, 'User');
  return ok(res, user);
});

module.exports = router;
