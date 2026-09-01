const User = require('../../models/User');
const AdminRole = require('../../models/AdminRole');
const { MODULES, ACTIONS } = require('../../config/adminModules');

/* Your own account. Every route here works on `req.user._id` and never on an
 * id from the request, so there is no id to tamper with: a user can only ever
 * reach their own profile, whatever they send.
 */

/** The permission map the admin app uses to draw menus and buttons. */
const permissionMap = (role) => {
  const full = role && role.fullAccess;
  const rows = (role && role.permissions) || [];
  const byModule = new Map(rows.map((p) => [p.module, p]));

  return MODULES.reduce((acc, mod) => {
    const row = byModule.get(mod.key);
    acc[mod.key] = ACTIONS.reduce((a, action) => {
      const supported = mod.actions.includes(action);
      a[action] = supported && (full || Boolean(row && row[action]));
      return a;
    }, {});
    return acc;
  }, {});
};

/** Everything the panel needs about the signed-in user, in one payload. */
const buildSession = async (user) => {
  const role = await AdminRole.findOne({ key: user.roleKey || 'custom' }).lean();
  const isSuperAdmin = user.roleKey === 'super_admin' || Boolean(role && role.fullAccess);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleKey: user.roleKey || 'custom',
      roleName: role ? role.name : 'Unassigned',
      profileImage: user.profileImage || '',
      status: user.status ?? 1,
      mustChangePassword: !!user.mustChangePassword,
      lastLoginAt: user.lastLoginAt || null,
      isSuperAdmin,
    },
    permissions: permissionMap(role),
  };
};

/** GET /admin/api/profile */
const show = async (req, res) => {
  const session = await buildSession(req.user);
  res.json({ status: 'success', data: session });
};

/**
 * PUT /admin/api/profile
 * Name and picture only. Email identifies the account and the role decides
 * access, so neither is self-service — a Super Admin changes those from User
 * Management.
 */
const update = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });

  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim();
    if (!name) return res.status(400).json({ status: 'error', message: 'Name cannot be empty' });
    user.name = name;
  }
  if (req.body.profileImage !== undefined) user.profileImage = String(req.body.profileImage);

  await user.save();
  const session = await buildSession(user);
  res.json({ status: 'success', message: 'Profile updated successfully', data: session });
};

/**
 * PUT /admin/api/profile/password
 * Requires the current password even though the session is already trusted —
 * it is what stops an unattended screen becoming a permanent account takeover.
 */
const changePassword = async (req, res) => {
  const current = req.body.current_password || req.body.currentPassword;
  const next = req.body.new_password || req.body.newPassword;

  if (!current || !next) {
    return res.status(400).json({ status: 'error', message: 'Current and new password are required' });
  }
  if (String(next).length < 6) {
    return res.status(400).json({ status: 'error', message: 'New password must be at least 6 characters' });
  }

  const user = await User.findById(req.user._id);
  if (!user || !(await user.matchPassword(current))) {
    return res.status(401).json({ status: 'error', message: 'Current password is incorrect' });
  }

  user.password = next;              // hashed by the model's pre-save hook
  user.mustChangePassword = false;
  await user.save();

  res.json({ status: 'success', message: 'Password changed successfully' });
};

module.exports = { show, update, changePassword, buildSession, permissionMap };
