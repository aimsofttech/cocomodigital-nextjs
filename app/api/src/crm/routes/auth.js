'use strict';

const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { CrmUser, CrmRole } = require('../models');
const { crmProtect } = require('../middleware/crmAuth');
const { DEFAULT_ROLES } = require('../services/permissions');
const { ok, created, bad } = require('./_helpers');

const signToken = (id) =>
  jwt.sign({ id, kind: 'crm' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const authPayload = (user, role) => ({
  token: signToken(user._id),
  user: {
    id: user._id, name: user.name, email: user.email,
    role: role ? role.name : null,
    permissions: role ? role.permissions : [],
    ownScope: role ? !!role.ownScope : false,
  },
});

// GET /crm/api/auth/setup-status (public) — lets the frontend know whether
// the CRM has any user yet, so it can show the first-run setup screen.
router.get('/setup-status', async (req, res) => {
  const count = await CrmUser.countDocuments();
  return ok(res, { needsSetup: count === 0 });
});

// POST /crm/api/auth/setup (public, one-time) — creates the default system
// roles and the first Admin user. Only runs while no CRM user exists yet;
// this replaces a manual seed script so the whole setup happens over the API.
router.post('/setup', async (req, res) => {
  const existing = await CrmUser.countDocuments();
  if (existing > 0) return bad(res, 'Setup has already been completed', 409);

  const { name, email, password } = req.body;
  if (!name || !email || !password) return bad(res, 'name, email and password are required');
  if (String(password).length < 4) return bad(res, 'Password must be at least 4 characters');

  const roleIds = {};
  for (const role of DEFAULT_ROLES) {
    const doc = await CrmRole.findOneAndUpdate(
      { name: role.name },
      { $set: { permissions: role.permissions, ownScope: role.ownScope, isSystem: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    roleIds[role.name] = doc._id;
  }

  const user = await CrmUser.create({ name, email: String(email).toLowerCase(), password, roleId: roleIds.Admin });
  const role = await CrmRole.findById(user.roleId).lean();
  return created(res, authPayload(user, role), 'CRM set up successfully');
});

// POST /crm/api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return bad(res, 'Email and password are required');
  const user = await CrmUser.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    return bad(res, 'Invalid credentials', 401);
  }
  if (!user.isActive) return bad(res, 'Account is deactivated', 403);
  user.lastLoginAt = new Date();
  await user.save();
  const role = await CrmRole.findById(user.roleId).lean();
  return ok(res, authPayload(user, role));
});

// POST /crm/api/auth/logout (stateless — mirror of admin API behaviour)
router.post('/logout', crmProtect, (req, res) => ok(res, null));

// GET /crm/api/auth/me
router.get('/me', crmProtect, async (req, res) => {
  const role = req.crmRole;
  return ok(res, {
    id: req.crmUser._id,
    name: req.crmUser.name,
    email: req.crmUser.email,
    phone: req.crmUser.phone,
    notificationPrefs: req.crmUser.notificationPrefs,
    role: role ? role.name : null,
    permissions: role ? role.permissions : [],
    ownScope: role ? !!role.ownScope : false,
  });
});

// POST /crm/api/auth/change-password
router.post('/change-password', crmProtect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return bad(res, 'Both current and new password are required');
  if (String(newPassword).length < 4) return bad(res, 'New password must be at least 4 characters');
  const user = await CrmUser.findById(req.crmUser._id).select('+password');
  if (!(await user.matchPassword(currentPassword))) return bad(res, 'Current password is incorrect', 401);
  user.password = newPassword;
  await user.save();
  return ok(res, null);
});

module.exports = router;
